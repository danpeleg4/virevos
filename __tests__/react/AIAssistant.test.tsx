import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("axios", () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: "" }),
    isAxiosError: () => false,
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
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

import axios from "axios";
import { AIAssistant } from "@/app/components/AIAssistant";

function renderAssistant() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AIAssistant isOpen onClose={vi.fn()} pendingBookings={[]} />
    </QueryClientProvider>
  );
}

describe("AIAssistant", () => {
  it("shows the empty-state greeting and suggested prompt chips", () => {
    renderAssistant();

    expect(screen.getByText(/i'm your virevos assistant/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /set up a new case/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /what's due this week\?/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /draft a welcome email/i })
    ).toBeInTheDocument();
  });

  it("sends the prompt to /api/chat and renders it as a user message when a chip is clicked", async () => {
    renderAssistant();

    fireEvent.click(
      screen.getByRole("button", { name: /what's due this week\?/i })
    );

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/chat",
        expect.objectContaining({
          messages: [{ role: "user", content: "What's due this week?" }],
        }),
        expect.anything()
      );
    });

    // The clicked prompt is now shown as the user's message, and the assistant
    // placeholder shows the typing indicator.
    const bubbles = await screen.findAllByText(/what's due this week\?/i);
    expect(bubbles.length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/assistant is typing/i)).toBeInTheDocument();
  });
});
