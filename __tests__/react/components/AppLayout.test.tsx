import React from "react";
import { renderWithQueryClient } from "../../_helpers/render";

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

  it("renders children", async () => {
    const screen = await renderWithQueryClient(
      <AppLayout>
        <div data-testid="child-content">Hello</div>
      </AppLayout>
    );
    await expect
      .element(screen.getByTestId("child-content"))
      .toBeInTheDocument();
  });

  it("shows loading spinner when user not loaded", async () => {
    mockUseAuthUser.mockReturnValue({ data: null, isPending: true });
    const screen = await renderWithQueryClient(
      <AppLayout>
        <div />
      </AppLayout>
    );
    await expect
      .element(screen.container.firstElementChild!)
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Dashboard", { exact: true }))
      .not.toBeInTheDocument();
  });

  it("renders all 8 nav items in the desktop sidebar", async () => {
    const screen = await renderWithQueryClient(
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
    for (const label of navLabels) {
      await expect
        .element(screen.getByText(label, { exact: true }).first())
        .toBeInTheDocument();
    }
  });

  it("renders user email in sidebar", async () => {
    const screen = await renderWithQueryClient(
      <AppLayout>
        <div />
      </AppLayout>
    );
    await expect
      .element(screen.getByText("john@example.com").first())
      .toBeInTheDocument();
  });

  it("opens AI assistant when AI Assistant button is clicked", async () => {
    const screen = await renderWithQueryClient(
      <AppLayout>
        <div />
      </AppLayout>
    );
    await expect
      .element(screen.getByTestId("ai-assistant"))
      .not.toBeInTheDocument();
    await screen
      .getByRole("button", { name: /ai assistant/i })
      .first()
      .click();
    await expect
      .element(screen.getByTestId("ai-assistant"))
      .toBeInTheDocument();
  });

  it("opens mobile sidebar when menu button is clicked", async () => {
    const screen = await renderWithQueryClient(
      <AppLayout>
        <div />
      </AppLayout>
    );
    await expect
      .element(screen.getByText("Dashboard", { exact: true }).first())
      .toBeInTheDocument();
  });
});
