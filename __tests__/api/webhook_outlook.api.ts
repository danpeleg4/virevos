import { POST } from "@/app/api/webhooks/outlook/route";
import { db } from "@db/db";

vi.mock("@db/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock("@/lib/outlook/outlook_sync", () => ({
  performIncrementalSync: vi.fn().mockResolvedValue(undefined),
}));

import { performIncrementalSync } from "@/lib/outlook/outlook_sync";

function makeRequest(
  body: unknown,
  searchParams?: Record<string, string>
): Request {
  const url = new URL("http://localhost/api/webhooks/outlook");
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      url.searchParams.set(k, v);
    }
  }
  return new Request(url.toString(), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/webhooks/outlook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responds with validationToken for subscription validation", async () => {
    const req = makeRequest({}, { validationToken: "token_abc123" });
    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("token_abc123");
    expect(res.headers.get("content-type")).toContain("text/plain");
  });

  it("returns 202 for empty notifications", async () => {
    const req = makeRequest({ value: [] });
    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(res.status).toBe(202);
  });

  it("triggers incremental sync on valid notification", async () => {
    (db.select as Mock).mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve([
              {
                userId: "user_1",
                clientState: "secret_state",
                calendarSubscriptionId: "sub_cal_1",
                emailSubscriptionId: "sub_email_1",
              },
            ]),
        }),
      }),
    });

    const req = makeRequest({
      value: [
        {
          subscriptionId: "sub_cal_1",
          clientState: "secret_state",
          changeType: "updated",
          resource: "/me/events/event_1",
        },
      ],
    });

    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(performIncrementalSync).toHaveBeenCalledWith("user_1");
    expect(res.status).toBe(202);
  });

  it("skips notification if clientState does not match", async () => {
    (db.select as Mock).mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve([
              {
                userId: "user_1",
                clientState: "correct_state",
                calendarSubscriptionId: "sub_cal_1",
                emailSubscriptionId: null,
              },
            ]),
        }),
      }),
    });

    vi.spyOn(console, "warn").mockImplementationOnce(() => {});

    const req = makeRequest({
      value: [
        {
          subscriptionId: "sub_cal_1",
          clientState: "wrong_state",
          changeType: "updated",
          resource: "/me/events/event_1",
        },
      ],
    });

    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(performIncrementalSync).not.toHaveBeenCalled();
    expect(res.status).toBe(202);
  });

  it("skips notification if subscription is not found", async () => {
    (db.select as Mock)
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      });

    const req = makeRequest({
      value: [
        {
          subscriptionId: "unknown_sub",
          clientState: "state",
          changeType: "updated",
          resource: "/me/events/event_1",
        },
      ],
    });

    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(performIncrementalSync).not.toHaveBeenCalled();
    expect(res.status).toBe(202);
  });
});
