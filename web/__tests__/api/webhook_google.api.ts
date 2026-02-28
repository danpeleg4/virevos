import { POST } from "@/app/api/webhooks/google/route";
import { db } from "@db/db";
import { NextRequest } from "next/server";

jest.mock("@db/db", () => ({
  db: {
    select: jest.fn(),
  },
}));

jest.mock("@/lib/google_sync", () => ({
  performIncrementalSync: jest.fn().mockResolvedValue(undefined),
}));

import { performIncrementalSync } from "@/lib/google_sync";

function makeRequest(headers: Record<string, string>): NextRequest {
  return {
    headers: {
      get: (key: string) => headers[key] ?? null,
    },
  } as unknown as NextRequest;
}

function mockDbSelect(rows: unknown[]) {
  (db.select as jest.Mock).mockReturnValue({
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve(rows),
      }),
    }),
  });
}

describe("POST /api/webhooks/google", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 200 for resource-state=sync (initial handshake)", async () => {
    const res = await POST(
      makeRequest({
        "X-Goog-Resource-State": "sync",
        "X-Goog-Channel-Token": "user_1",
        "X-Goog-Channel-Id": "channel-uuid",
      })
    );
    expect(res.status).toBe(200);
    expect(performIncrementalSync).not.toHaveBeenCalled();
  });

  it("returns 200 for resource-state=not_exists (ignored)", async () => {
    const res = await POST(
      makeRequest({
        "X-Goog-Resource-State": "not_exists",
        "X-Goog-Channel-Token": "user_1",
        "X-Goog-Channel-Id": "channel-uuid",
      })
    );
    expect(res.status).toBe(200);
    expect(performIncrementalSync).not.toHaveBeenCalled();
  });

  it("returns 400 when X-Goog-Channel-Token is missing", async () => {
    const res = await POST(
      makeRequest({
        "X-Goog-Resource-State": "exists",
        "X-Goog-Channel-Id": "channel-uuid",
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when X-Goog-Channel-Id is missing", async () => {
    const res = await POST(
      makeRequest({
        "X-Goog-Resource-State": "exists",
        "X-Goog-Channel-Token": "user_1",
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 401 when no sync state found for user", async () => {
    mockDbSelect([]);
    const res = await POST(
      makeRequest({
        "X-Goog-Resource-State": "exists",
        "X-Goog-Channel-Token": "user_1",
        "X-Goog-Channel-Id": "channel-uuid",
      })
    );
    expect(res.status).toBe(401);
    expect(performIncrementalSync).not.toHaveBeenCalled();
  });

  it("returns 401 when channelId does not match stored value", async () => {
    mockDbSelect([{ channelId: "different-channel", resourceId: "res-1" }]);
    const res = await POST(
      makeRequest({
        "X-Goog-Resource-State": "exists",
        "X-Goog-Channel-Token": "user_1",
        "X-Goog-Channel-Id": "channel-uuid",
      })
    );
    expect(res.status).toBe(401);
    expect(performIncrementalSync).not.toHaveBeenCalled();
  });

  it("returns 204 and triggers incremental sync on valid exists notification", async () => {
    mockDbSelect([{ channelId: "channel-uuid", resourceId: "res-1" }]);
    const res = await POST(
      makeRequest({
        "X-Goog-Resource-State": "exists",
        "X-Goog-Channel-Token": "user_1",
        "X-Goog-Channel-Id": "channel-uuid",
      })
    );
    expect(res.status).toBe(204);
    // Allow the fire-and-forget to initiate
    await Promise.resolve();
    expect(performIncrementalSync).toHaveBeenCalledWith("user_1");
  });

  it("returns 500 if performIncrementalSync rejects", async () => {
    mockDbSelect([{ channelId: "channel-uuid", resourceId: "res-1" }]);
    (performIncrementalSync as jest.Mock).mockRejectedValueOnce(
      new Error("sync error")
    );
    jest.spyOn(console, "error").mockImplementationOnce(() => {});
    const res = await POST(
      makeRequest({
        "X-Goog-Resource-State": "exists",
        "X-Goog-Channel-Token": "user_1",
        "X-Goog-Channel-Id": "channel-uuid",
      })
    );
    expect(res.status).toBe(500);
  });
});
