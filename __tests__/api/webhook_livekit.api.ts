import { POST } from "@/app/api/webhooks/livekit/route";
import { NextRequest } from "next/server";
import { ParticipantInfo_Kind } from "@livekit/protocol";
import {
  analyzeMeetingTranscript,
  handleEgressEnded,
  handleParticipantJoined,
  handleRoomFinished,
  handleRoomStarted,
} from "@/lib/workspace/meetings";
import { meetingsDrizzle } from "@db/classes/meetings_db";
import { planLimitsDrizzle } from "@db/classes/plan_limits_db";
import { billingDrizzle } from "@db/classes/billing_db";
import { liveKitClient } from "@/api_client/livekit_client";
import { openAIClient } from "@/api_client/openai_client";

vi.mock("next/server", async () => ({
  ...(await vi.importActual<typeof import("next/server")>("next/server")),
  after: (fn: () => unknown) => fn(),
}));

vi.mock("@/lib/workspace/meetings", () => ({
  analyzeMeetingTranscript: vi.fn(),
  handleEgressEnded: vi.fn(),
  handleParticipantJoined: vi.fn(),
  handleRoomFinished: vi.fn(),
  handleRoomStarted: vi.fn(),
}));

vi.mock("@db/classes/meetings_db", () => ({
  meetingsDrizzle: { __sentinel: "meetingsDrizzle" },
}));

vi.mock("@db/classes/plan_limits_db", () => ({
  planLimitsDrizzle: { __sentinel: "planLimitsDrizzle" },
}));

vi.mock("@db/classes/billing_db", () => ({
  billingDrizzle: { __sentinel: "billingDrizzle" },
}));

const mockReceive = vi.fn();
vi.mock("@/api_client/livekit_client", () => ({
  liveKitClient: {
    receiveWebhook: (...args: unknown[]) => mockReceive(...args),
  },
}));

vi.mock("@/api_client/openai_client", () => ({
  openAIClient: { __sentinel: "openAIClient" },
}));

function mockRequest<T>(event: T, authHeader = "valid-token"): NextRequest {
  return {
    text: vi.fn().mockResolvedValue(JSON.stringify(event)),
    headers: { get: vi.fn().mockReturnValue(authHeader) },
  } as unknown as NextRequest;
}

describe("POST /api/webhooks/livekit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReceive.mockImplementation((body: string) =>
      Promise.resolve(JSON.parse(body))
    );
    (handleRoomStarted as Mock).mockResolvedValue(undefined);
    (handleRoomFinished as Mock).mockResolvedValue(undefined);
    (analyzeMeetingTranscript as Mock).mockResolvedValue(undefined);
    (handleEgressEnded as Mock).mockResolvedValue(undefined);
    (handleParticipantJoined as Mock).mockResolvedValue(undefined);
  });

  it("returns 401 if authorization fails", async () => {
    mockReceive.mockRejectedValueOnce(new Error("invalid token"));
    const req = mockRequest({ event: "room_started", room: { name: "r1" } });

    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(handleRoomStarted).not.toHaveBeenCalled();
  });

  it("returns 400 if room is missing", async () => {
    const req = mockRequest({ event: "room_started" });

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(handleRoomStarted).not.toHaveBeenCalled();
  });

  it("dispatches room_started to handleRoomStarted with the wired deps", async () => {
    const req = mockRequest({
      event: "room_started",
      room: { name: "room_123" },
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(handleRoomStarted).toHaveBeenCalledWith(
      "room_123",
      meetingsDrizzle,
      liveKitClient,
      planLimitsDrizzle,
      billingDrizzle
    );
  });

  it("returns 200 early when the AI limit is reached on room_started", async () => {
    (handleRoomStarted as Mock).mockRejectedValueOnce(
      new Error("AI limit reached")
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const req = mockRequest({
      event: "room_started",
      room: { name: "room_123" },
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    warnSpy.mockRestore();
  });

  it("dispatches room_finished to handleRoomFinished and schedules the analysis", async () => {
    const req = mockRequest({
      event: "room_finished",
      createdAt: 1_700_000_600_000,
      room: {
        name: "room_123",
        creationTimeMs: 1_700_000_000_000,
      },
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(handleRoomFinished).toHaveBeenCalledWith(
      "room_123",
      1_700_000_600_000,
      1_700_000_000_000,
      meetingsDrizzle
    );
    expect(analyzeMeetingTranscript).toHaveBeenCalledWith(
      "room_123",
      meetingsDrizzle,
      openAIClient
    );
  });

  it("returns early for EGRESS participant", async () => {
    const req = mockRequest({
      event: "participant_joined",
      room: { name: "room_123" },
      participant: { kind: ParticipantInfo_Kind.EGRESS },
    });

    const res = await POST(req);

    expect(handleParticipantJoined).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it("dispatches participant_joined to handleParticipantJoined", async () => {
    const req = mockRequest({
      event: "participant_joined",
      room: { name: "room_123" },
      participant: {
        kind: "STANDARD",
        identity: "Dan",
      },
    });

    const res = await POST(req);

    expect(handleParticipantJoined).toHaveBeenCalledWith(
      "room_123",
      "Dan",
      meetingsDrizzle
    );
    expect(res.status).toBe(200);
  });

  it("dispatches egress_ended to handleEgressEnded with the summed file size", async () => {
    const req = mockRequest({
      event: "egress_ended",
      egressInfo: {
        roomName: "room_123",
        fileResults: [{ size: 12345 }],
      },
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(handleEgressEnded).toHaveBeenCalledWith(
      "room_123",
      12345,
      meetingsDrizzle
    );
  });
});
