import type {
  InsertedChatMessage,
  PortalChatDB,
  PortalMessageRow,
  PortalTokenRow,
} from "@db/portal_chat_db";

export const canonicalPortalChatToken: PortalTokenRow = {
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

export const canonicalChatMessage: InsertedChatMessage = {
  id: 10,
  senderType: "client",
  body: "Hello",
  readAt: null,
  createdAt: new Date(),
};

export const canonicalPortalMessageRow: PortalMessageRow = {
  id: 10,
  portalId: 3,
  clientId: 1,
  userId: "user_1",
  senderType: "client",
  body: "Hello",
  readAt: null,
  createdAt: new Date(),
};

export type FakePortalChatDb = {
  [K in keyof PortalChatDB]: Mock<PortalChatDB[K]>;
};

export function makeFakePortalChatDb(
  overrides: Partial<PortalChatDB> = {}
): FakePortalChatDb {
  const fake = {
    getPortalForUser: vi.fn(async () => [{ ...canonicalPortalChatToken }]),
    getPortalByToken: vi.fn(async () => [{ ...canonicalPortalChatToken }]),
    insertMessage: vi.fn(async () => ({ ...canonicalChatMessage })),
    setChatStarred: vi.fn(async () => {}),
    setChatArchived: vi.fn(async () => {}),
    getLatestClientMessage: vi.fn(async () => [{ id: 10 }]),
    markMessageUnread: vi.fn(async () => {}),
    deleteMessages: vi.fn(async () => {}),
    resetChatFlags: vi.fn(async () => {}),
    getMessagesForPortal: vi.fn(async () => [{ ...canonicalPortalMessageRow }]),
    markClientMessagesRead: vi.fn(async () => {}),
    markAgencyMessagesRead: vi.fn(async () => {}),
  } satisfies PortalChatDB;

  return Object.assign(fake, overrides) as FakePortalChatDb;
}
