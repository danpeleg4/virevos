import React from "react";
import { renderWithQueryClient } from "../../_helpers/render";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: vi.fn(() => "/workspace/dashboard"),
}));

vi.mock("@/app/hooks/useAuthUser", () => ({
  useAuthUser: () => ({
    data: {
      id: "user_1",
      email: "john@example.com",
      user_metadata: { name: "John Doe" },
    },
    isPending: false,
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabase: () => ({
    auth: { signOut: vi.fn() },
  }),
}));

vi.mock("next-themes", () => ({
  useTheme: vi.fn(() => ({ resolvedTheme: "light", setTheme: vi.fn() })),
}));

vi.mock("@/app/components/AIAssistant", () => ({
  AIAssistant: () => null,
}));

import WorkSpaceLayout from "@/app/workspace/layout";

describe("WorkSpaceLayout", () => {
  it("renders children content", async () => {
    const screen = await renderWithQueryClient(
      <WorkSpaceLayout>
        <div data-testid="page-content">Dashboard Content</div>
      </WorkSpaceLayout>
    );
    await expect
      .element(screen.getByTestId("page-content"))
      .toBeInTheDocument();
  });

  it("renders sidebar navigation", async () => {
    const screen = await renderWithQueryClient(
      <WorkSpaceLayout>
        <div />
      </WorkSpaceLayout>
    );
    await expect
      .element(screen.getByText("Dashboard", { exact: true }).first())
      .toBeInTheDocument();
  });
});
