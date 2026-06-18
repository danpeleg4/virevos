import { uploadDocumentRequestItem } from "@/lib/portal_document_uploads";
import { db } from "@db/db";

vi.mock("@db/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({ get: () => null })),
}));

// eslint-disable-next-line no-var
var mockUpload: Mock;
vi.mock("@/lib/storage", () => {
  mockUpload = vi.fn();
  return { uploadFile: mockUpload };
});

vi.mock("@/lib/supabase/supabase", () => ({
  FILES_BUCKET: "projectFiles",
}));

// eslint-disable-next-line no-var
var mockAnalyze: Mock;
vi.mock("@/lib/ai/document_analysis", () => {
  mockAnalyze = vi.fn();
  return { analyzeDocumentRequirement: mockAnalyze };
});

// eslint-disable-next-line no-var
var mockAssertCanUseAI: Mock;
vi.mock("@/lib/plan_limits", () => {
  mockAssertCanUseAI = vi.fn();
  return { assertCanUseAI: mockAssertCanUseAI };
});

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

const portalToken = {
  id: 10,
  clientId: 7,
  enabled: true,
  settings: { fileSharing: true },
  userId: "user_1",
};

const baseItemRow = {
  itemId: 1,
  itemName: "Tax return",
  itemDescription: "Most recent year",
  itemStatus: "pending",
  requestId: 1,
  requestStatus: "approved",
  requestClientId: 7,
};

function setupPortalLookup(rows: unknown[]) {
  const tokenLimit = vi.fn().mockResolvedValue(rows);
  const tokenWhere = vi.fn(() => ({ limit: tokenLimit }));
  const tokenFrom = vi.fn(() => ({ where: tokenWhere }));
  return { from: tokenFrom };
}

function setupItemLookup(rows: unknown[]) {
  const itemLimit = vi.fn().mockResolvedValue(rows);
  const itemWhere = vi.fn(() => ({ limit: itemLimit }));
  const itemInnerJoin = vi.fn(() => ({ where: itemWhere }));
  const itemFrom = vi.fn(() => ({ innerJoin: itemInnerJoin }));
  return { from: itemFrom };
}

function setupCaseLookup(rows: unknown[]) {
  const caseLimit = vi.fn().mockResolvedValue(rows);
  const caseWhere = vi.fn(() => ({ limit: caseLimit }));
  const caseFrom = vi.fn(() => ({ where: caseWhere }));
  return { from: caseFrom };
}

function primeHappyPath() {
  const insertedRow = {
    id: 555,
    caseId: 22,
    userId: "user_1",
    name: "doc.pdf",
    path: "documents/user_1/req-1/now-doc.pdf",
    size: 100,
    mimeType: "application/pdf",
    createdAt: new Date(),
  };

  (db.select as Mock)
    .mockReturnValueOnce(setupPortalLookup([portalToken]))
    .mockReturnValueOnce(setupItemLookup([baseItemRow]))
    .mockReturnValueOnce(setupCaseLookup([{ id: 22 }]));

  const returning = vi.fn().mockResolvedValue([insertedRow]);
  const insertValues = vi.fn(() => ({ returning }));
  (db.insert as Mock).mockReturnValue({ values: insertValues });

  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  (db.update as Mock).mockReturnValue({ set: updateSet });

  mockUpload.mockResolvedValueOnce(undefined);

  return { insertValues, updateSet };
}

describe("uploadDocumentRequestItem", () => {
  it("throws 400 for invalid itemId", async () => {
    await expectStatus(
      uploadDocumentRequestItem("tok", NaN, makeFormData(null)),
      400
    );
  });

  it("throws 404 for invalid token", async () => {
    (db.select as Mock).mockReturnValueOnce(setupPortalLookup([]));
    await expectStatus(
      uploadDocumentRequestItem("bad", 1, makeFormData(null)),
      404
    );
  });

  it("throws 404 for disabled portal", async () => {
    (db.select as Mock).mockReturnValueOnce(
      setupPortalLookup([{ ...portalToken, enabled: false }])
    );
    await expectStatus(
      uploadDocumentRequestItem("tok", 1, makeFormData(null)),
      404
    );
  });

  it("throws 403 when fileSharing is disabled", async () => {
    (db.select as Mock).mockReturnValueOnce(
      setupPortalLookup([{ ...portalToken, settings: { fileSharing: false } }])
    );
    await expectStatus(
      uploadDocumentRequestItem("tok", 1, makeFormData(null)),
      403
    );
  });

  it("throws 404 when item is not found", async () => {
    (db.select as Mock)
      .mockReturnValueOnce(setupPortalLookup([portalToken]))
      .mockReturnValueOnce(setupItemLookup([]));
    await expectStatus(
      uploadDocumentRequestItem("tok", 1, makeFormData(null)),
      404
    );
  });

  it("throws 403 when item belongs to a different client", async () => {
    (db.select as Mock)
      .mockReturnValueOnce(setupPortalLookup([portalToken]))
      .mockReturnValueOnce(
        setupItemLookup([{ ...baseItemRow, requestClientId: 999 }])
      );
    await expectStatus(
      uploadDocumentRequestItem("tok", 1, makeFormData(null)),
      403
    );
  });

  it("throws 403 when request is not approved", async () => {
    (db.select as Mock)
      .mockReturnValueOnce(setupPortalLookup([portalToken]))
      .mockReturnValueOnce(
        setupItemLookup([{ ...baseItemRow, requestStatus: "pending_approval" }])
      );
    await expectStatus(
      uploadDocumentRequestItem("tok", 1, makeFormData(null)),
      403
    );
  });

  it("throws 409 when item is already uploaded", async () => {
    (db.select as Mock)
      .mockReturnValueOnce(setupPortalLookup([portalToken]))
      .mockReturnValueOnce(
        setupItemLookup([{ ...baseItemRow, itemStatus: "uploaded" }])
      );
    await expectStatus(
      uploadDocumentRequestItem("tok", 1, makeFormData(null)),
      409
    );
  });

  it("throws 400 when no file provided", async () => {
    (db.select as Mock)
      .mockReturnValueOnce(setupPortalLookup([portalToken]))
      .mockReturnValueOnce(setupItemLookup([baseItemRow]));
    await expectStatus(
      uploadDocumentRequestItem("tok", 1, makeFormData(null)),
      400
    );
  });

  it("throws 400 when file exceeds 10 MB", async () => {
    (db.select as Mock)
      .mockReturnValueOnce(setupPortalLookup([portalToken]))
      .mockReturnValueOnce(setupItemLookup([baseItemRow]));
    const big = makeFile(11 * 1024 * 1024);
    await expectStatus(
      uploadDocumentRequestItem("tok", 1, makeFormData(big)),
      400
    );
  });

  it("uploads, runs analyzer, and marks item uploaded when verdict meets", async () => {
    const { insertValues, updateSet } = primeHappyPath();

    const file = makeFile(100);
    const result = await uploadDocumentRequestItem("tok", 1, makeFormData(file));

    expect(result.itemId).toBe(1);
    expect(result.file.id).toBe(555);
    expect(result.status).toBe("uploaded");
    expect(result.analysis).toEqual({
      verdict: "meets",
      reasoning: "Looks good",
    });

    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockAnalyze).toHaveBeenCalledWith(
      expect.objectContaining({
        itemName: "Tax return",
        itemDescription: "Most recent year",
        mimeType: "application/pdf",
        fileName: "doc.pdf",
      })
    );
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ caseId: 22, userId: "user_1" })
    );
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "uploaded",
        uploadedFileId: 555,
        uploadedAt: expect.any(Date),
        aiVerdict: "meets",
        aiReasoning: "Looks good",
        aiAnalyzedAt: expect.any(Date),
      })
    );
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ aiCredits: expect.anything() })
    );
  });

  it("increments ai_credits on does_not_meet verdict", async () => {
    mockAnalyze.mockResolvedValueOnce({
      verdict: "does_not_meet",
      reasoning: "Wrong document",
    });
    const { updateSet } = primeHappyPath();

    await uploadDocumentRequestItem("tok", 1, makeFormData(makeFile(100)));

    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ aiCredits: expect.anything() })
    );
  });

  it("does NOT increment ai_credits when verdict is skipped", async () => {
    mockAnalyze.mockResolvedValueOnce({
      verdict: "skipped",
      reasoning: "File type not supported for automatic analysis.",
    });
    const { updateSet } = primeHappyPath();

    await uploadDocumentRequestItem(
      "tok",
      1,
      makeFormData(makeFile(100, "text/plain", "notes.txt"))
    );

    const credits = updateSet.mock.calls.filter(
      (call: unknown[]) =>
        typeof call[0] === "object" &&
        call[0] !== null &&
        "ai_credits" in (call[0] as Record<string, unknown>)
    );
    expect(credits).toHaveLength(0);
  });

  it("skips AI analysis transparently when user is over AI limit (client sees only uploaded)", async () => {
    mockAssertCanUseAI.mockRejectedValueOnce(
      new Error("AI credit limit reached")
    );
    const { updateSet } = primeHappyPath();

    const result = await uploadDocumentRequestItem(
      "tok",
      1,
      makeFormData(makeFile(100))
    );

    expect(result.status).toBe("uploaded");
    expect(result.analysis).toBeUndefined();
    expect(mockAnalyze).not.toHaveBeenCalled();

    const credits = updateSet.mock.calls.filter(
      (call: unknown[]) =>
        typeof call[0] === "object" &&
        call[0] !== null &&
        "ai_credits" in (call[0] as Record<string, unknown>)
    );
    expect(credits).toHaveLength(0);

    const itemUpdates = updateSet.mock.calls.filter(
      (call: unknown[]) =>
        typeof call[0] === "object" &&
        call[0] !== null &&
        "status" in (call[0] as Record<string, unknown>)
    );
    expect(itemUpdates).toHaveLength(1);
    const itemSet = (itemUpdates[0] as unknown[])[0] as Record<string, unknown>;
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
    const { updateSet } = primeHappyPath();

    const result = await uploadDocumentRequestItem(
      "tok",
      1,
      makeFormData(makeFile(100))
    );

    expect(result.status).toBe("rejected");
    expect(result.analysis?.verdict).toBe("does_not_meet");
    expect(updateSet).toHaveBeenCalledWith(
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
    const { updateSet } = primeHappyPath();

    const file = makeFile(100, "text/plain", "notes.txt");
    const result = await uploadDocumentRequestItem("tok", 1, makeFormData(file));

    expect(result.status).toBe("uploaded");
    expect(result.analysis?.verdict).toBe("skipped");
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "uploaded",
        aiVerdict: "skipped",
      })
    );
  });

  it("allows upload when current status is rejected (re-upload after AI failure)", async () => {
    (db.select as Mock)
      .mockReturnValueOnce(setupPortalLookup([portalToken]))
      .mockReturnValueOnce(
        setupItemLookup([{ ...baseItemRow, itemStatus: "rejected" }])
      )
      .mockReturnValueOnce(setupCaseLookup([{ id: 22 }]));

    const returning = vi.fn().mockResolvedValue([
      {
        id: 556,
        caseId: 22,
        userId: "user_1",
        name: "doc.pdf",
        path: "p",
        size: 100,
        mimeType: "application/pdf",
        createdAt: new Date(),
      },
    ]);
    (db.insert as Mock).mockReturnValue({
      values: vi.fn(() => ({ returning })),
    });
    (db.update as Mock).mockReturnValue({
      set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
    });
    mockUpload.mockResolvedValueOnce(undefined);

    const result = await uploadDocumentRequestItem(
      "tok",
      1,
      makeFormData(makeFile(100))
    );

    expect(result.status).toBe("uploaded");
  });
});
