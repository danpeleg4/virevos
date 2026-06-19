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

vi.mock("next/navigation", () => ({
  useParams: () => ({ token: "test-token-abc" }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/util/date_utils", () => ({
  parseDateOnlyString: vi.fn((s: string) => new Date(s)),
}));

// Server actions pull in the DB layer, which is unavailable under jsdom — stub them.
vi.mock("@/lib/portal_chat", () => ({
  sendPortalChatMessage: vi.fn(() =>
    Promise.resolve({
      id: 1,
      senderType: "client",
      body: "x",
      readAt: null,
      createdAt: new Date().toISOString(),
    })
  ),
}));

vi.mock("@/lib/portal_bookings", () => ({
  createPortalBooking: vi.fn(() =>
    Promise.resolve({ success: true, bookingId: 1 })
  ),
}));

vi.mock("@/lib/portal_file_uploads", () => ({
  uploadPortalFile: vi.fn(() =>
    Promise.resolve({
      id: 1,
      name: "report.pdf",
      size: 4,
      mimeType: "application/pdf",
      path: "p",
      createdAt: new Date().toISOString(),
      caseId: 7,
    })
  ),
}));

vi.mock("@/lib/portal_document_uploads", () => ({
  uploadDocumentRequestItem: vi.fn(() =>
    Promise.resolve({
      itemId: 1,
      status: "uploaded",
      file: {
        id: 1,
        name: "doc.pdf",
        size: 4,
        mimeType: "application/pdf",
        path: "p",
      },
    })
  ),
}));

vi.mock("axios", () => {
  const axios = {
    get: vi.fn(),
    post: vi.fn(() => Promise.resolve({ data: {}, status: 200 })),
    isAxiosError: vi.fn(() => false),
  };
  return { default: axios, ...axios };
});

import axios from "axios";
import { sendPortalChatMessage } from "@/lib/portal_chat";
import { uploadPortalFile } from "@/lib/portal_file_uploads";
import PortalPage from "@/app/portal/[token]/page";

const mockedAxiosGet = axios.get as Mock;

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
  documentRequests?: unknown[];
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
    documentRequests: overrides.documentRequests ?? [],
  };
  mockedAxiosGet.mockImplementation(
    (url: string, config?: { params?: { type?: string } }) => {
      if (url.endsWith("/chat") || config?.params?.type === "chat") {
        return Promise.resolve({
          data: { messages: overrides.chatMessages ?? [] },
        });
      }
      if (overrides.failPortal) {
        return Promise.reject(new Error("network"));
      }
      return Promise.resolve({ data: portalPayload });
    }
  );
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

  it("sends a chat message via the server action", async () => {
    setupAxiosRoutes();
    renderWithClient(<PortalPage />);
    const tabBar = await findTabBar();
    fireEvent.click(
      within(tabBar).getByRole("button", { name: /^messages$/i })
    );

    const textarea = await screen.findByPlaceholderText(/write a message/i);
    fireEvent.change(textarea, { target: { value: "Hello there" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() =>
      expect(sendPortalChatMessage).toHaveBeenCalledWith(
        "test-token-abc",
        "Hello there"
      )
    );
  });

  it("uploads a file through the upload mutation", async () => {
    setupAxiosRoutes({
      cases: [
        {
          id: 7,
          name: "Case A",
          status: "in-progress",
          dueDate: "2030-01-01",
          priority: "high",
          description: null,
        },
      ],
    });
    renderWithClient(<PortalPage />);
    const tabBar = await findTabBar();
    fireEvent.click(within(tabBar).getByRole("button", { name: /^files/i }));

    const fileInput = document.getElementById(
      "portalFileInput"
    ) as HTMLInputElement;
    const file = new File(["data"], "report.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadPortalFile).toHaveBeenCalledWith(
        "test-token-abc",
        expect.any(FormData)
      );
    });
  });

  it("shows the documents-needed tab when requests exist", async () => {
    setupAxiosRoutes({
      documentRequests: [
        {
          id: 1,
          eventTitle: "Intake Meeting",
          eventDateTime: "2030-01-01T00:00:00Z",
          approvedAt: null,
          items: [
            {
              id: 11,
              name: "Passport Copy",
              description: null,
              sortOrder: 0,
              status: "pending",
              uploadedFileId: null,
              uploadedAt: null,
              aiVerdict: null,
              aiReasoning: null,
              aiAnalyzedAt: null,
              uploadedFile: null,
            },
          ],
        },
      ],
    });
    renderWithClient(<PortalPage />);
    const tabBar = await findTabBar();
    fireEvent.click(
      within(tabBar).getByRole("button", { name: /documents needed/i })
    );
    expect(await screen.findByText(/passport copy/i)).toBeInTheDocument();
  });

  it("shows the date prompt before any availability is requested on the schedule tab", async () => {
    setupAxiosRoutes({
      settings: {
        meetingSchedulingEnabled: true,
        availability: { meetingDurations: [30, 60] },
      },
    });
    renderWithClient(<PortalPage />);
    const tabBar = await findTabBar();
    fireEvent.click(
      within(tabBar).getByRole("button", { name: /schedule meeting/i })
    );

    expect(
      await screen.findByText(/choose a date to see available slots/i)
    ).toBeInTheDocument();
    // The availability query stays disabled until a date is picked
    const availabilityCall = (axios.get as Mock).mock.calls.find(
      (args: unknown[]) => {
        const cfg = args[1];
        return cfg && typeof cfg === "object" && "params" in cfg
          ? (cfg.params as { type?: string })?.type === "availability"
          : false;
      }
    );
    expect(availabilityCall).toBeFalsy();
  });
});
