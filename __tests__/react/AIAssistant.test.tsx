import React from "react";
import { http, HttpResponse } from "msw";
import { worker } from "../msw/worker";
import { renderWithQueryClient } from "../_helpers/render";
import { chatStreamBody } from "../msw/handlers/ai";

import { AIAssistant } from "@/app/components/AIAssistant";

function renderAssistant() {
  return renderWithQueryClient(
    <AIAssistant isOpen onClose={vi.fn()} pendingBookings={[]} />
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
    let sentBody: unknown;
    worker.use(
      http.post("/api/chat", async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.text(
          chatStreamBody([
            { type: "text_delta", delta: "Nothing due!" },
            { type: "done", response_id: "resp_1" },
          ]),
          { headers: { "Content-Type": "text/plain; charset=utf-8" } }
        );
      })
    );

    const screen = await renderAssistant();

    await screen
      .getByRole("button", { name: /what's due this week\?/i })
      .click();

    await vi.waitFor(() => {
      expect(sentBody).toMatchObject({
        messages: [{ role: "user", content: "What's due this week?" }],
      });
    });

    // The clicked prompt is now shown as the user's message, and the assistant
    // response streams in.
    await expect
      .element(screen.getByText(/what's due this week\?/i).first())
      .toBeInTheDocument();
    await expect.element(screen.getByText(/nothing due!/i)).toBeInTheDocument();
  });
});
