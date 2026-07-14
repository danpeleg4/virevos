import React from "react";
import { render } from "vitest-browser-react";

// Mock heavy child components
vi.mock("@/app/components/communications/UnifiedInbox", () => ({
  UnifiedInbox: () => <div data-testid="unified-inbox" />,
}));

vi.mock("@/app/components/communications/ScheduledMessages", () => ({
  ScheduledMessages: () => <div data-testid="scheduled-messages" />,
}));

import Communications from "@/app/workspace/communications/page";

describe("Communications Page", () => {
  it("renders Inbox tab button", async () => {
    const screen = await render(<Communications />);
    await expect
      .element(screen.getByRole("button", { name: /inbox/i }))
      .toBeInTheDocument();
  });

  it("renders Scheduled tab button", async () => {
    const screen = await render(<Communications />);
    await expect
      .element(screen.getByRole("button", { name: /scheduled/i }))
      .toBeInTheDocument();
  });

  it("does not render Client Portal tab", async () => {
    const screen = await render(<Communications />);
    await expect
      .element(screen.getByRole("button", { name: /client portal/i }))
      .not.toBeInTheDocument();
  });

  it("shows UnifiedInbox by default (inbox tab active)", async () => {
    const screen = await render(<Communications />);
    await expect
      .element(screen.getByTestId("unified-inbox"))
      .toBeInTheDocument();
  });

  it("shows ScheduledMessages when Scheduled tab is clicked", async () => {
    const screen = await render(<Communications />);
    await screen.getByRole("button", { name: /scheduled/i }).click();
    await expect
      .element(screen.getByTestId("scheduled-messages"))
      .toBeInTheDocument();
  });
});
