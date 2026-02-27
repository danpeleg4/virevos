import { GET } from "@/app/api/transcript/[id]/route";
import { currentUser } from "@clerk/nextjs/server";
import { S3Client } from "@aws-sdk/client-s3";
import { NextRequest } from "next/server";
import { Readable } from "stream";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  ListObjectsV2Command: jest.fn(),
  GetObjectCommand: jest.fn(),
}));

function mockCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeStream(data: string): Readable {
  return Readable.from(Buffer.from(data));
}

describe("GET /api/transcript/[id]", () => {
  // The route creates `const s3 = new S3Client(...)` at module level.
  // Capture the singleton instance's send mock once here.
  let mockSend: jest.Mock;

  beforeAll(() => {
    mockSend = (S3Client as jest.Mock).mock.results[0].value.send;
  });

  beforeEach(() => {
    mockSend.mockReset();
    (currentUser as jest.Mock).mockReset();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);

    const res = await GET({} as NextRequest, mockCtx("1"));

    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Unauthorized");
  });

  it("returns 400 if id is empty", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });

    const res = await GET({} as NextRequest, mockCtx(""));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid meetingId" });
  });

  it("returns 404 if S3 folder is empty", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    mockSend.mockResolvedValueOnce({ Contents: [] });

    const res = await GET({} as NextRequest, mockCtx("abc123_xyz"));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "No files found in folder" });
  });

  it("returns 404 if S3 folder has no JSON files", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    mockSend.mockResolvedValueOnce({
      Contents: [{ Key: "user_1/42/audio.mp3" }],
    });

    const res = await GET({} as NextRequest, mockCtx("abc123_xyz"));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "No JSON files found" });
  });

  it("returns 500 if S3 throws an error", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    mockSend.mockRejectedValueOnce(new Error("S3 unavailable"));

    const res = await GET({} as NextRequest, mockCtx("abc123_xyz"));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Failed to fetch JSON files from S3",
    });
  });

  it("returns parsed JSON from all matching files", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });

    const file1 = { speaker: "Alice", text: "Hello" };
    const file2 = { speaker: "Bob", text: "Hi" };

    mockSend
      .mockResolvedValueOnce({
        Contents: [
          { Key: "user_1/42/chunk1.json" },
          { Key: "user_1/42/chunk2.json" },
        ],
      })
      .mockResolvedValueOnce({ Body: makeStream(JSON.stringify(file1)) })
      .mockResolvedValueOnce({ Body: makeStream(JSON.stringify(file2)) });

    const res = await GET({} as NextRequest, mockCtx("abc123_xyz"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([file1, file2]);
  });
});
