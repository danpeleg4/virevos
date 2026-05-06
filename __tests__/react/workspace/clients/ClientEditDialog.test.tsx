import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const mockMutate = jest.fn();

jest.mock("@tanstack/react-query", () => ({
  useMutation: () => ({ mutate: mockMutate, isPending: false }),
  useQueryClient: () => ({
    cancelQueries: jest.fn(),
    getQueryData: jest.fn(),
    setQueryData: jest.fn(),
    invalidateQueries: jest.fn(),
  }),
}));

jest.mock("@/lib/clients", () => ({
  updateExistingClient: jest.fn(),
}));

const mockClient = {
  id: 1,
  name: "Acme Corp",
  email: "contact@acme.com",
  phone: "555-1234",
  notes: "Long-time client",
  status: "active",
  activeCases: 1,
  completedCases: 0,
  totalCases: 1,
  avatar: "A",
};

import { ClientEditDialog } from "@/app/workspace/clients/ClientEditDialog";

describe("ClientEditDialog", () => {
  const onOpenChange = jest.fn();

  beforeEach(() => {
    mockMutate.mockClear();
    onOpenChange.mockClear();
  });

  it("renders dialog when open=true", () => {
    render(
      <ClientEditDialog
        aClient={mockClient}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    expect(screen.getByText("Edit Client")).toBeInTheDocument();
  });

  it("does not render content when open=false", () => {
    render(
      <ClientEditDialog
        aClient={mockClient}
        open={false}
        onOpenChange={onOpenChange}
      />
    );
    expect(screen.queryByText("Edit Client")).not.toBeInTheDocument();
  });

  it("pre-fills name, email, phone, and notes", () => {
    render(
      <ClientEditDialog
        aClient={mockClient}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    expect(screen.getByDisplayValue("Acme Corp")).toBeInTheDocument();
    expect(screen.getByDisplayValue("contact@acme.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("555-1234")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Long-time client")).toBeInTheDocument();
  });

  it("renders Save Changes button", () => {
    render(
      <ClientEditDialog
        aClient={mockClient}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    expect(
      screen.getByRole("button", { name: /save changes/i })
    ).toBeInTheDocument();
  });

  it("calls mutation on save with current field values", () => {
    render(
      <ClientEditDialog
        aClient={mockClient}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith({
      id: 1,
      name: "Acme Corp",
      email: "contact@acme.com",
      phone: "555-1234",
      status: "active",
      notes: "Long-time client",
    });
  });

  it("normalizes a non-active stored status to inactive", () => {
    render(
      <ClientEditDialog
        aClient={{ ...mockClient, status: "inactive" }}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "inactive" })
    );
  });

  it("disables Save when name is empty", () => {
    render(
      <ClientEditDialog
        aClient={{ ...mockClient, name: "" }}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
  });

  it("calls onOpenChange(false) when Cancel is clicked", () => {
    render(
      <ClientEditDialog
        aClient={mockClient}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
