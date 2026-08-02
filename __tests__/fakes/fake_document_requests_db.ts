import type {
  ApprovedRequestRow,
  DocRequestItemRow,
  DocumentRequestsDB,
  ItemWithFileRow,
  PendingRequestRow,
} from "@db/classes/document_requests_db";

export const canonicalPendingRequest: PendingRequestRow = {
  id: 1,
  eventId: "evt-1",
  clientId: 5,
  status: "pending_approval",
  createdAt: new Date(),
  eventTitle: "Client Meeting",
  eventDateTime: new Date("2026-05-01T10:00:00Z"),
};

export const canonicalRequestItem: DocRequestItemRow = {
  id: 10,
  requestId: 1,
  name: "Passport",
  description: "Valid passport copy",
  sortOrder: 0,
  status: "pending",
  uploadedFileId: null,
  uploadedAt: null,
  aiVerdict: null,
  aiReasoning: null,
  aiAnalyzedAt: null,
};

export type FakeDocumentRequestsDb = {
  [K in keyof DocumentRequestsDB]: Mock<DocumentRequestsDB[K]>;
};

export function makeFakeDocumentRequestsDb(
  overrides: Partial<DocumentRequestsDB> = {}
): FakeDocumentRequestsDb {
  const fake = {
    getPendingRequests: vi.fn(
      async (): Promise<PendingRequestRow[]> => [{ ...canonicalPendingRequest }]
    ),
    getItemsByRequestIds: vi.fn(
      async (): Promise<DocRequestItemRow[]> => [{ ...canonicalRequestItem }]
    ),
    getItemsWithFilesByRequestIds: vi.fn(
      async (): Promise<ItemWithFileRow[]> => [
        {
          ...canonicalRequestItem,
          uploadedFileName: null,
          uploadedFilePath: null,
        },
      ]
    ),
    getRequestOwner: vi.fn(async (requestId: number) => [{ id: requestId }]),
    getRequestClientId: vi.fn(async () => [{ clientId: 5 }]),
    setRequestClientId: vi.fn(async () => {}),
    getItemIdsForRequest: vi.fn(async () => [{ id: 10 }]),
    deleteItems: vi.fn(async () => {}),
    updateItem: vi.fn(async () => {}),
    insertItem: vi.fn(async () => {}),
    applyRequestPatch: vi.fn(async () => {}),
    setRequestStatus: vi.fn(async () => {}),
    getApprovedRequestsForClient: vi.fn(
      async (): Promise<ApprovedRequestRow[]> => [
        {
          id: 1,
          approvedAt: new Date(),
          eventTitle: "Client Meeting",
          eventDateTime: new Date("2026-05-01T10:00:00Z"),
        },
      ]
    ),
  } satisfies DocumentRequestsDB;

  return Object.assign(fake, overrides) as FakeDocumentRequestsDb;
}
