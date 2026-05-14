import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const mockPush = jest.fn();
const mockUseQuery = jest.fn();
const mockUseMutation = jest.fn();
const mockUseQueryClient = jest.fn(() => ({
  invalidateQueries: jest.fn(),
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQueryClient: () => mockUseQueryClient(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("axios", () => ({
  __esModule: true,
  default: { get: jest.fn() },
  get: jest.fn(),
  isAxiosError: () => false,
}));

jest.mock("@/lib/clients", () => ({
  deleteClient: jest.fn(),
}));

jest.mock("@/app/components/clients/ClientPortalSettings", () => ({
  ClientPortalSettings: ({ clientId }: { clientId: number }) => (
    <div data-testid="portal-settings">Portal for {clientId}</div>
  ),
}));

jest.mock("@/app/components/communications/PortalChatPane", () => ({
  PortalChatPane: ({ clientName }: { clientName: string }) => (
    <div data-testid="chat-pane">Chat with {clientName}</div>
  ),
}));

jest.mock("@/app/workspace/clients/ClientEditDialog", () => ({
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
// status: "fulfilled". Build one to avoid suspending under jsdom.
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
    jest.clearAllMocks();
    mockUseMutation.mockReturnValue({ mutate: jest.fn(), isPending: false });
  });

  it("shows a loader while client query is loading", () => {
    setupQueries({ clientLoading: true });
    render(<ClientDetailPage params={fulfilledParams({ id: "42" })} />);
    // Loader2 has role of presentation; assert no client name yet
    expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
  });

  it("shows an error when client fails to load", () => {
    setupQueries({ clientError: true });
    render(<ClientDetailPage params={fulfilledParams({ id: "42" })} />);
    expect(screen.getByText(/failed to load client/i)).toBeInTheDocument();
  });

  it("renders the client header with name, email, and phone", () => {
    setupQueries();
    render(<ClientDetailPage params={fulfilledParams({ id: "42" })} />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("contact@acme.com")).toBeInTheDocument();
    expect(screen.getByText("555-1234")).toBeInTheDocument();
  });

  it("renders all three section tabs", () => {
    setupQueries();
    render(<ClientDetailPage params={fulfilledParams({ id: "42" })} />);
    expect(screen.getByRole("button", { name: /portal/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cases/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /communications/i })
    ).toBeInTheDocument();
  });

  it("shows the Portal settings by default", () => {
    setupQueries();
    render(<ClientDetailPage params={fulfilledParams({ id: "42" })} />);
    expect(screen.getByTestId("portal-settings")).toBeInTheDocument();
  });

  it("switches to Cases tab and shows cases", () => {
    setupQueries();
    render(<ClientDetailPage params={fulfilledParams({ id: "42" })} />);
    fireEvent.click(screen.getByRole("button", { name: /cases/i }));
    expect(screen.getByTestId("cases-tab")).toBeInTheDocument();
    expect(screen.getByText("Visa Application")).toBeInTheDocument();
  });

  it("switches to Communications tab and shows chat + emails", () => {
    setupQueries();
    render(<ClientDetailPage params={fulfilledParams({ id: "42" })} />);
    fireEvent.click(screen.getByRole("button", { name: /communications/i }));
    expect(screen.getByTestId("chat-pane")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("clicking back navigates to the clients list", () => {
    setupQueries();
    render(<ClientDetailPage params={fulfilledParams({ id: "42" })} />);
    fireEvent.click(screen.getByRole("button", { name: /back to clients/i }));
    expect(mockPush).toHaveBeenCalledWith("/workspace/clients");
  });
});
