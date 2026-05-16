vi.mock("@clerk/backend/webhooks", () => ({
  verifyWebhook: vi.fn(),
}));

vi.mock("@db/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(),
    })),
  },
}));

import { POST } from "@/app/api/webhooks/clerk/route";
import { db } from "@db/db";
import { verifyWebhook } from "@clerk/backend/webhooks";

describe("Clerk webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts user when event type is user.created", async () => {
    (verifyWebhook as Mock).mockResolvedValue({
      type: "user.created",
      data: {
        id: "user_123",
        email_addresses: [{ email_address: "test@example.com" }],
        first_name: "John",
        last_name: "Doe",
      },
    });

    const req = new Request("http://localhost/api/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);

    expect(verifyWebhook).toHaveBeenCalledTimes(1);
    expect(db.insert).toHaveBeenCalled();

    const insertCall = (db.insert as Mock).mock.results[0].value;
    expect(insertCall.values).toHaveBeenCalledWith({
      user_id: "user_123",
      email: "test@example.com",
      name: "John Doe",
    });

    expect(await res.text()).toBe("ok");
  });

  it("400 invalid webhook (verifyWebhook returns undefined)", async () => {
    (verifyWebhook as Mock).mockResolvedValue(undefined);

    const req = new Request("http://localhost/api/webhook", {
      method: "POST",
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(await res.text()).toBe("invalid webhook");
    expect(db.insert).not.toHaveBeenCalled();
  });
});
