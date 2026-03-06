import {
  createInstantMeeting,
  markActionItemAdded,
  getPastMeetingTranscript,
} from "@/lib/server_actions/meetings";
import { currentUser } from "@clerk/nextjs/server";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

// var so it can be assigned inside the jest.mock factory (hoisted before const declarations)
/* eslint-disable no-var */
var mockSearchRecords: jest.Mock;
/* eslint-enable no-var */

jest.mock("@pinecone-database/pinecone", () => {
  mockSearchRecords = jest.fn();
  return {
    Pinecone: jest.fn().mockImplementation(() => ({
      index: () => ({
        namespace: () => ({ searchRecords: mockSearchRecords }),
      }),
    })),
  };
});

const mockUpdateWhere = jest.fn();
const mockSet = jest.fn(() => ({ where: mockUpdateWhere }));
const mockValues = jest.fn();
const mockSelectWhere = jest.fn();
const mockSelectFrom = jest.fn(() => ({ where: mockSelectWhere }));
const mockSelect = jest.fn(() => ({ from: mockSelectFrom }));

jest.mock("@db/db", () => ({
  db: {
    insert: jest.fn(() => ({ values: mockValues })),
    select: (...args: any[]) => mockSelect.apply(null, args),
    update: jest.fn(() => ({ set: mockSet })),
  },
}));

const mockUser = { id: "user_1" };

beforeEach(() => {
  jest.clearAllMocks();
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
    (currentUser as jest.Mock).mockResolvedValue(null);
    await expect(createInstantMeeting("standup")).rejects.toThrow("Unauthorized");
  });

  it("inserts an event and returns { id, link } where link contains the id", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    const result = await createInstantMeeting("Weekly Sync");

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Weekly Sync", userId: "user_1", isMeeting: true })
    );
    expect(result).toHaveProperty("id");
    expect(result.link).toContain(result.id);
  });
});

// ─── markActionItemAdded ──────────────────────────────────────────────────

describe("markActionItemAdded", () => {
  it("throws when unauthenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);
    await expect(markActionItemAdded("evt-1", 0)).rejects.toThrow("Unauthorized");
  });

  it("returns early when event has no action_items", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockResolvedValueOnce([{ action_items: null }]);
    await markActionItemAdded("evt-1", 0);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("marks item at the given index as added: true and leaves others unchanged", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
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
    (currentUser as jest.Mock).mockResolvedValue(null);
    const result = await getPastMeetingTranscript("query");
    expect(result).toEqual(["Unauthorized"]);
  });

  it("returns array of chunk_text strings from Pinecone hits", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockSearchRecords.mockResolvedValueOnce({
      result: {
        hits: [
          { fields: { chunk_text: "Hello world" } },
          { fields: { chunk_text: "Second chunk" } },
        ],
      },
    });
    const result = await getPastMeetingTranscript("test query");
    expect(result).toEqual(["Hello world", "Second chunk"]);
  });

  it("returns empty array when no hits have chunk_text", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockSearchRecords.mockResolvedValueOnce({
      result: { hits: [{ fields: {} }, { fields: { other: "data" } }] },
    });
    const result = await getPastMeetingTranscript("test query");
    expect(result).toEqual([]);
  });
});
