import React from "react";
import { render } from "vitest-browser-react";

const mockPush = vi.fn();
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockUseQueryClient = vi.fn(() => ({
  invalidateQueries: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQueryClient: () => mockUseQueryClient(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("axios", () => ({
  __esModule: true,
  default: { get: vi.fn() },
  get: vi.fn(),
  isAxiosError: () => false,
}));

vi.mock("@/lib/workspace/clients", () => ({
  deleteClient: vi.fn(),
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

function setupQueries(
  overrides: Partial<{
    clientLoading: boolean;
    clientError: boolean;
    client: typeof mockClient | null;
    cases: typeof mockCases;
    emails: typeof mockEmails;
  }> = {}
) {
  const {
    clientLoading = false,
    clientError = false,
    client = mockClient,
    cases = mockCases,
    emails = mockEmails,
  } = overrides;

  mockUseQuery.mockImplementation((opts: { queryKey: string[] }) => {
    const key = opts.queryKey[0];
    if (key === "client") {
      return {
        data: clientError ? undefined : { client, portal: null },
        isLoading: clientLoading,
        isError: clientError,
      };
    }
    if (key === "clientCases") {
      return { data: cases, isLoading: false, isError: false };
    }
    if (key === "clientOutlookEmails") {
      return { data: emails, isLoading: false, isError: false };
    }
    return { data: undefined, isLoading: false, isError: false };
  });
}

describe("Client Detail Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it("shows a loader while client query is loading", async () => {
    setupQueries({ clientLoading: true });
    const screen = await render(
      <ClientDetailPage params={fulfilledParams({ id: "42" })} />
    );
    // Loader2 has role of presentation; assert no client name yet
    await expect.element(screen.getByText("Acme Corp")).not.toBeInTheDocument();
  });

  it("shows an error when client fails to load", async () => {
    setupQueries({ clientError: true });
    const screen = await render(
      <ClientDetailPage params={fulfilledParams({ id: "42" })} />
    );
    await expect
      .element(screen.getByText(/failed to load client/i))
      .toBeInTheDocument();
  });

  it("renders the client header with name, email, and phone", async () => {
    setupQueries();
    const screen = await render(
      <ClientDetailPage params={fulfilledParams({ id: "42" })} />
    );
    await expect.element(screen.getByText("Acme Corp")).toBeInTheDocument();
    await expect
      .element(screen.getByText("contact@acme.com"))
      .toBeInTheDocument();
    await expect.element(screen.getByText("555-1234")).toBeInTheDocument();
  });

  it("renders all three section tabs", async () => {
    setupQueries();
    const screen = await render(
      <ClientDetailPage params={fulfilledParams({ id: "42" })} />
    );
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
    setupQueries();
    const screen = await render(
      <ClientDetailPage params={fulfilledParams({ id: "42" })} />
    );
    await expect
      .element(screen.getByTestId("portal-settings"))
      .toBeInTheDocument();
  });

  it("switches to Cases tab and shows cases", async () => {
    setupQueries();
    const screen = await render(
      <ClientDetailPage params={fulfilledParams({ id: "42" })} />
    );
    await screen.getByRole("button", { name: /cases/i }).click();
    await expect.element(screen.getByTestId("cases-tab")).toBeInTheDocument();
    await expect
      .element(screen.getByText("Visa Application"))
      .toBeInTheDocument();
  });

  it("switches to Communications tab and shows chat + emails", async () => {
    setupQueries();
    const screen = await render(
      <ClientDetailPage params={fulfilledParams({ id: "42" })} />
    );
    await screen.getByRole("button", { name: /communications/i }).click();
    await expect.element(screen.getByTestId("chat-pane")).toBeInTheDocument();
    await expect.element(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("clicking back navigates to the clients list", async () => {
    setupQueries();
    const screen = await render(
      <ClientDetailPage params={fulfilledParams({ id: "42" })} />
    );
    await screen.getByRole("button", { name: /back to clients/i }).click();
    expect(mockPush).toHaveBeenCalledWith("/workspace/clients");
  });
});
