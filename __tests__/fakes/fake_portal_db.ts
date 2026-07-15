import type { PortalDB, PortalTokenRow } from "@db/portal_db";

export const canonicalPortalTokenRow: PortalTokenRow = {
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

export type FakePortalDb = {
  [K in keyof PortalDB]: Mock<PortalDB[K]>;
};

export function makeFakePortalDb(
  overrides: Partial<PortalDB> = {}
): FakePortalDb {
  const fake = {
    getClientOwnedByUser: vi.fn(async () => [{ id: 1, name: "Jane Client" }]),
    getPortalTokenByClient: vi.fn(async () => [{ ...canonicalPortalTokenRow }]),
    updatePortalToken: vi.fn(async () => ({ ...canonicalPortalTokenRow })),
    insertPortalToken: vi.fn(async () => ({ ...canonicalPortalTokenRow })),
  } satisfies PortalDB;

  return Object.assign(fake, overrides) as FakePortalDb;
}
