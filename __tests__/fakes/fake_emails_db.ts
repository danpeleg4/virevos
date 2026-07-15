import type { EmailRecentRow, EmailSearchRow, EmailsDB } from "@db/emails_db";

export const canonicalEmailRow: EmailSearchRow = {
  outlookId: "outlook-1",
  subject: "Quarterly review",
  fromEmail: "jane@client.com",
  fromName: "Jane Client",
  sentAt: new Date("2026-05-01T00:00:00Z"),
  isSent: false,
  snippet: "Let's discuss...",
};

export type FakeEmailsDb = {
  [K in keyof EmailsDB]: Mock<EmailsDB[K]>;
};

export function makeFakeEmailsDb(
  overrides: Partial<EmailsDB> = {}
): FakeEmailsDb {
  const fake = {
    getEmailsByOutlookIds: vi.fn(
      async (): Promise<EmailSearchRow[]> => [{ ...canonicalEmailRow }]
    ),
    getRecentUnsentEmails: vi.fn(
      async (): Promise<EmailRecentRow[]> => [
        { ...canonicalEmailRow, bodyText: "Hello", bodyHtml: null },
      ]
    ),
  } satisfies EmailsDB;

  return Object.assign(fake, overrides) as FakeEmailsDb;
}
