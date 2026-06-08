import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Integration } from "@/types/integrations";

const mockMutate = vi.fn();
const mockPush = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: undefined }),
  useMutation: (opts: { mutationFn: unknown }) => ({
    mutate: mockMutate,
    isPending: false,
    ...opts,
  }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next/image", () => ({
  default: (props: { alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} />
  ),
}));

vi.mock("@/lib/integrations", () => ({
  disconnectOutlook: vi.fn(),
}));

vi.mock("@/lib/user", () => ({
  changeRecordingStatus: vi.fn(),
}));

import { IntegrationSettings } from "@/app/components/scheduling/IntegrationSettings";

const outlook = (connected: boolean): Integration => ({
  id: "outlook",
  name: "Microsoft Outlook",
  description: "Sync with Outlook Calendar",
  icon: "/outlook.svg",
  connected,
  syncStatus: connected ? "synced" : "not-connected",
  features: ["Two-way calendar sync", "Teams meeting integration"],
});

beforeEach(() => {
  mockMutate.mockClear();
  mockPush.mockClear();
});

describe("IntegrationSettings", () => {
  it("renders the integration from props as Not Connected", () => {
    render(<IntegrationSettings integrations={[outlook(false)]} />);
    expect(screen.getByText("Microsoft Outlook")).toBeInTheDocument();
    expect(screen.getByText(/not connected/i)).toBeInTheDocument();
  });

  it("shows the Connected badge and features when connected", () => {
    render(<IntegrationSettings integrations={[outlook(true)]} />);
    expect(screen.getByText(/^connected$/i)).toBeInTheDocument();
    expect(screen.getByText("Two-way calendar sync")).toBeInTheDocument();
  });

  it("starts the OAuth flow when connecting a disconnected integration", () => {
    render(<IntegrationSettings integrations={[outlook(false)]} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(mockPush).toHaveBeenCalledWith("/api/outlook");
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("disconnects when toggling off a connected integration", () => {
    render(<IntegrationSettings integrations={[outlook(true)]} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(mockMutate).toHaveBeenCalledWith({
      id: "outlook",
      action: "disconnect",
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
