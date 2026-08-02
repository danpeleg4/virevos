import { GET } from "@/app/api/outlook/messages/[id]/attachments/route";
import {
  getOutlookAttachmentContent,
  listOutlookAttachments,
} from "@/lib/outlook/outlook_attachments";
import { outlookDrizzle } from "@db/classes/outlook_db";
import { graphAuthService } from "@/api_client/ms_graph/graph_auth_service";
import { graphMailService } from "@/api_client/ms_graph/graph_mail_service";
import { ValidationError } from "@/lib/util/validation";
import { NextRequest } from "next/server";

vi.mock("@/lib/outlook/outlook_attachments", () => ({
  getOutlookAttachmentContent: vi.fn(),
  listOutlookAttachments: vi.fn(),
}));

vi.mock("@db/classes/outlook_db", () => ({
  outlookDrizzle: { __sentinel: "outlookDrizzle" },
}));

vi.mock("@/api_client/ms_graph/graph_auth_service", () => ({
  graphAuthService: { __sentinel: "graphAuthService" },
}));

vi.mock("@/api_client/ms_graph/graph_mail_service", () => ({
  graphMailService: { __sentinel: "graphMailService" },
}));

const params = Promise.resolve({ id: "1" });

const makeRequest = (query = "") =>
  new NextRequest(
    `http://localhost/api/outlook/messages/1/attachments${query}`
  );

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("GET /api/outlook/messages/[id]/attachments", () => {
  it("returns 400 for a non-numeric id", async () => {
    const res = await GET(makeRequest(), {
      params: Promise.resolve({ id: "abc" }),
    });
    expect(res.status).toBe(400);
  });

  it("lists attachment metadata when no attachmentId is given", async () => {
    const attachments = [
      {
        id: "att-1",
        name: "doc.pdf",
        size: 100,
        contentType: "application/pdf",
      },
    ];
    (listOutlookAttachments as Mock).mockResolvedValueOnce({ attachments });

    const res = await GET(makeRequest(), { params });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ attachments });
    expect(listOutlookAttachments).toHaveBeenCalledWith(
      1,
      outlookDrizzle,
      graphAuthService,
      graphMailService
    );
  });

  it("streams attachment bytes when attachmentId is given", async () => {
    (getOutlookAttachmentContent as Mock).mockResolvedValueOnce({
      bytes: Buffer.from("pdf-bytes"),
      contentType: "application/pdf",
      fileName: "doc.pdf",
    });

    const res = await GET(makeRequest("?attachmentId=att-1"), { params });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(getOutlookAttachmentContent).toHaveBeenCalledWith(
      1,
      "att-1",
      outlookDrizzle,
      graphAuthService,
      graphMailService
    );
  });

  it("propagates a ValidationError status", async () => {
    (listOutlookAttachments as Mock).mockRejectedValueOnce(
      new ValidationError("Unauthorized", 401)
    );

    const res = await GET(makeRequest(), { params });

    expect(res.status).toBe(401);
  });

  it("returns 500 when the Graph call fails", async () => {
    (listOutlookAttachments as Mock).mockRejectedValueOnce(
      new Error("graph down")
    );

    const res = await GET(makeRequest(), { params });

    expect(res.status).toBe(500);
  });
});
