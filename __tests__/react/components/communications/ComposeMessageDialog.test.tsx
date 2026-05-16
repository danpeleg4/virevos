import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";

// FileReader mock — synchronously resolves readAsDataURL
class MockFileReader {
  result: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  readAsDataURL(file: File) {
    this.result = `data:${file.type || "application/octet-stream"};base64,aGVsbG8=`;
    // call synchronously so tests don't need extra flushes
    if (this.onload) this.onload();
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).FileReader = MockFileReader;

const mockAxiosPost = vi.fn();
const mockAxiosGet = vi.fn().mockResolvedValue({ data: [] });

vi.mock("axios", () => {
  const axios = {
    post: (...args: unknown[]) => mockAxiosPost(...args),
    get: (...args: unknown[]) => mockAxiosGet(...args),
  };
  return { default: axios, ...axios };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockSendOutlookEmail = vi.fn();
const mockSendAgencyChatMessage = vi.fn();

vi.mock("@/lib/outlook_actions", () => ({
  sendOutlookEmail: (...args: unknown[]) => mockSendOutlookEmail(...args),
}));

vi.mock("@/lib/portal_chat", () => ({
  sendAgencyChatMessage: (...args: unknown[]) =>
    mockSendAgencyChatMessage(...args),
}));

import { ComposeMessageDialog } from "@/app/components/communications/ComposeMessageDialog";

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderDialog = (
  open = true,
  onOpenChange = vi.fn(),
  onSent = vi.fn()
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
  const onOpenChange = vi.fn();
  const onSent = vi.fn();

  beforeEach(() => {
    onOpenChange.mockClear();
    onSent.mockClear();
    mockAxiosPost.mockClear();
    mockAxiosGet.mockClear();
    mockSendOutlookEmail.mockReset();
    mockSendAgencyChatMessage.mockReset();
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
    expect(screen.getByRole("button", { name: /chat/i })).toBeInTheDocument();
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

  it("calls sendOutlookEmail server action on email send", async () => {
    mockSendOutlookEmail.mockResolvedValueOnce({ success: true });
    renderDialog(true, onOpenChange, onSent);
    fireEvent.change(screen.getByPlaceholderText("recipient@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Write your message..."), {
      target: { value: "Hello there" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    await waitFor(() => {
      expect(mockSendOutlookEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: "test@example.com" })
      );
    });
  });

  it("calls onSent after successful email", async () => {
    mockSendOutlookEmail.mockResolvedValueOnce({ success: true });
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
    mockSendOutlookEmail.mockResolvedValueOnce({ success: true });
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

  describe("attachments", () => {
    beforeEach(() => {
      (toast.error as Mock).mockClear();
    });

    it("renders the Attach files button on the email tab", () => {
      renderDialog(true, onOpenChange, onSent);
      expect(
        screen.getByRole("button", { name: /attach files/i })
      ).toBeInTheDocument();
    });

    it("does not show the attachment list when no files selected", () => {
      renderDialog(true, onOpenChange, onSent);
      expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });

    it("shows file name in the list after selecting a file", async () => {
      renderDialog(true, onOpenChange, onSent);
      const file = new File(["hello"], "report.pdf", {
        type: "application/pdf",
      });
      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      expect(screen.getByText("report.pdf")).toBeInTheDocument();
    });

    it("shows formatted file size next to the attachment", async () => {
      renderDialog(true, onOpenChange, onSent);
      const file = new File(["hello"], "doc.txt", { type: "text/plain" });
      Object.defineProperty(file, "size", { value: 2048 });
      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      expect(screen.getByText("2.0 KB")).toBeInTheDocument();
    });

    it("removes an attachment when the remove button is clicked", async () => {
      renderDialog(true, onOpenChange, onSent);
      const file = new File(["hello"], "notes.txt", { type: "text/plain" });
      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      expect(screen.getByText("notes.txt")).toBeInTheDocument();

      // find the remove button (X icon button) inside the attachment list
      const removeBtn = screen.getByRole("list").querySelector("button");
      expect(removeBtn).not.toBeNull();
      fireEvent.click(removeBtn!);

      expect(screen.queryByText("notes.txt")).not.toBeInTheDocument();
    });

    it("shows error toast when total attachments exceed 25 MB", async () => {
      renderDialog(true, onOpenChange, onSent);
      const bigFile = new File(["x"], "huge.zip", {
        type: "application/zip",
      });
      Object.defineProperty(bigFile, "size", {
        value: 26 * 1024 * 1024,
      });
      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      await act(async () => {
        fireEvent.change(input, { target: { files: [bigFile] } });
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Total attachments exceed the 25 MB limit"
      );
      expect(screen.queryByText("huge.zip")).not.toBeInTheDocument();
    });

    it("includes attachments in the sendOutlookEmail payload", async () => {
      mockSendOutlookEmail.mockResolvedValueOnce({ success: true });
      renderDialog(true, onOpenChange, onSent);

      const file = new File(["hello"], "invoice.pdf", {
        type: "application/pdf",
      });
      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      fireEvent.change(screen.getByPlaceholderText("recipient@example.com"), {
        target: { value: "client@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Write your message..."), {
        target: { value: "Please find attached." },
      });
      fireEvent.click(screen.getByRole("button", { name: /send/i }));

      await waitFor(() => {
        expect(mockSendOutlookEmail).toHaveBeenCalledWith(
          expect.objectContaining({
            attachments: expect.arrayContaining([
              expect.objectContaining({
                name: "invoice.pdf",
                mimeType: "application/pdf",
                data: expect.any(String),
              }),
            ]),
          })
        );
      });
    });

    it("sends without attachments key when no files selected", async () => {
      mockSendOutlookEmail.mockResolvedValueOnce({ success: true });
      renderDialog(true, onOpenChange, onSent);
      fireEvent.change(screen.getByPlaceholderText("recipient@example.com"), {
        target: { value: "client@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Write your message..."), {
        target: { value: "Hello" },
      });
      fireEvent.click(screen.getByRole("button", { name: /send/i }));

      await waitFor(() => {
        const payload = mockSendOutlookEmail.mock.calls[0][0] as Record<
          string,
          unknown
        >;
        expect(payload.attachments).toBeUndefined();
      });
    });

    it("resets attachments when dialog is closed and reopened", async () => {
      const { rerender } = renderDialog(true, onOpenChange, onSent);
      const file = new File(["x"], "temp.txt", { type: "text/plain" });
      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });
      expect(screen.getByText("temp.txt")).toBeInTheDocument();

      // close the dialog
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      // onOpenChange is called — simulate it by re-rendering with open=false then open=true
      const queryClient = makeQueryClient();
      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
      rerender(
        <Wrapper>
          <ComposeMessageDialog
            open={false}
            onOpenChange={onOpenChange}
            onSent={onSent}
          />
        </Wrapper>
      );
      rerender(
        <Wrapper>
          <ComposeMessageDialog
            open={true}
            onOpenChange={onOpenChange}
            onSent={onSent}
          />
        </Wrapper>
      );
      expect(screen.queryByText("temp.txt")).not.toBeInTheDocument();
    });
  });
});
