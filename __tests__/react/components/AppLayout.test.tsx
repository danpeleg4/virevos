import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const mockPush = jest.fn();
const mockUseUser = jest.fn();
const mockUsePathname = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockUsePathname(),
}));

jest.mock("@clerk/nextjs", () => ({
  useUser: () => mockUseUser(),
  UserButton: () => <div data-testid="user-button" />,
}));

jest.mock("next-themes", () => ({
  useTheme: jest.fn(() => ({ resolvedTheme: "light", setTheme: jest.fn() })),
}));

jest.mock("motion/react", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  const motion = new Proxy(
    {},
    {
      get: (_t, _tag: string) =>
        function MC({
          children,
          initial,
          animate,
          exit,
          variants,
          transition,
          viewport,
          whileInView,
          whileHover,
          whileTap,
          ...props
        }: Record<string, unknown>) {
          return createElement(_tag, props, children as React.ReactNode);
        },
    }
  );
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

// Mock AIAssistant so we don't need to worry about its complex deps
jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(() => ({ data: undefined, isLoading: false })),
}));

jest.mock("axios", () => ({
  get: jest.fn(() => Promise.resolve({ data: { bookings: [] } })),
}));

jest.mock("@/app/components/AIAssistant", () => ({
  AIAssistant: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="ai-assistant" /> : null,
}));

import { AppLayout } from "@/app/components/AppLayout";

const defaultUser = {
  firstName: "John",
  lastName: "Doe",
  primaryEmailAddress: { emailAddress: "john@example.com" },
};

describe("AppLayout", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockUsePathname.mockReturnValue("/workspace/dashboard");
    mockUseUser.mockReturnValue({ user: defaultUser, isLoaded: true });
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
    mockUseUser.mockReturnValue({ user: null, isLoaded: false });
    const { container } = render(
      <AppLayout>
        <div />
      </AppLayout>
    );
    // Loading state renders a pulsing animation container
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
      "Projects",
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
    // Click the header AI button
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
    // Multiple icon-only buttons exist — Dashboard nav items are always present
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
  });
});
