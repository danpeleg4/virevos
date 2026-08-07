import React from "react";
import { http, HttpResponse } from "msw";
import { worker } from "../../../../msw/worker";
import { renderWithQueryClient } from "../../../../_helpers/render";
import {
  useDeleteScheduledMessage,
  useEmailConnectionStatus,
  usePortalChatThread,
  useScheduleMessage,
  useScheduledMessages,
  useSendPortalChatMessage,
  useSendScheduledMessageNow,
} from "@/app/components/communications/_lib/hooks";
import type { ScheduledEmail } from "@/types/communications";

const scheduledEmailFixture: ScheduledEmail = {
  id: 1,
  toEmail: "client@example.com",
  toName: "A Client",
  subject: "Reminder",
  bodyHtml: "<p>Reminder</p>",
  bodyText: "Reminder",
  scheduledAt: "2026-09-01T10:00:00.000Z",
  timezone: "UTC",
  recurring: "none",
  status: "pending",
  sentAt: null,
  errorMessage: null,
  attachments: [],
  clientId: null,
  createdAt: "2026-08-01T10:00:00.000Z",
};

describe("usePortalChatThread / useSendPortalChatMessage", () => {
  it("loads the thread and optimistically appends an agency reply", async () => {
    worker.use(
      http.get("/api/portal-chat/:clientId", () =>
        HttpResponse.json({
          portalId: 9,
          messages: [
            {
              id: 1,
              senderType: "client",
              body: "Hi there",
              readAt: null,
              createdAt: "2026-08-01T09:00:00.000Z",
            },
          ],
        })
      ),
      http.post("/api/portal-chat/:clientId", () =>
        HttpResponse.json({ success: true })
      )
    );
    function Harness() {
      const { data } = usePortalChatThread(1);
      const send = useSendPortalChatMessage(1);
      return (
        <div>
          <ul>
            {data?.messages.map((m) => (
              <li key={m.id}>{m.body}</li>
            ))}
          </ul>
          <button onClick={() => send.mutate("Reply from agency")}>Send</button>
        </div>
      );
    }
    const screen = await renderWithQueryClient(<Harness />);
    await expect.element(screen.getByText("Hi there")).toBeInTheDocument();

    await screen.getByRole("button", { name: "Send" }).click();

    await expect
      .element(screen.getByText("Reply from agency"))
      .toBeInTheDocument();
  });

  it("rolls back the optimistic message when sending fails", async () => {
    worker.use(
      http.get("/api/portal-chat/:clientId", () =>
        HttpResponse.json({ portalId: 9, messages: [] })
      ),
      http.post("/api/portal-chat/:clientId", () =>
        HttpResponse.json({ error: "boom" }, { status: 500 })
      )
    );
    function Harness() {
      const { data } = usePortalChatThread(1);
      const send = useSendPortalChatMessage(1);
      return (
        <div>
          <ul>
            {data?.messages.map((m) => (
              <li key={m.id}>{m.body}</li>
            ))}
          </ul>
          <button onClick={() => send.mutate("Will fail")}>Send</button>
        </div>
      );
    }
    const screen = await renderWithQueryClient(<Harness />);
    await screen.getByRole("button", { name: "Send" }).click();

    await expect.element(screen.getByText("Will fail")).not.toBeInTheDocument();
  });
});

describe("useEmailConnectionStatus", () => {
  it("reports the connection status", async () => {
    worker.use(
      http.get("/api/integrations/outlook", () =>
        HttpResponse.json({ connected: true })
      )
    );
    function Harness() {
      const { data } = useEmailConnectionStatus();
      return <div>Connected: {String(data ?? false)}</div>;
    }
    const screen = await renderWithQueryClient(<Harness />);
    await expect
      .element(screen.getByText("Connected: true"))
      .toBeInTheDocument();
  });
});

function ScheduledMessagesHarness() {
  const { data } = useScheduledMessages();
  const deleteMessage = useDeleteScheduledMessage();
  const sendNow = useSendScheduledMessageNow();
  return (
    <div>
      <ul>
        {data?.map((m) => (
          <li key={m.id}>
            {m.subject} - {m.status}
          </li>
        ))}
      </ul>
      <button onClick={() => deleteMessage.mutate(1)}>Delete</button>
      <button onClick={() => sendNow.mutate(scheduledEmailFixture)}>
        Send now
      </button>
    </div>
  );
}

describe("useScheduledMessages / useDeleteScheduledMessage", () => {
  it("lists scheduled messages and removes one on delete", async () => {
    let deleted = false;
    worker.use(
      http.get("/api/scheduled-emails", () =>
        HttpResponse.json({
          scheduledEmails: deleted ? [] : [scheduledEmailFixture],
        })
      ),
      http.delete("/api/scheduled-emails", () => {
        deleted = true;
        return HttpResponse.json({ success: true });
      })
    );
    const screen = await renderWithQueryClient(<ScheduledMessagesHarness />);
    await expect
      .element(screen.getByText("Reminder - pending"))
      .toBeInTheDocument();

    await screen.getByRole("button", { name: "Delete" }).click();

    await expect
      .element(screen.getByText("Reminder - pending"))
      .not.toBeInTheDocument();
  });
});

describe("useSendScheduledMessageNow", () => {
  it("optimistically flips status to sent and persists after refetch", async () => {
    let status = "pending";
    worker.use(
      http.get("/api/scheduled-emails", () =>
        HttpResponse.json({
          scheduledEmails: [{ ...scheduledEmailFixture, status }],
        })
      ),
      http.post("/api/scheduled-emails", async ({ request }) => {
        const body = (await request.json()) as { type?: string };
        if (body.type === "send-now") status = "sent";
        return HttpResponse.json({ success: true });
      })
    );
    const screen = await renderWithQueryClient(<ScheduledMessagesHarness />);
    await expect
      .element(screen.getByText("Reminder - pending"))
      .toBeInTheDocument();

    await screen.getByRole("button", { name: "Send now" }).click();

    await expect
      .element(screen.getByText("Reminder - sent"))
      .toBeInTheDocument();
  });

  it("rolls back the status when sending fails", async () => {
    worker.use(
      http.get("/api/scheduled-emails", () =>
        HttpResponse.json({ scheduledEmails: [scheduledEmailFixture] })
      ),
      http.post("/api/scheduled-emails", () =>
        HttpResponse.json({ error: "boom" }, { status: 500 })
      )
    );
    const screen = await renderWithQueryClient(<ScheduledMessagesHarness />);
    await screen.getByRole("button", { name: "Send now" }).click();

    await expect
      .element(screen.getByText("Reminder - pending"))
      .toBeInTheDocument();
  });
});

describe("useScheduleMessage", () => {
  it("posts the schedule payload", async () => {
    let postBody: unknown;
    worker.use(
      http.post("/api/scheduled-emails", async ({ request }) => {
        postBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );
    function Harness() {
      const schedule = useScheduleMessage();
      return (
        <button
          onClick={() =>
            schedule.mutate({
              toEmail: "new@client.com",
              subject: "Hello",
              bodyHtml: "<p>Hello</p>",
              scheduledAt: "2026-09-02T10:00:00.000Z",
            })
          }
        >
          Schedule
        </button>
      );
    }
    const screen = await renderWithQueryClient(<Harness />);
    await screen.getByRole("button", { name: "Schedule" }).click();

    await vi.waitFor(() => {
      expect(postBody).toMatchObject({
        type: "schedule",
        data: { toEmail: "new@client.com", subject: "Hello" },
      });
    });
  });
});
