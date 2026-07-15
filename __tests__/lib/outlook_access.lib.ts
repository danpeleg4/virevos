import {
  exchangeOutlookCode,
  getFreshOutlookAccessToken,
  getOutlookAuthUrl,
} from "@/lib/outlook/outlook_access";
import {
  canonicalOutlookToken,
  makeFakeOutlookDb,
} from "../fakes/fake_outlook_db";
import { makeFakeGraphAuthService } from "../fakes/fake_graph_auth_service";

const outlookDb = makeFakeOutlookDb();
const graphAuthService = makeFakeGraphAuthService();

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  process.env.OUTLOOK_CLIENT_ID = "client-id";
  process.env.OUTLOOK_REDIRECT_URI =
    "https://app.example.com/api/outlook/callback";
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("getOutlookAuthUrl", () => {
  it("builds the Microsoft authorize URL with the given state", () => {
    const url = getOutlookAuthUrl("state-123");

    expect(url).toContain(
      "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?"
    );
    expect(url).toContain("state=state-123");
    expect(url).toContain("client_id=client-id");
    expect(url).toContain("prompt=consent");
  });
});

describe("exchangeOutlookCode", () => {
  it("exchanges the code and computes expires_at from expires_in", async () => {
    graphAuthService.exchangeCode.mockResolvedValueOnce({
      access_token: "access-1",
      refresh_token: "refresh-1",
      expires_in: 3600,
    });

    const before = Date.now();
    const result = await exchangeOutlookCode("code-1", graphAuthService);

    expect(graphAuthService.exchangeCode).toHaveBeenCalledWith("code-1");
    expect(result.access_token).toBe("access-1");
    expect(result.refresh_token).toBe("refresh-1");
    expect(result.expires_at).toBeGreaterThanOrEqual(before + 3600 * 1000);
  });

  it("defaults refresh_token to an empty string when Graph omits it", async () => {
    graphAuthService.exchangeCode.mockResolvedValueOnce({
      access_token: "access-1",
      expires_in: 3600,
    });

    const result = await exchangeOutlookCode("code-1", graphAuthService);

    expect(result.refresh_token).toBe("");
  });
});

describe("getFreshOutlookAccessToken", () => {
  it("returns null when no token row exists", async () => {
    outlookDb.getTokenByUserId.mockResolvedValueOnce([]);

    const result = await getFreshOutlookAccessToken(
      "user_1",
      outlookDb,
      graphAuthService
    );

    expect(result).toBeNull();
    expect(graphAuthService.refreshToken).not.toHaveBeenCalled();
  });

  it("returns the stored token without refreshing when it is still fresh", async () => {
    const result = await getFreshOutlookAccessToken(
      "user_1",
      outlookDb,
      graphAuthService
    );

    expect(result).toBe(canonicalOutlookToken.accessToken);
    expect(graphAuthService.refreshToken).not.toHaveBeenCalled();
  });

  it("refreshes and persists the new token when it is close to expiry", async () => {
    outlookDb.getTokenByUserId.mockResolvedValueOnce([
      { ...canonicalOutlookToken, expiresIn: Date.now() - 1000 },
    ]);
    graphAuthService.refreshToken.mockResolvedValueOnce({
      access_token: "access-refreshed",
      refresh_token: "refresh-refreshed",
      expires_in: 3600,
    });

    const result = await getFreshOutlookAccessToken(
      "user_1",
      outlookDb,
      graphAuthService
    );

    expect(result).toBe("access-refreshed");
    expect(outlookDb.updateToken).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({
        accessToken: "access-refreshed",
        refreshToken: "refresh-refreshed",
        connected: true,
      })
    );
  });

  it("keeps the existing refresh token when Graph omits a new one", async () => {
    outlookDb.getTokenByUserId.mockResolvedValueOnce([
      { ...canonicalOutlookToken, expiresIn: Date.now() - 1000 },
    ]);
    graphAuthService.refreshToken.mockResolvedValueOnce({
      access_token: "access-refreshed",
      expires_in: 3600,
    });

    await getFreshOutlookAccessToken("user_1", outlookDb, graphAuthService);

    const [, data] = outlookDb.updateToken.mock.calls[0];
    expect(data).not.toHaveProperty("refreshToken");
  });

  it("returns null and logs when the refresh call fails", async () => {
    outlookDb.getTokenByUserId.mockResolvedValueOnce([
      { ...canonicalOutlookToken, expiresIn: Date.now() - 1000 },
    ]);
    graphAuthService.refreshToken.mockRejectedValueOnce(
      new Error("invalid_grant")
    );

    const result = await getFreshOutlookAccessToken(
      "user_1",
      outlookDb,
      graphAuthService
    );

    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
