import React from "react";
import { render } from "vitest-browser-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("axios", () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: "" }),
    isAxiosError: () => false,
  },
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
  it("shows the empty-state greeting and suggested prompt chips", async () => {
    const screen = await renderAssistant();

    await expect
      .element(screen.getByText(/i'm your virevos assistant/i))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /set up a new case/i }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /what's due this week\?/i }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /draft a welcome email/i }))
      .toBeInTheDocument();
  });

  it("sends the prompt to /api/chat and renders it as a user message when a chip is clicked", async () => {
    const screen = await renderAssistant();

    await screen
      .getByRole("button", { name: /what's due this week\?/i })
      .click();

    await vi.waitFor(() => {
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
    await expect
      .element(screen.getByText(/what's due this week\?/i).first())
      .toBeInTheDocument();
    await expect
      .element(screen.getByLabelText(/assistant is typing/i))
      .toBeInTheDocument();
  });
});
