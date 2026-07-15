import {
  getOutlookAttachmentContent,
  listOutlookAttachments,
} from "@/lib/outlook/outlook_attachments";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  canonicalOutlookEmail,
  makeFakeOutlookDb,
} from "../fakes/fake_outlook_db";
import { makeFakeGraphAuthService } from "../fakes/fake_graph_auth_service";
import { makeFakeGraphMailService } from "../fakes/fake_graph_mail_service";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const outlookDb = makeFakeOutlookDb();
const graphAuthService = makeFakeGraphAuthService();
const graphMailService = makeFakeGraphMailService();

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("listOutlookAttachments", () => {
  it("throws Unauthorized when there is no user", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(
      listOutlookAttachments(1, outlookDb, graphAuthService, graphMailService)
    ).rejects.toThrow("Unauthorized");
  });

  it("throws 404 when the email is not found", async () => {
    outlookDb.getEmailById.mockResolvedValueOnce([]);
    await expect(
      listOutlookAttachments(1, outlookDb, graphAuthService, graphMailService)
    ).rejects.toMatchObject({ status: 404 });
  });

  it("throws 403 when Outlook is not connected", async () => {
    outlookDb.getTokenByUserId.mockResolvedValueOnce([]);
    await expect(
      listOutlookAttachments(1, outlookDb, graphAuthService, graphMailService)
    ).rejects.toMatchObject({ status: 403 });
  });

  it("returns the attachment metadata list", async () => {
    const attachments = [
      {
        id: "att-1",
        name: "doc.pdf",
        size: 100,
        contentType: "application/pdf",
      },
    ];
    graphMailService.listAttachments.mockResolvedValueOnce({
      value: attachments,
    });

    const result = await listOutlookAttachments(
      1,
      outlookDb,
      graphAuthService,
      graphMailService
    );

    expect(result).toEqual({ attachments });
    expect(graphMailService.listAttachments).toHaveBeenCalledWith(
      "access-token-1",
      canonicalOutlookEmail.outlookId
    );
  });
});

describe("getOutlookAttachmentContent", () => {
  it("throws Unauthorized when there is no user", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(
      getOutlookAttachmentContent(
        1,
        "att-1",
        outlookDb,
        graphAuthService,
        graphMailService
      )
    ).rejects.toThrow("Unauthorized");
  });

  it("returns decoded bytes, content type, and file name", async () => {
    graphMailService.getAttachmentContent.mockResolvedValueOnce({
      contentBytes: Buffer.from("pdf-bytes").toString("base64"),
      contentType: "application/pdf",
      name: "doc.pdf",
    });

    const result = await getOutlookAttachmentContent(
      1,
      "att-1",
      outlookDb,
      graphAuthService,
      graphMailService
    );

    expect(result.bytes.toString()).toBe("pdf-bytes");
    expect(result.contentType).toBe("application/pdf");
    expect(result.fileName).toBe("doc.pdf");
    expect(graphMailService.getAttachmentContent).toHaveBeenCalledWith(
      "access-token-1",
      canonicalOutlookEmail.outlookId,
      "att-1"
    );
  });
});
