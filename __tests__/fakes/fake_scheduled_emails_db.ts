import type {
  Claimed,
  InsertSchEmail,
  ScheEmail,
  ScheduledEmailsDB,
} from "@db/scheduled_emails_db";

export const canonicalScheduledEmail: ScheEmail = {
  id: 5,
  userId: "user_1",
  status: "sent",
  toEmail: "client@example.com",
  toName: "Jane Client",
  subject: "Quarterly review",
  bodyHtml: "<p>Hello</p>",
  bodyText: "Hello",
  clientId: 1,
  scheduledAt: new Date(),
  timezone: "UTC",
  recurring: "",
  sentAt: new Date(),
  errorMessage: null,
  attachments: null,
  createdAt: new Date(),
};

export type FakeScheduledEmailsDb = {
  [K in keyof ScheduledEmailsDB]: Mock<ScheduledEmailsDB[K]>;
};

export function makeFakeScheduledEmailsDb(
  overrides: Partial<ScheduledEmailsDB> = {}
): FakeScheduledEmailsDb {
  const fake = {
    getScheduledEmailsByUser: vi.fn(
      async (_userId: string): Promise<ScheEmail[]> => [
        { ...canonicalScheduledEmail },
      ]
    ),
    getDueScheduledEmailIds: vi.fn(async () => [{ id: 5 }]),
    claimEmail: vi.fn(async (_id: number): Promise<Claimed | []> => {
      return [{ ...canonicalScheduledEmail }];
    }),
    unclaimEmail: vi.fn(async (_id: number): Promise<void> => {}),
    markAsFailed: vi.fn(async (_id: number): Promise<void> => {}),
    getUserRows: vi.fn(async (_userId: string) => [
      { name: "Dan", email: "dan@example.com" },
    ]),
    getAllClients: vi.fn(async (_userId: string) => [
      { id: 1, email: "client@example.com" },
    ]),
    insertOutlookEmail: vi.fn(async () => {}),
    catchFailedInsertOutlookEmail: vi.fn(async () => {}),
    insertScheduledEmail: vi.fn(async (input: InsertSchEmail) => {
      return {
        ...input,
        id: 1,
        status: "pending",
        sentAt: null,
        errorMessage: null,
        createdAt: new Date(),
      };
    }),
    getScheduledEmailById: vi.fn(
      async (scheduledEmailId: number, userId: string) => {
        if (scheduledEmailId === 5 && userId === "user_1") {
          return [{ id: 5 }];
        }
        return [];
      }
    ),
    deleteScheduledEmailById: vi.fn(
      async (_scheduledEmailId: number, _userId: string) => [{ id: 5 }]
    ),
  } satisfies ScheduledEmailsDB;

  return Object.assign(fake, overrides) as FakeScheduledEmailsDb;
}
