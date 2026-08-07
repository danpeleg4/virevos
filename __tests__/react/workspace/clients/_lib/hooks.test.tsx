import React from "react";
import { http, HttpResponse } from "msw";
import { worker } from "../../../../msw/worker";
import { renderWithQueryClient } from "../../../../_helpers/render";
import {
  useAddClient,
  useCancelBooking,
  useClient,
  useClientCases,
  useClientOutlookEmails,
  useClientPortal,
  useClients,
  useConfirmBooking,
  useDeleteClient,
  usePortalBookings,
  useSavePortalSettings,
  useUpdateClient,
} from "@/app/workspace/clients/_lib/hooks";
import { clientListFixtures } from "../../../../msw/handlers/clients";

function ClientsHarness() {
  const { data } = useClients();
  return (
    <ul>
      {data?.map((c) => (
        <li key={c.id}>{c.name}</li>
      ))}
    </ul>
  );
}

describe("useClients", () => {
  it("lists all clients", async () => {
    const screen = await renderWithQueryClient(<ClientsHarness />);
    await expect.element(screen.getByText("Jane Client")).toBeInTheDocument();
    await expect.element(screen.getByText("Acme Corp")).toBeInTheDocument();
  });
});

function DeleteClientHarness() {
  const { data } = useClients();
  const deleteClient = useDeleteClient();
  return (
    <div>
      <ul>
        {data?.map((c) => (
          <li key={c.id}>{c.name}</li>
        ))}
      </ul>
      <button onClick={() => deleteClient.mutate(1)}>Delete</button>
    </div>
  );
}

describe("useDeleteClient", () => {
  it("removes the client from the list after invalidation", async () => {
    let deleted = false;
    worker.use(
      http.get("/api/clients", () =>
        HttpResponse.json(
          deleted ? [clientListFixtures[1]] : clientListFixtures
        )
      ),
      http.delete("/api/clients/:id", () => {
        deleted = true;
        return HttpResponse.json({ success: true });
      })
    );
    const screen = await renderWithQueryClient(<DeleteClientHarness />);
    await expect.element(screen.getByText("Jane Client")).toBeInTheDocument();

    await screen.getByRole("button", { name: "Delete" }).click();

    await expect
      .element(screen.getByText("Jane Client"))
      .not.toBeInTheDocument();
  });
});

function AddClientHarness() {
  const { data } = useClients();
  const addClient = useAddClient();
  return (
    <div>
      <ul>
        {data?.map((c) => (
          <li key={c.id}>{c.name}</li>
        ))}
      </ul>
      <button
        onClick={() =>
          addClient.mutate({
            name: "New Client",
            email: "new@client.com",
            phone: "555-0199",
            notes: "",
          })
        }
      >
        Add
      </button>
    </div>
  );
}

describe("useAddClient", () => {
  it("optimistically appends the new client", async () => {
    const screen = await renderWithQueryClient(<AddClientHarness />);
    await expect.element(screen.getByText("Jane Client")).toBeInTheDocument();

    await screen.getByRole("button", { name: "Add" }).click();

    await expect.element(screen.getByText("New Client")).toBeInTheDocument();
  });

  it("rolls back the optimistic client when the request fails", async () => {
    worker.use(
      http.post("/api/clients", () =>
        HttpResponse.json({ error: "boom" }, { status: 500 })
      )
    );
    const screen = await renderWithQueryClient(<AddClientHarness />);

    await screen.getByRole("button", { name: "Add" }).click();

    await expect
      .element(screen.getByText("New Client"))
      .not.toBeInTheDocument();
  });
});

function UpdateClientHarness() {
  const { data } = useClients();
  const updateClient = useUpdateClient();
  return (
    <div>
      <ul>
        {data?.map((c) => (
          <li key={c.id}>{c.name}</li>
        ))}
      </ul>
      <button onClick={() => updateClient.mutate({ id: 1, name: "Renamed" })}>
        Rename
      </button>
    </div>
  );
}

describe("useUpdateClient", () => {
  it("optimistically renames the client and persists after refetch", async () => {
    let currentName = "Jane Client";
    worker.use(
      http.get("/api/clients", () =>
        HttpResponse.json([
          { ...clientListFixtures[0], name: currentName },
          clientListFixtures[1],
        ])
      ),
      http.patch("/api/clients/:id", async ({ request }) => {
        const body = (await request.json()) as { name?: string };
        if (body.name) currentName = body.name;
        return HttpResponse.json({ success: true });
      })
    );
    const screen = await renderWithQueryClient(<UpdateClientHarness />);
    await expect.element(screen.getByText("Jane Client")).toBeInTheDocument();

    await screen.getByRole("button", { name: "Rename" }).click();

    await expect.element(screen.getByText("Renamed")).toBeInTheDocument();
  });

  it("rolls back the rename when the request fails", async () => {
    worker.use(
      http.patch("/api/clients/:id", () =>
        HttpResponse.json({ error: "boom" }, { status: 500 })
      )
    );
    const screen = await renderWithQueryClient(<UpdateClientHarness />);
    await expect.element(screen.getByText("Jane Client")).toBeInTheDocument();

    await screen.getByRole("button", { name: "Rename" }).click();

    await expect.element(screen.getByText("Jane Client")).toBeInTheDocument();
  });
});

describe("useClient", () => {
  it("loads a single client's main profile", async () => {
    function Harness() {
      const { data } = useClient("1");
      return <div>{data?.client.name}</div>;
    }
    const screen = await renderWithQueryClient(<Harness />);
    await expect.element(screen.getByText("Jane Client")).toBeInTheDocument();
  });
});

describe("useClientCases", () => {
  it("fetches cases only once enabled", async () => {
    let fetched = false;
    worker.use(
      http.get("/api/clients/:id", ({ request }) => {
        const type = new URL(request.url).searchParams.get("type");
        if (type === "cases") {
          fetched = true;
          return HttpResponse.json({ cases: [] });
        }
        return HttpResponse.json({ error: "Invalid type" }, { status: 400 });
      })
    );
    function Harness({ enabled }: { enabled: boolean }) {
      useClientCases("1", enabled);
      return null;
    }
    await renderWithQueryClient(<Harness enabled={false} />);
    expect(fetched).toBe(false);

    await renderWithQueryClient(<Harness enabled={true} />);
    await vi.waitFor(() => {
      expect(fetched).toBe(true);
    });
  });
});

describe("useClientOutlookEmails", () => {
  it("fetches emails only once enabled", async () => {
    let fetched = false;
    worker.use(
      http.get("/api/clients/:id", ({ request }) => {
        const type = new URL(request.url).searchParams.get("type");
        if (type === "outlook-emails") {
          fetched = true;
          return HttpResponse.json({ emails: [] });
        }
        return HttpResponse.json({ error: "Invalid type" }, { status: 400 });
      })
    );
    function Harness({ enabled }: { enabled: boolean }) {
      useClientOutlookEmails("1", enabled);
      return null;
    }
    await renderWithQueryClient(<Harness enabled={false} />);
    expect(fetched).toBe(false);

    await renderWithQueryClient(<Harness enabled={true} />);
    await vi.waitFor(() => {
      expect(fetched).toBe(true);
    });
  });
});

describe("useClientPortal", () => {
  it("loads the portal record for a client", async () => {
    worker.use(
      http.get("/api/clients/:id", ({ request }) => {
        const type = new URL(request.url).searchParams.get("type");
        if (type === "portal") {
          return HttpResponse.json({
            portal: { id: 9, portalUrl: "https://portal.test/abc" },
          });
        }
        return HttpResponse.json({ error: "Invalid type" }, { status: 400 });
      })
    );
    function Harness() {
      const { data } = useClientPortal(1);
      return <div>{data?.portalUrl ?? "none"}</div>;
    }
    const screen = await renderWithQueryClient(<Harness />);
    await expect
      .element(screen.getByText("https://portal.test/abc"))
      .toBeInTheDocument();
  });
});

describe("useSavePortalSettings", () => {
  it("posts the payload and invalidates the portal + bookings caches", async () => {
    let postBody: unknown;
    worker.use(
      http.post("/api/clients/:id/portal", async ({ request }) => {
        postBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );
    function Harness() {
      const save = useSavePortalSettings("1");
      return (
        <button
          onClick={() =>
            save.mutate({
              enabled: true,
              settings: {
                title: "My Portal",
                welcomeMessage: "Welcome",
                chatEnabled: true,
                fileSharing: true,
                aiChatBot: true,
                emailNotifications: true,
                meetingSchedulingEnabled: false,
                availability: {
                  weeklySchedule: {},
                  meetingDurations: [30],
                  bufferMinutes: 0,
                  timezone: "UTC",
                },
              },
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
      expect(postBody).toMatchObject({
        enabled: true,
        settings: { title: "My Portal" },
      });
    });
  });
});

function BookingsHarness() {
  const { data } = usePortalBookings(true);
  const confirmBooking = useConfirmBooking();
  const cancelBooking = useCancelBooking();
  return (
    <div>
      <div>Bookings: {data?.length ?? 0}</div>
      <button onClick={() => confirmBooking.mutate(1)}>Confirm</button>
      <button onClick={() => cancelBooking.mutate(1)}>Cancel</button>
    </div>
  );
}

describe("usePortalBookings / useConfirmBooking / useCancelBooking", () => {
  it("loads bookings and confirms one", async () => {
    let status = "pending";
    worker.use(
      http.get("/api/portal", ({ request }) => {
        const type = new URL(request.url).searchParams.get("type");
        if (type === "bookings") {
          return HttpResponse.json({
            bookings: [{ id: 1, portalId: 9, status }],
          });
        }
        return HttpResponse.json({ error: "No type found" }, { status: 400 });
      }),
      http.patch("/api/portal-bookings/:id", () => {
        status = "confirmed";
        return HttpResponse.json({ success: true });
      })
    );
    const screen = await renderWithQueryClient(<BookingsHarness />);
    await expect.element(screen.getByText("Bookings: 1")).toBeInTheDocument();

    await screen.getByRole("button", { name: "Confirm" }).click();

    await vi.waitFor(() => {
      expect(status).toBe("confirmed");
    });
  });

  it("cancels a booking", async () => {
    let status = "pending";
    worker.use(
      http.get("/api/portal", ({ request }) => {
        const type = new URL(request.url).searchParams.get("type");
        if (type === "bookings") {
          return HttpResponse.json({
            bookings: [{ id: 1, portalId: 9, status }],
          });
        }
        return HttpResponse.json({ error: "No type found" }, { status: 400 });
      }),
      http.patch("/api/portal-bookings/:id", () => {
        status = "cancelled";
        return HttpResponse.json({ success: true });
      })
    );
    const screen = await renderWithQueryClient(<BookingsHarness />);
    await expect.element(screen.getByText("Bookings: 1")).toBeInTheDocument();

    await screen.getByRole("button", { name: "Cancel" }).click();

    await vi.waitFor(() => {
      expect(status).toBe("cancelled");
    });
  });
});
