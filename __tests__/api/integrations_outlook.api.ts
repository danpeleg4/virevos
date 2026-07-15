import { GET, DELETE } from "@/app/api/integrations/outlook/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  disconnectOutlook,
  getOutlookConnectionStatus,
} from "@/lib/integrations";
import { integrationsDrizzle } from "@db/integrations_db";
import { outlookDrizzle } from "@db/outlook_db";
import { graphAuthService } from "@/api_client/ms_graph/graph_auth_service";
import { graphMailService } from "@/api_client/ms_graph/graph_mail_service";
import { ValidationError } from "@/lib/util/validation";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/integrations", () => ({
  disconnectOutlook: vi.fn(),
  getOutlookConnectionStatus: vi.fn(),
}));

vi.mock("@db/integrations_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fns
  integrationsDrizzle: { __sentinel: "integrationsDrizzle" },
}));

vi.mock("@db/outlook_db", () => ({
  outlookDrizzle: { __sentinel: "outlookDrizzle" },
}));

vi.mock("@/api_client/ms_graph/graph_auth_service", () => ({
  graphAuthService: { __sentinel: "graphAuthService" },
}));

vi.mock("@/api_client/ms_graph/graph_mail_service", () => ({
  graphMailService: { __sentinel: "graphMailService" },
}));

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("GET /api/integrations/outlook", () => {
  it("returns 401 if user is not authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Unauthorized");
    expect(getOutlookConnectionStatus).not.toHaveBeenCalled();
  });

  it("returns the connection status from the wired db", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    (getOutlookConnectionStatus as Mock).mockResolvedValueOnce({
      connected: true,
    });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ connected: true });
    expect(getOutlookConnectionStatus).toHaveBeenCalledWith(
      integrationsDrizzle
    );
  });

  it("returns 500 when the query fails", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    (getOutlookConnectionStatus as Mock).mockRejectedValueOnce(
      new Error("db down")
    );

    const res = await GET();

    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/integrations/outlook", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await DELETE();

    expect(res.status).toBe(401);
    expect(disconnectOutlook).not.toHaveBeenCalled();
  });

  it("disconnects through the lib fn with the wired db", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    (disconnectOutlook as Mock).mockResolvedValueOnce({ success: true });

    const res = await DELETE();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(disconnectOutlook).toHaveBeenCalledWith(
      integrationsDrizzle,
      outlookDrizzle,
      graphAuthService,
      graphMailService
    );
  });

  it("propagates a ValidationError status", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    (disconnectOutlook as Mock).mockRejectedValueOnce(
      new ValidationError("Unauthorized", 401)
    );

    const res = await DELETE();

    expect(res.status).toBe(401);
  });

  it("returns 500 when the disconnect fails", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    (disconnectOutlook as Mock).mockRejectedValueOnce(new Error("db down"));

    const res = await DELETE();

    expect(res.status).toBe(500);
  });
});
