import type { IntegrationsDB } from "@db/integrations_db";

export type FakeIntegrationsDb = {
  [K in keyof IntegrationsDB]: Mock<IntegrationsDB[K]>;
};

export function makeFakeIntegrationsDb(
  overrides: Partial<IntegrationsDB> = {}
): FakeIntegrationsDb {
  const fake = {
    getOutlookConnection: vi.fn(async () => [{ connected: true }]),
    deleteOutlookTokens: vi.fn(async () => {}),
    deleteOutlookEmails: vi.fn(async () => {}),
  } satisfies IntegrationsDB;

  return Object.assign(fake, overrides) as FakeIntegrationsDb;
}
