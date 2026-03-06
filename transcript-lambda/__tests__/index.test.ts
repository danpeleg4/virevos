// These must be var so they're hoisted and available inside jest.mock factories
/* eslint-disable no-var */
var mockS3Send: jest.Mock;
var mockUpsertRecords: jest.Mock;
var mockNamespace: jest.Mock;
var mockPineconeIndex: jest.Mock;
var mockTranscriptionsCreate: jest.Mock;
var mockChatCreate: jest.Mock;
var mockExecAsync: jest.Mock;
/* eslint-enable no-var */

jest.mock("@aws-sdk/client-s3", () => {
  mockS3Send = jest.fn();
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send: mockS3Send })),
    GetObjectCommand: jest.fn().mockImplementation((p: object) => ({ _type: "Get", ...p })),
    PutObjectCommand: jest.fn().mockImplementation((p: object) => ({ _type: "Put", ...p })),
    ListObjectsV2Command: jest.fn().mockImplementation((p: object) => ({ _type: "List", ...p })),
  };
});

jest.mock("openai", () => {
  mockTranscriptionsCreate = jest.fn();
  mockChatCreate = jest.fn();
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      audio: { transcriptions: { create: mockTranscriptionsCreate } },
      chat: { completions: { create: mockChatCreate } },
    })),
  };
});

jest.mock("@pinecone-database/pinecone", () => {
  mockUpsertRecords = jest.fn().mockResolvedValue(undefined);
  mockNamespace = jest.fn().mockReturnValue({ upsertRecords: mockUpsertRecords });
  mockPineconeIndex = jest.fn().mockReturnValue({ namespace: mockNamespace });
  return {
    Pinecone: jest.fn().mockImplementation(() => ({ index: mockPineconeIndex })),
  };
});

jest.mock("@repo/db/db", () => ({
  db: { update: jest.fn() },
}));

jest.mock("@repo/db/schema", () => ({
  events: {},
}));

jest.mock("drizzle-orm", () => ({
  eq: jest.fn().mockReturnValue("eq-result"),
}));

jest.mock("stream", () => {
  const actual = jest.requireActual("stream");
  return {
    ...actual,
    pipeline: jest.fn(
      (_src: unknown, _dest: unknown, cb: (err: Error | null) => void) => cb(null)
    ),
  };
});

jest.mock("child_process", () => {
  mockExecAsync = jest.fn().mockResolvedValue({ stdout: "", stderr: "" });
  const mockExec: jest.Mock & Record<symbol, jest.Mock> = Object.assign(
    jest.fn((_cmd: string, cb: (err: Error | null, stdout: string, stderr: string) => void) =>
      cb(null, "", "")
    ),
    { [Symbol.for("nodejs.util.promisify.custom")]: mockExecAsync }
  );
  return { exec: mockExec };
});

jest.mock("fs", () => ({
  createWriteStream: jest.fn().mockReturnValue({}),
  createReadStream: jest.fn().mockReturnValue({}),
  existsSync: jest.fn().mockReturnValue(false),
  unlinkSync: jest.fn(),
}));

import { Readable } from "stream";
import { handler, normalizeDueDate, streamToString } from "../src";
import { db } from "@repo/db/db";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeJsonStream(data: object): Readable {
  const r = new Readable({ read() {} });
  r.push(JSON.stringify(data));
  r.push(null);
  return r;
}

function mockDbUpdate() {
  const mockWhere = jest.fn().mockResolvedValue(undefined);
  const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
  (db.update as jest.Mock).mockReturnValue({ set: mockSet });
  return { mockSet, mockWhere };
}

// ─── normalizeDueDate ────────────────────────────────────────────────────────

describe("normalizeDueDate", () => {
  it.each([
    [null, null],
    [undefined, null],
    ["", null],
    ["null", null],
    ["  ", null],
    [" null ", null],
    [123, null],
    [true, null],
  ])("returns null for falsy/invalid input: %p", (input, expected) => {
    expect(normalizeDueDate(input)).toBe(expected);
  });

  it("returns the date string unchanged for a valid YYYY-MM-DD", () => {
    expect(normalizeDueDate("2026-03-15")).toBe("2026-03-15");
  });

  it("returns null for a YYYY-MM-DD string with an invalid date", () => {
    expect(normalizeDueDate("2026-13-45")).toBeNull();
  });

  it("returns null for a non-date string", () => {
    expect(normalizeDueDate("not a date")).toBeNull();
  });

  it("trims whitespace before checking a valid date", () => {
    expect(normalizeDueDate("  2026-03-15  ")).toBe("2026-03-15");
  });
});

// ─── streamToString ──────────────────────────────────────────────────────────

describe("streamToString", () => {
  it("resolves with the stream content as a string", async () => {
    const r = new Readable({ read() {} });
    r.push("hello ");
    r.push("world");
    r.push(null);

    const result = await streamToString(r);
    expect(result).toBe("hello world");
  });

  it("rejects when the stream emits an error", async () => {
    const r = new Readable({ read() {} });
    const error = new Error("stream failure");
    setImmediate(() => r.emit("error", error));

    await expect(streamToString(r)).rejects.toThrow("stream failure");
  });
});

// ─── handler ─────────────────────────────────────────────────────────────────

describe("handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function makeEvent(key: string, bucket = "virevos-recording") {
    return { Records: [{ s3: { bucket: { name: bucket }, object: { key } } }] };
  }

  // Set up the sequential S3 send mocks for a single-participant recording
  function setupValidRecordingMocks() {
    mockS3Send
      // 1. ListObjectsV2 prefix scan (with Delimiter)
      .mockResolvedValueOnce({
        CommonPrefixes: [{ Prefix: "recordings/user1/room1/participant1/" }],
      })
      // 2. ListObjectsV2 in waitForMainJson
      .mockResolvedValueOnce({
        Contents: [{ Key: "recordings/user1/room1/main.json" }],
      })
      // 3. GetObject main.json
      .mockResolvedValueOnce({
        Body: makeJsonStream({ started_at: "1700000000000000000" }),
      })
      // 4. ListObjectsV2 participant1 folder
      .mockResolvedValueOnce({
        Contents: [
          { Key: "recordings/user1/room1/participant1/audio.mp4" },
          { Key: "recordings/user1/room1/participant1/meta.json" },
        ],
      })
      // 5. GetObject mp4
      .mockResolvedValueOnce({ Body: new Readable({ read() { this.push(null); } }) })
      // 6. GetObject participant json
      .mockResolvedValueOnce({
        Body: makeJsonStream({
          started_at: "1700000000000000000",
          ended_at: "1700060000000000000",
        }),
      })
      // 7. PutObject result json
      .mockResolvedValueOnce({});

    mockTranscriptionsCreate.mockResolvedValue({
      text: "Hello world",
      segments: [{ speaker: "Speaker_0", start: 0, end: 5, text: "Hello world" }],
    });

    mockChatCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary: "Test meeting",
              key_points: ["point 1"],
              action_items: [
                { task: "Do something", owner: "Alice", dueDate: "2026-03-15", completed: false },
              ],
              tags: ["test"],
            }),
          },
        },
      ],
    });
  }

  it("skips pinecone and db for a non-recordings key", async () => {
    mockS3Send
      .mockResolvedValueOnce({ CommonPrefixes: [] })
      .mockResolvedValueOnce({ Contents: [{ Key: "other/user1/room1/main.json" }] })
      .mockResolvedValueOnce({ Body: makeJsonStream({ started_at: "1700000000000000000" }) });

    await handler(makeEvent("other/user1/room1/file.mp4"));

    expect(mockUpsertRecords).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("processes a valid recording: upserts to Pinecone and updates DB", async () => {
    setupValidRecordingMocks();
    mockDbUpdate();

    await handler(makeEvent("recordings/user1/room1/file.mp4"));

    expect(mockUpsertRecords).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ chunk_text: "Hello world", speaker: "participant1" }),
      ])
    );
    expect(db.update).toHaveBeenCalled();
  });

  it("uploads the result JSON to S3 with the correct key", async () => {
    setupValidRecordingMocks();
    mockDbUpdate();

    await handler(makeEvent("recordings/user1/room1/file.mp4"));

    const putCall = mockS3Send.mock.calls.find((c) => c[0]._type === "Put");
    expect(putCall).toBeDefined();
    expect(putCall![0]).toMatchObject({
      Bucket: "vire-json",
      Key: expect.stringContaining("user1/room1"),
    });
  });

  it("calls OpenAI chat with the full transcript", async () => {
    setupValidRecordingMocks();
    mockDbUpdate();

    await handler(makeEvent("recordings/user1/room1/file.mp4"));

    expect(mockChatCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o",
        response_format: { type: "json_object" },
      })
    );
  });

  it("catches and logs errors from the inner processing loop without throwing", async () => {
    mockS3Send
      .mockResolvedValueOnce({ CommonPrefixes: [{ Prefix: "recordings/user1/room1/p1/" }] })
      .mockResolvedValueOnce({ Contents: [{ Key: "recordings/user1/room1/main.json" }] })
      .mockResolvedValueOnce({ Body: makeJsonStream({ started_at: "1700000000000000000" }) })
      .mockResolvedValueOnce({
        Contents: [
          { Key: "recordings/user1/room1/p1/audio.mp4" },
          { Key: "recordings/user1/room1/p1/meta.json" },
        ],
      })
      .mockResolvedValueOnce({ Body: new Readable({ read() { this.push(null); } }) })
      .mockResolvedValueOnce({ Body: makeJsonStream({ started_at: "1700000000000000000", ended_at: "1700060000000000000" }) });

    mockTranscriptionsCreate.mockRejectedValue(new Error("Transcription failed"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      handler(makeEvent("recordings/user1/room1/file.mp4"))
    ).resolves.not.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Error processing"),
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });
});
