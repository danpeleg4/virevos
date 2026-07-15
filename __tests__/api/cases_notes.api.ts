import { GET, POST } from "@/app/api/cases/[id]/notes/route";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { addCaseNotes, getCaseNotes } from "@/lib/workspace/cases";
import { casesDrizzle } from "@db/cases_db";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/workspace/cases", () => ({
  addCaseNotes: vi.fn(),
  getCaseNotes: vi.fn(),
}));

vi.mock("@db/cases_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fns
  casesDrizzle: { __sentinel: "casesDrizzle" },
}));

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

const getRequest = () => ({}) as NextRequest;

const postRequest = (body: unknown) =>
  new NextRequest("http://localhost/api/cases/5/notes", {
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

describe("GET /api/cases/[id]/notes", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await GET(getRequest(), makeCtx("5"));

    expect(res.status).toBe(401);
    expect(getCaseNotes).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid case id", async () => {
    const res = await GET(getRequest(), makeCtx("abc"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid caseId" });
  });

  it("returns the notes from the wired db", async () => {
    const notes = [{ id: 1, content: "Client called", caseId: 5 }];
    (getCaseNotes as Mock).mockResolvedValueOnce(notes);

    const res = await GET(getRequest(), makeCtx("5"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(notes);
    expect(getCaseNotes).toHaveBeenCalledWith(5, casesDrizzle);
  });

  it("returns 500 when the query fails", async () => {
    (getCaseNotes as Mock).mockRejectedValueOnce(new Error("db down"));

    const res = await GET(getRequest(), makeCtx("5"));

    expect(res.status).toBe(500);
  });
});

describe("POST /api/cases/[id]/notes", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await POST(postRequest({ note: "Hello" }), makeCtx("5"));

    expect(res.status).toBe(401);
    expect(addCaseNotes).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid case id", async () => {
    const res = await POST(postRequest({ note: "Hello" }), makeCtx("abc"));

    expect(res.status).toBe(400);
  });

  it("returns 400 when the note is empty", async () => {
    const res = await POST(postRequest({ note: "  " }), makeCtx("5"));

    expect(res.status).toBe(400);
    expect(addCaseNotes).not.toHaveBeenCalled();
  });

  it("adds the note through the lib fn with the wired db", async () => {
    const res = await POST(
      postRequest({ note: "Client called" }),
      makeCtx("5")
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(addCaseNotes).toHaveBeenCalledWith("Client called", 5, casesDrizzle);
  });

  it("returns 500 when the insert fails", async () => {
    (addCaseNotes as Mock).mockRejectedValueOnce(new Error("db down"));

    const res = await POST(
      postRequest({ note: "Client called" }),
      makeCtx("5")
    );

    expect(res.status).toBe(500);
  });
});
