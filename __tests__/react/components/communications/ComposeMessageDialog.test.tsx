import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockAxiosPost = jest.fn();
const mockAxiosGet = jest.fn().mockResolvedValue({ data: [] });

jest.mock("axios", () => ({
  post: (...args: unknown[]) => mockAxiosPost(...args),
  get: (...args: unknown[]) => mockAxiosGet(...args),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

import { ComposeMessageDialog } from "@/app/components/communications/ComposeMessageDialog";

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderDialog = (
  open = true,
  onOpenChange = jest.fn(),
  onSent = jest.fn()
) => {
  const queryClient = makeQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(
    <ComposeMessageDialog
      open={open}
      onOpenChange={onOpenChange}
      onSent={onSent}
    />,
    { wrapper: Wrapper }
  );
};

describe("ComposeMessageDialog", () => {
  const onOpenChange = jest.fn();
  const onSent = jest.fn();

  beforeEach(() => {
    onOpenChange.mockClear();
    onSent.mockClear();
    mockAxiosPost.mockClear();
    mockAxiosGet.mockClear();
  });

  it("renders dialog when open=true", () => {
    renderDialog(true, onOpenChange, onSent);
    expect(screen.getByText("New Message")).toBeInTheDocument();
  });

  it("does not render when open=false", () => {
    renderDialog(false, onOpenChange, onSent);
    expect(screen.queryByText("New Message")).not.toBeInTheDocument();
  });

  it("shows Email tab by default", () => {
    renderDialog(true, onOpenChange, onSent);
    expect(
      screen.getByPlaceholderText("recipient@example.com")
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Add a subject")).toBeInTheDocument();
  });

  it("shows Chat tab trigger", () => {
    renderDialog(true, onOpenChange, onSent);
    expect(
      screen.getByRole("button", { name: /chat/i })
    ).toBeInTheDocument();
  });

  it("Send button is disabled when email To is empty", () => {
    renderDialog(true, onOpenChange, onSent);
    fireEvent.change(screen.getByPlaceholderText("Write your message..."), {
      target: { value: "Hello" },
    });
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
  });

  it("Send button is disabled when email body is empty", () => {
    renderDialog(true, onOpenChange, onSent);
    fireEvent.change(screen.getByPlaceholderText("recipient@example.com"), {
      target: { value: "test@example.com" },
    });
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
  });

  it("calls axios.post to /api/outlook/send on email send", async () => {
    mockAxiosPost.mockResolvedValueOnce({ data: {} });
    renderDialog(true, onOpenChange, onSent);
    fireEvent.change(screen.getByPlaceholderText("recipient@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Write your message..."), {
      target: { value: "Hello there" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    await waitFor(() => {
      expect(mockAxiosPost).toHaveBeenCalledWith(
        "/api/outlook/send",
        expect.objectContaining({ to: "test@example.com" })
      );
    });
  });

  it("calls onSent after successful email", async () => {
    mockAxiosPost.mockResolvedValueOnce({ data: {} });
    renderDialog(true, onOpenChange, onSent);
    fireEvent.change(screen.getByPlaceholderText("recipient@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Write your message..."), {
      target: { value: "Hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    await waitFor(() => expect(onSent).toHaveBeenCalledTimes(1));
  });

  it("calls onOpenChange(false) after successful send", async () => {
    mockAxiosPost.mockResolvedValueOnce({ data: {} });
    renderDialog(true, onOpenChange, onSent);
    fireEvent.change(screen.getByPlaceholderText("recipient@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Write your message..."), {
      target: { value: "Hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
