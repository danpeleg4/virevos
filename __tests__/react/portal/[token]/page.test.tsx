import React from "react";
import { page } from "vitest/browser";
import { http, HttpResponse, delay } from "msw";
import { worker } from "../../../msw/worker";
import { renderWithQueryClient } from "../../../_helpers/render";

vi.mock("next/navigation", () => ({
  useParams: () => ({ token: "test-token-abc" }),
}));

vi.mock("@/lib/util/date_utils", () => ({
  parseDateOnlyString: vi.fn((s: string) => new Date(s)),
}));

import PortalPage from "@/app/portal/[token]/page";

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
}

function setupPortalHandlers(overrides: PortalOverrides = {}) {
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

  worker.use(
    http.get("/api/portal/:token", ({ request }) => {
      const url = new URL(request.url);
      const type = url.searchParams.get("type");
      if (type === "chat") {
        return HttpResponse.json({ messages: overrides.chatMessages ?? [] });
      }
      if (type === "availability") {
        return HttpResponse.json({ slots: [] });
      }
      return HttpResponse.json(portalPayload);
    })
  );
}

describe("Portal Page", () => {
  beforeEach(() => {
    setupPortalHandlers();
  });

  it("renders without crashing", async () => {
    const { container } = await renderWithQueryClient(<PortalPage />);
    await expect.element(container).toBeInTheDocument();
  });

  it("renders loading state initially", async () => {
    // keep the portal query pending so the loading state stays visible
    worker.use(
      http.get("/api/portal/:token", async () => {
        await delay("infinite");
        return HttpResponse.json({});
      })
    );
    const screen = await renderWithQueryClient(<PortalPage />);
    await expect
      .element(screen.getByText(/loading your portal/i))
      .toBeInTheDocument();
  });

  const findTabBar = async (screen: {
    getByTestId: (id: string) => ReturnType<typeof page.getByTestId>;
  }) => {
    const tabBar = screen.getByTestId("portal-tab-bar");
    await expect.element(tabBar).toBeInTheDocument();
    return tabBar;
  };

  it("renders the workspace-style tab pill buttons after data loads", async () => {
    const screen = await renderWithQueryClient(<PortalPage />);
    const tabBar = await findTabBar(screen);
    await expect
      .element(tabBar.getByRole("button", { name: /^overview$/i }))
      .toBeInTheDocument();
    await expect
      .element(tabBar.getByRole("button", { name: /^cases$/i }))
      .toBeInTheDocument();
    await expect
      .element(tabBar.getByRole("button", { name: /^messages$/i }))
      .toBeInTheDocument();
    await expect
      .element(tabBar.getByRole("button", { name: /^files$/i }))
      .toBeInTheDocument();
  });

  it("hides the schedule tab when meeting scheduling is disabled", async () => {
    const screen = await renderWithQueryClient(<PortalPage />);
    const tabBar = await findTabBar(screen);
    await expect
      .element(tabBar.getByRole("button", { name: /schedule meeting/i }))
      .not.toBeInTheDocument();
  });

  it("shows the schedule tab when meeting scheduling is enabled", async () => {
    setupPortalHandlers({
      settings: {
        meetingSchedulingEnabled: true,
        availability: { meetingDurations: [30] },
      },
    });
    const screen = await renderWithQueryClient(<PortalPage />);
    const tabBar = await findTabBar(screen);
    await expect
      .element(tabBar.getByRole("button", { name: /schedule meeting/i }))
      .toBeInTheDocument();
  });

  it("shows count badges on cases, messages and files tabs", async () => {
    setupPortalHandlers({
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
    const screen = await renderWithQueryClient(<PortalPage />);
    const tabBar = await findTabBar(screen);
    await expect
      .element(tabBar.getByRole("button", { name: /^cases\s*2$/i }))
      .toBeInTheDocument();
    await expect
      .element(tabBar.getByRole("button", { name: /^messages\s*2$/i }))
      .toBeInTheDocument();
    await expect
      .element(tabBar.getByRole("button", { name: /^files\s*1$/i }))
      .toBeInTheDocument();
  });

  it("switches the active tab when a tab pill is clicked", async () => {
    setupPortalHandlers({
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
    const screen = await renderWithQueryClient(<PortalPage />);
    const tabBar = await findTabBar(screen);

    // Overview tab default: shows "Active Cases" toolbar header
    await expect.element(screen.getByText(/active cases/i)).toBeInTheDocument();
    await expect
      .element(screen.getByText(/all cases/i))
      .not.toBeInTheDocument();

    await tabBar.getByRole("button", { name: /^cases\s*1$/i }).click();

    await expect.element(screen.getByText(/all cases/i)).toBeInTheDocument();
    await expect
      .element(screen.getByText(/active cases/i))
      .not.toBeInTheDocument();
  });

  it("renders the not-found state when portal data fails to load", async () => {
    worker.use(
      http.get("/api/portal/:token", () =>
        HttpResponse.json({ error: "Portal not found" }, { status: 404 })
      )
    );
    const screen = await renderWithQueryClient(<PortalPage />);
    await expect
      .element(screen.getByText(/portal not found/i))
      .toBeInTheDocument();
  });

  it("sends a chat message via the chat route", async () => {
    let sentBody: unknown;
    worker.use(
      http.post("/api/portal/:token/chat", async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json({
          id: 1,
          senderType: "client",
          body: (sentBody as { message: string }).message,
          readAt: null,
          createdAt: new Date().toISOString(),
        });
      })
    );
    const screen = await renderWithQueryClient(<PortalPage />);
    const tabBar = await findTabBar(screen);
    await tabBar.getByRole("button", { name: /^messages$/i }).click();

    await screen.getByPlaceholder(/write a message/i).fill("Hello there");
    await screen.getByRole("button", { name: /send/i }).click();

    await vi.waitFor(() => {
      expect(sentBody).toEqual({ message: "Hello there" });
    });
  });

  it("uploads a file through the upload mutation", async () => {
    setupPortalHandlers({
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

    let uploadedToken: string | undefined;
    let receivedFormData: FormData | undefined;
    worker.use(
      http.post("/api/portal/:token/files", async ({ request, params }) => {
        uploadedToken = String(params.token);
        receivedFormData = await request.formData();
        return HttpResponse.json({
          id: 1,
          name: "report.pdf",
          size: 4,
          mimeType: "application/pdf",
          path: "p",
          createdAt: new Date().toISOString(),
          caseId: 7,
        });
      })
    );

    const screen = await renderWithQueryClient(<PortalPage />);
    const tabBar = await findTabBar(screen);
    await tabBar.getByRole("button", { name: /^files/i }).click();

    const fileInput = page.elementLocator(
      document.getElementById("portalFileInput")!
    );
    const file = new File(["data"], "report.pdf", { type: "application/pdf" });
    await fileInput.upload(file);

    await vi.waitFor(() => {
      expect(uploadedToken).toBe("test-token-abc");
      expect(receivedFormData?.get("file")).toBeInstanceOf(File);
    });
  });

  it("shows the documents-needed tab when requests exist", async () => {
    setupPortalHandlers({
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
    const screen = await renderWithQueryClient(<PortalPage />);
    const tabBar = await findTabBar(screen);
    await tabBar.getByRole("button", { name: /documents needed/i }).click();
    await expect
      .element(screen.getByText(/passport copy/i))
      .toBeInTheDocument();
  });

  it("shows the date prompt before any availability is requested on the schedule tab", async () => {
    setupPortalHandlers({
      settings: {
        meetingSchedulingEnabled: true,
        availability: { meetingDurations: [30, 60] },
      },
    });

    let availabilityCalled = false;
    worker.use(
      http.get("/api/portal/:token", ({ request }) => {
        const url = new URL(request.url);
        const type = url.searchParams.get("type");
        if (type === "availability") {
          availabilityCalled = true;
          return HttpResponse.json({ slots: [] });
        }
        if (type === "chat") {
          return HttpResponse.json({ messages: [] });
        }
        return HttpResponse.json({
          client: {
            id: 1,
            name: "Portal Client",
            email: "client@example.com",
          },
          settings: {
            title: "Portal",
            meetingSchedulingEnabled: true,
            availability: { meetingDurations: [30, 60] },
          },
          cases: [],
          files: [],
          bookings: [],
          documentRequests: [],
        });
      })
    );

    const screen = await renderWithQueryClient(<PortalPage />);
    const tabBar = await findTabBar(screen);
    await tabBar.getByRole("button", { name: /schedule meeting/i }).click();

    await expect
      .element(screen.getByText(/choose a date to see available slots/i))
      .toBeInTheDocument();
    // The availability query stays disabled until a date is picked
    expect(availabilityCalled).toBe(false);
  });
});
