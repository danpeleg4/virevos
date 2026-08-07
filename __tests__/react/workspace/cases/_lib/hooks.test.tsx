import React from "react";
import { http, HttpResponse } from "msw";
import { worker } from "../../../../msw/worker";
import { renderWithQueryClient } from "../../../../_helpers/render";
import {
  useAddCaseFile,
  useAddCaseNote,
  useCase,
  useCaseFiles,
  useCaseNotes,
  useCases,
  useCreateCase,
  useDeleteCase,
  useDeleteCaseFile,
  useUpdateCase,
  useUpdateCaseStatus,
} from "@/app/workspace/cases/_lib/hooks";
import { caseFileFixtures, caseFixtures } from "../../../../msw/handlers/cases";

function CasesHarness() {
  const { data } = useCases();
  return (
    <ul>
      {data?.cases.map((c) => (
        <li key={c.id}>{c.name}</li>
      ))}
    </ul>
  );
}

describe("useCases", () => {
  it("lists all cases with their client roster", async () => {
    const screen = await renderWithQueryClient(<CasesHarness />);
    await expect.element(screen.getByText("Estate Case")).toBeInTheDocument();
    await expect
      .element(screen.getByText("Contract Review"))
      .toBeInTheDocument();
  });
});

describe("useCase", () => {
  it("loads a single case", async () => {
    function Harness() {
      const { data } = useCase("5");
      return <div>{data?.name}</div>;
    }
    const screen = await renderWithQueryClient(<Harness />);
    await expect.element(screen.getByText("Estate Case")).toBeInTheDocument();
  });
});

describe("useUpdateCaseStatus", () => {
  it("PATCHes the new status and invalidates the cases list", async () => {
    let patchBody: unknown;
    let fetchCount = 0;
    worker.use(
      http.get("/api/cases/get-cases", () => {
        fetchCount += 1;
        return HttpResponse.json({ cases: caseFixtures, allClients: [] });
      }),
      http.patch("/api/cases/:id", async ({ request }) => {
        patchBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );
    function Harness() {
      useCases();
      const update = useUpdateCaseStatus();
      return (
        <button
          onClick={() =>
            update.mutate({
              aCase: {
                id: caseFixtures[0].id,
                name: caseFixtures[0].name,
                clientId: caseFixtures[0].clientId,
                status: caseFixtures[0].status,
                dueDate: caseFixtures[0].dueDate,
                priority: caseFixtures[0].priority,
                stats: caseFixtures[0].stats,
              },
              newStatus: "completed",
            })
          }
        >
          Complete
        </button>
      );
    }
    const screen = await renderWithQueryClient(<Harness />);
    const initialFetches = fetchCount;

    await screen.getByRole("button", { name: "Complete" }).click();

    await vi.waitFor(() => {
      expect(patchBody).toEqual({ status: "completed" });
      expect(fetchCount).toBeGreaterThan(initialFetches);
    });
  });
});

describe("useUpdateCase", () => {
  it("PATCHes the full editable case fields", async () => {
    let patchBody: unknown;
    worker.use(
      http.patch("/api/cases/:id", async ({ request }) => {
        patchBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );
    function Harness() {
      const update = useUpdateCase();
      return (
        <button
          onClick={() =>
            update.mutate({
              id: 5,
              name: "Renamed Case",
              priority: "high",
              status: "active",
              clientId: null,
            })
          }
        >
          Save
        </button>
      );
    }
    const screen = await renderWithQueryClient(<Harness />);
    await screen.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() => {
      expect(patchBody).toEqual({
        name: "Renamed Case",
        priority: "high",
        status: "active",
        clientId: null,
      });
    });
  });
});

describe("useCreateCase", () => {
  it("POSTs the new case and invalidates the cases list", async () => {
    let postBody: unknown;
    worker.use(
      http.post("/api/cases", async ({ request }) => {
        postBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );
    function Harness() {
      const create = useCreateCase();
      return (
        <button
          onClick={() =>
            create.mutate({
              id: 1,
              name: "New Case",
              clientId: null,
              priority: "medium",
              dueDate: null,
              status: "active",
              stats: { totalTasks: 0, completedTasks: 0, percentage: 0 },
            })
          }
        >
          Create
        </button>
      );
    }
    const screen = await renderWithQueryClient(<Harness />);
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() => {
      expect(postBody).toMatchObject({ name: "New Case" });
    });
  });
});

describe("useDeleteCase", () => {
  it("removes the case from the list and invalidates", async () => {
    let deleted = false;
    worker.use(
      http.get("/api/cases/get-cases", () =>
        HttpResponse.json({
          cases: deleted ? [caseFixtures[1]] : caseFixtures,
          allClients: [],
        })
      ),
      http.delete("/api/cases/:id", () => {
        deleted = true;
        return HttpResponse.json({ success: true });
      })
    );
    function Harness() {
      const { data } = useCases();
      const deleteCase = useDeleteCase();
      return (
        <div>
          <ul>
            {data?.cases.map((c) => (
              <li key={c.id}>{c.name}</li>
            ))}
          </ul>
          <button onClick={() => deleteCase.mutate(5)}>Delete</button>
        </div>
      );
    }
    const screen = await renderWithQueryClient(<Harness />);
    await expect.element(screen.getByText("Estate Case")).toBeInTheDocument();

    await screen.getByRole("button", { name: "Delete" }).click();

    await expect
      .element(screen.getByText("Estate Case"))
      .not.toBeInTheDocument();
  });
});

describe("useCaseNotes / useAddCaseNote", () => {
  it("loads notes and adds a new one", async () => {
    let posted: unknown;
    worker.use(
      http.post("/api/cases/:id/notes", async ({ request }) => {
        posted = await request.json();
        return HttpResponse.json({ success: true });
      })
    );
    function Harness() {
      const { data } = useCaseNotes(5);
      const addNote = useAddCaseNote(5);
      return (
        <div>
          <ul>
            {data?.map((n) => (
              <li key={n.id}>{n.content}</li>
            ))}
          </ul>
          <button onClick={() => addNote.mutate("New note")}>Add</button>
        </div>
      );
    }
    const screen = await renderWithQueryClient(<Harness />);
    await expect
      .element(screen.getByText("Client called about deadline"))
      .toBeInTheDocument();

    await screen.getByRole("button", { name: "Add" }).click();

    await vi.waitFor(() => {
      expect(posted).toEqual({ note: "New note" });
    });
  });
});

describe("useCaseFiles / useAddCaseFile", () => {
  it("loads files and uploads a new one", async () => {
    let uploaded = false;
    worker.use(
      http.get("/api/files/:id", () => HttpResponse.json(caseFileFixtures)),
      http.post("/api/cases/:id/files", async () => {
        uploaded = true;
        return HttpResponse.json({ success: true });
      })
    );
    function Harness() {
      const { data } = useCaseFiles(5);
      const addFile = useAddCaseFile(5);
      return (
        <div>
          <ul>
            {data?.map((f) => (
              <li key={f.id}>{f.name}</li>
            ))}
          </ul>
          <button onClick={() => addFile.mutate(new File(["x"], "new.pdf"))}>
            Upload
          </button>
        </div>
      );
    }
    const screen = await renderWithQueryClient(<Harness />);
    await expect.element(screen.getByText("contract.pdf")).toBeInTheDocument();

    await screen.getByRole("button", { name: "Upload" }).click();

    await vi.waitFor(() => {
      expect(uploaded).toBe(true);
    });
  });
});

function DeleteCaseFileHarness() {
  const { data } = useCaseFiles(5);
  const deleteFile = useDeleteCaseFile(5);
  return (
    <div>
      <ul>
        {data?.map((f) => (
          <li key={f.id}>{f.name}</li>
        ))}
      </ul>
      <button onClick={() => deleteFile.mutate(7)}>Delete</button>
    </div>
  );
}

describe("useDeleteCaseFile", () => {
  it("optimistically removes the file and keeps it removed after invalidation", async () => {
    let deleted = false;
    worker.use(
      http.get("/api/files/:id", () =>
        HttpResponse.json(deleted ? [] : caseFileFixtures)
      ),
      http.delete("/api/files/:id", () => {
        deleted = true;
        return HttpResponse.json({ success: true });
      })
    );
    const screen = await renderWithQueryClient(<DeleteCaseFileHarness />);
    await expect.element(screen.getByText("contract.pdf")).toBeInTheDocument();

    await screen.getByRole("button", { name: "Delete" }).click();

    await expect
      .element(screen.getByText("contract.pdf"))
      .not.toBeInTheDocument();
  });

  it("restores the file when the delete request fails", async () => {
    worker.use(
      http.get("/api/files/:id", () => HttpResponse.json(caseFileFixtures)),
      http.delete("/api/files/:id", () =>
        HttpResponse.json({ error: "boom" }, { status: 500 })
      )
    );
    const screen = await renderWithQueryClient(<DeleteCaseFileHarness />);
    await expect.element(screen.getByText("contract.pdf")).toBeInTheDocument();

    await screen.getByRole("button", { name: "Delete" }).click();

    await expect.element(screen.getByText("contract.pdf")).toBeInTheDocument();
  });
});
