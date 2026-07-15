import type { NewTaskRow, TaskRow, TasksDB } from "@db/tasks_db";

export const canonicalTaskRow: TaskRow = {
  id: 1,
  userId: "user_1",
  title: "Design UI mockups",
  description: null,
  caseId: null,
  priority: "medium",
  status: "in-progress",
  dueDate: "2026-04-01",
  completed: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export type FakeTasksDb = {
  [K in keyof TasksDB]: Mock<TasksDB[K]>;
};

export function makeFakeTasksDb(overrides: Partial<TasksDB> = {}): FakeTasksDb {
  const fake = {
    getAllTasksWithCaseName: vi.fn(async (_userId: string) => [
      { tasks: { ...canonicalTaskRow }, caseName: null as string | null },
    ]),
    getTasksByCase: vi.fn(async (_userId: string, _caseId: number) => [
      { ...canonicalTaskRow, caseId: 5 },
    ]),
    findTaskById: vi.fn(
      async (taskId: number): Promise<TaskRow | undefined> => ({
        ...canonicalTaskRow,
        id: taskId,
      })
    ),
    updateTask: vi.fn(async () => {}),
    deleteTask: vi.fn(async () => {}),
    insertTask: vi.fn(
      async (values: NewTaskRow): Promise<TaskRow> => ({
        ...canonicalTaskRow,
        ...values,
        id: 10,
        description: values.description ?? null,
        caseId: values.caseId ?? null,
        priority: values.priority ?? "medium",
        status: values.status ?? "in-progress",
        dueDate: values.dueDate ?? null,
        completed: values.completed ?? false,
      })
    ),
    getCaseById: vi.fn(async (caseId: number) => [
      { id: caseId, userId: "user_1" },
    ]),
    getCaseByName: vi.fn(async (_name: string) => [
      { id: 5, userId: "user_1" },
    ]),
  } satisfies TasksDB;

  return Object.assign(fake, overrides) as FakeTasksDb;
}
