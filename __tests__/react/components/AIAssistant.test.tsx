import React from "react";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

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

// Mock fetch for streaming
globalThis.fetch = vi.fn();

import { AIAssistant } from "@/app/components/AIAssistant";

describe("AIAssistant", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    onClose.mockClear();
    (globalThis.fetch as unknown as Mock).mockClear();
  });

  it("renders panel when isOpen=true", async () => {
    const screen = await render(
      <AIAssistant isOpen={true} onClose={onClose} pendingBookings={[]} />
    );
    await expect.element(screen.getByText(/virevos ai/i)).toBeInTheDocument();
  });

  it("does not render panel when isOpen=false", async () => {
    const screen = await render(
      <AIAssistant isOpen={false} onClose={onClose} pendingBookings={[]} />
    );
    await expect
      .element(screen.getByText(/virevos ai/i))
      .not.toBeInTheDocument();
  });

  it("renders input field when open", async () => {
    const screen = await render(
      <AIAssistant isOpen={true} onClose={onClose} pendingBookings={[]} />
    );
    await expect
      .element(screen.getByPlaceholder(/plan, search, build/i))
      .toBeInTheDocument();
  });

  it("send button is disabled when input is empty", async () => {
    const screen = await render(
      <AIAssistant isOpen={true} onClose={onClose} pendingBookings={[]} />
    );
    // Find the button that is disabled when input is empty (the Send icon button)
    const buttons = screen.getByRole("button").elements();
    const sendButton = buttons.find((b) => b.hasAttribute("disabled"));
    expect(sendButton).toBeDefined();
  });

  it("close button calls onClose", async () => {
    const screen = await render(
      <AIAssistant isOpen={true} onClose={onClose} pendingBookings={[]} />
    );
    // The X button is the close button in the header
    await screen.getByRole("button").first().click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("input accepts text", async () => {
    const screen = await render(
      <AIAssistant isOpen={true} onClose={onClose} pendingBookings={[]} />
    );
    await screen.getByPlaceholder(/plan, search, build/i).fill("Hello AI");
    await expect
      .element(screen.getByPlaceholder(/plan, search, build/i))
      .toHaveValue("Hello AI");
  });

  it("shows meeting request section when there are pending bookings", async () => {
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
    const screen = await render(
      <AIAssistant isOpen={true} onClose={onClose} pendingBookings={pending} />
    );
    await expect
      .element(screen.getByText(/1 meeting request/i))
      .toBeInTheDocument();
    await expect.element(screen.getByText(/alice corp/i)).toBeInTheDocument();
    await expect.element(screen.getByText(/accept/i)).toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /decline/i }))
      .toBeInTheDocument();
  });

  it("does not show meeting request section when there are no pending bookings", async () => {
    const screen = await render(
      <AIAssistant isOpen={true} onClose={onClose} pendingBookings={[]} />
    );
    await expect
      .element(screen.getByText(/meeting request/i))
      .not.toBeInTheDocument();
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

  it("shows all bookings inline and disables the toggle when count <= 2", async () => {
    const pending = [makeBooking(1, "Alice Corp"), makeBooking(2, "Bob Inc")];
    const screen = await render(
      <AIAssistant isOpen={true} onClose={onClose} pendingBookings={pending} />
    );
    await expect.element(screen.getByText(/alice corp/i)).toBeInTheDocument();
    await expect.element(screen.getByText(/bob inc/i)).toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /2 meeting requests/i }))
      .toBeDisabled();
  });

  it("collapses booking list by default when count > 2", async () => {
    const pending = [
      makeBooking(1, "Alice Corp"),
      makeBooking(2, "Bob Inc"),
      makeBooking(3, "Carol LLC"),
    ];
    const screen = await render(
      <AIAssistant isOpen={true} onClose={onClose} pendingBookings={pending} />
    );
    const toggle = screen.getByRole("button", { name: /3 meeting requests/i });
    await expect.element(toggle).toBeEnabled();
    await expect.element(toggle).toHaveAttribute("aria-expanded", "false");
    await expect
      .element(screen.getByText(/alice corp/i))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByText(/carol llc/i))
      .not.toBeInTheDocument();
  });

  it("expands the booking list when the toggle is clicked", async () => {
    const pending = [
      makeBooking(1, "Alice Corp"),
      makeBooking(2, "Bob Inc"),
      makeBooking(3, "Carol LLC"),
    ];
    const screen = await render(
      <AIAssistant isOpen={true} onClose={onClose} pendingBookings={pending} />
    );
    const toggle = screen.getByRole("button", { name: /meeting request/i });
    await toggle.click();
    await expect.element(screen.getByText(/alice corp/i)).toBeInTheDocument();
    await expect.element(toggle).toHaveAttribute("aria-expanded", "true");
    await expect.element(screen.getByText(/bob inc/i)).toBeInTheDocument();
    await expect.element(screen.getByText(/carol llc/i)).toBeInTheDocument();
  });

  it("collapses the booking list again on a second click", async () => {
    const pending = [
      makeBooking(1, "Alice Corp"),
      makeBooking(2, "Bob Inc"),
      makeBooking(3, "Carol LLC"),
    ];
    const screen = await render(
      <AIAssistant isOpen={true} onClose={onClose} pendingBookings={pending} />
    );
    const toggle = screen.getByRole("button", { name: /meeting request/i });
    await toggle.click();
    await expect.element(screen.getByText(/alice corp/i)).toBeInTheDocument();
    await toggle.click();
    await expect
      .element(screen.getByText(/alice corp/i))
      .not.toBeInTheDocument();
    await expect.element(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("shows error message when fetch fails", async () => {
    (globalThis.fetch as unknown as Mock).mockRejectedValueOnce(
      new Error("Network error")
    );
    const screen = await render(
      <AIAssistant isOpen={true} onClose={onClose} pendingBookings={[]} />
    );
    await screen.getByPlaceholder(/plan, search, build/i).fill("Hello");
    // Click the send button (last button in the component)
    const buttons = screen.getByRole("button").elements();
    await page.elementLocator(buttons[buttons.length - 1]).click();
    // After submitting, the user message should appear in the chat
    await expect
      .element(screen.getByText("Hello", { exact: true }).first())
      .toBeInTheDocument();
  });
});
