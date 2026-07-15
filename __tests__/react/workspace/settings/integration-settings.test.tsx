import React from "react";
import type { Integration } from "@/types/integrations";
import { renderWithQueryClient } from "../../../_helpers/render";

const mockPush = vi.fn();

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

import { delay, http, HttpResponse } from "msw";
import { worker } from "../../../msw/worker";
import {
  IntegrationSettings,
  VideoMeetingPreferences,
} from "@/app/components/scheduling/IntegrationSettings";

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
  mockPush.mockClear();
});

describe("IntegrationSettings", () => {
  it("renders the integration from props as Not Connected", async () => {
    const screen = await renderWithQueryClient(
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
    const screen = await renderWithQueryClient(
      <IntegrationSettings integrations={[outlook(true)]} />
    );
    await expect.element(screen.getByText(/^connected$/i)).toBeInTheDocument();
    await expect
      .element(screen.getByText("Two-way calendar sync"))
      .toBeInTheDocument();
  });

  it("starts the OAuth flow when connecting a disconnected integration", async () => {
    let disconnectCalled = false;
    worker.use(
      http.delete("/api/integrations/outlook", () => {
        disconnectCalled = true;
        return HttpResponse.json({ success: true });
      })
    );

    const screen = await renderWithQueryClient(
      <IntegrationSettings integrations={[outlook(false)]} />
    );
    await screen.getByRole("switch").click();
    expect(mockPush).toHaveBeenCalledWith("/api/outlook");
    expect(disconnectCalled).toBe(false);
  });

  it("DELETEs the outlook connection when toggling off a connected integration", async () => {
    let disconnectCalled = false;
    worker.use(
      http.delete("/api/integrations/outlook", () => {
        disconnectCalled = true;
        return HttpResponse.json({ success: true });
      })
    );

    const screen = await renderWithQueryClient(
      <IntegrationSettings integrations={[outlook(true)]} />
    );
    await screen.getByRole("switch").click();
    await vi.waitFor(() => expect(disconnectCalled).toBe(true));
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe("VideoMeetingPreferences", () => {
  it("reflects the fetched recording status", async () => {
    worker.use(
      http.get("/api/recording/status", () =>
        HttpResponse.json({ recording_status: true })
      )
    );

    const screen = await renderWithQueryClient(<VideoMeetingPreferences />);

    await expect.element(screen.getByRole("switch")).toBeChecked();
  });

  it("toggles the recording status through the API", async () => {
    let patchBody: unknown;
    let status = false;
    worker.use(
      // stateful handlers: the settle-time refetch must observe the flip
      http.get("/api/recording/status", () =>
        HttpResponse.json({ recording_status: status })
      ),
      http.patch("/api/user", async ({ request }) => {
        patchBody = await request.json();
        status = !status;
        await delay(100);
        return HttpResponse.json({ success: true });
      })
    );

    const screen = await renderWithQueryClient(<VideoMeetingPreferences />);
    await expect.element(screen.getByRole("switch")).not.toBeChecked();

    await screen.getByRole("switch").click();

    // optimistic flip is immediate; the PATCH lands with the envelope
    await expect.element(screen.getByRole("switch")).toBeChecked();
    await vi.waitFor(() =>
      expect(patchBody).toEqual({ type: "recording-status" })
    );
  });

  it("rolls the toggle back when the API call fails", async () => {
    worker.use(
      http.patch("/api/user", () =>
        HttpResponse.json({ error: "boom" }, { status: 500 })
      )
    );

    const screen = await renderWithQueryClient(<VideoMeetingPreferences />);
    await expect.element(screen.getByRole("switch")).not.toBeChecked();

    await screen.getByRole("switch").click();

    await expect.element(screen.getByRole("switch")).not.toBeChecked();
  });
});
