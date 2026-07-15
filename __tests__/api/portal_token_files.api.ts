import { POST } from "@/app/api/portal/[token]/files/route";
import { uploadPortalFile } from "@/lib/portal_file_uploads";
import { portalUploadsDrizzle } from "@db/portal_uploads_db";
import { supabaseStorageClient } from "@/api_client/supabase_storage_client";
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

vi.mock("@/lib/portal_file_uploads", () => ({
  uploadPortalFile: vi.fn(),
}));

vi.mock("@db/portal_uploads_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fn
  portalUploadsDrizzle: { __sentinel: "portalUploadsDrizzle" },
}));

vi.mock("@/api_client/supabase_storage_client", () => ({
  supabaseStorageClient: { __sentinel: "supabaseStorageClient" },
}));

vi.mock("@db/plan_limits_db", () => ({
  planLimitsDrizzle: { __sentinel: "planLimitsDrizzle" },
}));

vi.mock("@db/billing_db", () => ({
  billingDrizzle: { __sentinel: "billingDrizzle" },
}));

const makeRequest = (token: string, formData: FormData) =>
  new NextRequest(`http://localhost/api/portal/${token}/files`, {
    method: "POST",
    body: formData,
  });

const makeParams = (token: string) => Promise.resolve({ token });

function makeFormData() {
  const fd = new FormData();
  fd.append("file", new File(["x"], "doc.pdf", { type: "application/pdf" }));
  return fd;
}

describe("POST /api/portal/[token]/files", () => {
  it("uploads the file via the wired deps", async () => {
    const result = { id: 1, name: "doc.pdf", caseId: 5 };
    (uploadPortalFile as Mock).mockResolvedValueOnce(result);

    const res = await POST(makeRequest("tok", makeFormData()), {
      params: makeParams("tok"),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(result);
    expect(uploadPortalFile).toHaveBeenCalledWith(
      "tok",
      expect.any(FormData),
      portalUploadsDrizzle,
      supabaseStorageClient,
      planLimitsDrizzle,
      billingDrizzle
    );
  });

  it("propagates a ValidationError status", async () => {
    (uploadPortalFile as Mock).mockRejectedValueOnce(
      new ValidationError("No file provided", 400)
    );

    const res = await POST(makeRequest("tok", makeFormData()), {
      params: makeParams("tok"),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "No file provided" });
  });

  it("returns 500 when the lib call throws", async () => {
    (uploadPortalFile as Mock).mockRejectedValueOnce(new Error("boom"));

    const res = await POST(makeRequest("tok", makeFormData()), {
      params: makeParams("tok"),
    });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Upload failed" });
  });
});
