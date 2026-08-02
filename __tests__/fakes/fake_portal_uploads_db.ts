import type {
  CaseFileRow,
  ClientRow,
  DocRequestItemWithRequest,
  PortalTokenRow,
  PortalUploadsDB,
} from "@db/classes/portal_uploads_db";

export const canonicalUploadsPortalToken: PortalTokenRow = {
  id: 3,
  clientId: 1,
  token: "portal-token-1",
  enabled: true,
  settings: { fileSharing: true },
  lastAccessedAt: null,
  chatStarred: false,
  chatArchived: false,
  userId: "user_1",
  createdAt: new Date(),
};

export const canonicalDocRequestItem: DocRequestItemWithRequest = {
  itemId: 10,
  itemName: "Passport",
  itemDescription: "Bio page",
  itemStatus: "pending",
  requestId: 7,
  requestStatus: "approved",
  requestClientId: 1,
};

export const canonicalUploadedFile: CaseFileRow = {
  id: 20,
  caseId: 5,
  userId: "user_1",
  name: "passport.pdf",
  path: "documents/user_1/req-7/passport.pdf",
  size: 1024,
  mimeType: "application/pdf",
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const canonicalUploadClient: ClientRow = {
  id: 1,
  name: "Jane Client",
  email: "jane@client.com",
  phone: null,
  notes: null,
  status: "active",
  userId: "user_1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

export type FakePortalUploadsDb = {
  [K in keyof PortalUploadsDB]: Mock<PortalUploadsDB[K]>;
};

export function makeFakePortalUploadsDb(
  overrides: Partial<PortalUploadsDB> = {}
): FakePortalUploadsDb {
  const fake = {
    getPortalTokenByToken: vi.fn(async () => [
      { ...canonicalUploadsPortalToken },
    ]),
    getDocumentRequestItemWithRequest: vi.fn(async () => [
      { ...canonicalDocRequestItem },
    ]),
    getFirstCaseForClient: vi.fn(async () => [{ id: 5 }]),
    getCaseForClient: vi.fn(async () => [{ id: 5 }]),
    getClientById: vi.fn(async () => [{ ...canonicalUploadClient }]),
    insertCaseFile: vi.fn(async () => ({ ...canonicalUploadedFile })),
    updateDocumentRequestItem: vi.fn(async () => {}),
    incrementAiCredits: vi.fn(async () => {}),
    insertCaseFileWithStorage: vi.fn(async () => ({
      ...canonicalUploadedFile,
    })),
  } satisfies PortalUploadsDB;

  return Object.assign(fake, overrides) as FakePortalUploadsDb;
}
