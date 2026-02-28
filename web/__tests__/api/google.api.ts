import { GET } from "@/app/api/google/route";
import { google } from "googleapis";

jest.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: jest.fn(),
    },
  },
}));

const mockGenerateAuthUrl = jest.fn();

describe("GET /api/google", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (google.auth.OAuth2 as unknown as jest.Mock).mockImplementation(() => ({
      generateAuthUrl: mockGenerateAuthUrl,
    }));
    mockGenerateAuthUrl.mockReturnValue(
      "https://accounts.google.com/o/oauth2/auth?mock=1"
    );
  });

  it("redirects to the Google OAuth URL", async () => {
    const res = await GET();
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "https://accounts.google.com/o/oauth2/auth?mock=1"
    );
  });

  it("generates auth URL with calendar scope and offline access", async () => {
    await GET();
    expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/calendar"],
    });
  });
});
