import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ScheduledEmail } from "@/types/communications";

const mockAxiosGet = vi.fn();

vi.mock("axios", () => {
  const axios = {
    get: (...args: unknown[]) => mockAxiosGet(...args),
  };
  return { default: axios, ...axios };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockSendOutlookEmail = vi.fn();

vi.mock("@/lib/outlook/outlook_actions", () => ({
  sendOutlookEmail: (...args: unknown[]) => mockSendOutlookEmail(...args),
}));

const mockCreateScheduledEmail = vi.fn();
const mockDeleteScheduledEmail = vi.fn();

vi.mock("@/lib/scheduled_emails", () => ({
  createScheduledEmail: (...args: unknown[]) =>
    mockCreateScheduledEmail(...args),
  deleteScheduledEmail: (...args: unknown[]) =>
    mockDeleteScheduledEmail(...args),
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

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderComponent = (navContainer: HTMLDivElement | null = null) => {
  const queryClient = makeQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<ScheduledMessages navContainer={navContainer} />, {
    wrapper: Wrapper,
  });
};

const openScheduleDialog = async () => {
  const navContainer = document.createElement("div");
  document.body.appendChild(navContainer);
  renderComponent(navContainer);

  fireEvent.click(
    await within(navContainer).findByRole("button", {
      name: /schedule message/i,
    })
  );
  return within(await screen.findByRole("dialog"));
};

const fillScheduleForm = (dialog: ReturnType<typeof within>) => {
  fireEvent.change(dialog.getByPlaceholderText("recipient@example.com"), {
    target: { value: "new@example.com" },
  });
  fireEvent.change(dialog.getByPlaceholderText("John Doe"), {
    target: { value: "New Person" },
  });
  fireEvent.change(dialog.getByPlaceholderText("Email subject..."), {
    target: { value: "Kickoff call" },
  });
  fireEvent.change(dialog.getByPlaceholderText("Type your message..."), {
    target: { value: "See you soon" },
  });
  const dateInput = document.querySelector<HTMLInputElement>(
    'input[type="date"]'
  );
  fireEvent.change(dateInput!, { target: { value: "2026-07-15" } });
};

beforeEach(() => {
  vi.clearAllMocks();
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

describe("ScheduledMessages — Send Now", () => {
  it("renders a pending message with a Send Now button", async () => {
    renderComponent();

    expect(
      await screen.findByRole("button", { name: /send now/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
    expect(screen.getByText("Quarterly review")).toBeInTheDocument();
  });

  it("optimistically marks the message as sent and calls sendOutlookEmail", async () => {
    let resolveSend!: () => void;
    mockSendOutlookEmail.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSend = resolve;
        })
    );

    renderComponent();

    fireEvent.click(await screen.findByRole("button", { name: /send now/i }));

    // Optimistic: badge flips and the button unmounts before the server responds
    await waitFor(() => {
      expect(screen.getByText("Sent")).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: /send now/i })
    ).not.toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();

    expect(mockSendOutlookEmail).toHaveBeenCalledTimes(1);
    expect(mockSendOutlookEmail).toHaveBeenCalledWith({
      id: 1,
      to: "client@example.com",
      toName: "Jane Client",
      subject: "Quarterly review",
      bodyHtml: "<p>Hello</p>",
      bodyText: "Hello",
    });

    // Server confirms; refetch on settle returns the sent version
    scheduledEmails = [
      { ...pendingEmail, status: "sent", sentAt: "2026-07-03T10:00:00.000Z" },
    ];
    await act(async () => {
      resolveSend();
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Message sent successfully");
    });
    expect(screen.getByText("Sent")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /send now/i })
    ).not.toBeInTheDocument();
  });

  it("rolls back the optimistic update and shows an error toast when sending fails", async () => {
    mockSendOutlookEmail.mockRejectedValue(new Error("smtp down"));

    renderComponent();

    fireEvent.click(await screen.findByRole("button", { name: /send now/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to send message");
    });

    // Rolled back: still pending, button available again
    expect(
      await screen.findByRole("button", { name: /send now/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
    expect(screen.queryByText("Sent")).not.toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("maps null toName and bodyText to undefined in the send payload", async () => {
    scheduledEmails = [
      { ...pendingEmail, id: 2, toName: null, bodyText: null },
    ];
    mockSendOutlookEmail.mockResolvedValue(undefined);

    renderComponent();

    fireEvent.click(await screen.findByRole("button", { name: /send now/i }));

    await waitFor(() => {
      expect(mockSendOutlookEmail).toHaveBeenCalledWith({
        id: 2,
        to: "client@example.com",
        toName: undefined,
        subject: "Quarterly review",
        bodyHtml: "<p>Hello</p>",
        bodyText: undefined,
      });
    });
  });
});

describe("ScheduledMessages — Schedule New Message", () => {
  it("optimistically adds the message to the list before the server responds", async () => {
    let resolveCreate!: () => void;
    mockCreateScheduledEmail.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveCreate = resolve;
        })
    );

    const dialog = await openScheduleDialog();
    fillScheduleForm(dialog);
    fireEvent.click(dialog.getByRole("button", { name: /schedule message/i }));

    // Optimistic: dialog closes and the new message shows up immediately
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Kickoff call")).toBeInTheDocument();
    expect(screen.getByText("New Person")).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();

    expect(mockCreateScheduledEmail).toHaveBeenCalledTimes(1);
    expect(mockCreateScheduledEmail).toHaveBeenCalledWith({
      toEmail: "new@example.com",
      toName: "New Person",
      subject: "Kickoff call",
      bodyHtml: "<p>See you soon</p>",
      bodyText: "See you soon",
      scheduledAt: new Date("2026-07-15T09:00").toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
    await act(async () => {
      resolveCreate();
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Message scheduled successfully"
      );
    });
    expect(screen.getByText("Kickoff call")).toBeInTheDocument();
  });

  it("hides the Send Now and delete buttons on the optimistic entry until the server confirms", async () => {
    scheduledEmails = [];
    mockCreateScheduledEmail.mockImplementation(() => new Promise(() => {}));

    const dialog = await openScheduleDialog();
    fillScheduleForm(dialog);
    fireEvent.click(dialog.getByRole("button", { name: /schedule message/i }));

    await waitFor(() => {
      expect(screen.getByText("Kickoff call")).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: /send now/i })
    ).not.toBeInTheDocument();
  });

  it("rolls back the optimistic message and shows an error toast when scheduling fails", async () => {
    mockCreateScheduledEmail.mockRejectedValue(new Error("db down"));

    const dialog = await openScheduleDialog();
    fillScheduleForm(dialog);
    fireEvent.click(dialog.getByRole("button", { name: /schedule message/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to schedule message");
    });

    // Rolled back: the optimistic message is gone, original list intact
    await waitFor(() => {
      expect(screen.queryByText("Kickoff call")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Quarterly review")).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("validates required fields before mutating", async () => {
    const dialog = await openScheduleDialog();

    fireEvent.click(dialog.getByRole("button", { name: /schedule message/i }));

    expect(toast.error).toHaveBeenCalledWith(
      "Please fill in all required fields"
    );
    expect(mockCreateScheduledEmail).not.toHaveBeenCalled();
    // Dialog stays open so the user can fix the form
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
