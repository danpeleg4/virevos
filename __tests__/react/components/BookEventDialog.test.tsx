import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

// Radix Select doesn't drive cleanly in jsdom (pointer events). Swap it for a
// native <select> so the Duration field can be exercised in tests.
jest.mock("@/app/components/ui/select", () => {
  const ReactMod = require("react");
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
  const addMeeting = jest.fn();
  const setDialogOpen = jest.fn();

  beforeEach(() => {
    addMeeting.mockClear();
    setDialogOpen.mockClear();
  });

  it("renders dialog when dialogOpen is true", () => {
    render(
      <BookEventDialog
        dialogOpen={true}
        setDialogOpen={setDialogOpen}
        addMeeting={addMeeting}
      />
    );
    expect(screen.getByText("Schedule an Event")).toBeInTheDocument();
  });

  it("does not show dialog content when dialogOpen is false", () => {
    render(
      <BookEventDialog
        dialogOpen={false}
        setDialogOpen={setDialogOpen}
        addMeeting={addMeeting}
      />
    );
    expect(screen.queryByText("Schedule an Event")).not.toBeInTheDocument();
  });

  it("renders title input", () => {
    render(
      <BookEventDialog
        dialogOpen={true}
        setDialogOpen={setDialogOpen}
        addMeeting={addMeeting}
      />
    );
    expect(
      screen.getByPlaceholderText(/meeting with team/i)
    ).toBeInTheDocument();
  });

  it("renders description textarea", () => {
    render(
      <BookEventDialog
        dialogOpen={true}
        setDialogOpen={setDialogOpen}
        addMeeting={addMeeting}
      />
    );
    expect(
      screen.getByPlaceholderText(/discuss the project plan/i)
    ).toBeInTheDocument();
  });

  it("renders date and time picker triggers", () => {
    render(
      <BookEventDialog
        dialogOpen={true}
        setDialogOpen={setDialogOpen}
        addMeeting={addMeeting}
      />
    );
    expect(
      screen.getByRole("button", { name: /select date/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /select time/i })
    ).toBeInTheDocument();
  });

  it("renders 'Create a Meeting' switch", () => {
    render(
      <BookEventDialog
        dialogOpen={true}
        setDialogOpen={setDialogOpen}
        addMeeting={addMeeting}
      />
    );
    expect(screen.getByText(/create a meeting/i)).toBeInTheDocument();
  });

  it("disables Book until title, date, time and duration are filled", () => {
    render(
      <BookEventDialog
        dialogOpen={true}
        setDialogOpen={setDialogOpen}
        addMeeting={addMeeting}
      />
    );

    const bookBtn = screen.getByRole("button", { name: /^book$/i });
    expect(bookBtn).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/meeting with team/i), {
      target: { value: "Team Sync" },
    });

    // Title alone is not enough — date, time, duration are still missing
    expect(bookBtn).toBeDisabled();
    expect(addMeeting).not.toHaveBeenCalled();
  });

  it("calls addMeeting with event payload when all fields are filled and Book is clicked", () => {
    render(
      <BookEventDialog
        dialogOpen={true}
        setDialogOpen={setDialogOpen}
        addMeeting={addMeeting}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/meeting with team/i), {
      target: { value: "Team Sync" },
    });

    // Open the date popover and click today's cell
    fireEvent.click(screen.getByRole("button", { name: /select date/i }));
    const today = new Date().getDate().toString();
    const dayCells = screen.getAllByRole("gridcell");
    const todayCell = dayCells
      .map((c) => c.querySelector("button"))
      .find(
        (btn) =>
          btn && btn.textContent === today && !btn.hasAttribute("disabled")
      );
    if (todayCell) fireEvent.click(todayCell);

    // Open the time popover and pick a slot
    fireEvent.click(screen.getByRole("button", { name: /select time/i }));
    fireEvent.click(screen.getByRole("button", { name: "10:00" }));

    // Pick duration via the mocked native select
    fireEvent.change(screen.getByLabelText("duration-mock"), {
      target: { value: "30" },
    });

    const bookBtn = screen.getByRole("button", { name: /^book$/i });
    expect(bookBtn).not.toBeDisabled();
    fireEvent.click(bookBtn);

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

  it("calls setDialogOpen(false) on Cancel", () => {
    render(
      <BookEventDialog
        dialogOpen={true}
        setDialogOpen={setDialogOpen}
        addMeeting={addMeeting}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(setDialogOpen).toHaveBeenCalledWith(false);
  });
});
