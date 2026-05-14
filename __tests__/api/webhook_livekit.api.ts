import { POST } from "@/app/api/webhooks/livekit/route";
import { db } from "@db/db";
import { NextRequest } from "next/server";
import { ParticipantInfo_Kind } from "@livekit/protocol";
import { assertCanUseAI } from "@/lib/plan_limits";

jest.mock("next/server", () => ({
  ...jest.requireActual("next/server"),
  after: jest.fn(),
}));

jest.mock("@/lib/plan_limits", () => ({
  assertCanUseAI: jest.fn(),
}));

// db mock
jest.mock("@db/db", () => ({
  db: {
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(),
      })),
    })),
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        innerJoin: jest.fn(() => ({
          where: jest.fn(() => []),
        })),
        where: jest.fn(() => []),
      })),
    })),
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        onConflictDoNothing: jest.fn(),
      })),
    })),
    transaction: jest.fn(),
  },
}));

// livekit mock
jest.mock("livekit-server-sdk", () => {
  const receiveFn = jest.fn();
  return {
    EgressClient: jest.fn().mockImplementation(() => ({
      startParticipantEgress: jest.fn(),
    })),
    EncodedFileOutput: jest.fn(),
    WebhookReceiver: jest.fn().mockImplementation(() => ({
      receive: receiveFn,
    })),
    __receiveFn: receiveFn,
  };
});

const { __receiveFn: mockReceive } = jest.requireMock("livekit-server-sdk") as {
  __receiveFn: jest.Mock;
};

// Helper
function mockRequest<T>(event: T, authHeader = "valid-token"): NextRequest {
  return {
    text: jest.fn().mockResolvedValue(JSON.stringify(event)),
    headers: { get: jest.fn().mockReturnValue(authHeader) },
  } as unknown as NextRequest;
}

describe("POST /api/webhooks/livekit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReceive.mockImplementation((_body: string, _auth: string) =>
      Promise.resolve(JSON.parse(_body))
    );
  });

  it("returns 401 if authorization fails", async () => {
    mockReceive.mockRejectedValueOnce(new Error("invalid token"));
    const req = mockRequest({ event: "room_started", room: { name: "r1" } });

    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("returns 400 if room is missing", async () => {
    const req = mockRequest({ event: "room_started" });

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("updates event to active on room_started", async () => {
    (db.select as jest.Mock).mockReturnValueOnce({
      from: () => ({
        innerJoin: () => ({
          where: () => [{ userId: "user_1", recordingStatus: false }],
        }),
      }),
    });

    const req = mockRequest({
      event: "room_started",
      room: { name: "room_123" },
    });

    const res = await POST(req);

    expect(db.update).toHaveBeenCalled();
    expect(assertCanUseAI).toHaveBeenCalledWith("user_1");
    expect(res.status).toBe(200);
  });

  it("returns 200 early when AI limit is reached on room_started", async () => {
    (db.select as jest.Mock).mockReturnValueOnce({
      from: () => ({
        innerJoin: () => ({
          where: () => [{ userId: "user_1", recordingStatus: true }],
        }),
      }),
    });
    (assertCanUseAI as jest.Mock).mockRejectedValueOnce(
      new Error("AI limit reached")
    );
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    const req = mockRequest({
      event: "room_started",
      room: { name: "room_123" },
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    // First update sets status="active"; egress branch must NOT run after limit error
    expect(db.update).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  it("updates duration and status on room_finished", async () => {
    (db.select as jest.Mock)
      .mockReturnValueOnce({
        from: () => ({
          where: () => [{ id: "room_123", duration: 10 }],
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: () => [{ userId: "user_1" }],
        }),
      });

    const req = mockRequest({
      event: "room_finished",
      createdAt: 1_700_000_600_000,
      room: {
        name: "room_123",
        creationTimeMs: 1_700_000_000_000,
      },
    });

    const res = await POST(req);

    expect(db.update).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it("returns early for EGRESS participant", async () => {
    const req = mockRequest({
      event: "participant_joined",
      room: { name: "room_123" },
      participant: { kind: ParticipantInfo_Kind.EGRESS },
    });

    const res = await POST(req);

    expect(db.insert).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it("inserts attendee when participant joins", async () => {
    (db.select as jest.Mock)
      .mockReturnValueOnce({
        from: () => ({
          where: () => [{ id: "room_123", userId: "user_1" }],
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: () => [{ recordingStatus: false }],
        }),
      });

    const req = mockRequest({
      event: "participant_joined",
      room: { name: "room_123" },
      participant: {
        kind: "STANDARD",
        identity: "Dan",
      },
    });

    const res = await POST(req);

    expect(db.insert).toHaveBeenCalled();
    expect(res.status).toBe(200);

    const insertCall = (db.insert as jest.Mock).mock.results[0].value;

    expect(insertCall.values).toHaveBeenCalledWith({
      meetingId: "room_123",
      name: "Dan",
      initials: "D",
    });

    const valuesCall = insertCall.values.mock.results[0].value;
    expect(valuesCall.onConflictDoNothing).toHaveBeenCalled();
  });

  it("credits user storage on first egress_ended", async () => {
    const recordingUpdate = {
      set: jest.fn(() => ({
        where: jest.fn(() => ({
          returning: jest.fn(() => Promise.resolve([{ userId: "user_1" }])),
        })),
      })),
    };
    const storageUpdate = { set: jest.fn(() => ({ where: jest.fn() })) };
    const txUpdate = jest
      .fn()
      .mockReturnValueOnce(recordingUpdate)
      .mockReturnValueOnce(storageUpdate);
    (db.transaction as jest.Mock).mockImplementationOnce(
      async (fn: (tx: { update: jest.Mock }) => Promise<unknown>) =>
        fn({ update: txUpdate })
    );

    const req = mockRequest({
      event: "egress_ended",
      egressInfo: {
        roomName: "room_123",
        fileResults: [{ size: 12345 }],
      },
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(txUpdate).toHaveBeenCalledTimes(2);
    expect(recordingUpdate.set).toHaveBeenCalledWith({ recordingSize: 12345 });
    expect(storageUpdate.set).toHaveBeenCalled();
  });

  it("skips storage update on duplicate egress_ended", async () => {
    const recordingUpdate = {
      set: jest.fn(() => ({
        where: jest.fn(() => ({
          returning: jest.fn(() => Promise.resolve([])),
        })),
      })),
    };
    const storageUpdate = { set: jest.fn(() => ({ where: jest.fn() })) };
    const txUpdate = jest
      .fn()
      .mockReturnValueOnce(recordingUpdate)
      .mockReturnValueOnce(storageUpdate);
    (db.transaction as jest.Mock).mockImplementationOnce(
      async (fn: (tx: { update: jest.Mock }) => Promise<unknown>) =>
        fn({ update: txUpdate })
    );

    const req = mockRequest({
      event: "egress_ended",
      egressInfo: {
        roomName: "room_123",
        fileResults: [{ size: 12345 }],
      },
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(txUpdate).toHaveBeenCalledTimes(1);
    expect(storageUpdate.set).not.toHaveBeenCalled();
  });

  it("skips transaction when egress_ended has no file size", async () => {
    const req = mockRequest({
      event: "egress_ended",
      egressInfo: { roomName: "room_123", fileResults: [] },
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("does not duplicate attendee on reconnect", async () => {
    (db.select as jest.Mock)
      .mockReturnValueOnce({
        from: () => ({
          where: () => [{ id: "room_123", userId: "user_1" }],
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: () => [{ recordingStatus: false }],
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: () => [{ id: "room_123", userId: "user_1" }],
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: () => [{ recordingStatus: false }],
        }),
      });

    const req = mockRequest({
      event: "participant_joined",
      room: { name: "room_123" },
      participant: {
        kind: "STANDARD",
        identity: "Dan",
      },
    });

    // First join
    await POST(req);
    // Second join (reconnect)
    await POST(req);

    expect(db.insert).toHaveBeenCalledTimes(2);

    for (const result of (db.insert as jest.Mock).mock.results) {
      const valuesCall = result.value.values.mock.results[0].value;
      expect(valuesCall.onConflictDoNothing).toHaveBeenCalled();
    }
  });
});
