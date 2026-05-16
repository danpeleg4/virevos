import { GET } from "@/app/api/google/route";
import { google } from "googleapis";

vi.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: vi.fn(),
    },
  },
}));

const mockGenerateAuthUrl = vi.fn();

describe("GET /api/google", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (google.auth.OAuth2 as unknown as Mock).mockImplementation(function () {
      return { generateAuthUrl: mockGenerateAuthUrl };
    });
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

  it("generates auth URL with required scopes and offline access", async () => {
    await GET();
    expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "openid",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/gmail.modify",
      ],
    });
  });
});
