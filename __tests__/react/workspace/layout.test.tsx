import React from "react";
import { render, screen } from "@testing-library/react";

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

vi.mock("@/lib/user", () => ({
  getAvatarUrl: vi.fn(),
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
  AIAssistant: () => null,
}));

import WorkSpaceLayout from "@/app/workspace/layout";

describe("WorkSpaceLayout", () => {
  it("renders children content", () => {
    render(
      <WorkSpaceLayout>
        <div data-testid="page-content">Dashboard Content</div>
      </WorkSpaceLayout>
    );
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });

  it("renders sidebar navigation", () => {
    render(
      <WorkSpaceLayout>
        <div />
      </WorkSpaceLayout>
    );
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
  });
});
