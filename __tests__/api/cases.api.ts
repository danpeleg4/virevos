import { GET, PATCH, DELETE } from "@/app/api/cases/[id]/route";
import { POST } from "@/app/api/cases/route";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  createCase,
  deleteCase,
  getCaseSummary,
  updateCase,
} from "@/lib/workspace/cases";
import { casesDrizzle } from "@db/classes/cases_db";
import { planLimitsDrizzle } from "@db/classes/plan_limits_db";
import { billingDrizzle } from "@db/classes/billing_db";
import { supabaseStorageClient } from "@/api_client/supabase_storage_client";
import { ValidationError } from "@/lib/util/validation";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/workspace/cases", () => ({
  createCase: vi.fn(),
  deleteCase: vi.fn(),
  getCaseSummary: vi.fn(),
  updateCase: vi.fn(),
}));

vi.mock("@db/classes/cases_db", () => ({
  // sentinel — the routes must pass this exact instance into the lib fns
  casesDrizzle: { __sentinel: "casesDrizzle" },
}));

vi.mock("@db/classes/plan_limits_db", () => ({
  planLimitsDrizzle: { __sentinel: "planLimitsDrizzle" },
}));

vi.mock("@db/classes/billing_db", () => ({
  billingDrizzle: { __sentinel: "billingDrizzle" },
}));

vi.mock("@/api_client/supabase_storage_client", () => ({
  supabaseStorageClient: { __sentinel: "supabaseStorageClient" },
}));

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

const getRequest = () => ({}) as NextRequest;

const postRequest = (body: unknown) =>
  new Request("http://localhost/api/cases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const patchRequest = (body: unknown) =>
  new NextRequest("http://localhost/api/cases/5", {
    method: "PATCH",
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

describe("GET /api/cases/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    const res = await GET(getRequest(), makeCtx("5"));
    expect(res.status).toBe(401);
    expect(getCaseSummary).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid id", async () => {
    const res = await GET(getRequest(), makeCtx("abc"));
    expect(res.status).toBe(400);
  });

  it("returns the case summary from the wired db", async () => {
    const summary = { id: 5, name: "Estate Case", status: "active" };
    (getCaseSummary as Mock).mockResolvedValueOnce(summary);

    const res = await GET(getRequest(), makeCtx("5"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(summary);
    expect(getCaseSummary).toHaveBeenCalledWith(5, casesDrizzle);
  });

  it("returns 404 when the case is missing", async () => {
    (getCaseSummary as Mock).mockResolvedValueOnce(null);

    const res = await GET(getRequest(), makeCtx("99"));

    expect(res.status).toBe(404);
  });

  it("returns 500 when the lookup fails", async () => {
    (getCaseSummary as Mock).mockRejectedValueOnce(new Error("db down"));

    const res = await GET(getRequest(), makeCtx("5"));

    expect(res.status).toBe(500);
  });
});

describe("POST /api/cases", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    const res = await POST(postRequest({ name: "New Case" }));
    expect(res.status).toBe(401);
    expect(createCase).not.toHaveBeenCalled();
  });

  it("creates the case through the lib fn with the wired deps", async () => {
    const created = { id: 99, name: "New Case", stats: { totalTasks: 0 } };
    (createCase as Mock).mockResolvedValueOnce(created);

    const res = await POST(postRequest({ name: "New Case" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(created);
    expect(createCase).toHaveBeenCalledWith(
      { name: "New Case" },
      casesDrizzle,
      planLimitsDrizzle,
      billingDrizzle
    );
  });

  it("propagates a ValidationError status", async () => {
    (createCase as Mock).mockRejectedValueOnce(
      new ValidationError("name is required", 400)
    );

    const res = await POST(postRequest({}));

    expect(res.status).toBe(400);
  });

  it("surfaces plan-limit errors with their message", async () => {
    (createCase as Mock).mockRejectedValueOnce(
      new Error("Case limit reached. The starter plan allows up to 5 cases.")
    );

    const res = await POST(postRequest({ name: "New Case" }));

    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain("Case limit reached");
  });
});

describe("PATCH /api/cases/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    const res = await PATCH(
      patchRequest({ status: "completed" }),
      makeCtx("5")
    );
    expect(res.status).toBe(401);
    expect(updateCase).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid id", async () => {
    const res = await PATCH(patchRequest({ status: "done" }), makeCtx("abc"));
    expect(res.status).toBe(400);
  });

  it("updates the case through the lib fn with the wired db", async () => {
    const res = await PATCH(
      patchRequest({ status: "completed", priority: "high" }),
      makeCtx("5")
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, id: 5 });
    expect(updateCase).toHaveBeenCalledWith(
      { status: "completed", priority: "high", id: 5 },
      casesDrizzle
    );
  });

  it("returns 500 when the update fails", async () => {
    (updateCase as Mock).mockRejectedValueOnce(new Error("db down"));

    const res = await PATCH(
      patchRequest({ status: "completed" }),
      makeCtx("5")
    );

    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/cases/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    const res = await DELETE(getRequest(), makeCtx("5"));
    expect(res.status).toBe(401);
    expect(deleteCase).not.toHaveBeenCalled();
  });

  it("deletes the case through the lib fn with the wired deps", async () => {
    const res = await DELETE(getRequest(), makeCtx("5"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, id: 5 });
    expect(deleteCase).toHaveBeenCalledWith(
      5,
      casesDrizzle,
      supabaseStorageClient
    );
  });

  it("returns 500 when the delete fails", async () => {
    (deleteCase as Mock).mockRejectedValueOnce(new Error("db down"));

    const res = await DELETE(getRequest(), makeCtx("5"));

    expect(res.status).toBe(500);
  });
});
