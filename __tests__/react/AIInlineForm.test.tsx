import React from "react";
import { render } from "vitest-browser-react";

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
  it("renders the title and a control for each field", async () => {
    const screen = await render(<InlineForm form={form} onSubmit={vi.fn()} />);

    await expect
      .element(screen.getByText(/set up your new case/i))
      .toBeInTheDocument();
    await expect
      .element(screen.getByLabelText(/case name/i))
      .toBeInTheDocument();
    await expect
      .element(screen.getByLabelText(/due date/i))
      .toBeInTheDocument();
    await expect.element(screen.getByLabelText(/notes/i)).toBeInTheDocument();
  });

  it("blocks submission and shows an error when a required field is empty", async () => {
    const onSubmit = vi.fn();
    const screen = await render(<InlineForm form={form} onSubmit={onSubmit} />);

    await screen.getByRole("button", { name: /submit/i }).click();

    expect(onSubmit).not.toHaveBeenCalled();
    await expect
      .element(screen.getByText(/please fill in: case name/i))
      .toBeInTheDocument();
  });

  it("submits the entered values when required fields are filled", async () => {
    const onSubmit = vi.fn();
    const screen = await render(<InlineForm form={form} onSubmit={onSubmit} />);

    await screen.getByLabelText(/case name/i).fill("Smith H-1B");
    await screen.getByLabelText(/notes/i).fill("urgent");
    await screen.getByRole("button", { name: /submit/i }).click();

    expect(onSubmit).toHaveBeenCalledWith({
      caseName: "Smith H-1B",
      dueDate: "",
      notes: "urgent",
    });
  });

  it("locks the form and hides the submit button once submitted", async () => {
    const screen = await render(
      <InlineForm form={form} submitted onSubmit={vi.fn()} />
    );

    await expect
      .element(screen.getByRole("button", { name: /submit/i }))
      .not.toBeInTheDocument();
    await expect.element(screen.getByText(/submitted/i)).toBeInTheDocument();
    await expect.element(screen.getByLabelText(/case name/i)).toBeDisabled();
  });
});
