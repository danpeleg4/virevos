import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock heavy child components
jest.mock("@/app/components/communications/UnifiedInbox", () => ({
  UnifiedInbox: () => <div data-testid="unified-inbox" />,
}));

jest.mock("@/app/components/communications/ScheduledMessages", () => ({
  ScheduledMessages: () => <div data-testid="scheduled-messages" />,
}));

import Communications from "@/app/workspace/communications/page";

describe("Communications Page", () => {
  it("renders Inbox tab button", () => {
    render(<Communications />);
    expect(screen.getByRole("button", { name: /inbox/i })).toBeInTheDocument();
  });

  it("renders Scheduled tab button", () => {
    render(<Communications />);
    expect(
      screen.getByRole("button", { name: /scheduled/i })
    ).toBeInTheDocument();
  });

  it("does not render Client Portal tab", () => {
    render(<Communications />);
    expect(
      screen.queryByRole("button", { name: /client portal/i })
    ).not.toBeInTheDocument();
  });

  it("shows UnifiedInbox by default (inbox tab active)", () => {
    render(<Communications />);
    expect(screen.getByTestId("unified-inbox")).toBeInTheDocument();
  });

  it("shows ScheduledMessages when Scheduled tab is clicked", () => {
    render(<Communications />);
    fireEvent.click(screen.getByRole("button", { name: /scheduled/i }));
    expect(screen.getByTestId("scheduled-messages")).toBeInTheDocument();
  });
});
