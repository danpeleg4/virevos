import React from "react";
import { http, HttpResponse } from "msw";
import { worker } from "../../../msw/worker";
import { renderWithQueryClient } from "../../../_helpers/render";
import { ClientPortalSettings } from "@/app/components/clients/ClientPortalSettings";
import { toast } from "@/app/components/ui/toast-store";
import type {
  PortalAvailability,
  PortalMeetingBooking,
  PortalRecord,
} from "@/types/portal";

const availability: PortalAvailability = {
  weeklySchedule: {
    monday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    tuesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    wednesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    thursday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    friday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    saturday: { enabled: false, startTime: "09:00", endTime: "17:00" },
    sunday: { enabled: false, startTime: "09:00", endTime: "17:00" },
  },
  meetingDurations: [15, 30, 45, 60],
  bufferMinutes: 15,
  timezone: "UTC",
};

const mockPortal: PortalRecord = {
  id: 1,
  clientId: 7,
  clientName: "Acme Corp",
  token: "tok-123",
  enabled: true,
  settings: { title: "Acme Portal" },
  portalUrl: "https://example.com/portal/tok-123",
  lastAccessedAt: null,
};

function usePortalHandlers(portal: PortalRecord | null) {
  worker.use(
    http.get("/api/clients/:id", ({ request }) => {
      const type = new URL(request.url).searchParams.get("type");
      if (type === "portal") return HttpResponse.json({ portal });
      return HttpResponse.json({ error: "Invalid type" }, { status: 400 });
    }),
    http.get("/api/portal", ({ request }) => {
      const type = new URL(request.url).searchParams.get("type");
      if (type === "bookings") return HttpResponse.json({ bookings: [] });
      return HttpResponse.json({ error: "Invalid type" }, { status: 400 });
    })
  );
}

function baseProps(
  overrides: Partial<Parameters<typeof ClientPortalSettings>[0]> = {}
) {
  return {
    clientId: 7,
    portalEnabled: true,
    onPortalEnabledChange: vi.fn(),
    title: "",
    onTitleChange: vi.fn(),
    welcomeMessage: "Welcome!",
    onWelcomeMessage: vi.fn(),
    emailNotifications: true,
    meetingSchedulingEnabled: false,
    onMeetingSchedulingEnabledChange: vi.fn(),
    availability,
    onAvailability: vi.fn(),
    isProvisioningPortal: false,
    ...overrides,
  };
}

describe("ClientPortalSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reflects the portalEnabled prop and reports toggles via onPortalEnabledChange", async () => {
    usePortalHandlers(null);
    const onPortalEnabledChange = vi.fn();
    const screen = await renderWithQueryClient(
      <ClientPortalSettings {...baseProps({ onPortalEnabledChange })} />
    );

    const portalSwitch = screen.getByRole("switch", { name: "Portal enabled" });
    await expect.element(portalSwitch).toHaveAttribute("aria-checked", "true");
    await portalSwitch.click();
    expect(onPortalEnabledChange).toHaveBeenCalledWith(false);
  });

  it("shows the title prop in the input and calls onTitleChange when edited", async () => {
    usePortalHandlers(null);
    const onTitleChange = vi.fn();
    const screen = await renderWithQueryClient(
      <ClientPortalSettings {...baseProps({ title: "Acme", onTitleChange })} />
    );

    await expect
      .element(screen.getByPlaceholder("e.g. Acme Agency"))
      .toHaveValue("Acme");
    await screen.getByPlaceholder("e.g. Acme Agency").fill("Acme Legal");
    expect(onTitleChange).toHaveBeenCalledWith("Acme Legal");
  });

  it("shows the welcomeMessage prop in the textarea and calls onWelcomeMessage when edited", async () => {
    usePortalHandlers(null);
    const onWelcomeMessage = vi.fn();
    const screen = await renderWithQueryClient(
      <ClientPortalSettings
        {...baseProps({ welcomeMessage: "Hi there", onWelcomeMessage })}
      />
    );

    await expect
      .element(screen.getByPlaceholder("Welcome to our portal!"))
      .toHaveValue("Hi there");
    await screen
      .getByPlaceholder("Welcome to our portal!")
      .fill("Glad you're here");
    expect(onWelcomeMessage).toHaveBeenCalledWith("Glad you're here");
  });

  it("toggles meeting scheduling via onMeetingSchedulingEnabledChange", async () => {
    usePortalHandlers(null);
    const onMeetingSchedulingEnabledChange = vi.fn();
    const screen = await renderWithQueryClient(
      <ClientPortalSettings
        {...baseProps({ onMeetingSchedulingEnabledChange })}
      />
    );

    await screen
      .getByRole("switch", { name: "Meeting scheduling enabled" })
      .click();
    expect(onMeetingSchedulingEnabledChange).toHaveBeenCalledWith(true);
  });

  it("disables the email notifications switch and reflects the prop value", async () => {
    usePortalHandlers(null);
    const screen = await renderWithQueryClient(
      <ClientPortalSettings {...baseProps({ emailNotifications: false })} />
    );

    const emailSwitch = screen.getByRole("switch", {
      name: "Email notifications",
    });
    await expect.element(emailSwitch).toBeDisabled();
    await expect.element(emailSwitch).toHaveAttribute("aria-checked", "false");
  });

  it("shows the portal URL once a portal exists", async () => {
    usePortalHandlers(mockPortal);
    const screen = await renderWithQueryClient(
      <ClientPortalSettings {...baseProps()} />
    );

    await expect
      .element(screen.getByText(mockPortal.portalUrl))
      .toBeInTheDocument();
  });

  it("shows a provisioning spinner instead of the empty-state prompt while creating the portal", async () => {
    usePortalHandlers(null);
    const screen = await renderWithQueryClient(
      <ClientPortalSettings {...baseProps({ isProvisioningPortal: true })} />
    );

    await expect
      .element(screen.getByText(/generating portal url/i))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText(/save settings to generate/i))
      .not.toBeInTheDocument();
  });

  it("shows the empty-state prompt when no portal exists and nothing is provisioning", async () => {
    usePortalHandlers(null);
    const screen = await renderWithQueryClient(
      <ClientPortalSettings {...baseProps({ isProvisioningPortal: false })} />
    );

    await expect
      .element(screen.getByText(/save settings to generate/i))
      .toBeInTheDocument();
  });

  it("shows distinct start and end times for a day's availability", async () => {
    usePortalHandlers(null);
    const screen = await renderWithQueryClient(
      <ClientPortalSettings
        {...baseProps({ meetingSchedulingEnabled: true })}
      />
    );

    const startTime = screen.getByRole("combobox", {
      name: "Start time for Monday",
    });
    const endTime = screen.getByRole("combobox", {
      name: "End time for Monday",
    });
    await expect.element(startTime).toHaveTextContent("09:00");
    await expect.element(endTime).toHaveTextContent("17:00");
  });
});

describe("ClientPortalSettings — booking toast feedback", () => {
  const pendingBooking: PortalMeetingBooking & {
    clientDisplayName: string | null;
  } = {
    id: 42,
    portalId: mockPortal.id,
    clientId: mockPortal.clientId,
    userId: "user-1",
    clientName: "Jane Client",
    clientEmail: "jane@example.com",
    dateTime: "2026-07-10T09:00:00.000Z",
    duration: 30,
    status: "pending",
    notes: null,
    meetingLink: null,
    eventId: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    clientDisplayName: "Jane Client",
  };

  function usePortalHandlersWithBooking() {
    worker.use(
      http.get("/api/clients/:id", ({ request }) => {
        const type = new URL(request.url).searchParams.get("type");
        if (type === "portal") return HttpResponse.json({ portal: mockPortal });
        return HttpResponse.json({ error: "Invalid type" }, { status: 400 });
      }),
      http.get("/api/portal", ({ request }) => {
        const type = new URL(request.url).searchParams.get("type");
        if (type === "bookings")
          return HttpResponse.json({ bookings: [pendingBooking] });
        return HttpResponse.json({ error: "Invalid type" }, { status: 400 });
      })
    );
  }

  const renderWithBooking = () =>
    renderWithQueryClient(
      <ClientPortalSettings {...baseProps({ meetingSchedulingEnabled: true })} />
    );

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows only a success toast when confirming a booking succeeds", async () => {
    usePortalHandlersWithBooking();
    worker.use(
      http.patch("/api/portal-bookings/:id", () => HttpResponse.json({}))
    );
    const successSpy = vi.spyOn(toast, "success");
    const errorSpy = vi.spyOn(toast, "error");

    const screen = await renderWithBooking();
    await screen.getByRole("button", { name: "Confirm" }).click();

    await vi.waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Confirmed" })
      );
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("shows only an error toast — not a false success toast — when confirming fails", async () => {
    usePortalHandlersWithBooking();
    worker.use(
      http.patch("/api/portal-bookings/:id", () =>
        HttpResponse.json({ error: "db down" }, { status: 500 })
      )
    );
    const successSpy = vi.spyOn(toast, "success");
    const errorSpy = vi.spyOn(toast, "error");

    const screen = await renderWithBooking();
    await screen.getByRole("button", { name: "Confirm" }).click();

    await vi.waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Failed" })
      );
    });
    expect(successSpy).not.toHaveBeenCalled();
  });

  it("shows only an error toast — not a false success toast — when cancelling fails", async () => {
    usePortalHandlersWithBooking();
    worker.use(
      http.patch("/api/portal-bookings/:id", () =>
        HttpResponse.json({ error: "db down" }, { status: 500 })
      )
    );
    const successSpy = vi.spyOn(toast, "success");
    const errorSpy = vi.spyOn(toast, "error");

    const screen = await renderWithBooking();
    await screen.getByRole("button", { name: "Cancel" }).click();

    await vi.waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Failed" })
      );
    });
    expect(successSpy).not.toHaveBeenCalled();
  });
});
