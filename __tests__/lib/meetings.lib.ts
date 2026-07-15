import {
  analyzeMeetingTranscript,
  createInstantMeeting,
  createMeetingToken,
  getRecordingUrl,
  getTranscript,
  handleEgressEnded,
  handleParticipantJoined,
  handleRoomFinished,
  handleRoomStarted,
  markActionItemAdded,
  meetingTranscriptSemanticSearch,
  startMeeting,
} from "@/lib/workspace/meetings";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  canonicalMeetingRow,
  makeFakeMeetingsDb,
} from "../fakes/fake_meetings_db";
import { makeFakeOpenAIClient } from "../fakes/fake_openai_client";
import { makeFakeStorageClient } from "../fakes/fake_storage_client";
import { makeFakeLiveKitClient } from "../fakes/fake_livekit_client";
import { makeFakeBillingDb } from "../fakes/fake_billing_db";
import { makeFakePlanLimitsDb } from "../fakes/fake_plan_limits_db";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/supabase/supabase", () => ({
  RECORDINGS_BUCKET: "recording",
}));

const meetingsDb = makeFakeMeetingsDb();
const openaiClient = makeFakeOpenAIClient();
const storage = makeFakeStorageClient();
const livekit = makeFakeLiveKitClient();
const billingDb = makeFakeBillingDb();
const planLimitsDb = makeFakePlanLimitsDb();

const mockUser = { id: "user_1" };

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  (getCurrentUser as Mock).mockResolvedValue(mockUser);
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ─── startMeeting ─────────────────────────────────────────────────────────

describe("startMeeting", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(startMeeting("evt-1", meetingsDb)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("marks the event active for the current user", async () => {
    await startMeeting("evt-1", meetingsDb);
    expect(meetingsDb.setEventStatus).toHaveBeenCalledWith(
      "evt-1",
      "user_1",
      "active"
    );
  });
});

// ─── createInstantMeeting ─────────────────────────────────────────────────

describe("createInstantMeeting", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(createInstantMeeting("standup", meetingsDb)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("inserts an event and returns { id, link } where link contains the id", async () => {
    const result = await createInstantMeeting("Weekly Sync", meetingsDb);

    expect(meetingsDb.insertEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Weekly Sync",
        userId: "user_1",
        isMeeting: true,
      })
    );
    expect(result).toHaveProperty("id");
    expect(result.link).toContain(result.id);
  });
});

// ─── markActionItemAdded ──────────────────────────────────────────────────

describe("markActionItemAdded", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(markActionItemAdded("evt-1", 0, meetingsDb)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("returns early when event has no actionItems", async () => {
    meetingsDb.getActionItems.mockResolvedValueOnce([{ actionItems: null }]);
    await markActionItemAdded("evt-1", 0, meetingsDb);
    expect(meetingsDb.setActionItems).not.toHaveBeenCalled();
  });

  it("marks item at the given index as added: true and leaves others unchanged", async () => {
    meetingsDb.getActionItems.mockResolvedValueOnce([
      {
        actionItems: [
          {
            task: "a",
            owner: "Dan",
            dueDate: null,
            completed: false,
            added: false,
          },
          {
            task: "b",
            owner: "Dan",
            dueDate: null,
            completed: false,
            added: false,
          },
        ],
      },
    ]);
    await markActionItemAdded("evt-1", 1, meetingsDb);

    expect(meetingsDb.setActionItems).toHaveBeenCalledWith("evt-1", "user_1", [
      {
        task: "a",
        owner: "Dan",
        dueDate: null,
        completed: false,
        added: false,
      },
      { task: "b", owner: "Dan", dueDate: null, completed: false, added: true },
    ]);
  });
});

// ─── meetingTranscriptSemanticSearch ──────────────────────────────────────

describe("meetingTranscriptSemanticSearch", () => {
  it("returns ['Unauthorized'] when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    const result = await meetingTranscriptSemanticSearch(
      "query",
      meetingsDb,
      openaiClient,
      storage
    );
    expect(result).toEqual(["Unauthorized"]);
  });

  it("returns empty array when there is no latest meeting", async () => {
    meetingsDb.getLatestMeeting.mockResolvedValueOnce([]);
    const result = await meetingTranscriptSemanticSearch(
      "query",
      meetingsDb,
      openaiClient,
      storage
    );
    expect(result).toEqual([]);
    expect(storage.queryVectors).not.toHaveBeenCalled();
  });

  it("filters by user_id only (room is post-filtered, not sent to the API)", async () => {
    storage.queryVectors.mockResolvedValueOnce([]);
    await meetingTranscriptSemanticSearch(
      "test query",
      meetingsDb,
      openaiClient,
      storage
    );
    expect(storage.queryVectors).toHaveBeenCalledWith(
      "recording",
      "transcription",
      expect.objectContaining({ filter: { user_id: "user_1" } })
    );
  });

  it("returns chunk_text only for hits belonging to the latest meeting room", async () => {
    storage.queryVectors.mockResolvedValueOnce([
      { metadata: { chunk_text: "Hello world", room: "evt-1" } },
      { metadata: { chunk_text: "Other meeting", room: "evt-other" } },
      { metadata: { chunk_text: "Second chunk", room: "evt-1" } },
    ]);
    const result = await meetingTranscriptSemanticSearch(
      "test query",
      meetingsDb,
      openaiClient,
      storage
    );
    expect(openaiClient.createEmbedding).toHaveBeenCalledWith("test query");
    expect(result).toEqual(["Hello world", "Second chunk"]);
  });

  it("returns empty array when no hits have chunk_text", async () => {
    storage.queryVectors.mockResolvedValueOnce([
      { metadata: { room: "evt-1" } },
      { metadata: { other: "data", room: "evt-1" } },
    ]);
    const result = await meetingTranscriptSemanticSearch(
      "test query",
      meetingsDb,
      openaiClient,
      storage
    );
    expect(result).toEqual([]);
  });
});

// ─── getRecordingUrl ──────────────────────────────────────────────────────

describe("getRecordingUrl", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(getRecordingUrl("evt-1", meetingsDb, storage)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("returns null when the meeting is not found", async () => {
    meetingsDb.getEventIdForUser.mockResolvedValueOnce([]);
    await expect(
      getRecordingUrl("ghost", meetingsDb, storage)
    ).resolves.toBeNull();
    expect(storage.getSignedUrl).not.toHaveBeenCalled();
  });

  it("returns the signed url for the composite recording", async () => {
    const result = await getRecordingUrl("evt-1", meetingsDb, storage);
    expect(storage.getSignedUrl).toHaveBeenCalledWith(
      "recording",
      "recordings/user_1/evt-1/composite.mp4",
      3600
    );
    expect(result).toEqual({ url: "https://cdn/signed-url" });
  });
});

// ─── getTranscript ────────────────────────────────────────────────────────

describe("getTranscript", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(getTranscript("evt-1", meetingsDb)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("returns null when the meeting has not started", async () => {
    meetingsDb.getMeetingStartTime.mockResolvedValueOnce([
      { id: "evt-1", meetingStartTimeEpoch: null },
    ]);
    await expect(getTranscript("evt-1", meetingsDb)).resolves.toBeNull();
  });

  it("returns the transcript chunks", async () => {
    const result = await getTranscript("evt-1", meetingsDb);
    expect(result?.chunks).toHaveLength(1);
    expect(result?.meetingStartTimeEpoch).toBe(1_700_000_000);
  });
});

// ─── createMeetingToken ───────────────────────────────────────────────────

describe("createMeetingToken", () => {
  it("returns not-found for a non-meeting event", async () => {
    meetingsDb.getEventByIdUnscoped.mockResolvedValueOnce([
      { ...canonicalMeetingRow, isMeeting: false },
    ]);
    await expect(
      createMeetingToken("evt-1", "Dan", meetingsDb, livekit)
    ).resolves.toEqual({ outcome: "not-found" });
  });

  it("returns not-found for an event that does not exist", async () => {
    meetingsDb.getEventByIdUnscoped.mockResolvedValueOnce([]);
    await expect(
      createMeetingToken("ghost", "Dan", meetingsDb, livekit)
    ).resolves.toEqual({ outcome: "not-found" });
  });

  it("returns not-started when the meeting has not begun and isn't active", async () => {
    meetingsDb.getEventByIdUnscoped.mockResolvedValueOnce([
      {
        ...canonicalMeetingRow,
        dateTime: new Date(Date.now() + 60 * 60000),
        status: "upcoming",
      },
    ]);
    await expect(
      createMeetingToken("evt-1", "Dan", meetingsDb, livekit)
    ).resolves.toEqual({ outcome: "not-started" });
  });

  it("returns ended when the meeting window has passed", async () => {
    meetingsDb.getEventByIdUnscoped.mockResolvedValueOnce([
      {
        ...canonicalMeetingRow,
        dateTime: new Date(Date.now() - 60 * 60000),
        duration: 10,
        status: "ended",
      },
    ]);
    await expect(
      createMeetingToken("evt-1", "Dan", meetingsDb, livekit)
    ).resolves.toEqual({ outcome: "ended" });
  });

  it("issues a token and dispatches the transcription agent", async () => {
    meetingsDb.getEventByIdUnscoped.mockResolvedValueOnce([
      {
        ...canonicalMeetingRow,
        dateTime: new Date(Date.now() - 5 * 60000),
        duration: 30,
        status: "active",
      },
    ]);

    const result = await createMeetingToken(
      "evt-1",
      "Dan",
      meetingsDb,
      livekit
    );

    expect(result).toEqual(
      expect.objectContaining({ outcome: "ok", token: "jwt-token" })
    );
    expect(livekit.createToken).toHaveBeenCalledWith("Dan", "evt-1", 600);
    expect(livekit.dispatchAgent).toHaveBeenCalledWith(
      "evt-1",
      "transcription-agent"
    );
  });

  it("still issues a token when the agent dispatch fails", async () => {
    meetingsDb.getEventByIdUnscoped.mockResolvedValueOnce([
      {
        ...canonicalMeetingRow,
        dateTime: new Date(Date.now() - 5 * 60000),
        duration: 30,
        status: "active",
      },
    ]);
    livekit.dispatchAgent.mockRejectedValueOnce(new Error("dispatch down"));

    await expect(
      createMeetingToken("evt-1", "Dan", meetingsDb, livekit)
    ).resolves.toEqual(expect.objectContaining({ outcome: "ok" }));
  });
});

// ─── handleRoomStarted (LiveKit webhook) ──────────────────────────────────

describe("handleRoomStarted", () => {
  it("marks the room active and starts egress when recording is on", async () => {
    await handleRoomStarted(
      "evt-1",
      meetingsDb,
      livekit,
      planLimitsDb,
      billingDb
    );

    expect(meetingsDb.setRoomStatus).toHaveBeenCalledWith("evt-1", "active");
    expect(livekit.startCompositeEgress).toHaveBeenCalledWith(
      "evt-1",
      "recordings/user_1/evt-1/composite.mp4"
    );
    expect(meetingsDb.setMeetingStartEpoch).toHaveBeenCalled();
  });

  it("skips egress when one is already running", async () => {
    livekit.hasActiveEgress.mockResolvedValueOnce(true);

    await handleRoomStarted(
      "evt-1",
      meetingsDb,
      livekit,
      planLimitsDb,
      billingDb
    );

    expect(livekit.startCompositeEgress).not.toHaveBeenCalled();
  });

  it("skips egress when recording is off", async () => {
    meetingsDb.getMeetingOwnerWithRecordingStatus.mockResolvedValueOnce([
      { userId: "user_1", recordingStatus: false },
    ]);

    await handleRoomStarted(
      "evt-1",
      meetingsDb,
      livekit,
      planLimitsDb,
      billingDb
    );

    expect(livekit.startCompositeEgress).not.toHaveBeenCalled();
  });

  it("propagates the AI-limit error so the route can respond 200 without recording", async () => {
    planLimitsDb.getAiCredits.mockResolvedValueOnce([{ ai_credits: 999 }]);

    await expect(
      handleRoomStarted("evt-1", meetingsDb, livekit, planLimitsDb, billingDb)
    ).rejects.toThrow();
    expect(livekit.startCompositeEgress).not.toHaveBeenCalled();
  });
});

describe("handleRoomFinished", () => {
  it("marks the room ended with a derived duration and increments credits", async () => {
    const finishedAt = 1_700_000_600_000;
    const createdAt = 1_700_000_000_000;

    await handleRoomFinished("evt-1", finishedAt, createdAt, meetingsDb);

    expect(meetingsDb.markRoomFinished).toHaveBeenCalledWith("evt-1", 10);
    expect(meetingsDb.incrementAiCredits).toHaveBeenCalledWith("user_1");
  });

  it("falls back to the stored duration when timestamps are not finite", async () => {
    await handleRoomFinished("evt-1", NaN, NaN, meetingsDb);

    expect(meetingsDb.markRoomFinished).toHaveBeenCalledWith(
      "evt-1",
      canonicalMeetingRow.duration
    );
  });

  it("does nothing when the room row is missing", async () => {
    meetingsDb.getEventByIdUnscoped.mockResolvedValueOnce([]);

    await handleRoomFinished("ghost", 1, 2, meetingsDb);

    expect(meetingsDb.markRoomFinished).not.toHaveBeenCalled();
  });
});

describe("analyzeMeetingTranscript", () => {
  it("does nothing when there are no transcript chunks", async () => {
    meetingsDb.getTranscriptChunksFull.mockResolvedValueOnce([]);

    await analyzeMeetingTranscript("evt-1", meetingsDb, openaiClient);

    expect(openaiClient.createJsonCompletion).not.toHaveBeenCalled();
  });

  it("updates the event with the analysis and matched client id", async () => {
    openaiClient.createJsonCompletion.mockResolvedValueOnce(
      JSON.stringify({
        summary: "Discussed onboarding",
        key_points: ["Point A"],
        action_items: [],
        tags: ["onboarding"],
        client_id_guess: 1,
        document_requirements: [],
      })
    );

    await analyzeMeetingTranscript("evt-1", meetingsDb, openaiClient);

    expect(meetingsDb.updateMeetingAnalysis).toHaveBeenCalledWith(
      "evt-1",
      expect.objectContaining({
        aiSummary: "Discussed onboarding",
        hasTranscript: true,
        hasNotes: true,
        clientId: 1,
      })
    );
  });

  it("ignores a client_id_guess that doesn't match any known client", async () => {
    openaiClient.createJsonCompletion.mockResolvedValueOnce(
      JSON.stringify({ client_id_guess: 999, document_requirements: [] })
    );

    await analyzeMeetingTranscript("evt-1", meetingsDb, openaiClient);

    const call = meetingsDb.updateMeetingAnalysis.mock.calls[0][1];
    expect(call).not.toHaveProperty("clientId");
  });

  it("inserts a document request when requirements are present", async () => {
    openaiClient.createJsonCompletion.mockResolvedValueOnce(
      JSON.stringify({
        document_requirements: [{ name: "Passport", description: "ID doc" }],
      })
    );

    await analyzeMeetingTranscript("evt-1", meetingsDb, openaiClient);

    expect(meetingsDb.insertDocumentRequestWithItems).toHaveBeenCalledWith(
      "evt-1",
      null,
      "user_1",
      [{ name: "Passport", description: "ID doc" }]
    );
  });

  it("skips the document request when there are no valid requirements", async () => {
    openaiClient.createJsonCompletion.mockResolvedValueOnce(
      JSON.stringify({ document_requirements: [{ name: "  " }] })
    );

    await analyzeMeetingTranscript("evt-1", meetingsDb, openaiClient);

    expect(meetingsDb.insertDocumentRequestWithItems).not.toHaveBeenCalled();
  });

  it("does nothing when the meeting owner cannot be found", async () => {
    meetingsDb.getMeetingOwner.mockResolvedValueOnce([]);

    await analyzeMeetingTranscript("evt-1", meetingsDb, openaiClient);

    expect(openaiClient.createJsonCompletion).not.toHaveBeenCalled();
  });
});

describe("handleEgressEnded", () => {
  it("credits storage when the total size is positive", async () => {
    await handleEgressEnded("evt-1", 12345, meetingsDb);
    expect(meetingsDb.creditRecordingStorage).toHaveBeenCalledWith(
      "evt-1",
      12345
    );
  });

  it("skips crediting when the total size is zero", async () => {
    await handleEgressEnded("evt-1", 0, meetingsDb);
    expect(meetingsDb.creditRecordingStorage).not.toHaveBeenCalled();
  });
});

describe("handleParticipantJoined", () => {
  it("inserts the attendee", async () => {
    await handleParticipantJoined("evt-1", "Dan", meetingsDb);
    expect(meetingsDb.insertAttendee).toHaveBeenCalledWith("evt-1", "Dan");
  });
});
