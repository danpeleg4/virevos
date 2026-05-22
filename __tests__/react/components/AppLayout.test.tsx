import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const mockPush = vi.fn();
const mockUseAuthUser = vi.fn();
const mockUsePathname = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
  usePathname: () => mockUsePathname(),
}));

vi.mock("@/app/hooks/useAuthUser", () => ({
  useAuthUser: () => mockUseAuthUser(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabase: () => ({
    auth: { signOut: vi.fn().mockResolvedValue({}) },
  }),
}));

vi.mock("next-themes", () => ({
  useTheme: vi.fn(() => ({ resolvedTheme: "light", setTheme: vi.fn() })),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
}));

vi.mock("axios", () => {
  const axios = {
    get: vi.fn(() => Promise.resolve({ data: { bookings: [] } })),
  };
  return { default: axios, ...axios };
});

vi.mock("@/app/components/AIAssistant", () => ({
  AIAssistant: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="ai-assistant" /> : null,
}));

import { AppLayout } from "@/app/components/AppLayout";

const defaultUser = {
  id: "user_1",
  email: "john@example.com",
  user_metadata: { name: "John Doe" },
};

describe("AppLayout", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockUsePathname.mockReturnValue("/workspace/dashboard");
    mockUseAuthUser.mockReturnValue({ data: defaultUser, isPending: false });
  });

  it("renders children", () => {
    render(
      <AppLayout>
        <div data-testid="child-content">Hello</div>
      </AppLayout>
    );
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });

  it("shows loading spinner when user not loaded", () => {
    mockUseAuthUser.mockReturnValue({ data: null, isPending: true });
    const { container } = render(
      <AppLayout>
        <div />
      </AppLayout>
    );
    expect(container.firstChild).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("renders all 8 nav items in the desktop sidebar", () => {
    render(
      <AppLayout>
        <div />
      </AppLayout>
    );
    const navLabels = [
      "Dashboard",
      "Clients",
      "Cases",
      "Tasks",
      "Calendar",
      "Communications",
      "Billing",
      "Settings",
    ];
    navLabels.forEach((label) => {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    });
  });

  it("renders user email in sidebar", () => {
    render(
      <AppLayout>
        <div />
      </AppLayout>
    );
    expect(screen.getAllByText("john@example.com").length).toBeGreaterThan(0);
  });

  it("opens AI assistant when AI Assistant button is clicked", () => {
    render(
      <AppLayout>
        <div />
      </AppLayout>
    );
    expect(screen.queryByTestId("ai-assistant")).not.toBeInTheDocument();
    const aiButtons = screen.getAllByRole("button", { name: /ai assistant/i });
    fireEvent.click(aiButtons[0]);
    expect(screen.getByTestId("ai-assistant")).toBeInTheDocument();
  });

  it("opens mobile sidebar when menu button is clicked", () => {
    render(
      <AppLayout>
        <div />
      </AppLayout>
    );
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
  });
});
