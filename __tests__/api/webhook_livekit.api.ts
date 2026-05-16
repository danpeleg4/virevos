import { POST } from "@/app/api/webhooks/livekit/route";
import { db } from "@db/db";
import { NextRequest } from "next/server";
import { ParticipantInfo_Kind } from "@livekit/protocol";
import { assertCanUseAI } from "@/lib/plan_limits";

vi.mock("next/server", async () => ({
  ...(await vi.importActual<typeof import("next/server")>("next/server")),
  after: vi.fn(),
}));

vi.mock("@/lib/plan_limits", () => ({
  assertCanUseAI: vi.fn(),
}));

// db mock
vi.mock("@db/db", () => ({
  db: {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => []),
        })),
        where: vi.fn(() => []),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn(),
      })),
    })),
    transaction: vi.fn(),
  },
}));

// livekit mock
const { mockReceive } = vi.hoisted(() => ({ mockReceive: vi.fn() }));

vi.mock("livekit-server-sdk", () => ({
  EgressClient: vi.fn(function () {
    return { startParticipantEgress: vi.fn() };
  }),
  EncodedFileOutput: vi.fn(),
  WebhookReceiver: vi.fn(function () {
    return { receive: mockReceive };
  }),
  __receiveFn: mockReceive,
}));

// Helper
function mockRequest<T>(event: T, authHeader = "valid-token"): NextRequest {
  return {
    text: vi.fn().mockResolvedValue(JSON.stringify(event)),
    headers: { get: vi.fn().mockReturnValue(authHeader) },
  } as unknown as NextRequest;
}

describe("POST /api/webhooks/livekit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    (db.select as Mock).mockReturnValueOnce({
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
    (db.select as Mock).mockReturnValueOnce({
      from: () => ({
        innerJoin: () => ({
          where: () => [{ userId: "user_1", recordingStatus: true }],
        }),
      }),
    });
    (assertCanUseAI as Mock).mockRejectedValueOnce(
      new Error("AI limit reached")
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

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
    (db.select as Mock)
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
    (db.select as Mock)
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

    const insertCall = (db.insert as Mock).mock.results[0].value;

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
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ userId: "user_1" }])),
        })),
      })),
    };
    const storageUpdate = { set: vi.fn(() => ({ where: vi.fn() })) };
    const txUpdate = vi
      .fn()
      .mockReturnValueOnce(recordingUpdate)
      .mockReturnValueOnce(storageUpdate);
    (db.transaction as Mock).mockImplementationOnce(
      async (fn: (tx: { update: Mock }) => Promise<unknown>) =>
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
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([])),
        })),
      })),
    };
    const storageUpdate = { set: vi.fn(() => ({ where: vi.fn() })) };
    const txUpdate = vi
      .fn()
      .mockReturnValueOnce(recordingUpdate)
      .mockReturnValueOnce(storageUpdate);
    (db.transaction as Mock).mockImplementationOnce(
      async (fn: (tx: { update: Mock }) => Promise<unknown>) =>
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
    (db.select as Mock)
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

    for (const result of (db.insert as Mock).mock.results) {
      const valuesCall = result.value.values.mock.results[0].value;
      expect(valuesCall.onConflictDoNothing).toHaveBeenCalled();
    }
  });
});
