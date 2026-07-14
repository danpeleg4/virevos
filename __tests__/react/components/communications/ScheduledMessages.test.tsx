import React from "react";
import { render } from "vitest-browser-react";
import { page, type Locator } from "vitest/browser";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ScheduledEmail } from "@/types/communications";

const mockAxiosGet = vi.fn();
const mockAxiosPost = vi.fn();
const mockAxiosDelete = vi.fn();

vi.mock("axios", () => {
  const axios = {
    get: (...args: unknown[]) => mockAxiosGet(...args),
    post: (...args: unknown[]) => mockAxiosPost(...args),
    delete: (...args: unknown[]) => mockAxiosDelete(...args),
  };
  return { default: axios, ...axios };
});

// itemsPerPage is derived from measured viewport height; pin it so the
// pagination tests are deterministic regardless of the browser window size
const calcWindow = vi.hoisted(() => ({ itemsPerPage: 10 }));

vi.mock("@/app/hooks/useCalcWindow", () => ({
  useCalcWindow: () => ({
    itemsPerPage: calcWindow.itemsPerPage,
    tableRef: { current: null },
  }),
}));

import { ScheduledMessages } from "@/app/components/communications/ScheduledMessages";

const pendingEmail: ScheduledEmail = {
  id: 1,
  toEmail: "client@example.com",
  toName: "Jane Client",
  subject: "Quarterly review",
  bodyHtml: "<p>Hello</p>",
  bodyText: "Hello",
  scheduledAt: "2026-07-10T09:00:00.000Z",
  timezone: "UTC",
  recurring: null,
  status: "pending",
  sentAt: null,
  errorMessage: null,
  clientId: null,
  createdAt: "2026-07-01T09:00:00.000Z",
};

let scheduledEmails: ScheduledEmail[];
let navContainer: HTMLDivElement | null = null;

const createNavContainer = () => {
  navContainer = document.createElement("div");
  document.body.appendChild(navContainer);
  return navContainer;
};

const emailsFetchCount = () =>
  mockAxiosGet.mock.calls.filter(
    (call: unknown[]) => call[0] === "/api/scheduled-emails"
  ).length;

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderComponent = (nav: HTMLDivElement | null = null) => {
  const queryClient = makeQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<ScheduledMessages navContainer={nav} />, {
    wrapper: Wrapper,
  });
};

const openScheduleDialog = async () => {
  const nav = createNavContainer();
  const screen = await renderComponent(nav);

  await page
    .elementLocator(nav)
    .getByRole("button", { name: /schedule message/i })
    .click();

  const dialog = screen.getByRole("dialog");
  await expect.element(dialog).toBeInTheDocument();
  return { screen, dialog };
};

const fillScheduleForm = async (dialog: Locator) => {
  await dialog
    .getByPlaceholder("recipient@example.com")
    .fill("new@example.com");
  await dialog.getByPlaceholder("John Doe").fill("New Person");
  await dialog.getByPlaceholder("Email subject...").fill("Kickoff call");
  await dialog.getByPlaceholder("Type your message...").fill("See you soon");
  const dateInput =
    document.querySelector<HTMLInputElement>('input[type="date"]');
  await page.elementLocator(dateInput!).fill("2026-07-15");
};

beforeEach(() => {
  vi.resetAllMocks();
  calcWindow.itemsPerPage = 10;
  scheduledEmails = [pendingEmail];
  mockAxiosGet.mockImplementation((url: string) => {
    if (url === "/api/integrations/outlook") {
      return Promise.resolve({ data: { connected: true } });
    }
    if (url === "/api/scheduled-emails") {
      return Promise.resolve({ data: { scheduledEmails } });
    }
    return Promise.resolve({ data: {} });
  });
});

afterEach(() => {
  navContainer?.remove();
  navContainer = null;
});

describe("ScheduledMessages — Send Now", () => {
  it("renders a pending message with a Send Now button", async () => {
    const screen = await renderComponent();

    await expect
      .element(screen.getByRole("button", { name: /send now/i }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Scheduled", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Quarterly review"))
      .toBeInTheDocument();
  });

  it("optimistically marks the message as sent and posts a send-now request", async () => {
    let resolveSend!: () => void;
    mockAxiosPost.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSend = resolve;
        })
    );

    const screen = await renderComponent();

    await screen.getByRole("button", { name: /send now/i }).click();

    // Optimistic: badge flips and the button unmounts before the server responds
    await expect
      .element(screen.getByText("Sent", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /send now/i }))
      .not.toBeInTheDocument();

    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    expect(mockAxiosPost).toHaveBeenCalledWith("/api/scheduled-emails", {
      data: 1,
      type: "send-now",
    });

    // Server confirms; refetch on settle returns the sent version
    scheduledEmails = [
      { ...pendingEmail, status: "sent", sentAt: "2026-07-03T10:00:00.000Z" },
    ];
    const fetchesBeforeSettle = emailsFetchCount();
    resolveSend();

    await vi.waitFor(() => {
      expect(emailsFetchCount()).toBeGreaterThan(fetchesBeforeSettle);
    });
    await expect
      .element(screen.getByText("Sent", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /send now/i }))
      .not.toBeInTheDocument();
  });

  it("rolls back the optimistic update when sending fails", async () => {
    mockAxiosPost.mockRejectedValue(new Error("smtp down"));

    const screen = await renderComponent();

    await screen.getByRole("button", { name: /send now/i }).click();

    await vi.waitFor(() => {
      expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    });

    // Rolled back: still pending, button available again
    await expect
      .element(screen.getByRole("button", { name: /send now/i }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Scheduled", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Sent", { exact: true }))
      .not.toBeInTheDocument();
  });

  it("sends only the scheduled email id — the server reads the row itself", async () => {
    scheduledEmails = [
      { ...pendingEmail, id: 2, toName: null, bodyText: null },
    ];
    mockAxiosPost.mockResolvedValue({ data: { success: true } });

    const screen = await renderComponent();

    await screen.getByRole("button", { name: /send now/i }).click();

    await vi.waitFor(() => {
      expect(mockAxiosPost).toHaveBeenCalledWith("/api/scheduled-emails", {
        data: 2,
        type: "send-now",
      });
    });
  });
});

describe("ScheduledMessages — Schedule New Message", () => {
  it("optimistically adds the message to the list before the server responds", async () => {
    let resolveCreate!: () => void;
    mockAxiosPost.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveCreate = resolve;
        })
    );

    const { screen, dialog } = await openScheduleDialog();
    await fillScheduleForm(dialog);
    await dialog.getByRole("button", { name: /schedule message/i }).click();

    // Optimistic: dialog closes and the new message shows up immediately
    await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();
    await expect.element(screen.getByText("Kickoff call")).toBeInTheDocument();
    await expect.element(screen.getByText("New Person")).toBeInTheDocument();

    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    expect(mockAxiosPost).toHaveBeenCalledWith("/api/scheduled-emails", {
      type: "schedule",
      data: {
        toEmail: "new@example.com",
        toName: "New Person",
        subject: "Kickoff call",
        bodyHtml: "<p>See you soon</p>",
        bodyText: "See you soon",
        scheduledAt: new Date("2026-07-15T09:00").toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });

    // Server confirms; refetch on settle returns the persisted version
    scheduledEmails = [
      {
        ...pendingEmail,
        id: 7,
        toEmail: "new@example.com",
        toName: "New Person",
        subject: "Kickoff call",
        bodyHtml: "<p>See you soon</p>",
        bodyText: "See you soon",
        scheduledAt: new Date("2026-07-15T09:00").toISOString(),
      },
      pendingEmail,
    ];
    const fetchesBeforeSettle = emailsFetchCount();
    resolveCreate();

    await vi.waitFor(() => {
      expect(emailsFetchCount()).toBeGreaterThan(fetchesBeforeSettle);
    });
    await expect.element(screen.getByText("Kickoff call")).toBeInTheDocument();
  });

  it("hides the Send Now and delete buttons on the optimistic entry until the server confirms", async () => {
    scheduledEmails = [];
    mockAxiosPost.mockImplementation(() => new Promise(() => {}));

    const { screen, dialog } = await openScheduleDialog();
    await fillScheduleForm(dialog);
    await dialog.getByRole("button", { name: /schedule message/i }).click();

    await expect.element(screen.getByText("Kickoff call")).toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /send now/i }))
      .not.toBeInTheDocument();
  });

  it("rolls back the optimistic message when scheduling fails", async () => {
    mockAxiosPost.mockRejectedValue(new Error("db down"));

    const { screen, dialog } = await openScheduleDialog();
    await fillScheduleForm(dialog);
    await dialog.getByRole("button", { name: /schedule message/i }).click();

    await vi.waitFor(() => {
      expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    });

    // Rolled back: the optimistic message is gone, original list intact
    await expect
      .element(screen.getByText("Kickoff call"))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByText("Quarterly review"))
      .toBeInTheDocument();
  });

  it("validates required fields before mutating", async () => {
    const { screen, dialog } = await openScheduleDialog();

    await dialog.getByRole("button", { name: /schedule message/i }).click();

    expect(mockAxiosPost).not.toHaveBeenCalled();
    // Dialog stays open so the user can fix the form
    await expect.element(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("ScheduledMessages — Pagination", () => {
  const makeEmails = (n: number): ScheduledEmail[] =>
    Array.from({ length: n }, (_, i) => ({
      ...pendingEmail,
      id: i + 1,
      subject: `Message ${i + 1}`,
    }));

  it("splits messages into pages and navigates with Previous/Next", async () => {
    calcWindow.itemsPerPage = 2;
    scheduledEmails = makeEmails(3);

    const screen = await renderComponent();

    await expect.element(screen.getByText("Message 1")).toBeInTheDocument();
    await expect.element(screen.getByText("Message 2")).toBeInTheDocument();
    await expect.element(screen.getByText("Message 3")).not.toBeInTheDocument();
    await expect
      .element(screen.getByText(/Showing 1–2 of 3 messages/))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /previous/i }))
      .toBeDisabled();

    await screen.getByRole("button", { name: /next/i }).click();

    await expect.element(screen.getByText("Message 3")).toBeInTheDocument();
    await expect.element(screen.getByText("Message 1")).not.toBeInTheDocument();
    await expect
      .element(screen.getByText(/Showing 3–3 of 3 messages/))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /next/i }))
      .toBeDisabled();

    await screen.getByRole("button", { name: /previous/i }).click();
    await expect.element(screen.getByText("Message 1")).toBeInTheDocument();
  });

  it("resets to the first page when the search query changes", async () => {
    calcWindow.itemsPerPage = 2;
    scheduledEmails = makeEmails(3);
    const nav = createNavContainer();
    const screen = await renderComponent(nav);

    await expect.element(screen.getByText("Message 1")).toBeInTheDocument();
    await screen.getByRole("button", { name: /next/i }).click();
    await expect
      .element(screen.getByText(/Showing 3–3 of 3 messages/))
      .toBeInTheDocument();

    // all rows share client@example.com, so the list is unchanged — only the page resets
    await page
      .elementLocator(nav)
      .getByPlaceholder("Search scheduled...")
      .fill("client");

    await expect
      .element(screen.getByText(/Showing 1–2 of 3 messages/))
      .toBeInTheDocument();
    await expect.element(screen.getByText("Message 1")).toBeInTheDocument();
  });

  it("shows the filtered empty state inside the table when nothing matches", async () => {
    const nav = createNavContainer();
    const screen = await renderComponent(nav);

    await expect
      .element(screen.getByText("Quarterly review"))
      .toBeInTheDocument();

    await page
      .elementLocator(nav)
      .getByPlaceholder("Search scheduled...")
      .fill("zzz-no-match");

    await expect
      .element(screen.getByText("No messages match your filters"))
      .toBeInTheDocument();
    // the CTA empty state is reserved for a truly empty list
    await expect
      .element(
        screen.getByRole("button", { name: /schedule your first message/i })
      )
      .not.toBeInTheDocument();
  });
});
