import { POST } from "@/app/api/webhooks/livekit/route";
import { db } from "@db/db";
import { NextRequest } from "next/server";

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
        where: jest.fn(() => []),
      })),
    })),
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        onConflictDoNothing: jest.fn(),
      })),
    })),
  },
}));

// livekit mock
jest.mock("livekit-server-sdk", () => ({
  EgressClient: jest.fn().mockImplementation(() => ({
    startParticipantEgress: jest.fn(),
  })),
  EncodedFileOutput: jest.fn(),
}));

// Helper
function mockRequest<T>(body: T): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

describe("POST /api/webhooks/livekit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 if room is missing", async () => {
    const req = mockRequest({ event: "room_started" });

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("updates event to active on room_started", async () => {
    const req = mockRequest({
      event: "room_started",
      room: { name: "room_123" },
    });

    const res = await POST(req);

    expect(db.update).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it("updates duration and status on room_finished", async () => {
    (db.select as jest.Mock).mockReturnValueOnce({
      from: () => ({
        where: () => [{ id: "room_123", duration: 10 }],
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
      participant: { kind: "EGRESS" },
    });

    const res = await POST(req);

    expect(db.insert).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it("inserts attendee when participant joins", async () => {
    (db.select as jest.Mock).mockReturnValueOnce({
      from: () => ({
        where: () => [{ id: "room_123", userId: "user_1" }],
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

  it("does not duplicate attendee on reconnect", async () => {
    (db.select as jest.Mock)
      .mockReturnValueOnce({
        from: () => ({
          where: () => [{ id: "room_123", userId: "user_1" }],
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: () => [{ id: "room_123", userId: "user_1" }],
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
