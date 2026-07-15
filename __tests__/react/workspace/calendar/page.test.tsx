import React from "react";
import { renderWithQueryClient } from "../../../_helpers/render";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn(() => null) }),
}));

// Mock heavy child components — render tabNav so the tab buttons appear in the DOM
vi.mock("@/app/components/scheduling/CalendarView", () => ({
  CalendarView: ({ tabNav }: { tabNav: React.ReactNode }) => (
    <div data-testid="calendar-view">{tabNav}</div>
  ),
}));

vi.mock("@/app/components/scheduling/Meetings", () => ({
  Meetings: ({ tabNav }: { tabNav: React.ReactNode }) => (
    <div data-testid="meetings-view">{tabNav}</div>
  ),
}));

vi.mock("@/app/components/scheduling/MeetingNotes", () => ({
  MeetingNotes: ({ tabNav }: { tabNav: React.ReactNode }) => (
    <div data-testid="meeting-notes">{tabNav}</div>
  ),
}));

vi.mock("@/app/components/scheduling/IntegrationSettings", () => ({
  IntegrationSettings: () => <div data-testid="integration-settings" />,
  VideoMeetingPreferences: () => <div data-testid="video-preferences" />,
}));

import CalendarPage from "@/app/workspace/calendar/page";

describe("Calendar Page", () => {
  it("renders Calendar tab button", async () => {
    const screen = await renderWithQueryClient(<CalendarPage />);
    await expect
      .element(screen.getByRole("button", { name: /^calendar$/i }))
      .toBeInTheDocument();
  });

  it("renders Meetings tab button", async () => {
    const screen = await renderWithQueryClient(<CalendarPage />);
    await expect
      .element(screen.getByRole("button", { name: /^meetings$/i }))
      .toBeInTheDocument();
  });

  it("renders Meeting Notes tab button", async () => {
    const screen = await renderWithQueryClient(<CalendarPage />);
    await expect
      .element(screen.getByRole("button", { name: /meeting notes/i }))
      .toBeInTheDocument();
  });

  it("renders Preferences tab button", async () => {
    const screen = await renderWithQueryClient(<CalendarPage />);
    await expect
      .element(screen.getByRole("button", { name: /preferences/i }))
      .toBeInTheDocument();
  });

  it("shows CalendarView by default", async () => {
    const screen = await renderWithQueryClient(<CalendarPage />);
    await expect
      .element(screen.getByTestId("calendar-view"))
      .toBeInTheDocument();
  });

  it("shows Meetings view when Meetings tab is clicked", async () => {
    const screen = await renderWithQueryClient(<CalendarPage />);
    await screen.getByRole("button", { name: /^meetings$/i }).click();
    await expect
      .element(screen.getByTestId("meetings-view"))
      .toBeInTheDocument();
  });

  it("shows Meeting Notes when notes tab is clicked", async () => {
    const screen = await renderWithQueryClient(<CalendarPage />);
    await screen.getByRole("button", { name: /meeting notes/i }).click();
    await expect
      .element(screen.getByTestId("meeting-notes"))
      .toBeInTheDocument();
  });

  it("shows Preferences when preferences tab is clicked", async () => {
    const screen = await renderWithQueryClient(<CalendarPage />);
    await screen.getByRole("button", { name: /preferences/i }).click();
    await expect
      .element(screen.getByTestId("video-preferences"))
      .toBeInTheDocument();
  });
});
