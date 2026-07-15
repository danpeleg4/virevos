import React from "react";
import { delay, http, HttpResponse } from "msw";
import { worker } from "../../../../msw/worker";
import { renderWithQueryClient } from "../../../../_helpers/render";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/app/components/clients/ClientPortalSettings", () => ({
  ClientPortalSettings: ({ clientId }: { clientId: number }) => (
    <div data-testid="portal-settings">Portal for {clientId}</div>
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
      if (type === "portal") return HttpResponse.json({ portal: null });
      return HttpResponse.json({ error: "Invalid type" }, { status: 400 });
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
      .element(screen.getByRole("button", { name: /portal/i }))
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
});
