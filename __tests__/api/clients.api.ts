import { GET, POST } from "@/app/api/clients/route";
import { GET as GET_PORTAL_CLIENTS } from "@/app/api/clients/portal/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  addAClient,
  getClients,
  getPortalEnabledClients,
} from "@/lib/workspace/clients";
import { clientsDrizzle } from "@db/classes/clients_db";
import { planLimitsDrizzle } from "@db/classes/plan_limits_db";
import { billingDrizzle } from "@db/classes/billing_db";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/workspace/clients", () => ({
  addAClient: vi.fn(),
  getClients: vi.fn(),
  getPortalEnabledClients: vi.fn(),
}));

vi.mock("@db/classes/clients_db", () => ({
  // sentinel — the routes must pass this exact instance into the lib fns
  clientsDrizzle: { __sentinel: "clientsDrizzle" },
}));

vi.mock("@db/classes/plan_limits_db", () => ({
  planLimitsDrizzle: { __sentinel: "planLimitsDrizzle" },
}));

vi.mock("@db/classes/billing_db", () => ({
  billingDrizzle: { __sentinel: "billingDrizzle" },
}));

const postRequest = (body: unknown) =>
  new Request("http://localhost/api/clients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("GET /api/clients", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(getClients).not.toHaveBeenCalled();
  });

  it("returns clients from the wired db", async () => {
    const rows = [{ id: 1, name: "Jane Client", totalCases: 2 }];
    (getClients as Mock).mockResolvedValueOnce(rows);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(rows);
    expect(getClients).toHaveBeenCalledWith(clientsDrizzle);
  });

  it("returns 500 when the query fails", async () => {
    (getClients as Mock).mockRejectedValueOnce(new Error("db down"));

    const res = await GET();

    expect(res.status).toBe(500);
  });
});

describe("POST /api/clients", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await POST(postRequest({ name: "John" }));

    expect(res.status).toBe(401);
    expect(addAClient).not.toHaveBeenCalled();
  });

  it("creates the client through the lib fn with the wired deps", async () => {
    const created = { id: 42, name: "John", email: "john@example.com" };
    (addAClient as Mock).mockResolvedValueOnce(created);

    const res = await POST(
      postRequest({ name: "John", email: "john@example.com" })
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(created);
    expect(addAClient).toHaveBeenCalledWith(
      { name: "John", email: "john@example.com" },
      clientsDrizzle,
      planLimitsDrizzle,
      billingDrizzle
    );
  });

  it("passes through the lib fn's { message } failure shape", async () => {
    (addAClient as Mock).mockResolvedValueOnce({
      message: "name is required",
    });

    const res = await POST(postRequest({}));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: "name is required" });
  });
});

describe("GET /api/clients/portal", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await GET_PORTAL_CLIENTS();

    expect(res.status).toBe(401);
    expect(getPortalEnabledClients).not.toHaveBeenCalled();
  });

  it("returns portal-enabled clients from the wired db", async () => {
    const rows = [{ id: 1, name: "Jane Client", email: "jane@client.com" }];
    (getPortalEnabledClients as Mock).mockResolvedValueOnce(rows);

    const res = await GET_PORTAL_CLIENTS();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(rows);
    expect(getPortalEnabledClients).toHaveBeenCalledWith(clientsDrizzle);
  });

  it("returns 500 when the query fails", async () => {
    (getPortalEnabledClients as Mock).mockRejectedValueOnce(
      new Error("db down")
    );

    const res = await GET_PORTAL_CLIENTS();

    expect(res.status).toBe(500);
  });
});
