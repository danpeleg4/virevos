import { savePortalSettings } from "@/lib/portal_settings";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  canonicalPortalTokenRow,
  makeFakePortalDb,
} from "../fakes/fake_portal_db";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const portalDb = makeFakePortalDb();

const mockUser = { id: "user_1" };

beforeEach(() => {
  vi.clearAllMocks();
  (getCurrentUser as Mock).mockResolvedValue(mockUser);
  process.env.NEXT_PUBLIC_APP_URL = "https://app.test";
});

describe("savePortalSettings", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(savePortalSettings({ clientId: 1 }, portalDb)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("throws when the client is not owned by the user", async () => {
    portalDb.getClientOwnedByUser.mockResolvedValueOnce([]);
    await expect(savePortalSettings({ clientId: 1 }, portalDb)).rejects.toThrow(
      "Client not found"
    );
  });

  it("updates the existing token when one is present", async () => {
    const result = await savePortalSettings(
      { clientId: 1, enabled: false, settings: { title: "New Title" } },
      portalDb
    );

    expect(portalDb.updatePortalToken).toHaveBeenCalledWith(
      canonicalPortalTokenRow.id,
      { settings: { title: "New Title" }, enabled: false }
    );
    expect(portalDb.insertPortalToken).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        portalUrl: `https://app.test/portal/${canonicalPortalTokenRow.token}`,
        clientName: "Jane Client",
      })
    );
  });

  it("only updates the provided fields", async () => {
    await savePortalSettings({ clientId: 1, enabled: true }, portalDb);

    expect(portalDb.updatePortalToken).toHaveBeenCalledWith(
      canonicalPortalTokenRow.id,
      { enabled: true }
    );
  });

  it("inserts a new token when none exists yet", async () => {
    portalDb.getPortalTokenByClient.mockResolvedValueOnce([]);

    await savePortalSettings(
      { clientId: 1, settings: { title: "Portal" } },
      portalDb
    );

    expect(portalDb.insertPortalToken).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 1,
        enabled: true,
        settings: { title: "Portal" },
        userId: "user_1",
      })
    );
    expect(portalDb.updatePortalToken).not.toHaveBeenCalled();
  });

  it("defaults a new token to disabled settings when none provided", async () => {
    portalDb.getPortalTokenByClient.mockResolvedValueOnce([]);

    await savePortalSettings({ clientId: 1, enabled: false }, portalDb);

    expect(portalDb.insertPortalToken).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false, settings: {} })
    );
  });
});
