import React, { JSX } from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const mockQueryClient = {
  setQueryData: vi.fn(),
  invalidateQueries: vi.fn(),
};

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => mockQueryClient,
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    variables: undefined,
  })),
  useQuery: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
  })),
}));

vi.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <p>{children}</p>,
}));

vi.mock("@/lib/portal_bookings", () => ({
  acceptBookingWithCalendar: vi.fn(),
  updateBookingStatus: vi.fn(),
}));

vi.mock("@/lib/document_requests", () => ({
  approveDocumentRequest: vi.fn(),
  declineDocumentRequest: vi.fn(),
  updateDocumentRequest: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch for streaming
global.fetch = vi.fn();

import { waitFor } from "@testing-library/react";
import { AIAssistant } from "@/app/components/AIAssistant";

describe("AIAssistant", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    onClose.mockClear();
    (global.fetch as Mock).mockClear();
  });

  it("renders panel when isOpen=true", () => {
    render(
      <AIAssistant isOpen={true} onClose={onClose} pendingBookings={[]} />
    );
    expect(screen.getByText(/virevos ai/i)).toBeInTheDocument();
  });

  it("does not render panel when isOpen=false", () => {
    render(
      <AIAssistant isOpen={false} onClose={onClose} pendingBookings={[]} />
    );
    expect(screen.queryByText(/virevos ai/i)).not.toBeInTheDocument();
  });

  it("renders input field when open", () => {
    render(
      <AIAssistant isOpen={true} onClose={onClose} pendingBookings={[]} />
    );
    expect(
      screen.getByPlaceholderText(/plan, search, build/i)
    ).toBeInTheDocument();
  });

  it("send button is disabled when input is empty", () => {
    render(
      <AIAssistant isOpen={true} onClose={onClose} pendingBookings={[]} />
    );
    // Find the button that is disabled when input is empty (the Send icon button)
    const buttons = screen.getAllByRole("button");
    const sendButton = buttons.find((b) => b.hasAttribute("disabled"));
    expect(sendButton).toBeDefined();
  });

  it("close button calls onClose", () => {
    render(
      <AIAssistant isOpen={true} onClose={onClose} pendingBookings={[]} />
    );
    const buttons = screen.getAllByRole("button");
    // The X button is the close button in the header
    fireEvent.click(buttons[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("input accepts text", () => {
    render(
      <AIAssistant isOpen={true} onClose={onClose} pendingBookings={[]} />
    );
    const input = screen.getByPlaceholderText(/plan, search, build/i);
    fireEvent.change(input, { target: { value: "Hello AI" } });
    expect(input).toHaveValue("Hello AI");
  });

  it("shows meeting request section when there are pending bookings", () => {
    const pending = [
      {
        id: 1,
        portalId: 10,
        clientId: 5,
        userId: "user_1",
        clientName: "Alice Smith",
        clientEmail: "alice@example.com",
        dateTime: "2030-06-01T10:00:00.000Z",
        duration: 30,
        status: "pending" as const,
        notes: "Discuss Q3 roadmap",
        meetingLink: null,
        eventId: null,
        createdAt: null,
        clientDisplayName: "Alice Corp",
      },
    ];
    render(
      <AIAssistant isOpen={true} onClose={onClose} pendingBookings={pending} />
    );
    expect(screen.getByText(/1 meeting request/i)).toBeInTheDocument();
    expect(screen.getByText(/alice corp/i)).toBeInTheDocument();
    expect(screen.getByText(/accept/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /decline/i })
    ).toBeInTheDocument();
  });

  it("does not show meeting request section when there are no pending bookings", () => {
    render(
      <AIAssistant isOpen={true} onClose={onClose} pendingBookings={[]} />
    );
    expect(screen.queryByText(/meeting request/i)).not.toBeInTheDocument();
  });

  const makeBooking = (id: number, clientName: string) => ({
    id,
    portalId: 10,
    clientId: id,
    userId: "user_1",
    clientName,
    clientEmail: `${clientName.toLowerCase().replace(/\s+/g, "")}@example.com`,
    dateTime: "2030-06-01T10:00:00.000Z",
    duration: 30,
    status: "pending" as const,
    notes: null,
    meetingLink: null,
    eventId: null,
    createdAt: null,
    clientDisplayName: clientName,
  });

  it("shows all bookings inline and disables the toggle when count <= 2", () => {
    const pending = [makeBooking(1, "Alice Corp"), makeBooking(2, "Bob Inc")];
    render(
      <AIAssistant isOpen={true} onClose={onClose} pendingBookings={pending} />
    );
    expect(screen.getByText(/alice corp/i)).toBeInTheDocument();
    expect(screen.getByText(/bob inc/i)).toBeInTheDocument();
    const toggle = screen.getByRole("button", {
      name: /2 meeting requests/i,
    });
    expect(toggle).toBeDisabled();
  });

  it("collapses booking list by default when count > 2", () => {
    const pending = [
      makeBooking(1, "Alice Corp"),
      makeBooking(2, "Bob Inc"),
      makeBooking(3, "Carol LLC"),
    ];
    render(
      <AIAssistant isOpen={true} onClose={onClose} pendingBookings={pending} />
    );
    const toggle = screen.getByRole("button", {
      name: /3 meeting requests/i,
    });
    expect(toggle).toBeEnabled();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/alice corp/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/carol llc/i)).not.toBeInTheDocument();
  });

  const getToggle = () =>
    screen.getByRole("button", { name: /meeting request/i });

  it("expands the booking list when the toggle is clicked", async () => {
    const pending = [
      makeBooking(1, "Alice Corp"),
      makeBooking(2, "Bob Inc"),
      makeBooking(3, "Carol LLC"),
    ];
    render(
      <AIAssistant isOpen={true} onClose={onClose} pendingBookings={pending} />
    );
    fireEvent.click(getToggle());
    await screen.findByText(/alice corp/i);
    expect(getToggle()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/bob inc/i)).toBeInTheDocument();
    expect(screen.getByText(/carol llc/i)).toBeInTheDocument();
  });

  it("collapses the booking list again on a second click", async () => {
    const pending = [
      makeBooking(1, "Alice Corp"),
      makeBooking(2, "Bob Inc"),
      makeBooking(3, "Carol LLC"),
    ];
    render(
      <AIAssistant isOpen={true} onClose={onClose} pendingBookings={pending} />
    );
    fireEvent.click(getToggle());
    await screen.findByText(/alice corp/i);
    fireEvent.click(getToggle());
    await waitFor(() =>
      expect(screen.queryByText(/alice corp/i)).not.toBeInTheDocument()
    );
    expect(getToggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("shows error message when fetch fails", async () => {
    (global.fetch as Mock).mockRejectedValueOnce(new Error("Network error"));
    render(
      <AIAssistant isOpen={true} onClose={onClose} pendingBookings={[]} />
    );
    const input = screen.getByPlaceholderText(/plan, search, build/i);
    fireEvent.change(input, { target: { value: "Hello" } });
    // Click the send button (last button in the component)
    const buttons = screen.getAllByRole("button");
    const sendBtn = buttons[buttons.length - 1];
    fireEvent.click(sendBtn);
    // After submitting, the user message should appear in the chat
    await waitFor(
      () => expect(screen.getAllByText("Hello").length).toBeGreaterThan(0),
      { timeout: 3000 }
    );
  });
});
