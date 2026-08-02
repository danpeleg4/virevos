import type {
  CaseFileRow,
  CaseRow,
  CasesDB,
  CaseWithStatsRow,
  NewCaseRow,
} from "@db/classes/cases_db";
import { canonicalClientRow } from "./fake_clients_db";

export const canonicalCaseRow: CaseRow = {
  id: 5,
  clientId: null,
  name: "Estate Case",
  description: null,
  status: "active",
  dueDate: "2026-08-01",
  priority: "medium",
  userId: "user_1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const canonicalCaseFileRow: CaseFileRow = {
  id: 7,
  caseId: 5,
  userId: "user_1",
  name: "contract.pdf",
  path: "projects/user_1/contract.pdf",
  size: 100,
  mimeType: "application/pdf",
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const canonicalCaseWithStats: CaseWithStatsRow = {
  id: 5,
  name: "Estate Case",
  description: null,
  status: "active",
  dueDate: "2026-08-01",
  priority: "medium",
  clientId: null,
  userId: "user_1",
  clientName: null,
  totalTasks: 2,
  completedTasks: 1,
};

export type FakeCasesDb = {
  [K in keyof CasesDB]: Mock<CasesDB[K]>;
};

export function makeFakeCasesDb(overrides: Partial<CasesDB> = {}): FakeCasesDb {
  const fake = {
    getCaseById: vi.fn(async () => [{ ...canonicalCaseRow }]),
    getCaseByName: vi.fn(async (_userId: string, name: string) => [
      { ...canonicalCaseRow, name },
    ]),
    getCasesWithStats: vi.fn(async (_userId: string) => [
      { ...canonicalCaseWithStats },
    ]),
    getClientsForUser: vi.fn(async (_userId: string) => []),
    getClientByName: vi.fn(async (_userId: string, name: string) => [
      { ...canonicalClientRow, name },
    ]),
    getCaseSummary: vi.fn(async (caseId: number, _userId: string) => [
      {
        id: caseId,
        name: "Estate Case",
        clientId: null,
        clientName: null,
        dueDate: "2026-08-01" as string | null,
        priority: "medium",
        status: "active",
      },
    ]),
    getCaseNotes: vi.fn(async () => []),
    getUserFiles: vi.fn(async () => []),
    getCaseFileById: vi.fn(async () => [{ ...canonicalCaseFileRow }]),
    getCaseFilesByCase: vi.fn(async () => [{ ...canonicalCaseFileRow }]),
    getCaseFilePaths: vi.fn(
      async (): Promise<{ path: string; size: number }[]> => []
    ),
    deleteCaseCascade: vi.fn(async () => {}),
    insertCaseFileWithStorage: vi.fn(async () => {}),
    deleteCaseFileWithStorage: vi.fn(async () => {}),
    insertCase: vi.fn(
      async (values: NewCaseRow): Promise<CaseRow> => ({
        ...canonicalCaseRow,
        ...values,
        id: 99,
        description: values.description ?? null,
        clientId: values.clientId ?? null,
        status: values.status ?? "active",
        dueDate: values.dueDate ?? null,
        priority: values.priority ?? "medium",
      })
    ),
    insertCaseNote: vi.fn(async () => {}),
    updateCase: vi.fn(async () => {}),
  } satisfies CasesDB;

  return Object.assign(fake, overrides) as FakeCasesDb;
}
