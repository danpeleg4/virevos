import React from "react";
import { delay, http, HttpResponse } from "msw";
import { worker } from "../../../../msw/worker";
import { renderWithQueryClient } from "../../../../_helpers/render";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/app/components/clients/ClientPortalSettings", () => ({
  ClientPortalSettings: ({
    clientId,
    title,
    onTitleChange,
  }: {
    clientId: number;
    title: string;
    onTitleChange: (title: string) => void;
  }) => (
    <div data-testid="portal-settings">
      Portal for {clientId}
      <span data-testid="portal-title">Title: {title}</span>
      <button onClick={() => onTitleChange(`${title}!`)}>Change Title</button>
    </div>
  ),
}));

vi.mock("@/app/components/communications/PortalChatPane", () => ({
  PortalChatPane: ({ clientName }: { clientName: string }) => (
    <div data-testid="chat-pane">Chat with {clientName}</div>
  ),
}));

vi.mock("@/app/workspace/clients/ClientEditDialog", () => ({
  ClientEditDialog: () => <div data-testid="edit-dialog" />,
}));

const mockClient = {
  id: 42,
  name: "Acme Corp",
  email: "contact@acme.com",
  phone: "555-1234",
  status: "active",
  notes: "important",
  activeCases: 1,
  completedCases: 0,
  totalCases: 1,
};

const mockCases = [
  {
    id: 9,
    name: "Visa Application",
    status: "active",
    priority: "high",
    dueDate: "2026-07-01",
    stats: { totalTasks: 4, completedTasks: 2, percentage: 50 },
  },
];

const mockEmails = [
  {
    id: 1,
    subject: "Hello",
    snippet: "snippet",
    fromEmail: "x@y.com",
    fromName: "X",
    toEmails: ["a@b.com"],
    isRead: false,
    isSent: false,
    hasAttachments: false,
    sentAt: "2026-05-01T00:00:00Z",
  },
];

import ClientDetailPage from "@/app/workspace/clients/[id]/page";

// React's `use(thenable)` returns synchronously when the thenable carries
// status: "fulfilled". Build one to avoid suspending during render.
function fulfilledParams<T>(value: T): Promise<T> {
  const p = Promise.resolve(value) as Promise<T> & {
    status?: string;
    value?: T;
  };
  p.status = "fulfilled";
  p.value = value;
  return p;
}

// Portals are now created server-side in the same transaction as the client
// (see txAddClientAndPortal), so by the time this page loads, the client
// already has a portal. `portalRecord` seeds that existing portal; Save
// Changes still POSTs to /api/clients/:id/portal to update it.
let portalRecord: Record<string, unknown> | null = null;
let lastSavedSettings: Record<string, unknown> | undefined;

function makeDefaultPortalRecord(clientId: number) {
  return {
    id: 1,
    clientId,
    clientName: mockClient.name,
    token: "tok-123",
    enabled: true,
    settings: {},
    portalUrl: "https://example.com/portal/tok-123",
    lastAccessedAt: null,
  };
}

function useClientHandlers(
  overrides: Partial<{
    clientPending: boolean;
    clientError: boolean;
  }> = {}
) {
  worker.use(
    http.get("/api/clients/:id", async ({ request }) => {
      const type = new URL(request.url).searchParams.get("type");
      if (type === "main") {
        if (overrides.clientPending) {
          await delay("infinite");
        }
        if (overrides.clientError) {
          return HttpResponse.json({ error: "boom" }, { status: 500 });
        }
        return HttpResponse.json({ client: mockClient, portal: null });
      }
      if (type === "cases") return HttpResponse.json({ cases: mockCases });
      if (type === "outlook-emails")
        return HttpResponse.json({ emails: mockEmails });
      if (type === "portal") return HttpResponse.json({ portal: portalRecord });
      return HttpResponse.json({ error: "Invalid type" }, { status: 400 });
    }),
    http.post("/api/clients/:id/portal", async ({ request, params }) => {
      const body = (await request.json()) as {
        enabled: boolean;
        settings: Record<string, unknown>;
      };
      lastSavedSettings = body.settings;
      portalRecord = {
        id: 1,
        clientId: Number(params.id),
        clientName: mockClient.name,
        token: "tok-123",
        enabled: body.enabled,
        settings: body.settings,
        portalUrl: "https://example.com/portal/tok-123",
        lastAccessedAt: null,
      };
      return HttpResponse.json(portalRecord);
    })
  );
}

const renderPage = () =>
  renderWithQueryClient(
    <ClientDetailPage params={fulfilledParams({ id: "42" })} />
  );

describe("Client Detail Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    portalRecord = makeDefaultPortalRecord(42);
    lastSavedSettings = undefined;
  });

  it("shows a loader while client query is loading", async () => {
    useClientHandlers({ clientPending: true });
    const screen = await renderPage();
    // Loader2 has role of presentation; assert no client name yet
    await expect.element(screen.getByText("Acme Corp")).not.toBeInTheDocument();
  });

  it("shows an error when client fails to load", async () => {
    useClientHandlers({ clientError: true });
    const screen = await renderPage();
    await expect
      .element(screen.getByText(/failed to load client/i))
      .toBeInTheDocument();
  });

  it("renders the client header with name, email, and phone", async () => {
    useClientHandlers();
    const screen = await renderPage();
    await expect.element(screen.getByText("Acme Corp")).toBeInTheDocument();
    await expect
      .element(screen.getByText("contact@acme.com"))
      .toBeInTheDocument();
    await expect.element(screen.getByText("555-1234")).toBeInTheDocument();
  });

  it("renders all three section tabs", async () => {
    useClientHandlers();
    const screen = await renderPage();
    await expect
      .element(screen.getByRole("button", { name: "Portal", exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /cases/i }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /communications/i }))
      .toBeInTheDocument();
  });

  it("shows the Portal settings by default", async () => {
    useClientHandlers();
    const screen = await renderPage();
    await expect
      .element(screen.getByTestId("portal-settings"))
      .toBeInTheDocument();
  });

  it("switches to Cases tab and shows cases", async () => {
    useClientHandlers();
    const screen = await renderPage();
    await screen.getByRole("button", { name: /cases/i }).click();
    await expect.element(screen.getByTestId("cases-tab")).toBeInTheDocument();
    await expect
      .element(screen.getByText("Visa Application"))
      .toBeInTheDocument();
  });

  it("switches to Communications tab and shows chat + emails", async () => {
    useClientHandlers();
    const screen = await renderPage();
    await screen.getByRole("button", { name: /communications/i }).click();
    await expect.element(screen.getByTestId("chat-pane")).toBeInTheDocument();
    await expect.element(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("clicking back navigates to the clients list", async () => {
    useClientHandlers();
    const screen = await renderPage();
    await screen.getByRole("button", { name: /back to clients/i }).click();
    expect(mockPush).toHaveBeenCalledWith("/workspace/clients");
  });

  it("shows the Preview Portal link for a client whose portal already exists", async () => {
    useClientHandlers();
    const screen = await renderPage();
    await expect
      .element(screen.getByRole("button", { name: /preview portal/i }))
      .toBeInTheDocument();
  });

  it("keeps Save Changes disabled until a setting is changed, then saves and disables it again", async () => {
    useClientHandlers();
    const screen = await renderPage();

    // wait for the portal to load so the baseline snapshot settles
    await expect
      .element(screen.getByRole("button", { name: /preview portal/i }))
      .toBeInTheDocument();

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    await expect.element(saveButton).toBeDisabled();

    await screen.getByRole("button", { name: /change title/i }).click();
    await expect.element(saveButton).not.toBeDisabled();

    await saveButton.click();

    await vi.waitFor(() => {
      expect(lastSavedSettings?.title).toBe("!");
    });
    await expect.element(saveButton).toBeDisabled();
  });

  it("keeps a newer edit typed after Save, before the refetch lands", async () => {
    useClientHandlers();
    const screen = await renderPage();

    // wait for the portal to load so the baseline snapshot settles
    await expect
      .element(screen.getByRole("button", { name: /preview portal/i }))
      .toBeInTheDocument();

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    const changeTitleButton = screen.getByRole("button", {
      name: /change title/i,
    });

    // first edit: title becomes "!"
    await changeTitleButton.click();
    await expect
      .element(screen.getByTestId("portal-title"))
      .toHaveTextContent("Title: !");

    // hold the save request open so we can keep editing before it resolves
    let resolveSave!: () => void;
    worker.use(
      http.post("/api/clients/:id/portal", async ({ request, params }) => {
        const body = (await request.json()) as {
          enabled: boolean;
          settings: Record<string, unknown>;
        };
        await new Promise<void>((resolve) => {
          resolveSave = resolve;
        });
        lastSavedSettings = body.settings;
        portalRecord = {
          id: 1,
          clientId: Number(params.id),
          clientName: mockClient.name,
          token: "tok-123",
          enabled: body.enabled,
          settings: body.settings,
          portalUrl: "https://example.com/portal/tok-123",
          lastAccessedAt: null,
        };
        return HttpResponse.json(portalRecord);
      })
    );

    await saveButton.click();

    // a newer edit arrives while the save (and the refetch it triggers) is
    // still in flight — this must survive, not get clobbered by the sync
    // effect once the refetch resolves with the older, already-stale value
    await changeTitleButton.click();
    await expect
      .element(screen.getByTestId("portal-title"))
      .toHaveTextContent("Title: !!");

    resolveSave();

    // the save resolves with the payload from *before* the second edit
    await vi.waitFor(() => {
      expect(lastSavedSettings?.title).toBe("!");
    });

    // give the invalidated ["clientPortal", id] query time to refetch and
    // the sync effect a chance to (wrongly) run — the newer edit must remain
    await vi.waitFor(() => {
      expect(portalRecord?.settings).toEqual(
        expect.objectContaining({ title: "!" })
      );
    });
    await expect
      .element(screen.getByTestId("portal-title"))
      .toHaveTextContent("Title: !!");

    // the unsaved "!!" edit means the form is still dirty
    await expect.element(saveButton).not.toBeDisabled();
  });
});
