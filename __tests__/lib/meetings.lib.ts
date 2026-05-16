import {
  createInstantMeeting,
  markActionItemAdded,
  getPastMeetingTranscript,
} from "@/lib/meetings";
import { currentUser } from "@clerk/nextjs/server";

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

// var so it can be assigned inside the vi.mock factory (hoisted before const declarations)
/* eslint-disable no-var */
var mockQueryVectors: Mock;
var mockCreateEmbedding: Mock;
/* eslint-enable no-var */

vi.mock("@/lib/embeddings", () => {
  mockQueryVectors = vi.fn();
  mockCreateEmbedding = vi.fn().mockResolvedValue([0.1, 0.2, 0.3]);
  return {
    TRANSCRIPT_BUCKET: "recording",
    TRANSCRIPT_INDEX: "transcription",
    createEmbedding: mockCreateEmbedding,
    supabaseVector: {
      storage: {
        vectors: {
          from: () => ({ index: () => ({ queryVectors: mockQueryVectors }) }),
        },
      },
    },
  };
});

const mockUpdateWhere = vi.fn();
const mockSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockValues = vi.fn();
const mockSelectWhere = vi.fn();
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere }));
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));

vi.mock("@db/db", () => ({
  db: {
    insert: vi.fn(() => ({ values: mockValues })),
    select: (...args: any[]) => mockSelect.apply(null, args),
    update: vi.fn(() => ({ set: mockSet })),
  },
}));

const mockUser = { id: "user_1" };

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateWhere.mockResolvedValue(undefined);
  mockSet.mockReturnValue({ where: mockUpdateWhere });
  mockValues.mockResolvedValue(undefined);
  mockSelectWhere.mockResolvedValue([]);
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  mockSelect.mockReturnValue({ from: mockSelectFrom });
});

// ─── createInstantMeeting ─────────────────────────────────────────────────

describe("createInstantMeeting", () => {
  it("throws when unauthenticated", async () => {
    (currentUser as Mock).mockResolvedValue(null);
    await expect(createInstantMeeting("standup")).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("inserts an event and returns { id, link } where link contains the id", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    const result = await createInstantMeeting("Weekly Sync");

    expect(mockValues).toHaveBeenCalledWith(
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
    (currentUser as Mock).mockResolvedValue(null);
    await expect(markActionItemAdded("evt-1", 0)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("returns early when event has no action_items", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockResolvedValueOnce([{ action_items: null }]);
    await markActionItemAdded("evt-1", 0);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("marks item at the given index as added: true and leaves others unchanged", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    const items = [
      { text: "a", added: false },
      { text: "b", added: false },
    ];
    mockSelectWhere.mockResolvedValueOnce([{ action_items: items }]);
    await markActionItemAdded("evt-1", 1);

    expect(mockSet).toHaveBeenCalledWith({
      action_items: [
        { text: "a", added: false },
        { text: "b", added: true },
      ],
    });
  });
});

// ─── getPastMeetingTranscript ─────────────────────────────────────────────

describe("getPastMeetingTranscript", () => {
  it("returns ['Unauthorized'] when unauthenticated", async () => {
    (currentUser as Mock).mockResolvedValue(null);
    const result = await getPastMeetingTranscript("query");
    expect(result).toEqual(["Unauthorized"]);
  });

  it("returns array of chunk_text strings from Supabase vector hits", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockQueryVectors.mockResolvedValueOnce({
      data: {
        vectors: [
          { metadata: { chunk_text: "Hello world" } },
          { metadata: { chunk_text: "Second chunk" } },
        ],
      },
    });
    const result = await getPastMeetingTranscript("test query");
    expect(mockCreateEmbedding).toHaveBeenCalledWith("test query");
    expect(result).toEqual(["Hello world", "Second chunk"]);
  });

  it("returns empty array when no hits have chunk_text", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockQueryVectors.mockResolvedValueOnce({
      data: { vectors: [{ metadata: {} }, { metadata: { other: "data" } }] },
    });
    const result = await getPastMeetingTranscript("test query");
    expect(result).toEqual([]);
  });
});
