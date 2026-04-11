import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockAxiosPost = jest.fn();

jest.mock("axios", () => ({
  post: (...args: unknown[]) => mockAxiosPost(...args),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

import { ComposeMessageDialog } from "@/app/components/communications/ComposeMessageDialog";

describe("ComposeMessageDialog", () => {
  const onOpenChange = jest.fn();
  const onSent = jest.fn();

  const renderDialog = (open = true) =>
    render(
      <ComposeMessageDialog
        open={open}
        onOpenChange={onOpenChange}
        onSent={onSent}
      />
    );

  beforeEach(() => {
    onOpenChange.mockClear();
    onSent.mockClear();
    mockAxiosPost.mockClear();
  });

  it("renders dialog when open=true", () => {
    renderDialog();
    expect(screen.getByText("New Message")).toBeInTheDocument();
  });

  it("does not render when open=false", () => {
    renderDialog(false);
    expect(screen.queryByText("New Message")).not.toBeInTheDocument();
  });

  it("shows Email tab by default", () => {
    renderDialog();
    expect(screen.getByLabelText("To")).toBeInTheDocument();
    expect(screen.getByLabelText("Subject")).toBeInTheDocument();
  });

  it("shows Chat tab trigger", () => {
    renderDialog();
    const chatTab = screen.getByRole("tab", { name: /chat/i });
    expect(chatTab).toBeInTheDocument();
  });

  it("Send button is disabled when email To is empty", () => {
    renderDialog();
    // Only email body filled, To is empty
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Hello" },
    });
    const sendBtn = screen.getByRole("button", { name: /send/i });
    expect(sendBtn).toBeDisabled();
  });

  it("Send button is disabled when email body is empty", () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText("To"), {
      target: { value: "test@example.com" },
    });
    const sendBtn = screen.getByRole("button", { name: /send/i });
    expect(sendBtn).toBeDisabled();
  });

  it("calls axios.post to /api/gmail/send on email send", async () => {
    mockAxiosPost.mockResolvedValueOnce({ data: {} });
    renderDialog();
    fireEvent.change(screen.getByLabelText("To"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Hello there" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    await waitFor(() => {
      expect(mockAxiosPost).toHaveBeenCalledWith(
        "/api/gmail/send",
        expect.objectContaining({ to: "test@example.com" })
      );
    });
  });

  it("calls onSent after successful email", async () => {
    mockAxiosPost.mockResolvedValueOnce({ data: {} });
    renderDialog();
    fireEvent.change(screen.getByLabelText("To"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    await waitFor(() => expect(onSent).toHaveBeenCalledTimes(1));
  });

  it("calls onOpenChange(false) after successful send", async () => {
    mockAxiosPost.mockResolvedValueOnce({ data: {} });
    renderDialog();
    fireEvent.change(screen.getByLabelText("To"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    await waitFor(() =>
      expect(onOpenChange).toHaveBeenCalledWith(false)
    );
  });
});
