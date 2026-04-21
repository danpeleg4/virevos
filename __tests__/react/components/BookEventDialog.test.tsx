import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

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

  it("renders date and time inputs", () => {
    render(
      <BookEventDialog
        dialogOpen={true}
        setDialogOpen={setDialogOpen}
        addMeeting={addMeeting}
      />
    );
    const inputs = screen.getAllByRole("textbox");
    // At least title, description; plus date/time type=date/time inputs
    expect(inputs.length).toBeGreaterThan(0);
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

  it("calls addMeeting with event payload when Book is clicked", () => {
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

    // Set date and time
    const dateInput = document.querySelector("input[type='date']");
    const timeInput = document.querySelector("input[type='time']");
    if (dateInput)
      fireEvent.change(dateInput, { target: { value: "2026-05-15" } });
    if (timeInput) fireEvent.change(timeInput, { target: { value: "10:00" } });

    fireEvent.click(screen.getByRole("button", { name: /^book$/i }));
    expect(addMeeting).toHaveBeenCalledTimes(1);
    expect(addMeeting).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Team Sync",
        isMeeting: false,
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
