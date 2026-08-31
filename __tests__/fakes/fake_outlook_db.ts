import type {
  OutlookDB,
  OutlookEmailRow,
  OutlookEmailWithClientRow,
  OutlookSyncStateRow,
  OutlookTokenRow,
} from "@db/classes/outlook_db";

export const canonicalOutlookToken: OutlookTokenRow = {
  id: 1,
  accessToken: "access-token-1",
  refreshToken: "refresh-token-1",
  expiresIn: Date.now() + 60 * 60 * 1000,
  connected: true,
  userId: "user_1",
};

export const canonicalOutlookEmail: OutlookEmailRow = {
  id: 1,
  outlookId: "outlook-msg-1",
  conversationId: "conv-1",
  subject: "Hello",
  snippet: "Hi there",
  fromEmail: "jane@client.com",
  fromName: "Jane Client",
  toEmails: ["me@example.com"],
  ccEmails: [],
  bodyHtml: "<p>Hi there</p>",
  bodyText: "Hi there",
  isRead: false,
  isStarred: false,
  isArchived: false,
  isSent: false,
  hasAttachments: false,
  sentAt: new Date("2026-05-01T10:00:00Z"),
  clientId: null,
  userId: "user_1",
  createdAt: new Date(),
};

export const canonicalOutlookSyncState: OutlookSyncStateRow = {
  id: 1,
  calendarSubscriptionId: "sub-cal-1",
  emailSubscriptionId: "sub-email-1",
  calendarDeltaLink: "https://graph.microsoft.com/v1.0/delta-cal",
  emailDeltaLink: "https://graph.microsoft.com/v1.0/delta-email",
  sentEmailDeltaLink: "https://graph.microsoft.com/v1.0/delta-sent",
  clientState: "client-state-1",
  subscriptionExpiration: Date.now() + 3 * 24 * 60 * 60 * 1000,
  userId: "user_1",
};

export type FakeOutlookDb = {
  [K in keyof OutlookDB]: Mock<OutlookDB[K]>;
};

export function makeFakeOutlookDb(
  overrides: Partial<OutlookDB> = {}
): FakeOutlookDb {
  const fake = {
    getTokenByUserId: vi.fn(async () => [{ ...canonicalOutlookToken }]),
    insertToken: vi.fn(async () => {}),
    updateToken: vi.fn(async () => {}),

    getEmailById: vi.fn(async () => [{ ...canonicalOutlookEmail }]),
    getEmailsForUser: vi.fn(async (): Promise<OutlookEmailWithClientRow[]> => [
      { ...canonicalOutlookEmail, clientName: null },
    ]),
    getExistingEmailsForUser: vi.fn(async () => [{ ...canonicalOutlookEmail }]),
    insertEmails: vi.fn(async () => {}),
    updateEmail: vi.fn(async () => {}),
    deleteEmail: vi.fn(async () => {}),

    getSyncState: vi.fn(async () => [{ ...canonicalOutlookSyncState }]),
    findSyncStateBySubscriptionId: vi.fn(async () => [
      { ...canonicalOutlookSyncState },
    ]),
    getExpiringSyncStates: vi.fn(async () => [{ userId: "user_1" }]),
    upsertDeltaLinks: vi.fn(async () => {}),
    updateDeltaLinks: vi.fn(async () => {}),
    upsertSubscriptions: vi.fn(async () => {}),
    updateSubscriptionExpiration: vi.fn(async () => {}),
  } satisfies OutlookDB;

  return Object.assign(fake, overrides) as FakeOutlookDb;
}
