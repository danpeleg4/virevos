import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { InlineForm } from "@/app/components/AIInlineForm";
import type { AIFormRequest } from "@/types/ai";

const form: AIFormRequest = {
  callId: "call_1",
  title: "Set up your new case",
  fields: [
    {
      name: "caseName",
      label: "Case name",
      type: "text",
      required: true,
      options: [],
      placeholder: "e.g. Smith H-1B",
    },
    {
      name: "dueDate",
      label: "Due date",
      type: "date",
      required: false,
      options: [],
      placeholder: null,
    },
    {
      name: "notes",
      label: "Notes",
      type: "textarea",
      required: false,
      options: [],
      placeholder: null,
    },
  ],
};

describe("InlineForm", () => {
  it("renders the title and a control for each field", () => {
    render(<InlineForm form={form} onSubmit={vi.fn()} />);

    expect(screen.getByText(/set up your new case/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/case name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
  });

  it("blocks submission and shows an error when a required field is empty", () => {
    const onSubmit = vi.fn();
    render(<InlineForm form={form} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/please fill in: case name/i)).toBeInTheDocument();
  });

  it("submits the entered values when required fields are filled", () => {
    const onSubmit = vi.fn();
    render(<InlineForm form={form} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/case name/i), {
      target: { value: "Smith H-1B" },
    });
    fireEvent.change(screen.getByLabelText(/notes/i), {
      target: { value: "urgent" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      caseName: "Smith H-1B",
      dueDate: "",
      notes: "urgent",
    });
  });

  it("locks the form and hides the submit button once submitted", () => {
    render(<InlineForm form={form} submitted onSubmit={vi.fn()} />);

    expect(
      screen.queryByRole("button", { name: /submit/i })
    ).not.toBeInTheDocument();
    expect(screen.getByText(/submitted/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/case name/i)).toBeDisabled();
  });
});
