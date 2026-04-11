import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => ({ get: jest.fn(() => null) }),
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(() => ({ data: [], isLoading: false })),
  useMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn(), setQueryData: jest.fn() })),
}));

jest.mock("axios");

// Mock heavy child components — render tabNav so the tab buttons appear in the DOM
jest.mock("@/app/components/scheduling/CalendarView", () => ({
  CalendarView: ({ tabNav }: { tabNav: React.ReactNode }) => <div data-testid="calendar-view">{tabNav}</div>,
}));

jest.mock("@/app/components/scheduling/Meetings", () => ({
  Meetings: ({ tabNav }: { tabNav: React.ReactNode }) => <div data-testid="meetings-view">{tabNav}</div>,
}));

jest.mock("@/app/components/scheduling/MeetingNotes", () => ({
  MeetingNotes: ({ tabNav }: { tabNav: React.ReactNode }) => <div data-testid="meeting-notes">{tabNav}</div>,
}));

jest.mock("@/app/components/scheduling/IntegrationSettings", () => ({
  IntegrationSettings: () => <div data-testid="integration-settings" />,
  VideoMeetingPreferences: () => <div data-testid="video-preferences" />,
}));

import CalendarPage from "@/app/workspace/calendar/page";

describe("Calendar Page", () => {
  it("renders Calendar tab button", () => {
    render(<CalendarPage />);
    expect(screen.getByRole("button", { name: /^calendar$/i })).toBeInTheDocument();
  });

  it("renders Meetings tab button", () => {
    render(<CalendarPage />);
    expect(screen.getByRole("button", { name: /^meetings$/i })).toBeInTheDocument();
  });

  it("renders Meeting Notes tab button", () => {
    render(<CalendarPage />);
    expect(screen.getByRole("button", { name: /meeting notes/i })).toBeInTheDocument();
  });

  it("renders Preferences tab button", () => {
    render(<CalendarPage />);
    expect(screen.getByRole("button", { name: /preferences/i })).toBeInTheDocument();
  });

  it("shows CalendarView by default", () => {
    render(<CalendarPage />);
    expect(screen.getByTestId("calendar-view")).toBeInTheDocument();
  });

  it("shows Meetings view when Meetings tab is clicked", () => {
    render(<CalendarPage />);
    fireEvent.click(screen.getByRole("button", { name: /^meetings$/i }));
    expect(screen.getByTestId("meetings-view")).toBeInTheDocument();
  });

  it("shows Meeting Notes when notes tab is clicked", () => {
    render(<CalendarPage />);
    fireEvent.click(screen.getByRole("button", { name: /meeting notes/i }));
    expect(screen.getByTestId("meeting-notes")).toBeInTheDocument();
  });

  it("shows Preferences when preferences tab is clicked", () => {
    render(<CalendarPage />);
    fireEvent.click(screen.getByRole("button", { name: /preferences/i }));
    expect(screen.getByTestId("video-preferences")).toBeInTheDocument();
  });
});
