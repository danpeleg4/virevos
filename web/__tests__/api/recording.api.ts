import { POST } from "@/app/api/recording/route";
import { NextRequest } from "next/server";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn(),
}));

import { currentUser } from "@clerk/nextjs/server";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function mockRequest<T extends Record<string, unknown>>(body: T): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

describe("POST /api/recording", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);

    const res = await POST(mockRequest({ meetingId: "123" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 if meetingId is missing", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });

    const res = await POST(mockRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns signed url when main.mp4 exists", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    (getSignedUrl as jest.Mock).mockResolvedValue("https://signed-url");

    const res = await POST(mockRequest({ meetingId: "meeting_1" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.url).toBe("https://signed-url");
  });
});
