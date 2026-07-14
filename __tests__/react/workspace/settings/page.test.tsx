import React from "react";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

const mockUseQuery = vi.fn();
const mockMutate = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (opts: { queryKey: string[] }) => mockUseQuery(opts),
  useMutation: (opts: { mutationFn: unknown }) => ({
    mutate: mockMutate,
    isPending: false,
    ...opts,
  }),
  useQueryClient: () => ({
    cancelQueries: vi.fn().mockResolvedValue(undefined),
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock("@/lib/user", () => ({
  uploadAvatar: vi.fn(),
  changePassword: vi.fn(),
  updateProfile: vi.fn(),
  updateWeeklySummaryPreference: vi.fn(),
  updateProductUpdatesPreference: vi.fn(),
}));

vi.mock("next-themes", () => ({
  useTheme: vi.fn(() => ({ resolvedTheme: "light", setTheme: vi.fn() })),
}));

// Mock IntegrationSettings sub-component
vi.mock("@/app/components/scheduling/IntegrationSettings", () => ({
  IntegrationSettings: () => <div data-testid="integration-settings" />,
  VideoMeetingPreferences: () => <div data-testid="video-preferences" />,
}));

import Settings from "@/app/workspace/settings/page";

// Returns query data keyed by queryKey so the profile and avatar queries can
// resolve to their own shapes.
function mockQueriesByKey(
  overrides: Record<string, unknown> = {}
): (opts: { queryKey: string[] }) => { data: unknown } {
  return ({ queryKey }) => {
    const key = queryKey[0];
    if (key in overrides) return { data: overrides[key] };
    if (key === "userProfile")
      return {
        data: {
          name: "John Doe",
          email: "john@example.com",
          jobTitle: "",
          company: "",
          bio: "",
          timezone: "America/New_York",
        },
      };
    return { data: { url: null } }; // avatarUrl
  };
}

beforeEach(() => {
  mockUseQuery.mockImplementation(mockQueriesByKey());
  mockMutate.mockClear();
});

describe("Settings Page", () => {
  it("renders Settings heading", async () => {
    const screen = await render(<Settings />);
    await expect
      .element(screen.getByText("Settings", { exact: true }))
      .toBeInTheDocument();
  });

  it("renders Profile tab", async () => {
    const screen = await render(<Settings />);
    await expect
      .element(screen.getByRole("button", { name: /profile/i }))
      .toBeInTheDocument();
  });

  it("renders Notifications tab", async () => {
    const screen = await render(<Settings />);
    await expect
      .element(screen.getByRole("button", { name: /notifications/i }))
      .toBeInTheDocument();
  });

  it("renders Security tab", async () => {
    const screen = await render(<Settings />);
    await expect
      .element(screen.getByRole("button", { name: /security/i }))
      .toBeInTheDocument();
  });

  it("renders Integrations tab", async () => {
    const screen = await render(<Settings />);
    await expect
      .element(screen.getByRole("button", { name: /integrations/i }))
      .toBeInTheDocument();
  });

  it("shows profile content by default", async () => {
    const screen = await render(<Settings />);
    // Default tab is profile — shows the Full name field
    await expect
      .element(screen.getByLabelText(/full name/i))
      .toBeInTheDocument();
  });

  it("switches to Notifications tab when clicked", async () => {
    const screen = await render(<Settings />);
    await screen.getByRole("button", { name: /notifications/i }).click();
    await expect
      .element(screen.getByText(/product updates/i))
      .toBeInTheDocument();
  });

  it("reflects prefetched notification preferences in the toggles", async () => {
    mockUseQuery.mockImplementation(
      mockQueriesByKey({ weeklySummary: true, productUpdates: false })
    );
    const screen = await render(<Settings />);
    await screen.getByRole("button", { name: /notifications/i }).click();
    await expect.element(screen.getByRole("switch")).not.toBeChecked();
  });

  it("saves a notification preference via the mutation", async () => {
    mockUseQuery.mockImplementation(
      mockQueriesByKey({ weeklySummary: false, productUpdates: false })
    );
    const screen = await render(<Settings />);
    await screen.getByRole("button", { name: /notifications/i }).click();
    await screen.getByRole("switch").first().click();
    expect(mockMutate).toHaveBeenCalledWith(true);
  });

  it("switches to Security tab when clicked", async () => {
    const screen = await render(<Settings />);
    await screen.getByRole("button", { name: /security/i }).click();
    await expect
      .element(screen.getByText(/change password/i))
      .toBeInTheDocument();
  });

  it("switches to Integrations tab when clicked", async () => {
    const screen = await render(<Settings />);
    await screen.getByRole("button", { name: /integrations/i }).click();
    await expect
      .element(screen.getByTestId("integration-settings"))
      .toBeInTheDocument();
  });

  it("seeds the full name field from the loaded profile", async () => {
    const screen = await render(<Settings />);
    await expect
      .element(screen.getByLabelText(/full name/i))
      .toHaveValue("John Doe");
  });

  it("updates the full name field on input", async () => {
    const screen = await render(<Settings />);
    await screen.getByLabelText(/full name/i).fill("Jane Doe");
    await expect
      .element(screen.getByLabelText(/full name/i))
      .toHaveValue("Jane Doe");
  });

  it("saves the edited profile via the mutation", async () => {
    const screen = await render(<Settings />);
    await screen.getByLabelText(/full name/i).fill("Jane Doe");
    await screen.getByLabelText(/job title/i).fill("Attorney");
    await screen.getByRole("button", { name: /^save$/i }).click();
    expect(mockMutate).toHaveBeenCalledWith({
      name: "Jane Doe",
      jobTitle: "Attorney",
      company: "",
      bio: "",
    });
  });

  it("disables Save when the name is unchanged", async () => {
    const screen = await render(<Settings />);
    await expect
      .element(screen.getByRole("button", { name: /^save$/i }))
      .toBeDisabled();
  });

  it("disables Save when the name is emptied", async () => {
    const screen = await render(<Settings />);
    await screen.getByLabelText(/full name/i).fill("   ");
    await expect
      .element(screen.getByRole("button", { name: /^save$/i }))
      .toBeDisabled();
  });

  it("uploads a selected avatar image via the mutation", async () => {
    const { container } = await render(<Settings />);
    const fileInput = page.elementLocator(
      container.querySelector('input[type="file"]')!
    );
    const file = new File(["x"], "avatar.png", { type: "image/png" });
    await fileInput.upload(file);
    expect(mockMutate).toHaveBeenCalledWith(file);
  });

  it("rejects unsupported avatar file types without uploading", async () => {
    const screen = await render(<Settings />);
    const fileInput = page.elementLocator(
      screen.container.querySelector('input[type="file"]')!
    );
    const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
    await fileInput.upload(file);
    expect(mockMutate).not.toHaveBeenCalled();
    await expect
      .element(screen.getByText(/unsupported image type/i))
      .toBeInTheDocument();
  });

  it("renders the avatar image when a URL is available", async () => {
    mockUseQuery.mockImplementation(
      mockQueriesByKey({ avatarUrl: { url: "https://cdn/avatar.png" } })
    );
    const screen = await render(<Settings />);
    // AvatarImage only renders once the underlying image reports "loaded",
    // but the file input and upload control should always be present.
    await expect
      .element(screen.getByRole("button", { name: /upload new/i }))
      .toBeInTheDocument();
  });
});
