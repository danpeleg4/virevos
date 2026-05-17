import { GET } from "@/app/api/outlook/sync/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import { db } from "@db/db";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@db/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

function makeGetRequest(params?: Record<string, string>): Request {
  const url = new URL("http://localhost/api/outlook/sync");
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return new Request(url.toString());
}

const mockEmail = {
  id: 1,
  outlookId: "outlook_1",
  conversationId: "conv_1",
  subject: "Test Subject",
  snippet: "Test snippet",
  fromEmail: "sender@example.com",
  fromName: "Sender Name",
  toEmails: ["recipient@example.com"],
  bodyHtml: "<p>Hello</p>",
  bodyText: "Hello",
  isRead: false,
  isStarred: false,
  isArchived: false,
  isSent: false,
  sentAt: new Date("2026-04-01T10:00:00Z"),
  clientId: null,
  clientName: null,
};

function mockDbSelect(rows: (typeof mockEmail)[]) {
  (db.select as Mock).mockReturnValue({
    from: () => ({
      leftJoin: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => ({
              offset: () => Promise.resolve(rows),
            }),
          }),
        }),
      }),
    }),
  });
}

describe("GET /api/outlook/sync", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 if not authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    const res = await GET(makeGetRequest() as Parameters<typeof GET>[0]);
    expect(res.status).toBe(401);
  });

  it("returns paginated email messages", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    mockDbSelect([mockEmail]);

    const res = await GET(makeGetRequest() as Parameters<typeof GET>[0]);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0]).toMatchObject({
      outlookId: "outlook_1",
      subject: "Test Subject",
      from: "Sender Name",
      unread: true,
    });
    expect(body.hasMore).toBe(false);
  });

  it("sets hasMore=true when there are more results", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    mockDbSelect(Array(51).fill(mockEmail));

    const res = await GET(
      makeGetRequest({ limit: "50" }) as Parameters<typeof GET>[0]
    );
    const body = await res.json();
    expect(body.hasMore).toBe(true);
    expect(body.messages).toHaveLength(50);
  });

  it("returns 500 on db error", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    (db.select as Mock).mockImplementation(() => {
      throw new Error("db error");
    });
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    const res = await GET(makeGetRequest() as Parameters<typeof GET>[0]);
    expect(res.status).toBe(500);
  });
});
