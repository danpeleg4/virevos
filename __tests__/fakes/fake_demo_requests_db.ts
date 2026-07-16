import type { DemoRequestRow, DemoRequestsDB } from "@db/demo_requests_db";

export const canonicalDemoRequestRow: DemoRequestRow = {
  id: 7,
  name: "Jane Prospect",
  email: "jane@prospect.com",
  company: "Prospect Inc",
  message: "Interested in a demo next week",
  status: "pending",
  errorMessage: null,
  createdAt: new Date("2026-07-01T10:00:00Z"),
};

export type FakeDemoRequestsDb = {
  [K in keyof DemoRequestsDB]: Mock<DemoRequestsDB[K]>;
};

export function makeFakeDemoRequestsDb(
  overrides: Partial<DemoRequestsDB> = {}
): FakeDemoRequestsDb {
  const fake = {
    insertDemoRequest: vi.fn(async () => ({ ...canonicalDemoRequestRow })),
    setDemoRequestStatus: vi.fn(async () => {}),
  } satisfies DemoRequestsDB;

  return Object.assign(fake, overrides) as FakeDemoRequestsDb;
}
