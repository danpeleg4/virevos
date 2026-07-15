import { NextRequest } from "next/server";
import { GET, PATCH, DELETE } from "@/app/api/clients/[id]/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  deleteClient,
  getClientCases,
  getClientMain,
  getClientOutlookEmails,
  getClientPortal,
  updateExistingClient,
} from "@/lib/workspace/clients";
import { clientsDrizzle } from "@db/clients_db";
import { ValidationError } from "@/lib/util/validation";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/workspace/clients", () => ({
  deleteClient: vi.fn(),
  getClientCases: vi.fn(),
  getClientMain: vi.fn(),
  getClientOutlookEmails: vi.fn(),
  getClientPortal: vi.fn(),
  updateExistingClient: vi.fn(),
}));

vi.mock("@db/clients_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fns
  clientsDrizzle: { __sentinel: "clientsDrizzle" },
}));

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

const getRequest = (id: string, type: string) =>
  new NextRequest(`http://localhost/api/clients/${id}?type=${type}`);

const patchRequest = (body: unknown) =>
  new NextRequest("http://localhost/api/clients/1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const deleteRequest = () =>
  new NextRequest("http://localhost/api/clients/1", { method: "DELETE" });

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("GET /api/clients/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await GET(getRequest("1", "main"), makeCtx("1"));

    expect(res.status).toBe(401);
    expect(getClientMain).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid client id", async () => {
    const res = await GET(getRequest("abc", "main"), makeCtx("abc"));

    expect(res.status).toBe(400);
  });

  it("returns 400 for an unknown type", async () => {
    const res = await GET(getRequest("1", "bogus"), makeCtx("1"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid type" });
  });

  it("returns the main payload from the wired db", async () => {
    const payload = { client: { id: 1, name: "Jane Client" }, portal: null };
    (getClientMain as Mock).mockResolvedValueOnce(payload);

    const res = await GET(getRequest("1", "main"), makeCtx("1"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(payload);
    expect(getClientMain).toHaveBeenCalledWith(1, clientsDrizzle);
  });

  it("returns 404 when the client is missing", async () => {
    (getClientMain as Mock).mockResolvedValueOnce(null);

    const res = await GET(getRequest("99", "main"), makeCtx("99"));

    expect(res.status).toBe(404);
  });

  it("returns cases with stats for type=cases", async () => {
    const casesWithStats = [{ id: 5, name: "Estate Case" }];
    (getClientCases as Mock).mockResolvedValueOnce(casesWithStats);

    const res = await GET(getRequest("1", "cases"), makeCtx("1"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ cases: casesWithStats });
    expect(getClientCases).toHaveBeenCalledWith(1, clientsDrizzle);
  });

  it("returns emails for type=outlook-emails", async () => {
    const emails = [{ id: 9, subject: "Hello" }];
    (getClientOutlookEmails as Mock).mockResolvedValueOnce(emails);

    const res = await GET(getRequest("1", "outlook-emails"), makeCtx("1"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ emails });
    expect(getClientOutlookEmails).toHaveBeenCalledWith(1, clientsDrizzle);
  });

  it("returns the portal for type=portal", async () => {
    const portal = { id: 3, token: "portal-token-1" };
    (getClientPortal as Mock).mockResolvedValueOnce(portal);

    const res = await GET(getRequest("1", "portal"), makeCtx("1"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ portal });
    expect(getClientPortal).toHaveBeenCalledWith(1, clientsDrizzle);
  });

  it("returns 500 when a lookup fails", async () => {
    (getClientMain as Mock).mockRejectedValueOnce(new Error("db down"));

    const res = await GET(getRequest("1", "main"), makeCtx("1"));

    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/clients/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await PATCH(patchRequest({ name: "Johnny" }), makeCtx("1"));

    expect(res.status).toBe(401);
    expect(updateExistingClient).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid client id", async () => {
    const res = await PATCH(patchRequest({ name: "Johnny" }), makeCtx("abc"));

    expect(res.status).toBe(400);
  });

  it("updates the client through the lib fn with the wired db", async () => {
    const res = await PATCH(
      patchRequest({ name: "Johnny", status: "inactive" }),
      makeCtx("1")
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, id: 1 });
    expect(updateExistingClient).toHaveBeenCalledWith(
      { name: "Johnny", status: "inactive", id: 1 },
      clientsDrizzle
    );
  });

  it("propagates a ValidationError status from the lib fn", async () => {
    (updateExistingClient as Mock).mockRejectedValueOnce(
      new ValidationError("status must be one of active, inactive", 400)
    );

    const res = await PATCH(patchRequest({ status: "archived" }), makeCtx("1"));

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/clients/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await DELETE(deleteRequest(), makeCtx("1"));

    expect(res.status).toBe(401);
    expect(deleteClient).not.toHaveBeenCalled();
  });

  it("deletes the client through the lib fn with the wired db", async () => {
    const res = await DELETE(deleteRequest(), makeCtx("7"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, id: 7 });
    expect(deleteClient).toHaveBeenCalledWith({ id: 7 }, clientsDrizzle);
  });

  it("returns 500 when the delete fails", async () => {
    (deleteClient as Mock).mockRejectedValueOnce(new Error("db down"));

    const res = await DELETE(deleteRequest(), makeCtx("7"));

    expect(res.status).toBe(500);
  });
});
