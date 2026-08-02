import type {
  CaseFileRow,
  CaseRow,
  ClientRow,
  PortalMainDB,
  PortalTokenRow,
} from "@db/classes/portal_main_db";

export const canonicalPortalMainToken: PortalTokenRow = {
  id: 3,
  clientId: 1,
  token: "portal-token-1",
  enabled: true,
  settings: {},
  lastAccessedAt: null,
  chatStarred: false,
  chatArchived: false,
  userId: "user_1",
  createdAt: new Date(),
};

export const canonicalPortalMainClient: ClientRow = {
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

export const canonicalPortalMainCase: CaseRow = {
  id: 5,
  name: "Estate Case",
  description: null,
  status: "in-progress",
  dueDate: "2026-08-01",
  priority: "medium",
  clientId: 1,
  userId: "user_1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const canonicalPortalMainFile: CaseFileRow = {
  id: 7,
  caseId: 5,
  userId: "user_1",
  name: "contract.pdf",
  path: "cases/user_1/contract.pdf",
  size: 100,
  mimeType: "application/pdf",
  createdAt: new Date(),
  updatedAt: new Date(),
};

export type FakePortalMainDb = {
  [K in keyof PortalMainDB]: Mock<PortalMainDB[K]>;
};

export function makeFakePortalMainDb(
  overrides: Partial<PortalMainDB> = {}
): FakePortalMainDb {
  const fake = {
    getPortalByToken: vi.fn(async () => [{ ...canonicalPortalMainToken }]),
    touchLastAccessed: vi.fn(async () => {}),
    getClientById: vi.fn(async () => [{ ...canonicalPortalMainClient }]),
    getCasesForClient: vi.fn(async () => [{ ...canonicalPortalMainCase }]),
    getCaseFilesForCases: vi.fn(async () => [{ ...canonicalPortalMainFile }]),
    getCaseFileById: vi.fn(async () => [{ ...canonicalPortalMainFile }]),
    getCaseById: vi.fn(async () => [{ ...canonicalPortalMainCase }]),
  } satisfies PortalMainDB;

  return Object.assign(fake, overrides) as FakePortalMainDb;
}
