import { POST } from "@/app/api/portal/[token]/document-requests/[itemId]/upload/route";
import { uploadDocumentRequestItem } from "@/lib/portal/portal_document_uploads";
import { portalUploadsDrizzle } from "@db/portal_uploads_db";
import { supabaseStorageClient } from "@/api_client/supabase_storage_client";
import { openAIClient } from "@/api_client/openai_client";
import { planLimitsDrizzle } from "@db/plan_limits_db";
import { billingDrizzle } from "@db/billing_db";
import { ValidationError } from "@/lib/util/validation";
import { NextRequest } from "next/server";

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

vi.mock("@/lib/portal/portal_document_uploads", () => ({
  uploadDocumentRequestItem: vi.fn(),
}));

vi.mock("@db/portal_uploads_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fn
  portalUploadsDrizzle: { __sentinel: "portalUploadsDrizzle" },
}));

vi.mock("@/api_client/supabase_storage_client", () => ({
  supabaseStorageClient: { __sentinel: "supabaseStorageClient" },
}));

vi.mock("@/api_client/openai_client", () => ({
  openAIClient: { __sentinel: "openAIClient" },
}));

vi.mock("@db/plan_limits_db", () => ({
  planLimitsDrizzle: { __sentinel: "planLimitsDrizzle" },
}));

vi.mock("@db/billing_db", () => ({
  billingDrizzle: { __sentinel: "billingDrizzle" },
}));

const makeRequest = (token: string, itemId: string, formData: FormData) =>
  new NextRequest(
    `http://localhost/api/portal/${token}/document-requests/${itemId}/upload`,
    { method: "POST", body: formData }
  );

const makeParams = (token: string, itemId: string) =>
  Promise.resolve({ token, itemId });

function makeFormData() {
  const fd = new FormData();
  fd.append("file", new File(["x"], "doc.pdf", { type: "application/pdf" }));
  return fd;
}

describe("POST /api/portal/[token]/document-requests/[itemId]/upload", () => {
  it("uploads the item via the wired deps", async () => {
    const result = { itemId: 1, status: "uploaded" };
    (uploadDocumentRequestItem as Mock).mockResolvedValueOnce(result);

    const res = await POST(makeRequest("tok", "1", makeFormData()), {
      params: makeParams("tok", "1"),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(result);
    expect(uploadDocumentRequestItem).toHaveBeenCalledWith(
      "tok",
      1,
      expect.any(FormData),
      portalUploadsDrizzle,
      supabaseStorageClient,
      openAIClient,
      planLimitsDrizzle,
      billingDrizzle
    );
  });

  it("propagates a ValidationError status", async () => {
    (uploadDocumentRequestItem as Mock).mockRejectedValueOnce(
      new ValidationError("Item not found", 404)
    );

    const res = await POST(makeRequest("tok", "1", makeFormData()), {
      params: makeParams("tok", "1"),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Item not found" });
  });

  it("returns 500 when the lib call throws", async () => {
    (uploadDocumentRequestItem as Mock).mockRejectedValueOnce(
      new Error("boom")
    );

    const res = await POST(makeRequest("tok", "1", makeFormData()), {
      params: makeParams("tok", "1"),
    });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Upload failed" });
  });
});
