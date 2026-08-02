import React from "react";
import { http, HttpResponse } from "msw";
import { worker } from "../../../msw/worker";
import { renderWithQueryClient } from "../../../_helpers/render";
import { UnifiedInbox } from "@/app/components/communications/UnifiedInbox";
import { toast } from "@/app/components/ui/toast-store";
import type { PortalChatConversation } from "@/types/portal";

function emptyEmailsHandler() {
  worker.use(
    http.get("/api/integrations/outlook", () =>
      HttpResponse.json({ connected: true })
    ),
    http.get("/api/outlook/sync", () =>
      HttpResponse.json({ messages: [], page: 1, limit: 50, hasMore: false })
    ),
    http.get("/api/portal-chat", () => HttpResponse.json({ conversations: [] }))
  );
}

const readChatConvo: PortalChatConversation = {
  portalId: 1,
  clientId: 9,
  clientName: "Jane Client",
  clientEmail: "jane@example.com",
  lastMessage: "See you then",
  lastMessageAt: "2026-07-01T09:00:00.000Z",
  unreadCount: 0,
  starred: false,
  archived: false,
};

function chatConvoHandlers() {
  worker.use(
    http.get("/api/integrations/outlook", () =>
      HttpResponse.json({ connected: true })
    ),
    http.get("/api/outlook/sync", () =>
      HttpResponse.json({ messages: [], page: 1, limit: 50, hasMore: false })
    ),
    http.get("/api/portal-chat", () =>
      HttpResponse.json({ conversations: [readChatConvo] })
    ),
    http.get("/api/portal-chat/:clientId", () =>
      HttpResponse.json({ messages: [] })
    )
  );
}

const renderInbox = () =>
  renderWithQueryClient(<UnifiedInbox navContainer={null} />);

describe("UnifiedInbox — toast feedback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows only a success toast — not a false failure toast — when Sync succeeds", async () => {
    emptyEmailsHandler();
    worker.use(
      http.post("/api/outlook/sync", () => HttpResponse.json({ success: true }))
    );
    const successSpy = vi.spyOn(toast, "success");
    const errorSpy = vi.spyOn(toast, "error");

    const screen = await renderInbox();
    await screen.getByRole("button", { name: "Sync Messages" }).click();

    await vi.waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Synced" })
      );
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("shows only an error toast — not a false success toast — when Sync fails", async () => {
    emptyEmailsHandler();
    worker.use(
      http.post("/api/outlook/sync", () =>
        HttpResponse.json({ error: "outlook down" }, { status: 500 })
      )
    );
    const successSpy = vi.spyOn(toast, "success");
    const errorSpy = vi.spyOn(toast, "error");

    const screen = await renderInbox();
    await screen.getByRole("button", { name: "Sync Messages" }).click();

    await vi.waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Failed" })
      );
    });
    expect(successSpy).not.toHaveBeenCalled();
  });

  it("shows a success toast when deleting a portal chat succeeds", async () => {
    chatConvoHandlers();
    worker.use(
      http.delete("/api/portal-chat/:clientId", () => HttpResponse.json({}))
    );
    const successSpy = vi.spyOn(toast, "success");
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const screen = await renderInbox();
    await screen.getByText("Jane Client").first().click();
    await screen.getByRole("button", { name: /more/i }).click();
    await screen.getByText("Delete", { exact: true }).click();

    await vi.waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Deleted" })
      );
    });
  });

  it("shows only an error toast — not a false success toast — when deleting a portal chat fails", async () => {
    chatConvoHandlers();
    worker.use(
      http.delete("/api/portal-chat/:clientId", () =>
        HttpResponse.json({ error: "db down" }, { status: 500 })
      )
    );
    const successSpy = vi.spyOn(toast, "success");
    const errorSpy = vi.spyOn(toast, "error");
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const screen = await renderInbox();
    await screen.getByText("Jane Client").first().click();
    await screen.getByRole("button", { name: /more/i }).click();
    await screen.getByText("Delete", { exact: true }).click();

    await vi.waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Failed" })
      );
    });
    expect(successSpy).not.toHaveBeenCalled();
  });
});
