import type {
  ClientRow,
  ClientsDB,
  ClientWithCaseCountsRow,
  NewClientRow,
  PortalTokenRow,
} from "@db/classes/clients_db";

export const canonicalClientRow: ClientRow = {
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

export const canonicalClientWithCounts: ClientWithCaseCountsRow = {
  id: 1,
  name: "Jane Client",
  email: "jane@client.com",
  phone: null,
  status: "active",
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  totalCases: 2,
  completedCases: 1,
  activeCases: 1,
};

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

export type FakeClientsDb = {
  [K in keyof ClientsDB]: Mock<ClientsDB[K]>;
};

export function makeFakeClientsDb(
  overrides: Partial<ClientsDB> = {}
): FakeClientsDb {
  const fake = {
    getClientsWithCaseCounts: vi.fn(async (_userId: string) => [
      { ...canonicalClientWithCounts },
    ]),
    getClientWithCaseCounts: vi.fn(async (clientId: number) => [
      { ...canonicalClientWithCounts, id: clientId },
    ]),
    getClientByName: vi.fn(async (name: string) => [
      { ...canonicalClientWithCounts, name },
    ]),
    getPortalTokenByClient: vi.fn(async (): Promise<PortalTokenRow[]> => [
      { ...canonicalPortalTokenRow },
    ]),
    getClientCasesWithStats: vi.fn(async () => []),
    getClientOutlookEmails: vi.fn(async () => []),
    getPortalDetails: vi.fn(async () => []),
    getPortalEnabledClients: vi.fn(async () => [
      { id: 1, name: "Jane Client", email: "jane@client.com" as string | null },
    ]),
    insertClient: vi.fn(async (values: NewClientRow): Promise<ClientRow> => ({
      ...canonicalClientRow,
      ...values,
      id: 42,
      email: values.email ?? null,
      phone: values.phone ?? null,
      notes: values.notes ?? null,
      status: values.status ?? "active",
    })),
    txAddClientAndPortal: vi.fn(
      async (values: NewClientRow): Promise<ClientRow & PortalTokenRow> => ({
        ...canonicalPortalTokenRow,
        clientId: 42,
        ...canonicalClientRow,
        ...values,
        id: 42,
        email: values.email ?? null,
        phone: values.phone ?? null,
        notes: values.notes ?? null,
        status: values.status ?? "active",
      })
    ),
    updateClient: vi.fn(async () => {}),
    deleteClient: vi.fn(async () => {}),
  } satisfies ClientsDB;

  return Object.assign(fake, overrides) as FakeClientsDb;
}
