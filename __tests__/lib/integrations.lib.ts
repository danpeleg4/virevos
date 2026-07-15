import {
  disconnectOutlook,
  getOutlookConnectionStatus,
} from "@/lib/integrations";
import { getCurrentUser } from "@/lib/supabase/auth";
import { removeSubscriptions } from "@/lib/outlook/outlook_sync";
import { makeFakeIntegrationsDb } from "../fakes/fake_integrations_db";
import { makeFakeOutlookDb } from "../fakes/fake_outlook_db";
import { makeFakeGraphAuthService } from "../fakes/fake_graph_auth_service";
import { makeFakeGraphMailService } from "../fakes/fake_graph_mail_service";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/outlook/outlook_sync", () => ({
  removeSubscriptions: vi.fn(),
}));

const integrationsDb = makeFakeIntegrationsDb();
const outlookDb = makeFakeOutlookDb();
const graphAuthService = makeFakeGraphAuthService();
const graphMailService = makeFakeGraphMailService();

const disconnect = () =>
  disconnectOutlook(
    integrationsDb,
    outlookDb,
    graphAuthService,
    graphMailService
  );

const mockUser = { id: "user_1" };

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  (getCurrentUser as Mock).mockResolvedValue(mockUser);
  (removeSubscriptions as Mock).mockResolvedValue(undefined);
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ─── getOutlookConnectionStatus ───────────────────────────────────────────

describe("getOutlookConnectionStatus", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(getOutlookConnectionStatus(integrationsDb)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("returns connected=true when a connected token exists", async () => {
    await expect(getOutlookConnectionStatus(integrationsDb)).resolves.toEqual({
      connected: true,
    });
  });

  it("returns connected=false when no token exists", async () => {
    integrationsDb.getOutlookConnection.mockResolvedValueOnce([]);
    await expect(getOutlookConnectionStatus(integrationsDb)).resolves.toEqual({
      connected: false,
    });
  });

  it("returns connected=false when the token is not connected", async () => {
    integrationsDb.getOutlookConnection.mockResolvedValueOnce([
      { connected: false },
    ]);
    await expect(getOutlookConnectionStatus(integrationsDb)).resolves.toEqual({
      connected: false,
    });
  });
});

// ─── disconnectOutlook ─────────────────────────────────────────────────────

describe("disconnectOutlook", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(disconnect()).rejects.toThrow("Unauthorized");
  });

  it("removes subscriptions then deletes tokens and emails", async () => {
    await expect(disconnect()).resolves.toEqual({
      success: true,
    });

    expect(removeSubscriptions).toHaveBeenCalledWith(
      "user_1",
      outlookDb,
      graphAuthService,
      graphMailService
    );
    expect(integrationsDb.deleteOutlookTokens).toHaveBeenCalledWith("user_1");
    expect(integrationsDb.deleteOutlookEmails).toHaveBeenCalledWith("user_1");
  });

  it("still deletes local data when removeSubscriptions fails", async () => {
    (removeSubscriptions as Mock).mockRejectedValueOnce(
      new Error("graph down")
    );

    await expect(disconnect()).resolves.toEqual({
      success: true,
    });

    expect(integrationsDb.deleteOutlookTokens).toHaveBeenCalledWith("user_1");
    expect(integrationsDb.deleteOutlookEmails).toHaveBeenCalledWith("user_1");
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
