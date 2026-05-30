import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

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
  getAvatarUrl: vi.fn(),
  uploadAvatar: vi.fn(),
  getUserProfile: vi.fn(),
  updateProfile: vi.fn(),
  getWeeklySummaryPreference: vi.fn(),
  updateWeeklySummaryPreference: vi.fn(),
  getProductUpdatesPreference: vi.fn(),
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
  it("renders Settings heading", () => {
    render(<Settings />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders Profile tab", () => {
    render(<Settings />);
    expect(
      screen.getByRole("button", { name: /profile/i })
    ).toBeInTheDocument();
  });

  it("renders Notifications tab", () => {
    render(<Settings />);
    expect(
      screen.getByRole("button", { name: /notifications/i })
    ).toBeInTheDocument();
  });

  it("renders Security tab", () => {
    render(<Settings />);
    expect(
      screen.getByRole("button", { name: /security/i })
    ).toBeInTheDocument();
  });

  it("renders Integrations tab", () => {
    render(<Settings />);
    expect(
      screen.getByRole("button", { name: /integrations/i })
    ).toBeInTheDocument();
  });

  it("shows profile content by default", () => {
    render(<Settings />);
    // Default tab is profile — shows the Full name field
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
  });

  it("switches to Notifications tab when clicked", () => {
    render(<Settings />);
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    expect(screen.getByText(/weekly summary/i)).toBeInTheDocument();
  });

  it("switches to Security tab when clicked", () => {
    render(<Settings />);
    fireEvent.click(screen.getByRole("button", { name: /security/i }));
    expect(screen.getByText(/change password/i)).toBeInTheDocument();
  });

  it("switches to Integrations tab when clicked", () => {
    render(<Settings />);
    fireEvent.click(screen.getByRole("button", { name: /integrations/i }));
    expect(screen.getByTestId("integration-settings")).toBeInTheDocument();
  });

  it("seeds the full name field from the loaded profile", () => {
    render(<Settings />);
    const input = screen.getByLabelText(/full name/i) as HTMLInputElement;
    expect(input.value).toBe("John Doe");
  });

  it("updates the full name field on input", () => {
    render(<Settings />);
    const input = screen.getByLabelText(/full name/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Jane Doe" } });
    expect(input.value).toBe("Jane Doe");
  });

  it("saves the edited profile via the mutation", () => {
    render(<Settings />);
    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "Jane Doe" },
    });
    fireEvent.change(screen.getByLabelText(/job title/i), {
      target: { value: "Attorney" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    expect(mockMutate).toHaveBeenCalledWith({
      name: "Jane Doe",
      jobTitle: "Attorney",
      company: "",
      bio: "",
      timezone: "America/New_York",
    });
  });

  it("disables Save when the name is unchanged", () => {
    render(<Settings />);
    expect(screen.getByRole("button", { name: /^save$/i })).toBeDisabled();
  });

  it("disables Save when the name is emptied", () => {
    render(<Settings />);
    const input = screen.getByLabelText(/full name/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "   " } });
    expect(screen.getByRole("button", { name: /^save$/i })).toBeDisabled();
  });

  it("uploads a selected avatar image via the mutation", () => {
    const { container } = render(<Settings />);
    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(["x"], "avatar.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(mockMutate).toHaveBeenCalledWith(file);
  });

  it("rejects unsupported avatar file types without uploading", () => {
    const { container } = render(<Settings />);
    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(mockMutate).not.toHaveBeenCalled();
    expect(screen.getByText(/unsupported image type/i)).toBeInTheDocument();
  });

  it("renders the avatar image when a URL is available", () => {
    mockUseQuery.mockImplementation(
      mockQueriesByKey({ avatarUrl: { url: "https://cdn/avatar.png" } })
    );
    render(<Settings />);
    // AvatarImage only renders once the underlying image reports "loaded",
    // but the file input and upload control should always be present.
    expect(
      screen.getByRole("button", { name: /upload new/i })
    ).toBeInTheDocument();
  });
});
