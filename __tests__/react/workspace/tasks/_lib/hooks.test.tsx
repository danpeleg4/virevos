import React from "react";
import { http, HttpResponse } from "msw";
import { worker } from "../../../../msw/worker";
import { renderWithQueryClient } from "../../../../_helpers/render";
import {
  useAllTasks,
  useCaseTasks,
  useChangeTaskStatus,
  useChangeTaskPriority,
  useChangeTaskDueDate,
  useDeleteTask,
  useAddTask,
} from "@/app/workspace/tasks/_lib/hooks";
import { taskFixtures } from "../../../../msw/handlers/tasks";

function AllTasksHarness() {
  const { data } = useAllTasks();
  const changeStatus = useChangeTaskStatus();
  return (
    <div>
      <ul>
        {data?.map((t) => (
          <li key={t.id}>
            {t.title} - {t.status} - {t.caseName}
          </li>
        ))}
      </ul>
      <button
        onClick={() => changeStatus.mutate({ taskId: 1, status: "completed" })}
      >
        Complete
      </button>
    </div>
  );
}

describe("useAllTasks", () => {
  it("flattens task rows with a caseName fallback", async () => {
    const screen = await renderWithQueryClient(<AllTasksHarness />);
    await expect
      .element(
        screen.getByText("Design UI mockups - in-progress - Estate Case")
      )
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Review contract - completed - No Case"))
      .toBeInTheDocument();
  });
});

describe("useCaseTasks", () => {
  it("loads tasks scoped to a single case", async () => {
    function Harness() {
      const { data } = useCaseTasks(5);
      return (
        <ul>
          {data?.map((t) => (
            <li key={t.id}>{t.title}</li>
          ))}
        </ul>
      );
    }
    const screen = await renderWithQueryClient(<Harness />);
    await expect
      .element(screen.getByText("Design UI mockups"))
      .toBeInTheDocument();
  });
});

describe("useChangeTaskStatus", () => {
  it("optimistically updates status and persists it after refetch", async () => {
    let currentStatus = "in-progress";
    worker.use(
      http.get("/api/tasks", () =>
        HttpResponse.json([
          {
            tasks: { ...taskFixtures[0].tasks, status: currentStatus },
            caseName: "Estate Case",
          },
          taskFixtures[1],
        ])
      ),
      http.patch("/api/tasks/:id", async ({ request }) => {
        const body = (await request.json()) as { status?: string };
        if (body.status) currentStatus = body.status;
        return HttpResponse.json({ success: true });
      })
    );

    const screen = await renderWithQueryClient(<AllTasksHarness />);
    await expect
      .element(
        screen.getByText("Design UI mockups - in-progress - Estate Case")
      )
      .toBeInTheDocument();

    await screen.getByRole("button", { name: "Complete" }).click();

    await expect
      .element(screen.getByText("Design UI mockups - completed - Estate Case"))
      .toBeInTheDocument();
  });

  it("rolls back the optimistic status when the request fails", async () => {
    worker.use(
      http.patch("/api/tasks/:id", () =>
        HttpResponse.json({ error: "boom" }, { status: 500 })
      )
    );

    const screen = await renderWithQueryClient(<AllTasksHarness />);
    await expect
      .element(
        screen.getByText("Design UI mockups - in-progress - Estate Case")
      )
      .toBeInTheDocument();

    await screen.getByRole("button", { name: "Complete" }).click();

    await expect
      .element(
        screen.getByText("Design UI mockups - in-progress - Estate Case")
      )
      .toBeInTheDocument();
  });
});

describe("useChangeTaskPriority", () => {
  it("PATCHes the new priority", async () => {
    let patchBody: unknown;
    worker.use(
      http.patch("/api/tasks/:id", async ({ request }) => {
        patchBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );
    function Harness() {
      const changePriority = useChangeTaskPriority();
      return (
        <button
          onClick={() => changePriority.mutate({ taskId: 1, priority: "high" })}
        >
          Set priority
        </button>
      );
    }
    const screen = await renderWithQueryClient(<Harness />);
    await screen.getByRole("button", { name: "Set priority" }).click();
    await vi.waitFor(() => {
      expect(patchBody).toEqual({ priority: "high" });
    });
  });
});

describe("useChangeTaskDueDate", () => {
  it("PATCHes the new due date", async () => {
    let patchBody: unknown;
    worker.use(
      http.patch("/api/tasks/:id", async ({ request }) => {
        patchBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );
    function Harness() {
      const changeDueDate = useChangeTaskDueDate();
      return (
        <button
          onClick={() =>
            changeDueDate.mutate({ taskId: 1, dueDate: "2026-05-01" })
          }
        >
          Set due date
        </button>
      );
    }
    const screen = await renderWithQueryClient(<Harness />);
    await screen.getByRole("button", { name: "Set due date" }).click();
    await vi.waitFor(() => {
      expect(patchBody).toEqual({ dueDate: "2026-05-01" });
    });
  });
});

function DeleteTaskHarness() {
  const { data } = useAllTasks();
  const deleteTask = useDeleteTask();
  return (
    <div>
      <ul>
        {data?.map((t) => (
          <li key={t.id}>{t.title}</li>
        ))}
      </ul>
      <button onClick={() => deleteTask.mutate(1)}>Delete</button>
    </div>
  );
}

describe("useDeleteTask", () => {
  it("optimistically removes the task and keeps it removed after invalidation", async () => {
    let deleted = false;
    worker.use(
      http.get("/api/tasks", () =>
        HttpResponse.json(deleted ? [taskFixtures[1]] : taskFixtures)
      ),
      http.delete("/api/tasks/:id", () => {
        deleted = true;
        return HttpResponse.json({ success: true });
      })
    );
    const screen = await renderWithQueryClient(<DeleteTaskHarness />);
    await expect
      .element(screen.getByText("Design UI mockups"))
      .toBeInTheDocument();

    await screen.getByRole("button", { name: "Delete" }).click();

    await expect
      .element(screen.getByText("Design UI mockups"))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByText("Review contract"))
      .toBeInTheDocument();
  });

  it("restores the task when the delete request fails", async () => {
    worker.use(
      http.delete("/api/tasks/:id", () =>
        HttpResponse.json({ error: "boom" }, { status: 500 })
      )
    );
    const screen = await renderWithQueryClient(<DeleteTaskHarness />);
    await expect
      .element(screen.getByText("Design UI mockups"))
      .toBeInTheDocument();

    await screen.getByRole("button", { name: "Delete" }).click();

    await expect
      .element(screen.getByText("Design UI mockups"))
      .toBeInTheDocument();
  });
});

function AddTaskHarness() {
  const { data } = useAllTasks();
  const addTask = useAddTask();
  return (
    <div>
      <ul>
        {data?.map((t) => (
          <li key={t.id}>{t.title}</li>
        ))}
      </ul>
      <button
        onClick={() =>
          addTask.mutate({
            id: 999,
            userId: "user_1",
            title: "New task",
            description: null,
            caseId: null,
            priority: "low",
            status: "in-progress",
            dueDate: null,
            completed: false,
            createdAt: null,
            updatedAt: null,
          })
        }
      >
        Add
      </button>
    </div>
  );
}

describe("useAddTask", () => {
  it("optimistically appends the new task", async () => {
    const screen = await renderWithQueryClient(<AddTaskHarness />);
    await expect
      .element(screen.getByText("Design UI mockups"))
      .toBeInTheDocument();

    await screen.getByRole("button", { name: "Add" }).click();

    await expect.element(screen.getByText("New task")).toBeInTheDocument();
  });

  it("rolls back the optimistic task when the request fails", async () => {
    worker.use(
      http.post("/api/tasks", () =>
        HttpResponse.json({ error: "boom" }, { status: 500 })
      )
    );
    const screen = await renderWithQueryClient(<AddTaskHarness />);

    await screen.getByRole("button", { name: "Add" }).click();

    await expect.element(screen.getByText("New task")).not.toBeInTheDocument();
  });
});
