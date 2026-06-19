import {
  approveDocumentRequest,
  declineDocumentRequest,
  listApprovedRequestsForClient,
  listPendingDocumentRequests,
  updateDocumentRequest,
} from "@/lib/document_requests";
import { getCurrentUser } from "@/lib/supabase/auth";
import { buildSelectChain } from "../_helpers/drizzle";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const mockUpdateWhere = vi.fn();
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockDeleteWhere = vi.fn();
const mockInsertValues = vi.fn();

vi.mock("@db/db", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(() => ({ set: mockUpdateSet })),
    delete: vi.fn(() => ({ where: mockDeleteWhere })),
    insert: vi.fn(() => ({ values: mockInsertValues })),
    transaction: vi.fn(),
  },
}));

import { db } from "@db/db";

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  mockUpdateWhere.mockResolvedValue(undefined);
  mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
  mockDeleteWhere.mockResolvedValue(undefined);
  mockInsertValues.mockResolvedValue(undefined);
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

const mockUser = { id: "user_1" };

// ─── listPendingDocumentRequests ─────────────────────────────────────────────

describe("listPendingDocumentRequests", () => {
  it("throws Unauthorized when no user is authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(listPendingDocumentRequests(mockUser.id)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("returns empty array when no pending requests exist", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    (db.select as Mock).mockReturnValue(buildSelectChain([]));

    const result = await listPendingDocumentRequests(mockUser.id);
    expect(result).toEqual([]);
  });

  it("returns mapped requests with their items", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);

    const requestRow = {
      id: 7,
      eventId: "evt_1",
      clientId: 3,
      status: "pending_approval",
      createdAt: new Date("2026-04-01T12:00:00.000Z"),
      eventTitle: "Initial OPT consult",
      eventDateTime: new Date("2026-03-30T10:00:00.000Z"),
    };
    const itemRow = {
      id: 100,
      requestId: 7,
      name: "Passport",
      description: "Bio page only",
      sortOrder: 0,
      status: "pending",
      uploadedFileId: null,
      uploadedAt: null,
    };

    (db.select as Mock)
      .mockReturnValueOnce(buildSelectChain([requestRow]))
      .mockReturnValueOnce(buildSelectChain([itemRow]));

    const result = await listPendingDocumentRequests(mockUser.id);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 7,
      eventId: "evt_1",
      eventTitle: "Initial OPT consult",
      clientId: 3,
      status: "pending_approval",
    });
    expect(result[0].eventDateTime).toBe("2026-03-30T10:00:00.000Z");
    expect(result[0].items).toHaveLength(1);
    expect(result[0].items[0]).toMatchObject({
      id: 100,
      name: "Passport",
      description: "Bio page only",
      status: "pending",
    });
  });
});

// ─── updateDocumentRequest ───────────────────────────────────────────────────

describe("updateDocumentRequest", () => {
  it("throws Unauthorized when no user is authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(updateDocumentRequest(1, { clientId: 5 })).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("throws when the request is not owned by the user", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    (db.select as Mock).mockReturnValue(buildSelectChain([]));

    await expect(updateDocumentRequest(1, { clientId: 5 })).rejects.toThrow(
      "Document request not found"
    );
  });

  it("runs a transaction that updates clientId and diffs items", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    (db.select as Mock).mockReturnValue(buildSelectChain([{ id: 1 }]));

    const txUpdateWhere = vi.fn().mockResolvedValue(undefined);
    const txUpdateSet = vi.fn(() => ({ where: txUpdateWhere }));
    const txDeleteWhere = vi.fn().mockResolvedValue(undefined);
    const txInsertValues = vi.fn().mockResolvedValue(undefined);
    const txExistingItems = [{ id: 11 }, { id: 12 }];
    const txSelectWhere = vi.fn().mockResolvedValue(txExistingItems);
    const txSelectFrom = vi.fn(() => ({ where: txSelectWhere }));

    const tx = {
      update: vi.fn(() => ({ set: txUpdateSet })),
      delete: vi.fn(() => ({ where: txDeleteWhere })),
      insert: vi.fn(() => ({ values: txInsertValues })),
      select: vi.fn(() => ({ from: txSelectFrom })),
    };

    (db.transaction as Mock).mockImplementation(
      async (fn: (t: unknown) => Promise<void>) => fn(tx)
    );

    await updateDocumentRequest(1, {
      clientId: 99,
      items: [
        { id: 11, name: "Passport", description: null, sortOrder: 0 },
        { name: "Form I-94", description: "Latest", sortOrder: 1 },
      ],
    });

    expect(tx.update).toHaveBeenCalled();
    expect(txUpdateSet).toHaveBeenCalledWith({ clientId: 99 });
    expect(tx.delete).toHaveBeenCalled();
    expect(tx.insert).toHaveBeenCalled();
    expect(txInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Form I-94", sortOrder: 1 })
    );
  });
});

// ─── approveDocumentRequest ──────────────────────────────────────────────────

describe("approveDocumentRequest", () => {
  it("throws Unauthorized when no user is authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(approveDocumentRequest(1)).rejects.toThrow("Unauthorized");
  });

  it("throws when the request is not found", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    (db.select as Mock).mockReturnValue(buildSelectChain([]));

    await expect(approveDocumentRequest(1)).rejects.toThrow(
      "Document request not found"
    );
  });

  it("throws when clientId is null", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    (db.select as Mock).mockReturnValue(buildSelectChain([{ clientId: null }]));

    await expect(approveDocumentRequest(1)).rejects.toThrow(
      "Client must be selected before approval"
    );
  });

  it("sets status to approved with approvedAt when clientId is set", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    (db.select as Mock).mockReturnValue(buildSelectChain([{ clientId: 42 }]));

    await approveDocumentRequest(1);

    expect(db.update).toHaveBeenCalled();
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "approved",
        approvedAt: expect.any(Date),
      })
    );
  });
});

// ─── declineDocumentRequest ──────────────────────────────────────────────────

describe("declineDocumentRequest", () => {
  it("throws Unauthorized when no user is authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(declineDocumentRequest(1)).rejects.toThrow("Unauthorized");
  });

  it("sets status to declined for an owned request", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    (db.select as Mock).mockReturnValue(buildSelectChain([{ id: 1 }]));

    await declineDocumentRequest(1);

    expect(mockUpdateSet).toHaveBeenCalledWith({ status: "declined" });
  });
});

// ─── listApprovedRequestsForClient ───────────────────────────────────────────

describe("listApprovedRequestsForClient", () => {
  it("returns empty when no approved requests exist", async () => {
    (db.select as Mock).mockReturnValue(buildSelectChain([]));

    const result = await listApprovedRequestsForClient(5);
    expect(result).toEqual([]);
  });

  it("groups items under their request and includes uploaded file info", async () => {
    const requestRow = {
      id: 1,
      approvedAt: new Date("2026-04-05T10:00:00.000Z"),
      eventTitle: "Strategy meeting",
      eventDateTime: new Date("2026-04-04T10:00:00.000Z"),
    };
    const itemRow = {
      id: 50,
      requestId: 1,
      name: "Passport",
      description: null,
      sortOrder: 0,
      status: "uploaded",
      uploadedFileId: 200,
      uploadedAt: new Date("2026-04-06T10:00:00.000Z"),
      uploadedFileName: "passport.pdf",
      uploadedFilePath: "documents/u/req-1/passport.pdf",
    };

    (db.select as Mock)
      .mockReturnValueOnce(buildSelectChain([requestRow]))
      .mockReturnValueOnce(buildSelectChain([itemRow]));

    const result = await listApprovedRequestsForClient(7);

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
