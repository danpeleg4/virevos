import { uploadDocumentRequestItem } from "@/lib/portal_document_uploads";
import {
  canonicalDocRequestItem,
  canonicalUploadedFile,
  canonicalUploadsPortalToken,
  makeFakePortalUploadsDb,
} from "../fakes/fake_portal_uploads_db";
import { makeFakeStorageClient } from "../fakes/fake_storage_client";
import { makeFakeOpenAIClient } from "../fakes/fake_openai_client";
import { makeFakePlanLimitsDb } from "../fakes/fake_plan_limits_db";
import { makeFakeBillingDb } from "../fakes/fake_billing_db";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({ get: () => null })),
}));

vi.mock("@/lib/supabase/supabase", () => ({
  FILES_BUCKET: "projectFiles",
}));

const mockAnalyze = vi.fn();
vi.mock("@/lib/ai/document_analysis", () => ({
  analyzeDocumentRequirement: (...args: unknown[]) => mockAnalyze(...args),
}));

const mockAssertCanUseAI = vi.fn();
vi.mock("@/lib/plan_limits", () => ({
  assertCanUseAI: (...args: unknown[]) => mockAssertCanUseAI(...args),
}));

const portalUploadsDb = makeFakePortalUploadsDb();
const storage = makeFakeStorageClient();
const openaiClient = makeFakeOpenAIClient();
const planLimitsDb = makeFakePlanLimitsDb();
const billingDb = makeFakeBillingDb();

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  mockAnalyze.mockResolvedValue({ verdict: "meets", reasoning: "Looks good" });
  mockAssertCanUseAI.mockResolvedValue(undefined);
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

function makeFormData(file: File | null): FormData {
  const fd = new FormData();
  if (file) fd.append("file", file);
  return fd;
}

function makeFile(size: number, type = "application/pdf", name = "doc.pdf") {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

async function expectStatus(promise: Promise<unknown>, status: number) {
  await expect(promise).rejects.toMatchObject({ status });
}

const upload = (token: string, itemId: number, formData: FormData) =>
  uploadDocumentRequestItem(
    token,
    itemId,
    formData,
    portalUploadsDb,
    storage,
    openaiClient,
    planLimitsDb,
    billingDb
  );

describe("uploadDocumentRequestItem", () => {
  it("throws 400 for invalid itemId", async () => {
    await expectStatus(upload("tok", NaN, makeFormData(null)), 400);
  });

  it("throws 404 for invalid token", async () => {
    portalUploadsDb.getPortalTokenByToken.mockResolvedValueOnce([]);
    await expectStatus(upload("bad", 1, makeFormData(null)), 404);
  });

  it("throws 404 for disabled portal", async () => {
    portalUploadsDb.getPortalTokenByToken.mockResolvedValueOnce([
      { ...canonicalUploadsPortalToken, enabled: false },
    ]);
    await expectStatus(upload("tok", 1, makeFormData(null)), 404);
  });

  it("throws 403 when fileSharing is disabled", async () => {
    portalUploadsDb.getPortalTokenByToken.mockResolvedValueOnce([
      { ...canonicalUploadsPortalToken, settings: { fileSharing: false } },
    ]);
    await expectStatus(upload("tok", 1, makeFormData(null)), 403);
  });

  it("throws 404 when item is not found", async () => {
    portalUploadsDb.getDocumentRequestItemWithRequest.mockResolvedValueOnce([]);
    await expectStatus(upload("tok", 1, makeFormData(null)), 404);
  });

  it("throws 403 when item belongs to a different client", async () => {
    portalUploadsDb.getDocumentRequestItemWithRequest.mockResolvedValueOnce([
      { ...canonicalDocRequestItem, requestClientId: 999 },
    ]);
    await expectStatus(upload("tok", 1, makeFormData(null)), 403);
  });

  it("throws 403 when request is not approved", async () => {
    portalUploadsDb.getDocumentRequestItemWithRequest.mockResolvedValueOnce([
      { ...canonicalDocRequestItem, requestStatus: "pending_approval" },
    ]);
    await expectStatus(upload("tok", 1, makeFormData(null)), 403);
  });

  it("throws 409 when item is already uploaded", async () => {
    portalUploadsDb.getDocumentRequestItemWithRequest.mockResolvedValueOnce([
      { ...canonicalDocRequestItem, itemStatus: "uploaded" },
    ]);
    await expectStatus(upload("tok", 1, makeFormData(null)), 409);
  });

  it("throws 400 when no file provided", async () => {
    await expectStatus(upload("tok", 1, makeFormData(null)), 400);
  });

  it("throws 400 when file exceeds 10 MB", async () => {
    const big = makeFile(11 * 1024 * 1024);
    await expectStatus(upload("tok", 1, makeFormData(big)), 400);
  });

  it("uploads, runs analyzer, and marks item uploaded when verdict meets", async () => {
    const file = makeFile(100);
    const result = await upload("tok", 1, makeFormData(file));

    expect(result.itemId).toBe(1);
    expect(result.file.id).toBe(canonicalUploadedFile.id);
    expect(result.status).toBe("uploaded");
    expect(result.analysis).toEqual({
      verdict: "meets",
      reasoning: "Looks good",
    });

    expect(storage.uploadFile).toHaveBeenCalledTimes(1);
    expect(mockAnalyze).toHaveBeenCalledWith(
      expect.objectContaining({
        itemName: "Passport",
        itemDescription: "Bio page",
        mimeType: "application/pdf",
        fileName: "doc.pdf",
      }),
      openaiClient
    );
    expect(portalUploadsDb.insertCaseFile).toHaveBeenCalledWith(
      expect.objectContaining({ caseId: 5, userId: "user_1" })
    );
    expect(portalUploadsDb.updateDocumentRequestItem).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        status: "uploaded",
        uploadedFileId: canonicalUploadedFile.id,
        uploadedAt: expect.any(Date),
        aiVerdict: "meets",
        aiReasoning: "Looks good",
        aiAnalyzedAt: expect.any(Date),
      })
    );
    expect(portalUploadsDb.incrementAiCredits).toHaveBeenCalledWith("user_1");
  });

  it("increments ai_credits on does_not_meet verdict", async () => {
    mockAnalyze.mockResolvedValueOnce({
      verdict: "does_not_meet",
      reasoning: "Wrong document",
    });

    await upload("tok", 1, makeFormData(makeFile(100)));

    expect(portalUploadsDb.incrementAiCredits).toHaveBeenCalledWith("user_1");
  });

  it("does NOT increment ai_credits when verdict is skipped", async () => {
    mockAnalyze.mockResolvedValueOnce({
      verdict: "skipped",
      reasoning: "File type not supported for automatic analysis.",
    });

    await upload(
      "tok",
      1,
      makeFormData(makeFile(100, "text/plain", "notes.txt"))
    );

    expect(portalUploadsDb.incrementAiCredits).not.toHaveBeenCalled();
  });

  it("skips AI analysis transparently when user is over AI limit (client sees only uploaded)", async () => {
    mockAssertCanUseAI.mockRejectedValueOnce(
      new Error("AI credit limit reached")
    );

    const result = await upload("tok", 1, makeFormData(makeFile(100)));

    expect(result.status).toBe("uploaded");
    expect(result.analysis).toBeUndefined();
    expect(mockAnalyze).not.toHaveBeenCalled();
    expect(portalUploadsDb.incrementAiCredits).not.toHaveBeenCalled();

    const itemSet = portalUploadsDb.updateDocumentRequestItem.mock.calls[0][1];
    expect(itemSet.status).toBe("uploaded");
    expect(itemSet).not.toHaveProperty("aiVerdict");
    expect(itemSet).not.toHaveProperty("aiReasoning");
    expect(itemSet).not.toHaveProperty("aiAnalyzedAt");
  });

  it("flips status to rejected when verdict is does_not_meet", async () => {
    mockAnalyze.mockResolvedValueOnce({
      verdict: "does_not_meet",
      reasoning: "Wrong document",
    });

    const result = await upload("tok", 1, makeFormData(makeFile(100)));

    expect(result.status).toBe("rejected");
    expect(result.analysis?.verdict).toBe("does_not_meet");
    expect(portalUploadsDb.updateDocumentRequestItem).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        status: "rejected",
        aiVerdict: "does_not_meet",
        aiReasoning: "Wrong document",
      })
    );
  });

  it("keeps status uploaded when verdict is skipped (unsupported mime)", async () => {
    mockAnalyze.mockResolvedValueOnce({
      verdict: "skipped",
      reasoning: "File type not supported for automatic analysis.",
    });

    const file = makeFile(100, "text/plain", "notes.txt");
    const result = await upload("tok", 1, makeFormData(file));

    expect(result.status).toBe("uploaded");
    expect(result.analysis?.verdict).toBe("skipped");
    expect(portalUploadsDb.updateDocumentRequestItem).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        status: "uploaded",
        aiVerdict: "skipped",
      })
    );
  });

  it("allows upload when current status is rejected (re-upload after AI failure)", async () => {
    portalUploadsDb.getDocumentRequestItemWithRequest.mockResolvedValueOnce([
      { ...canonicalDocRequestItem, itemStatus: "rejected" },
    ]);

    const result = await upload("tok", 1, makeFormData(makeFile(100)));

    expect(result.status).toBe("uploaded");
  });
});
