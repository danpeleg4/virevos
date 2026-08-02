import { GET } from "@/app/api/document-requests/pending/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import { listPendingDocumentRequests } from "@/lib/document_requests";
import { documentRequestsDrizzle } from "@db/classes/document_requests_db";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/document_requests", () => ({
  listPendingDocumentRequests: vi.fn(),
}));

vi.mock("@db/classes/document_requests_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fn
  documentRequestsDrizzle: { __sentinel: "documentRequestsDrizzle" },
}));

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("GET /api/document-requests/pending", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(listPendingDocumentRequests).not.toHaveBeenCalled();
  });

  it("returns the pending requests from the wired db", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    const requests = [{ id: 1, eventTitle: "Client Meeting" }];
    (listPendingDocumentRequests as Mock).mockResolvedValueOnce(requests);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(requests);
    expect(listPendingDocumentRequests).toHaveBeenCalledWith(
      "user_1",
      documentRequestsDrizzle
    );
  });

  it("returns 500 when the query fails", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    (listPendingDocumentRequests as Mock).mockRejectedValueOnce(
      new Error("db down")
    );

    const res = await GET();

    expect(res.status).toBe(500);
  });
});
