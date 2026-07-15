import React from "react";
import { page } from "vitest/browser";
import { http, HttpResponse } from "msw";
import { worker } from "../../../msw/worker";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderWithQueryClient } from "../../../_helpers/render";

import { ComposeMessageDialog } from "@/app/components/communications/ComposeMessageDialog";

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderDialog = (open = true, onOpenChange = vi.fn(), onSent = vi.fn()) =>
  renderWithQueryClient(
    <ComposeMessageDialog
      open={open}
      onOpenChange={onOpenChange}
      onSent={onSent}
    />
  );

const fileInput = () =>
  page.elementLocator(
    document.querySelector<HTMLInputElement>('input[type="file"]')!
  );

describe("ComposeMessageDialog", () => {
  const onOpenChange = vi.fn();
  const onSent = vi.fn();

  beforeEach(() => {
    onOpenChange.mockClear();
    onSent.mockClear();
  });

  it("renders dialog when open=true", async () => {
    const screen = await renderDialog(true, onOpenChange, onSent);
    await expect.element(screen.getByText("New Message")).toBeInTheDocument();
  });

  it("does not render when open=false", async () => {
    const screen = await renderDialog(false, onOpenChange, onSent);
    await expect
      .element(screen.getByText("New Message"))
      .not.toBeInTheDocument();
  });

  it("shows Email tab by default", async () => {
    const screen = await renderDialog(true, onOpenChange, onSent);
    await expect
      .element(screen.getByPlaceholder("recipient@example.com"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByPlaceholder("Add a subject"))
      .toBeInTheDocument();
  });

  it("shows Chat tab trigger", async () => {
    const screen = await renderDialog(true, onOpenChange, onSent);
    await expect
      .element(screen.getByRole("button", { name: /chat/i }))
      .toBeInTheDocument();
  });

  it("Send button is disabled when email To is empty", async () => {
    const screen = await renderDialog(true, onOpenChange, onSent);
    await screen.getByPlaceholder("Write your message...").fill("Hello");
    await expect
      .element(screen.getByRole("button", { name: /send/i }))
      .toBeDisabled();
  });

  it("Send button is disabled when email body is empty", async () => {
    const screen = await renderDialog(true, onOpenChange, onSent);
    await screen
      .getByPlaceholder("recipient@example.com")
      .fill("test@example.com");
    await expect
      .element(screen.getByRole("button", { name: /send/i }))
      .toBeDisabled();
  });

  it("posts to /api/outlook/messages on email send", async () => {
    let sentBody: unknown;
    worker.use(
      http.post("/api/outlook/messages", async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );

    const screen = await renderDialog(true, onOpenChange, onSent);
    await screen
      .getByPlaceholder("recipient@example.com")
      .fill("test@example.com");
    await screen.getByPlaceholder("Write your message...").fill("Hello there");
    await screen.getByRole("button", { name: /send/i }).click();
    await vi.waitFor(() => {
      expect(sentBody).toMatchObject({ to: "test@example.com" });
    });
  });

  it("calls onSent after successful email", async () => {
    const screen = await renderDialog(true, onOpenChange, onSent);
    await screen
      .getByPlaceholder("recipient@example.com")
      .fill("test@example.com");
    await screen.getByPlaceholder("Write your message...").fill("Hello");
    await screen.getByRole("button", { name: /send/i }).click();
    await vi.waitFor(() => expect(onSent).toHaveBeenCalledTimes(1));
  });

  it("calls onOpenChange(false) after successful send", async () => {
    const screen = await renderDialog(true, onOpenChange, onSent);
    await screen
      .getByPlaceholder("recipient@example.com")
      .fill("test@example.com");
    await screen.getByPlaceholder("Write your message...").fill("Hello");
    await screen.getByRole("button", { name: /send/i }).click();
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  describe("attachments", () => {
    it("renders the Attach files button on the email tab", async () => {
      const screen = await renderDialog(true, onOpenChange, onSent);
      await expect
        .element(screen.getByRole("button", { name: /attach files/i }))
        .toBeInTheDocument();
    });

    it("does not show the attachment list when no files selected", async () => {
      const screen = await renderDialog(true, onOpenChange, onSent);
      await expect.element(screen.getByRole("list")).not.toBeInTheDocument();
    });

    it("shows file name in the list after selecting a file", async () => {
      const screen = await renderDialog(true, onOpenChange, onSent);
      const file = new File(["hello"], "report.pdf", {
        type: "application/pdf",
      });

      await fileInput().upload(file);

      await expect.element(screen.getByText("report.pdf")).toBeInTheDocument();
    });

    it("shows formatted file size next to the attachment", async () => {
      const screen = await renderDialog(true, onOpenChange, onSent);
      const file = new File([new Uint8Array(2048)], "doc.txt", {
        type: "text/plain",
      });

      await fileInput().upload(file);

      await expect.element(screen.getByText("2.0 KB")).toBeInTheDocument();
    });

    it("removes an attachment when the remove button is clicked", async () => {
      const screen = await renderDialog(true, onOpenChange, onSent);
      const file = new File(["hello"], "notes.txt", { type: "text/plain" });

      await fileInput().upload(file);

      await expect.element(screen.getByText("notes.txt")).toBeInTheDocument();

      // find the remove button (X icon button) inside the attachment list
      await screen.getByRole("list").getByRole("button").first().click();

      await expect
        .element(screen.getByText("notes.txt"))
        .not.toBeInTheDocument();
    });

    it("rejects attachments when the total exceeds 25 MB", async () => {
      const screen = await renderDialog(true, onOpenChange, onSent);
      const bigFile = new File([new Uint8Array(26 * 1024 * 1024)], "huge.zip", {
        type: "application/zip",
      });

      await fileInput().upload(bigFile);

      // the oversized file is dropped: no attachment list entry appears
      await expect
        .element(screen.getByText("huge.zip"))
        .not.toBeInTheDocument();
      await expect.element(screen.getByRole("list")).not.toBeInTheDocument();
    });

    it("includes attachments in the /api/outlook/messages payload", async () => {
      let sentBody: { attachments?: unknown[] } | undefined;
      worker.use(
        http.post("/api/outlook/messages", async ({ request }) => {
          sentBody = (await request.json()) as { attachments?: unknown[] };
          return HttpResponse.json({ success: true });
        })
      );

      const screen = await renderDialog(true, onOpenChange, onSent);

      const file = new File(["hello"], "invoice.pdf", {
        type: "application/pdf",
      });

      await fileInput().upload(file);
      await expect.element(screen.getByText("invoice.pdf")).toBeInTheDocument();

      await screen
        .getByPlaceholder("recipient@example.com")
        .fill("client@example.com");
      await screen
        .getByPlaceholder("Write your message...")
        .fill("Please find attached.");
      await screen.getByRole("button", { name: /send/i }).click();

      await vi.waitFor(() => {
        expect(sentBody?.attachments).toEqual([
          expect.objectContaining({
            name: "invoice.pdf",
            mimeType: "application/pdf",
            data: expect.any(String),
          }),
        ]);
      });
    });

    it("sends without attachments key when no files selected", async () => {
      let sentBody: { attachments?: unknown[] } | undefined;
      worker.use(
        http.post("/api/outlook/messages", async ({ request }) => {
          sentBody = (await request.json()) as { attachments?: unknown[] };
          return HttpResponse.json({ success: true });
        })
      );

      const screen = await renderDialog(true, onOpenChange, onSent);
      await screen
        .getByPlaceholder("recipient@example.com")
        .fill("client@example.com");
      await screen.getByPlaceholder("Write your message...").fill("Hello");
      await screen.getByRole("button", { name: /send/i }).click();

      await vi.waitFor(() => {
        expect(sentBody?.attachments).toBeUndefined();
      });
    });

    it("resets attachments when dialog is closed and reopened", async () => {
      const screen = await renderDialog(true, onOpenChange, onSent);
      const file = new File(["x"], "temp.txt", { type: "text/plain" });

      await fileInput().upload(file);
      await expect.element(screen.getByText("temp.txt")).toBeInTheDocument();

      // close the dialog
      await screen.getByRole("button", { name: /cancel/i }).click();
      // onOpenChange is called — simulate it by re-rendering with open=false then open=true
      const queryClient = makeQueryClient();
      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
      await screen.rerender(
        <Wrapper>
          <ComposeMessageDialog
            open={false}
            onOpenChange={onOpenChange}
            onSent={onSent}
          />
        </Wrapper>
      );
      await screen.rerender(
        <Wrapper>
          <ComposeMessageDialog
            open={true}
            onOpenChange={onOpenChange}
            onSent={onSent}
          />
        </Wrapper>
      );
      await expect
        .element(screen.getByText("temp.txt"))
        .not.toBeInTheDocument();
    });
  });
});
