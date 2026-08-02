import React from "react";
import { page, type Locator } from "vitest/browser";
import { http, HttpResponse } from "msw";
import { worker } from "../../../msw/worker";
import { renderWithQueryClient } from "../../../_helpers/render";
import type { ScheduledEmail } from "@/types/communications";
import { timeOptions } from "@/lib/util/utils";

// itemsPerPage is derived from measured viewport height; pin it so the
// pagination tests are deterministic regardless of the browser window size
const calcWindow = vi.hoisted(() => ({ itemsPerPage: 10 }));

vi.mock("@/app/hooks/useCalcWindow", () => ({
  useCalcWindow: () => ({
    itemsPerPage: calcWindow.itemsPerPage,
    tableRef: { current: null },
  }),
}));

// Swap Radix Select for a native <select> so the Time field can be driven
// deterministically in tests.
vi.mock("@/app/components/ui/select", async () => {
  const ReactMod = await import("react");
  const SelectCtx = ReactMod.createContext(
    {} as { onValueChange?: (v: string) => void; placeholder?: React.ReactNode }
  );

  const SelectValueMock = ({
    placeholder,
  }: {
    placeholder?: React.ReactNode;
  }) => ReactMod.createElement("span", null, placeholder);

  // Find the SelectValue placeholder nested under this Select's children
  // (it lives inside SelectTrigger), so each Select gets its own accessible
  // name instead of a single hardcoded label shared by every instance.
  function findPlaceholder(node: React.ReactNode): React.ReactNode {
    let found: React.ReactNode;
    ReactMod.Children.forEach(node, (child) => {
      if (found !== undefined || !ReactMod.isValidElement(child)) return;
      const el = child as React.ReactElement<{
        placeholder?: React.ReactNode;
        children?: React.ReactNode;
      }>;
      if (el.type === SelectValueMock) {
        found = el.props.placeholder;
      } else if (el.props && "children" in el.props) {
        found = findPlaceholder(el.props.children);
      }
    });
    return found;
  }

  return {
    Select: ({
      children,
      onValueChange,
    }: {
      children: React.ReactNode;
      onValueChange?: (v: string) => void;
    }) =>
      ReactMod.createElement(
        SelectCtx.Provider,
        { value: { onValueChange, placeholder: findPlaceholder(children) } },
        children
      ),
    SelectTrigger: ({ children }: { children: React.ReactNode }) =>
      ReactMod.createElement("div", null, children),
    SelectValue: SelectValueMock,
    SelectContent: ({ children }: { children: React.ReactNode }) => {
      const { onValueChange, placeholder } = ReactMod.useContext(SelectCtx);
      return ReactMod.createElement(
        "select",
        {
          "aria-label": placeholder,
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
            onValueChange?.(e.target.value),
        },
        ReactMod.createElement("option", { value: "" }, "Select"),
        children
      );
    },
    SelectItem: ({
      value,
      children,
      disabled,
    }: {
      value: string;
      children: React.ReactNode;
      disabled?: boolean;
    }) => ReactMod.createElement("option", { value, disabled }, children),
  };
});

import { ScheduledMessages } from "@/app/components/communications/ScheduledMessages";
import { toast } from "@/app/components/ui/toast-store";

const pendingEmail: ScheduledEmail = {
  id: 1,
  toEmail: "client@example.com",
  toName: "Jane Client",
  subject: "Quarterly review",
  bodyHtml: "<p>Hello</p>",
  bodyText: "Hello",
  scheduledAt: "2026-07-10T09:00:00.000Z",
  timezone: "UTC",
  recurring: null,
  status: "pending",
  sentAt: null,
  errorMessage: null,
  clientId: null,
  createdAt: "2026-07-01T09:00:00.000Z",
};

let scheduledEmails: ScheduledEmail[];
let navContainer: HTMLDivElement | null = null;
let emailsFetchCount = 0;
let lastPostBody: unknown;
let postCallCount = 0;

const createNavContainer = () => {
  navContainer = document.createElement("div");
  document.body.appendChild(navContainer);
  return navContainer;
};

function setupDefaultHandlers() {
  worker.use(
    http.get("/api/integrations/outlook", () =>
      HttpResponse.json({ connected: true })
    ),
    http.get("/api/scheduled-emails", () => {
      emailsFetchCount += 1;
      return HttpResponse.json({ scheduledEmails });
    })
  );
}

const renderComponent = (nav: HTMLDivElement | null = null) =>
  renderWithQueryClient(<ScheduledMessages navContainer={nav} />);

const openScheduleDialog = async () => {
  const nav = createNavContainer();
  const screen = await renderComponent(nav);

  await page
    .elementLocator(nav)
    .getByRole("button", { name: /schedule message/i })
    .click();

  const dialog = screen.getByRole("dialog");
  await expect.element(dialog).toBeInTheDocument();
  return { screen, dialog };
};

// The Calendar disables past days, so tests pick "today" rather than a
// fixed date — keep this in sync with the day clicked in fillScheduleForm.
const scheduleTargetDate = new Date();
const scheduleTargetDay = scheduleTargetDate.getDate().toString();

// fillScheduleForm never touches the Time field, so it keeps the form's
// "09:00" default — unless the auto-adjust-on-today logic (ScheduledMessages
// handleSelectDate) bumps it forward because "now" is already past 9am.
const defaultFormTime = "09:00";
const currentTimeStr = `${String(scheduleTargetDate.getHours()).padStart(
  2,
  "0"
)}:${String(scheduleTargetDate.getMinutes()).padStart(2, "0")}`;
const expectedDefaultFormTime =
  defaultFormTime < currentTimeStr
    ? (timeOptions.find((t) => t >= currentTimeStr) ?? defaultFormTime)
    : defaultFormTime;

const expectedScheduledAt = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(
    scheduleTargetDate.getFullYear(),
    scheduleTargetDate.getMonth(),
    scheduleTargetDate.getDate(),
    hours,
    minutes,
    0,
    0
  ).toISOString();
};

const fillScheduleForm = async (
  screen: Awaited<ReturnType<typeof renderWithQueryClient>>,
  dialog: Locator
) => {
  await dialog
    .getByPlaceholder("recipient@example.com")
    .fill("new@example.com");
  await dialog.getByPlaceholder("John Doe").fill("New Person");
  await dialog.getByPlaceholder("Email subject...").fill("Kickoff call");
  await dialog.getByPlaceholder("Type your message...").fill("See you soon");

  // Popover/Calendar portal outside the dialog, so search at the page level
  await dialog.getByRole("button", { name: /select date/i }).click();
  await vi.waitFor(() => {
    expect(screen.getByRole("gridcell").elements().length).toBeGreaterThan(0);
  });
  const dayCells = screen.getByRole("gridcell").elements();
  const targetCell = dayCells
    .map((c) => c.querySelector("button"))
    .find(
      (btn) =>
        btn &&
        btn.textContent === scheduleTargetDay &&
        !btn.hasAttribute("disabled")
    );
  if (targetCell) await page.elementLocator(targetCell).click();
  // Escape would close the outer Dialog too — both it and the Popover attach
  // their own document-level Escape listener with no stacking awareness.
  // Clicking elsewhere inside the dialog dismisses only the popover via
  // onPointerDownOutside.
  await dialog.getByPlaceholder("Type your message...").click();
};

beforeEach(() => {
  calcWindow.itemsPerPage = 10;
  scheduledEmails = [pendingEmail];
  emailsFetchCount = 0;
  lastPostBody = undefined;
  postCallCount = 0;
  setupDefaultHandlers();
});

afterEach(() => {
  navContainer?.remove();
  navContainer = null;
});

describe("ScheduledMessages — Send Now", () => {
  it("renders a pending message with a Send Now button", async () => {
    const screen = await renderComponent();

    await expect
      .element(screen.getByRole("button", { name: /send now/i }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Scheduled", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Quarterly review"))
      .toBeInTheDocument();
  });

  it("optimistically marks the message as sent and posts a send-now request", async () => {
    let resolveSend!: () => void;
    worker.use(
      http.post("/api/scheduled-emails", async ({ request }) => {
        postCallCount += 1;
        lastPostBody = await request.json();
        await new Promise<void>((resolve) => {
          resolveSend = resolve;
        });
        return HttpResponse.json({ success: true });
      })
    );

    const screen = await renderComponent();

    await screen.getByRole("button", { name: /send now/i }).click();

    // Optimistic: badge flips and the button unmounts before the server responds
    await expect
      .element(screen.getByText("Sent", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /send now/i }))
      .not.toBeInTheDocument();

    // waitFor on lastPostBody directly — postCallCount increments before the
    // request body is awaited, so checking it first is a race
    await vi.waitFor(() => {
      expect(lastPostBody).toEqual({ data: 1, type: "send-now" });
    });

    // Server confirms; refetch on settle returns the sent version
    scheduledEmails = [
      { ...pendingEmail, status: "sent", sentAt: "2026-07-03T10:00:00.000Z" },
    ];
    const fetchesBeforeSettle = emailsFetchCount;
    resolveSend();

    await vi.waitFor(() => {
      expect(emailsFetchCount).toBeGreaterThan(fetchesBeforeSettle);
    });
    await expect
      .element(screen.getByText("Sent", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /send now/i }))
      .not.toBeInTheDocument();
  });

  it("rolls back the optimistic update when sending fails", async () => {
    worker.use(
      http.post("/api/scheduled-emails", () => {
        postCallCount += 1;
        return HttpResponse.json({ error: "smtp down" }, { status: 500 });
      })
    );

    const screen = await renderComponent();

    await screen.getByRole("button", { name: /send now/i }).click();

    await vi.waitFor(() => {
      expect(postCallCount).toBe(1);
    });

    // Rolled back: still pending, button available again
    await expect
      .element(screen.getByRole("button", { name: /send now/i }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Scheduled", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Sent", { exact: true }))
      .not.toBeInTheDocument();
  });

  it("sends only the scheduled email id — the server reads the row itself", async () => {
    scheduledEmails = [
      { ...pendingEmail, id: 2, toName: null, bodyText: null },
    ];
    worker.use(
      http.post("/api/scheduled-emails", async ({ request }) => {
        lastPostBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );

    const screen = await renderComponent();

    await screen.getByRole("button", { name: /send now/i }).click();

    await vi.waitFor(() => {
      expect(lastPostBody).toEqual({ data: 2, type: "send-now" });
    });
  });
});

describe("ScheduledMessages — Schedule New Message", () => {
  it("optimistically adds the message to the list before the server responds", async () => {
    let resolveCreate!: () => void;
    worker.use(
      http.post("/api/scheduled-emails", async ({ request }) => {
        postCallCount += 1;
        lastPostBody = await request.json();
        await new Promise<void>((resolve) => {
          resolveCreate = resolve;
        });
        return HttpResponse.json({ success: true });
      })
    );

    const { screen, dialog } = await openScheduleDialog();
    await fillScheduleForm(screen, dialog);
    await dialog.getByRole("button", { name: /schedule message/i }).click();

    // Optimistic: dialog closes and the new message shows up immediately
    await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();
    await expect.element(screen.getByText("Kickoff call")).toBeInTheDocument();
    await expect.element(screen.getByText("New Person")).toBeInTheDocument();

    await vi.waitFor(() => {
      expect(lastPostBody).toEqual({
        type: "schedule",
        data: {
          toEmail: "new@example.com",
          toName: "New Person",
          subject: "Kickoff call",
          bodyHtml: "<p>See you soon</p>",
          bodyText: "See you soon",
          scheduledAt: expectedScheduledAt(expectedDefaultFormTime),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
    });

    // Server confirms; refetch on settle returns the persisted version
    scheduledEmails = [
      {
        ...pendingEmail,
        id: 7,
        toEmail: "new@example.com",
        toName: "New Person",
        subject: "Kickoff call",
        bodyHtml: "<p>See you soon</p>",
        bodyText: "See you soon",
        scheduledAt: expectedScheduledAt(expectedDefaultFormTime),
      },
      pendingEmail,
    ];
    const fetchesBeforeSettle = emailsFetchCount;
    resolveCreate();

    await vi.waitFor(() => {
      expect(emailsFetchCount).toBeGreaterThan(fetchesBeforeSettle);
    });
    await expect.element(screen.getByText("Kickoff call")).toBeInTheDocument();
  });

  it("hides the Send Now and delete buttons on the optimistic entry until the server confirms", async () => {
    scheduledEmails = [];
    worker.use(
      http.post("/api/scheduled-emails", () => new Promise<never>(() => {}))
    );

    const { screen, dialog } = await openScheduleDialog();
    await fillScheduleForm(screen, dialog);
    await dialog.getByRole("button", { name: /schedule message/i }).click();

    await expect.element(screen.getByText("Kickoff call")).toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /send now/i }))
      .not.toBeInTheDocument();
  });

  it("rolls back the optimistic message when scheduling fails", async () => {
    worker.use(
      http.post("/api/scheduled-emails", () => {
        postCallCount += 1;
        return HttpResponse.json({ error: "db down" }, { status: 500 });
      })
    );

    const { screen, dialog } = await openScheduleDialog();
    await fillScheduleForm(screen, dialog);
    await dialog.getByRole("button", { name: /schedule message/i }).click();

    await vi.waitFor(() => {
      expect(postCallCount).toBe(1);
    });

    // Rolled back: the optimistic message is gone, original list intact
    await expect
      .element(screen.getByText("Kickoff call"))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByText("Quarterly review"))
      .toBeInTheDocument();
  });

  it("validates required fields before mutating", async () => {
    let called = false;
    worker.use(
      http.post("/api/scheduled-emails", () => {
        called = true;
        return HttpResponse.json({ success: true });
      })
    );

    const { screen, dialog } = await openScheduleDialog();

    await dialog.getByRole("button", { name: /schedule message/i }).click();

    expect(called).toBe(false);
    // Dialog stays open so the user can fix the form
    await expect.element(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not crash and skips the mutation when the Time field is cleared (issue #247)", async () => {
    let called = false;
    worker.use(
      http.post("/api/scheduled-emails", () => {
        called = true;
        return HttpResponse.json({ success: true });
      })
    );

    const { screen, dialog } = await openScheduleDialog();
    await fillScheduleForm(screen, dialog);

    // The Select has no blank item in the real UI, but selecting the mock's
    // injected "" option still exercises the formTime-cleared guard.
    await dialog
      .getByRole("combobox", { name: /select time/i })
      .selectOptions("");

    await dialog.getByRole("button", { name: /schedule message/i }).click();

    expect(called).toBe(false);
    // Dialog stays open — no uncaught RangeError from an invalid Date
    await expect.element(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("disables time slots already passed today, but not on a future date", async () => {
    const { screen, dialog } = await openScheduleDialog();

    // fillScheduleForm picks today's date via the calendar
    await fillScheduleForm(screen, dialog);

    const timeSelect = dialog.getByRole("combobox", {
      name: /select time/i,
    });
    const optionsToday = (
      timeSelect.elements()[0] as HTMLSelectElement
    ).querySelectorAll("option");
    const midnightToday = Array.from(optionsToday).find(
      (o) => o.value === "00:00"
    ) as HTMLOptionElement;
    const lateToday = Array.from(optionsToday).find(
      (o) => o.value === "23:30"
    ) as HTMLOptionElement;
    expect(midnightToday.disabled).toBe(true);
    expect(lateToday.disabled).toBe(false);

    // Switch to a day next month — nothing there should be disabled,
    // regardless of the current clock time
    await dialog.getByRole("button", { name: /select date/i }).click();
    await screen.getByRole("button", { name: /next month/i }).click();
    await vi.waitFor(() => {
      expect(screen.getByRole("gridcell").elements().length).toBeGreaterThan(0);
    });
    const dayCells = screen.getByRole("gridcell").elements();
    const futureCell = dayCells
      .map((c) => c.querySelector("button"))
      .find((btn) => btn && !btn.hasAttribute("disabled"));
    if (futureCell) await page.elementLocator(futureCell).click();
    await dialog.getByPlaceholder("Type your message...").click();

    const optionsFuture = (
      timeSelect.elements()[0] as HTMLSelectElement
    ).querySelectorAll("option");
    const midnightFuture = Array.from(optionsFuture).find(
      (o) => o.value === "00:00"
    ) as HTMLOptionElement;
    expect(midnightFuture.disabled).toBe(false);
  });

  it("auto-adjusts a past preselected time when today is chosen as the date", async () => {
    worker.use(
      http.post("/api/scheduled-emails", async ({ request }) => {
        lastPostBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );

    const { screen, dialog } = await openScheduleDialog();
    await dialog
      .getByPlaceholder("recipient@example.com")
      .fill("new@example.com");
    await dialog.getByPlaceholder("Email subject...").fill("Kickoff call");
    await dialog.getByPlaceholder("Type your message...").fill("See you soon");

    // Force a time that's already in the past relative to "now"
    await dialog
      .getByRole("combobox", { name: /select time/i })
      .selectOptions("00:00");

    // Picking today should bump the time off the now-disabled "00:00" slot
    await dialog.getByRole("button", { name: /select date/i }).click();
    await vi.waitFor(() => {
      expect(screen.getByRole("gridcell").elements().length).toBeGreaterThan(0);
    });
    const dayCells = screen.getByRole("gridcell").elements();
    const todayCell = dayCells
      .map((c) => c.querySelector("button"))
      .find(
        (btn) =>
          btn &&
          btn.textContent === scheduleTargetDay &&
          !btn.hasAttribute("disabled")
      );
    if (todayCell) await page.elementLocator(todayCell).click();
    await dialog.getByPlaceholder("Type your message...").click();

    await dialog.getByRole("button", { name: /schedule message/i }).click();

    const nextAvailable = timeOptions.find((t) => t >= currentTimeStr);

    await vi.waitFor(() => {
      expect(lastPostBody).toEqual({
        type: "schedule",
        data: expect.objectContaining({
          scheduledAt: expectedScheduledAt(nextAvailable!),
        }),
      });
    });
  });
});

describe("ScheduledMessages — Attachments", () => {
  const fileInput = () =>
    page.elementLocator(
      document.querySelector<HTMLInputElement>('input[type="file"]')!
    );

  beforeEach(() => {
    worker.use(
      http.get("/api/files/user-files", () => HttpResponse.json({ files: [] }))
    );
  });

  it("shows an Attach Files button in the schedule dialog", async () => {
    const { dialog } = await openScheduleDialog();
    await expect
      .element(dialog.getByRole("button", { name: /attach files/i }))
      .toBeInTheDocument();
  });

  it("attaches a file and includes it in the schedule payload", async () => {
    worker.use(
      http.post("/api/scheduled-emails", async ({ request }) => {
        lastPostBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );

    const { screen, dialog } = await openScheduleDialog();
    await fillScheduleForm(screen, dialog);

    await dialog.getByRole("button", { name: /attach files/i }).click();
    const file = new File(["hello"], "report.pdf", {
      type: "application/pdf",
    });
    await fileInput().upload(file);
    await screen.getByRole("button", { name: /attach \(1\)/i }).click();

    await expect.element(dialog.getByText("report.pdf")).toBeInTheDocument();

    await dialog.getByRole("button", { name: /schedule message/i }).click();

    await vi.waitFor(() => {
      expect(lastPostBody).toMatchObject({
        type: "schedule",
        data: expect.objectContaining({
          attachments: [
            expect.objectContaining({
              name: "report.pdf",
              mimeType: "application/pdf",
            }),
          ],
        }),
      });
    });
  });

  it("omits the attachments key entirely when nothing was attached", async () => {
    worker.use(
      http.post("/api/scheduled-emails", async ({ request }) => {
        lastPostBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );

    const { screen, dialog } = await openScheduleDialog();
    await fillScheduleForm(screen, dialog);
    await dialog.getByRole("button", { name: /schedule message/i }).click();

    await vi.waitFor(() => {
      expect(lastPostBody).toBeDefined();
    });
    expect((lastPostBody as { data: object }).data).not.toHaveProperty(
      "attachments"
    );
  });

  it("removes an attached file when its remove button is clicked", async () => {
    const { screen, dialog } = await openScheduleDialog();
    await dialog.getByRole("button", { name: /attach files/i }).click();
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    await fileInput().upload(file);
    await screen.getByRole("button", { name: /attach \(1\)/i }).click();

    await expect.element(dialog.getByText("notes.txt")).toBeInTheDocument();

    await dialog.getByRole("button", { name: /remove notes.txt/i }).click();

    await expect.element(dialog.getByText("notes.txt")).not.toBeInTheDocument();
  });
});

describe("ScheduledMessages — Pagination", () => {
  const makeEmails = (n: number): ScheduledEmail[] =>
    Array.from({ length: n }, (_, i) => ({
      ...pendingEmail,
      id: i + 1,
      subject: `Message ${i + 1}`,
    }));

  it("splits messages into pages and navigates with Previous/Next", async () => {
    calcWindow.itemsPerPage = 2;
    scheduledEmails = makeEmails(3);

    const screen = await renderComponent();

    await expect.element(screen.getByText("Message 1")).toBeInTheDocument();
    await expect.element(screen.getByText("Message 2")).toBeInTheDocument();
    await expect.element(screen.getByText("Message 3")).not.toBeInTheDocument();
    await expect
      .element(screen.getByText(/Showing 1–2 of 3 messages/))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /previous/i }))
      .toBeDisabled();

    await screen.getByRole("button", { name: /next/i }).click();

    await expect.element(screen.getByText("Message 3")).toBeInTheDocument();
    await expect.element(screen.getByText("Message 1")).not.toBeInTheDocument();
    await expect
      .element(screen.getByText(/Showing 3–3 of 3 messages/))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /next/i }))
      .toBeDisabled();

    await screen.getByRole("button", { name: /previous/i }).click();
    await expect.element(screen.getByText("Message 1")).toBeInTheDocument();
  });

  it("resets to the first page when the search query changes", async () => {
    calcWindow.itemsPerPage = 2;
    scheduledEmails = makeEmails(3);
    const nav = createNavContainer();
    const screen = await renderComponent(nav);

    await expect.element(screen.getByText("Message 1")).toBeInTheDocument();
    await screen.getByRole("button", { name: /next/i }).click();
    await expect
      .element(screen.getByText(/Showing 3–3 of 3 messages/))
      .toBeInTheDocument();

    // all rows share client@example.com, so the list is unchanged — only the page resets
    await page
      .elementLocator(nav)
      .getByPlaceholder("Search scheduled...")
      .fill("client");

    await expect
      .element(screen.getByText(/Showing 1–2 of 3 messages/))
      .toBeInTheDocument();
    await expect.element(screen.getByText("Message 1")).toBeInTheDocument();
  });

  it("shows the filtered empty state inside the table when nothing matches", async () => {
    const nav = createNavContainer();
    const screen = await renderComponent(nav);

    await expect
      .element(screen.getByText("Quarterly review"))
      .toBeInTheDocument();

    await page
      .elementLocator(nav)
      .getByPlaceholder("Search scheduled...")
      .fill("zzz-no-match");

    await expect
      .element(screen.getByText("No messages match your filters"))
      .toBeInTheDocument();
    // the CTA empty state is reserved for a truly empty list
    await expect
      .element(
        screen.getByRole("button", { name: /schedule your first message/i })
      )
      .not.toBeInTheDocument();
  });
});

describe("ScheduledMessages — Toast feedback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("warns instead of silently no-oping when required schedule fields are missing", async () => {
    const warningSpy = vi.spyOn(toast, "warning");
    const { dialog } = await openScheduleDialog();

    await dialog.getByRole("button", { name: /schedule message/i }).click();

    expect(warningSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Missing information" })
    );
  });

  it("shows only a success toast — not a false failure toast — when Send Now succeeds", async () => {
    worker.use(
      http.post("/api/scheduled-emails", () =>
        HttpResponse.json({ success: true })
      )
    );
    const successSpy = vi.spyOn(toast, "success");
    const errorSpy = vi.spyOn(toast, "error");

    const screen = await renderComponent();
    await screen.getByRole("button", { name: /send now/i }).click();

    await vi.waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Sent" })
      );
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("shows only an error toast — not a false success toast — when Send Now fails", async () => {
    worker.use(
      http.post("/api/scheduled-emails", () =>
        HttpResponse.json({ error: "smtp down" }, { status: 500 })
      )
    );
    const successSpy = vi.spyOn(toast, "success");
    const errorSpy = vi.spyOn(toast, "error");

    const screen = await renderComponent();
    await screen.getByRole("button", { name: /send now/i }).click();

    await vi.waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Failed" })
      );
    });
    expect(successSpy).not.toHaveBeenCalled();
  });

  it("shows only a success toast — not a false failure toast — when scheduling succeeds", async () => {
    worker.use(
      http.post("/api/scheduled-emails", () =>
        HttpResponse.json({ success: true })
      )
    );
    const successSpy = vi.spyOn(toast, "success");
    const errorSpy = vi.spyOn(toast, "error");

    const { screen, dialog } = await openScheduleDialog();
    await fillScheduleForm(screen, dialog);
    await dialog.getByRole("button", { name: /schedule message/i }).click();

    await vi.waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Scheduled" })
      );
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("shows only an error toast — not a false success toast — when scheduling fails", async () => {
    worker.use(
      http.post("/api/scheduled-emails", () =>
        HttpResponse.json({ error: "db down" }, { status: 500 })
      )
    );
    const successSpy = vi.spyOn(toast, "success");
    const errorSpy = vi.spyOn(toast, "error");

    const { screen, dialog } = await openScheduleDialog();
    await fillScheduleForm(screen, dialog);
    await dialog.getByRole("button", { name: /schedule message/i }).click();

    await vi.waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Failed" })
      );
    });
    expect(successSpy).not.toHaveBeenCalled();
  });
});
