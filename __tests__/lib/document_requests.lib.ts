import {
  approveDocumentRequest,
  declineDocumentRequest,
  listApprovedRequestsForClient,
  listPendingDocumentRequests,
  updateDocumentRequest,
} from "@/lib/document_requests";
import { getCurrentUser } from "@/lib/supabase/auth";
import { ValidationError } from "@/lib/util/validation";
import {
  canonicalPendingRequest,
  canonicalRequestItem,
  makeFakeDocumentRequestsDb,
} from "../fakes/fake_document_requests_db";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const documentRequestsDb = makeFakeDocumentRequestsDb();

const mockUser = { id: "user_1" };

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ─── listPendingDocumentRequests ─────────────────────────────────────────────

describe("listPendingDocumentRequests", () => {
  it("throws Unauthorized when no user is authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(
      listPendingDocumentRequests(mockUser.id, documentRequestsDb)
    ).rejects.toThrow("Unauthorized");
  });

  it("returns empty array when no pending requests exist", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    documentRequestsDb.getPendingRequests.mockResolvedValueOnce([]);

    const result = await listPendingDocumentRequests(
      mockUser.id,
      documentRequestsDb
    );
    expect(result).toEqual([]);
    expect(documentRequestsDb.getItemsByRequestIds).not.toHaveBeenCalled();
  });

  it("returns mapped requests with their items", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    documentRequestsDb.getPendingRequests.mockResolvedValueOnce([
      { ...canonicalPendingRequest },
    ]);
    documentRequestsDb.getItemsByRequestIds.mockResolvedValueOnce([
      { ...canonicalRequestItem },
    ]);

    const result = await listPendingDocumentRequests(
      mockUser.id,
      documentRequestsDb
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: canonicalPendingRequest.id,
      eventId: canonicalPendingRequest.eventId,
      eventTitle: canonicalPendingRequest.eventTitle,
      clientId: canonicalPendingRequest.clientId,
      status: "pending_approval",
    });
    expect(result[0].items).toHaveLength(1);
    expect(result[0].items[0]).toMatchObject({
      id: canonicalRequestItem.id,
      name: "Passport",
      status: "pending",
    });
  });
});

// ─── updateDocumentRequest ───────────────────────────────────────────────────

describe("updateDocumentRequest", () => {
  it("throws Unauthorized when no user is authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(
      updateDocumentRequest(1, { clientId: 5 }, documentRequestsDb)
    ).rejects.toThrow("Unauthorized");
  });

  it("throws when the request is not owned by the user", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    documentRequestsDb.getRequestOwner.mockResolvedValueOnce([]);

    await expect(
      updateDocumentRequest(1, { clientId: 5 }, documentRequestsDb)
    ).rejects.toThrow("Document request not found");
    expect(documentRequestsDb.applyRequestPatch).not.toHaveBeenCalled();
  });

  it("applies the patch atomically once ownership is confirmed", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);

    const patch = {
      clientId: 99,
      items: [
        { id: 11, name: "Passport", description: null, sortOrder: 0 },
        { name: "Form I-94", description: "Latest", sortOrder: 1 },
      ],
    };
    await updateDocumentRequest(1, patch, documentRequestsDb);

    expect(documentRequestsDb.getRequestOwner).toHaveBeenCalledWith(
      1,
      "user_1"
    );
    expect(documentRequestsDb.applyRequestPatch).toHaveBeenCalledWith(1, patch);
  });
});

// ─── approveDocumentRequest ──────────────────────────────────────────────────

describe("approveDocumentRequest", () => {
  it("throws Unauthorized when no user is authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(approveDocumentRequest(1, documentRequestsDb)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("throws when the request is not found", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    documentRequestsDb.getRequestClientId.mockResolvedValueOnce([]);

    await expect(approveDocumentRequest(1, documentRequestsDb)).rejects.toThrow(
      "Document request not found"
    );
  });

  it("throws a ValidationError when clientId is null", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    documentRequestsDb.getRequestClientId.mockResolvedValueOnce([
      { clientId: null },
    ]);

    let error: unknown;
    try {
      await approveDocumentRequest(1, documentRequestsDb);
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as Error).message).toBe(
      "Client must be selected before approval"
    );
  });

  it("sets status to approved with approvedAt when clientId is set", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    documentRequestsDb.getRequestClientId.mockResolvedValueOnce([
      { clientId: 42 },
    ]);

    await approveDocumentRequest(1, documentRequestsDb);

    expect(documentRequestsDb.setRequestStatus).toHaveBeenCalledWith(
      1,
      "approved",
      expect.any(Date)
    );
  });
});

// ─── declineDocumentRequest ──────────────────────────────────────────────────

describe("declineDocumentRequest", () => {
  it("throws Unauthorized when no user is authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(declineDocumentRequest(1, documentRequestsDb)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("throws when the request is not owned by the user", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    documentRequestsDb.getRequestOwner.mockResolvedValueOnce([]);

    await expect(declineDocumentRequest(1, documentRequestsDb)).rejects.toThrow(
      "Document request not found"
    );
  });

  it("sets status to declined for an owned request", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);

    await declineDocumentRequest(1, documentRequestsDb);

    expect(documentRequestsDb.setRequestStatus).toHaveBeenCalledWith(
      1,
      "declined"
    );
  });
});

// ─── listApprovedRequestsForClient ───────────────────────────────────────────

describe("listApprovedRequestsForClient", () => {
  it("returns empty when no approved requests exist", async () => {
    documentRequestsDb.getApprovedRequestsForClient.mockResolvedValueOnce([]);

    const result = await listApprovedRequestsForClient(5, documentRequestsDb);
    expect(result).toEqual([]);
    expect(
      documentRequestsDb.getItemsWithFilesByRequestIds
    ).not.toHaveBeenCalled();
  });

  it("groups items under their request and includes uploaded file info", async () => {
    documentRequestsDb.getApprovedRequestsForClient.mockResolvedValueOnce([
      {
        id: 1,
        approvedAt: new Date("2026-04-05T10:00:00.000Z"),
        eventTitle: "Strategy meeting",
        eventDateTime: new Date("2026-04-04T10:00:00.000Z"),
      },
    ]);
    documentRequestsDb.getItemsWithFilesByRequestIds.mockResolvedValueOnce([
      {
        id: 50,
        requestId: 1,
        name: "Passport",
        description: null,
        sortOrder: 0,
        status: "uploaded",
        uploadedFileId: 200,
        uploadedAt: new Date("2026-04-06T10:00:00.000Z"),
        aiVerdict: null,
        aiReasoning: null,
        aiAnalyzedAt: null,
        uploadedFileName: "passport.pdf",
        uploadedFilePath: "documents/u/req-1/passport.pdf",
      },
    ]);

    const result = await listApprovedRequestsForClient(7, documentRequestsDb);

    expect(result).toHaveLength(1);
    expect(result[0].eventTitle).toBe("Strategy meeting");
    expect(result[0].items).toHaveLength(1);
    expect(result[0].items[0]).toMatchObject({
      id: 50,
      name: "Passport",
      status: "uploaded",
      uploadedFile: {
        id: 200,
        name: "passport.pdf",
        path: "documents/u/req-1/passport.pdf",
      },
    });
  });
});
