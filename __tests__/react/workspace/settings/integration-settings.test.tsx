import React from "react";
import { render } from "vitest-browser-react";
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

vi.mock("next/image", () => {
  function MockImage(props: { alt: string }) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt} />;
  }
  return { __esModule: true, default: MockImage };
});

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
  it("renders the integration from props as Not Connected", async () => {
    const screen = await render(
      <IntegrationSettings integrations={[outlook(false)]} />
    );
    await expect
      .element(screen.getByText("Microsoft Outlook"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText(/not connected/i))
      .toBeInTheDocument();
  });

  it("shows the Connected badge and features when connected", async () => {
    const screen = await render(
      <IntegrationSettings integrations={[outlook(true)]} />
    );
    await expect.element(screen.getByText(/^connected$/i)).toBeInTheDocument();
    await expect
      .element(screen.getByText("Two-way calendar sync"))
      .toBeInTheDocument();
  });

  it("starts the OAuth flow when connecting a disconnected integration", async () => {
    const screen = await render(
      <IntegrationSettings integrations={[outlook(false)]} />
    );
    await screen.getByRole("switch").click();
    expect(mockPush).toHaveBeenCalledWith("/api/outlook");
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("disconnects when toggling off a connected integration", async () => {
    const screen = await render(
      <IntegrationSettings integrations={[outlook(true)]} />
    );
    await screen.getByRole("switch").click();
    expect(mockMutate).toHaveBeenCalledWith({
      id: "outlook",
      action: "disconnect",
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
