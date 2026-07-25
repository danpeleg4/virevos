import { PATCH } from "@/app/api/document-requests/[id]/route";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  approveDocumentRequest,
  declineDocumentRequest,
  updateDocumentRequest,
} from "@/lib/document_requests";
import { documentRequestsDrizzle } from "@db/document_requests_db";
import { ValidationError } from "@/lib/util/validation";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/document_requests", () => ({
  approveDocumentRequest: vi.fn(),
  declineDocumentRequest: vi.fn(),
  updateDocumentRequest: vi.fn(),
}));

vi.mock("@db/document_requests_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fns
  documentRequestsDrizzle: { __sentinel: "documentRequestsDrizzle" },
}));

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

const patchRequest = (body: unknown) =>
  new NextRequest("http://localhost/api/document-requests/1", {
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

describe("PATCH /api/document-requests/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await PATCH(patchRequest({ type: "approve" }), makeCtx("1"));

    expect(res.status).toBe(401);
    expect(approveDocumentRequest).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid request id", async () => {
    const res = await PATCH(patchRequest({ type: "approve" }), makeCtx("abc"));

    expect(res.status).toBe(400);
  });

  it("dispatches approve with the wired db", async () => {
    const res = await PATCH(patchRequest({ type: "approve" }), makeCtx("1"));

    expect(res.status).toBe(200);
    expect(approveDocumentRequest).toHaveBeenCalledWith(
      1,
      documentRequestsDrizzle
    );
  });

  it("dispatches decline with the wired db", async () => {
    const res = await PATCH(patchRequest({ type: "decline" }), makeCtx("1"));

    expect(res.status).toBe(200);
    expect(declineDocumentRequest).toHaveBeenCalledWith(
      1,
      documentRequestsDrizzle
    );
  });

  it("dispatches update with the patch data and wired db", async () => {
    const data = { clientId: 5 };
    const res = await PATCH(
      patchRequest({ type: "update", data }),
      makeCtx("1")
    );

    expect(res.status).toBe(200);
    expect(updateDocumentRequest).toHaveBeenCalledWith(
      1,
      data,
      documentRequestsDrizzle
    );
  });

  it("returns 400 for an unknown type", async () => {
    const res = await PATCH(patchRequest({ type: "bogus" }), makeCtx("1"));

    expect(res.status).toBe(400);
  });

  it("returns 401 when the lib fn reports Unauthorized", async () => {
    (approveDocumentRequest as Mock).mockRejectedValueOnce(
      new Error("Unauthorized")
    );

    const res = await PATCH(patchRequest({ type: "approve" }), makeCtx("1"));

    expect(res.status).toBe(401);
  });

  it("returns 400 when the lib fn throws a ValidationError", async () => {
    (approveDocumentRequest as Mock).mockRejectedValueOnce(
      new ValidationError("Client must be selected before approval")
    );

    const res = await PATCH(patchRequest({ type: "approve" }), makeCtx("1"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Client must be selected before approval",
    });
  });

  it("returns 404 when the lib fn reports the request was not found", async () => {
    (approveDocumentRequest as Mock).mockRejectedValueOnce(
      new Error("Document request not found")
    );

    const res = await PATCH(patchRequest({ type: "approve" }), makeCtx("1"));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: "Document request not found",
    });
  });

  it("returns 500 with the error message for unexpected failures", async () => {
    (approveDocumentRequest as Mock).mockRejectedValueOnce(
      new Error("Database connection lost")
    );

    const res = await PATCH(patchRequest({ type: "approve" }), makeCtx("1"));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Database connection lost",
    });
  });
});
