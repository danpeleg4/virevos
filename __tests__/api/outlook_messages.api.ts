import { GET } from "@/app/api/outlook/messages/[id]/route";
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

const mockEmail = {
  id: 1,
  outlookId: "outlook_msg_1",
  conversationId: "conv_1",
  subject: "Hello",
  snippet: "Hi there",
  fromEmail: "sender@example.com",
  fromName: "Sender",
  toEmails: ["me@example.com"],
  ccEmails: [],
  bodyHtml: "<p>Hi there</p>",
  bodyText: "Hi there",
  isRead: false,
  isStarred: false,
  isArchived: false,
  isSent: false,
  sentAt: new Date("2026-04-01T10:00:00Z"),
  clientId: null,
  userId: "user_1",
  createdAt: new Date(),
};

function makeRequest(): Request {
  return new Request("http://localhost/api/outlook/messages/1");
}

function mockDbFound() {
  (db.select as Mock).mockReturnValue({
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve([mockEmail]),
      }),
    }),
  });
}

function mockDbEmpty() {
  (db.select as Mock).mockReturnValue({
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve([]),
      }),
    }),
  });
}

const params = Promise.resolve({ id: "1" });

describe("GET /api/outlook/messages/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 if not authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    const res = await GET(makeRequest(), { params });
    expect(res.status).toBe(401);
  });

  it("returns 400 for non-numeric id", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    const res = await GET(makeRequest(), {
      params: Promise.resolve({ id: "abc" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when message not found", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    mockDbEmpty();
    const res = await GET(makeRequest(), { params });
    expect(res.status).toBe(404);
  });

  it("returns the message when found", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    mockDbFound();
    const res = await GET(makeRequest(), { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.outlookId).toBe("outlook_msg_1");
  });
});
