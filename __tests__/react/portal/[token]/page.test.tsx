import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}

jest.mock("next/navigation", () => ({
  useParams: () => ({ token: "test-token-abc" }),
}));

jest.mock("motion/react", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  const motion = new Proxy(
    {},
    {
      get: (_t, _tag: string) =>
        function MC({
          children,
          initial,
          animate,
          exit,
          variants,
          transition,
          viewport,
          whileInView,
          whileHover,
          whileTap,
          ...props
        }: Record<string, unknown>) {
          return createElement(_tag, props, children as React.ReactNode);
        },
    }
  );
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/lib/date_utils", () => ({
  parseDateOnlyString: jest.fn((s: string) => new Date(s)),
}));

jest.mock("axios", () => ({
  get: jest.fn(),
  post: jest.fn(() => Promise.resolve({ data: {}, status: 200 })),
  isAxiosError: jest.fn(() => false),
}));

import axios from "axios";
import PortalPage from "@/app/portal/[token]/page";

const mockedAxiosGet = axios.get as jest.Mock;

interface PortalOverrides {
  cases?: unknown[];
  files?: unknown[];
  bookings?: unknown[];
  settings?: Record<string, unknown>;
  chatMessages?: Array<{
    id: number;
    senderType: "client" | "agency";
    body: string;
    readAt: string | null;
    createdAt: string;
  }>;
  failPortal?: boolean;
}

function setupAxiosRoutes(overrides: PortalOverrides = {}) {
  const portalPayload = {
    client: {
      id: 1,
      name: "Portal Client",
      email: "client@example.com",
    },
    settings: { title: "Portal", ...(overrides.settings ?? {}) },
    cases: overrides.cases ?? [],
    files: overrides.files ?? [],
    bookings: overrides.bookings ?? [],
    documentRequests: [],
  };
  mockedAxiosGet.mockImplementation((url: string) => {
    if (url.endsWith("/chat")) {
      return Promise.resolve({
        data: { messages: overrides.chatMessages ?? [] },
      });
    }
    if (overrides.failPortal) {
      return Promise.reject(new Error("network"));
    }
    return Promise.resolve({ data: portalPayload });
  });
}

describe("Portal Page", () => {
  beforeEach(() => {
    mockedAxiosGet.mockReset();
    setupAxiosRoutes();
  });

  it("renders without crashing", () => {
    const { container } = renderWithClient(<PortalPage />);
    expect(container).toBeInTheDocument();
  });

  it("renders loading state initially", () => {
    renderWithClient(<PortalPage />);
    expect(screen.getByText(/loading your portal/i)).toBeInTheDocument();
  });

  const findTabBar = async () =>
    (await screen.findByTestId("portal-tab-bar")) as HTMLElement;

  it("renders the workspace-style tab pill buttons after data loads", async () => {
    renderWithClient(<PortalPage />);
    const tabBar = await findTabBar();
    expect(
      within(tabBar).getByRole("button", { name: /^overview$/i })
    ).toBeInTheDocument();
    expect(
      within(tabBar).getByRole("button", { name: /^cases$/i })
    ).toBeInTheDocument();
    expect(
      within(tabBar).getByRole("button", { name: /^messages$/i })
    ).toBeInTheDocument();
    expect(
      within(tabBar).getByRole("button", { name: /^files$/i })
    ).toBeInTheDocument();
  });

  it("hides the schedule tab when meeting scheduling is disabled", async () => {
    renderWithClient(<PortalPage />);
    const tabBar = await findTabBar();
    expect(
      within(tabBar).queryByRole("button", { name: /schedule meeting/i })
    ).not.toBeInTheDocument();
  });

  it("shows the schedule tab when meeting scheduling is enabled", async () => {
    setupAxiosRoutes({
      settings: {
        meetingSchedulingEnabled: true,
        availability: { meetingDurations: [30] },
      },
    });
    renderWithClient(<PortalPage />);
    const tabBar = await findTabBar();
    expect(
      within(tabBar).getByRole("button", { name: /schedule meeting/i })
    ).toBeInTheDocument();
  });

  it("shows count badges on cases, messages and files tabs", async () => {
    setupAxiosRoutes({
      cases: [
        {
          id: 1,
          name: "Case A",
          status: "in-progress",
          dueDate: "2030-01-01",
          priority: "high",
          description: null,
        },
        {
          id: 2,
          name: "Case B",
          status: "in-progress",
          dueDate: "2030-01-02",
          priority: "low",
          description: null,
        },
      ],
      chatMessages: [
        {
          id: 1,
          senderType: "agency",
          body: "Hi",
          readAt: null,
          createdAt: "2030-01-01T00:00:00Z",
        },
        {
          id: 2,
          senderType: "agency",
          body: "Hello",
          readAt: null,
          createdAt: "2030-01-02T00:00:00Z",
        },
        {
          id: 3,
          senderType: "agency",
          body: "Read",
          readAt: "2030-01-03T00:00:00Z",
          createdAt: "2030-01-03T00:00:00Z",
        },
      ],
      files: [
        {
          id: 1,
          name: "doc.pdf",
          size: 1024,
          mimeType: "application/pdf",
          path: "/p",
          createdAt: null,
        },
      ],
    });
    renderWithClient(<PortalPage />);
    const tabBar = await findTabBar();
    expect(
      within(tabBar).getByRole("button", { name: /^cases\s*2$/i })
    ).toBeInTheDocument();
    expect(
      within(tabBar).getByRole("button", { name: /^messages\s*2$/i })
    ).toBeInTheDocument();
    expect(
      within(tabBar).getByRole("button", { name: /^files\s*1$/i })
    ).toBeInTheDocument();
  });

  it("switches the active tab when a tab pill is clicked", async () => {
    setupAxiosRoutes({
      cases: [
        {
          id: 1,
          name: "Acme Lawsuit",
          status: "in-progress",
          dueDate: "2030-01-01",
          priority: "high",
          description: "Trademark dispute",
        },
      ],
    });
    renderWithClient(<PortalPage />);
    const tabBar = await findTabBar();

    // Overview tab default: shows "Active Cases" toolbar header
    expect(screen.getByText(/active cases/i)).toBeInTheDocument();
    expect(screen.queryByText(/all cases/i)).not.toBeInTheDocument();

    fireEvent.click(
      within(tabBar).getByRole("button", { name: /^cases\s*1$/i })
    );

    await waitFor(() =>
      expect(screen.getByText(/all cases/i)).toBeInTheDocument()
    );
    expect(screen.queryByText(/active cases/i)).not.toBeInTheDocument();
  });

  it("renders the not-found state when portal data fails to load", async () => {
    setupAxiosRoutes({ failPortal: true });
    renderWithClient(<PortalPage />);
    expect(await screen.findByText(/portal not found/i)).toBeInTheDocument();
  });
});
