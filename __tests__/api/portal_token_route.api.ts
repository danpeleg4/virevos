import { GET } from "@/app/api/portal/[token]/route";
import {
  downloadPortalFile,
  getPortalAvailability,
  getPortalMainData,
} from "@/lib/portal/portal_page";
import { getPortalChatMessages } from "@/lib/portal/portal_chat";
import { portalMainDrizzle } from "@db/portal_main_db";
import { portalBookingsDrizzle } from "@db/portal_bookings_db";
import { portalChatDrizzle } from "@db/portal_chat_db";
import { documentRequestsDrizzle } from "@db/document_requests_db";
import { supabaseStorageClient } from "@/api_client/supabase_storage_client";
import { ValidationError } from "@/lib/util/validation";
import { NextRequest } from "next/server";

vi.mock("@/lib/portal/portal_page", () => ({
  getPortalMainData: vi.fn(),
  getPortalAvailability: vi.fn(),
  downloadPortalFile: vi.fn(),
}));

vi.mock("@/lib/portal/portal_chat", () => ({
  getPortalChatMessages: vi.fn(),
}));

vi.mock("@db/portal_main_db", () => ({
  portalMainDrizzle: { __sentinel: "portalMainDrizzle" },
}));

vi.mock("@db/portal_bookings_db", () => ({
  portalBookingsDrizzle: { __sentinel: "portalBookingsDrizzle" },
}));

vi.mock("@db/portal_chat_db", () => ({
  portalChatDrizzle: { __sentinel: "portalChatDrizzle" },
}));

vi.mock("@db/document_requests_db", () => ({
  documentRequestsDrizzle: { __sentinel: "documentRequestsDrizzle" },
}));

vi.mock("@/api_client/supabase_storage_client", () => ({
  supabaseStorageClient: { __sentinel: "supabaseStorageClient" },
}));

const makeParams = (token: string) => Promise.resolve({ token });
const makeRequest = (query: string) =>
  new NextRequest(`http://localhost/api/portal/test-token${query}`);

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("GET /api/portal/[token]?type=main", () => {
  it("returns the portal payload via the wired deps", async () => {
    const payload = { client: { id: 1, name: "Jane", email: "j@x.com" } };
    (getPortalMainData as Mock).mockResolvedValueOnce(payload);

    const res = await GET(makeRequest("?type=main"), {
      params: makeParams("test-token"),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(payload);
    expect(getPortalMainData).toHaveBeenCalledWith(
      "test-token",
      portalMainDrizzle,
      portalBookingsDrizzle,
      documentRequestsDrizzle
    );
  });

  it("propagates a ValidationError status", async () => {
    (getPortalMainData as Mock).mockRejectedValueOnce(
      new ValidationError("Portal not found or disabled", 404)
    );

    const res = await GET(makeRequest("?type=main"), {
      params: makeParams("test-token"),
    });

    expect(res.status).toBe(404);
  });

  it("returns 500 when the query fails", async () => {
    (getPortalMainData as Mock).mockRejectedValueOnce(new Error("db down"));

    const res = await GET(makeRequest("?type=main"), {
      params: makeParams("test-token"),
    });

    expect(res.status).toBe(500);
  });
});

describe("GET /api/portal/[token]?type=availability", () => {
  it("returns slots via the wired deps", async () => {
    (getPortalAvailability as Mock).mockResolvedValueOnce({ slots: [] });

    const res = await GET(
      makeRequest("?type=availability&date=2026-08-01&duration=30"),
      {
        params: makeParams("test-token"),
      }
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ slots: [] });
    expect(getPortalAvailability).toHaveBeenCalledWith(
      "test-token",
      "2026-08-01",
      "30",
      portalMainDrizzle,
      portalBookingsDrizzle
    );
  });

  it("propagates a ValidationError status", async () => {
    (getPortalAvailability as Mock).mockRejectedValueOnce(
      new ValidationError("Invalid duration", 400)
    );

    const res = await GET(
      makeRequest("?type=availability&date=2026-08-01&duration=99"),
      { params: makeParams("test-token") }
    );

    expect(res.status).toBe(400);
  });
});

describe("GET /api/portal/[token]?type=chat", () => {
  it("returns the chat thread via the wired portalChatDrizzle instance", async () => {
    (getPortalChatMessages as Mock).mockResolvedValueOnce({ messages: [] });

    const res = await GET(makeRequest("?type=chat"), {
      params: makeParams("test-token"),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ messages: [] });
    expect(getPortalChatMessages).toHaveBeenCalledWith(
      "test-token",
      portalChatDrizzle
    );
  });

  it("returns 404 when the portal is not found", async () => {
    (getPortalChatMessages as Mock).mockRejectedValueOnce(
      new ValidationError("Portal not found", 404)
    );

    const res = await GET(makeRequest("?type=chat"), {
      params: makeParams("test-token"),
    });

    expect(res.status).toBe(404);
  });
});

describe("GET /api/portal/[token]?type=filesDownload", () => {
  it("streams the file bytes via the wired deps", async () => {
    (downloadPortalFile as Mock).mockResolvedValueOnce({
      bytes: new Uint8Array([1, 2, 3]),
      fileName: "contract.pdf",
      mimeType: "application/pdf",
    });

    const res = await GET(makeRequest("?type=filesDownload&fileId=7"), {
      params: makeParams("test-token"),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(downloadPortalFile).toHaveBeenCalledWith(
      "test-token",
      7,
      portalMainDrizzle,
      supabaseStorageClient
    );
  });

  it("returns 403 when the file does not belong to the portal's client", async () => {
    (downloadPortalFile as Mock).mockRejectedValueOnce(
      new ValidationError("Forbidden", 403)
    );

    const res = await GET(makeRequest("?type=filesDownload&fileId=7"), {
      params: makeParams("test-token"),
    });

    expect(res.status).toBe(403);
  });

  it("returns 500 when the download fails unexpectedly", async () => {
    (downloadPortalFile as Mock).mockRejectedValueOnce(new Error("boom"));

    const res = await GET(makeRequest("?type=filesDownload&fileId=7"), {
      params: makeParams("test-token"),
    });

    expect(res.status).toBe(500);
  });
});
