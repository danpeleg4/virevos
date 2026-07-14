import React from "react";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";

// Swap Radix Select for a native <select> so the Duration field can be driven
// deterministically in tests.
vi.mock("@/app/components/ui/select", async () => {
  const ReactMod = await import("react");
  const SelectCtx = ReactMod.createContext({});
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
        { value: { onValueChange } },
        children
      ),
    SelectTrigger: ({ children }: { children: React.ReactNode }) =>
      ReactMod.createElement("div", null, children),
    SelectValue: ({ placeholder }: { placeholder?: string }) =>
      ReactMod.createElement("span", null, placeholder),
    SelectContent: ({ children }: { children: React.ReactNode }) => {
      const { onValueChange } = ReactMod.useContext(SelectCtx) as {
        onValueChange?: (v: string) => void;
      };
      return ReactMod.createElement(
        "select",
        {
          "aria-label": "duration-mock",
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
    }: {
      value: string;
      children: React.ReactNode;
    }) => ReactMod.createElement("option", { value }, children),
  };
});

import { BookEventDialog } from "@/app/components/BookEventDialog";

describe("BookEventDialog", () => {
  const addMeeting = vi.fn();
  const setDialogOpen = vi.fn();

  beforeEach(() => {
    addMeeting.mockClear();
    setDialogOpen.mockClear();
  });

  it("renders dialog when dialogOpen is true", async () => {
    const screen = await render(
      <BookEventDialog
        dialogOpen={true}
        setDialogOpen={setDialogOpen}
        addMeeting={addMeeting}
      />
    );
    await expect
      .element(screen.getByText("Schedule an Event"))
      .toBeInTheDocument();
  });

  it("does not show dialog content when dialogOpen is false", async () => {
    const screen = await render(
      <BookEventDialog
        dialogOpen={false}
        setDialogOpen={setDialogOpen}
        addMeeting={addMeeting}
      />
    );
    await expect
      .element(screen.getByText("Schedule an Event"))
      .not.toBeInTheDocument();
  });

  it("renders title input", async () => {
    const screen = await render(
      <BookEventDialog
        dialogOpen={true}
        setDialogOpen={setDialogOpen}
        addMeeting={addMeeting}
      />
    );
    await expect
      .element(screen.getByPlaceholder(/meeting with team/i))
      .toBeInTheDocument();
  });

  it("renders description textarea", async () => {
    const screen = await render(
      <BookEventDialog
        dialogOpen={true}
        setDialogOpen={setDialogOpen}
        addMeeting={addMeeting}
      />
    );
    await expect
      .element(screen.getByPlaceholder(/discuss the project plan/i))
      .toBeInTheDocument();
  });

  it("renders date and time picker triggers", async () => {
    const screen = await render(
      <BookEventDialog
        dialogOpen={true}
        setDialogOpen={setDialogOpen}
        addMeeting={addMeeting}
      />
    );
    await expect
      .element(screen.getByRole("button", { name: /select date/i }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /select time/i }))
      .toBeInTheDocument();
  });

  it("renders 'Create a Meeting' switch", async () => {
    const screen = await render(
      <BookEventDialog
        dialogOpen={true}
        setDialogOpen={setDialogOpen}
        addMeeting={addMeeting}
      />
    );
    await expect
      .element(screen.getByText(/create a meeting/i))
      .toBeInTheDocument();
  });

  it("disables Book until title, date, time and duration are filled", async () => {
    const screen = await render(
      <BookEventDialog
        dialogOpen={true}
        setDialogOpen={setDialogOpen}
        addMeeting={addMeeting}
      />
    );

    const bookBtn = screen.getByRole("button", { name: /^book$/i });
    await expect.element(bookBtn).toBeDisabled();

    await screen.getByPlaceholder(/meeting with team/i).fill("Team Sync");

    // Title alone is not enough — date, time, duration are still missing
    await expect.element(bookBtn).toBeDisabled();
    expect(addMeeting).not.toHaveBeenCalled();
  });

  it("calls addMeeting with event payload when all fields are filled and Book is clicked", async () => {
    const screen = await render(
      <BookEventDialog
        dialogOpen={true}
        setDialogOpen={setDialogOpen}
        addMeeting={addMeeting}
      />
    );

    await screen.getByPlaceholder(/meeting with team/i).fill("Team Sync");

    // Open the date popover and click today's cell
    await screen.getByRole("button", { name: /select date/i }).click();
    const today = new Date().getDate().toString();
    await vi.waitFor(() => {
      expect(screen.getByRole("gridcell").elements().length).toBeGreaterThan(0);
    });
    const dayCells = screen.getByRole("gridcell").elements();
    const todayCell = dayCells
      .map((c) => c.querySelector("button"))
      .find(
        (btn) =>
          btn && btn.textContent === today && !btn.hasAttribute("disabled")
      );
    if (todayCell) await page.elementLocator(todayCell).click();
    // the popover stays open over the form — dismiss it before moving on
    await userEvent.keyboard("{Escape}");

    // Open the time popover and pick a slot
    await screen.getByRole("button", { name: /select time/i }).click();
    await screen.getByRole("button", { name: "10:00" }).click();
    await userEvent.keyboard("{Escape}");

    // Pick duration via the mocked native select
    await screen.getByLabelText("duration-mock").selectOptions("30");

    const bookBtn = screen.getByRole("button", { name: /^book$/i });
    await expect.element(bookBtn).not.toBeDisabled();
    await bookBtn.click();

    expect(addMeeting).toHaveBeenCalledTimes(1);
    expect(addMeeting).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Team Sync",
        isMeeting: false,
        duration: 30,
        attendees: [],
      })
    );
  });

  it("calls setDialogOpen(false) on Cancel", async () => {
    const screen = await render(
      <BookEventDialog
        dialogOpen={true}
        setDialogOpen={setDialogOpen}
        addMeeting={addMeeting}
      />
    );
    await screen.getByRole("button", { name: /cancel/i }).click();
    expect(setDialogOpen).toHaveBeenCalledWith(false);
  });
});
