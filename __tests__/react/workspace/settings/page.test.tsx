import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

jest.mock("next-themes", () => ({
  useTheme: jest.fn(() => ({ resolvedTheme: "light", setTheme: jest.fn() })),
}));

// Mock IntegrationSettings sub-component
jest.mock("@/app/components/scheduling/IntegrationSettings", () => ({
  IntegrationSettings: () => <div data-testid="integration-settings" />,
  VideoMeetingPreferences: () => <div data-testid="video-preferences" />,
}));

import Settings from "@/app/workspace/settings/page";

describe("Settings Page", () => {
  it("renders Settings heading", () => {
    render(<Settings />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders Notifications tab", () => {
    render(<Settings />);
    expect(
      screen.getByRole("button", { name: /notifications/i })
    ).toBeInTheDocument();
  });

  it("renders Preferences tab", () => {
    render(<Settings />);
    expect(
      screen.getByRole("button", { name: /preferences/i })
    ).toBeInTheDocument();
  });

  it("renders Integrations tab", () => {
    render(<Settings />);
    expect(
      screen.getByRole("button", { name: /integrations/i })
    ).toBeInTheDocument();
  });

  it("shows notifications content by default", () => {
    render(<Settings />);
    // Default tab is notifications — shows Desktop/Mobile notifications toggles
    expect(screen.getByText(/desktop notifications/i)).toBeInTheDocument();
  });

  it("switches to Preferences tab when clicked", () => {
    render(<Settings />);
    fireEvent.click(screen.getByRole("button", { name: /preferences/i }));
    expect(screen.getByText(/dark mode/i)).toBeInTheDocument();
  });

  it("switches to Integrations tab when clicked", () => {
    render(<Settings />);
    fireEvent.click(screen.getByRole("button", { name: /integrations/i }));
    expect(screen.getByTestId("integration-settings")).toBeInTheDocument();
  });
});
