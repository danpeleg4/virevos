import React from "react";
import { render } from "vitest-browser-react";

const mockMutate = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({ mutate: mockMutate, isPending: false }),
  useQueryClient: () => ({
    cancelQueries: vi.fn(),
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock("@/lib/workspace/clients", () => ({
  updateExistingClient: vi.fn(),
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

// no getByDisplayValue locator in browser mode; assert a field carries the value
const expectFieldWithValue = async (value: string) => {
  await vi.waitFor(() => {
    const match = Array.from(
      document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        "input, textarea"
      )
    ).some((field) => field.value === value);
    expect(match).toBe(true);
  });
};

describe("ClientEditDialog", () => {
  const onOpenChange = vi.fn();

  beforeEach(() => {
    mockMutate.mockClear();
    onOpenChange.mockClear();
  });

  it("renders dialog when open=true", async () => {
    const screen = await render(
      <ClientEditDialog
        aClient={mockClient}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    await expect
      .element(screen.getByText("Edit Client", { exact: true }))
      .toBeInTheDocument();
  });

  it("does not render content when open=false", async () => {
    const screen = await render(
      <ClientEditDialog
        aClient={mockClient}
        open={false}
        onOpenChange={onOpenChange}
      />
    );
    await expect
      .element(screen.getByText("Edit Client", { exact: true }))
      .not.toBeInTheDocument();
  });

  it("pre-fills name, email, phone, and notes", async () => {
    await render(
      <ClientEditDialog
        aClient={mockClient}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    await expectFieldWithValue("Acme Corp");
    await expectFieldWithValue("contact@acme.com");
    await expectFieldWithValue("555-1234");
    await expectFieldWithValue("Long-time client");
  });

  it("renders Save Changes button", async () => {
    const screen = await render(
      <ClientEditDialog
        aClient={mockClient}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    await expect
      .element(screen.getByRole("button", { name: /save changes/i }))
      .toBeInTheDocument();
  });

  it("calls mutation on save with current field values", async () => {
    const screen = await render(
      <ClientEditDialog
        aClient={mockClient}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    await screen.getByRole("button", { name: /save changes/i }).click();
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

  it("normalizes a non-active stored status to inactive", async () => {
    const screen = await render(
      <ClientEditDialog
        aClient={{ ...mockClient, status: "inactive" }}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    await screen.getByRole("button", { name: /save changes/i }).click();
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "inactive" })
    );
  });

  it("disables Save when name is empty", async () => {
    const screen = await render(
      <ClientEditDialog
        aClient={{ ...mockClient, name: "" }}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    await expect
      .element(screen.getByRole("button", { name: /save changes/i }))
      .toBeDisabled();
  });

  it("calls onOpenChange(false) when Cancel is clicked", async () => {
    const screen = await render(
      <ClientEditDialog
        aClient={mockClient}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    await screen.getByRole("button", { name: /cancel/i }).click();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
