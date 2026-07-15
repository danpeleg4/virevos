import type { GraphMailServiceInterface } from "@/api_client/ms_graph/graph_mail_service";

export type FakeGraphMailService = {
  [K in keyof GraphMailServiceInterface]: Mock<GraphMailServiceInterface[K]>;
};

export function makeFakeGraphMailService(
  overrides: Partial<GraphMailServiceInterface> = {}
): FakeGraphMailService {
  const fake = {
    sendMail: vi.fn(async () => {}),
    replyMail: vi.fn(async () => {}),
    createDraft: vi.fn(async () => ({ id: "draft-1" })),
    createReplyDraft: vi.fn(async () => ({ id: "draft-1" })),
    sendDraft: vi.fn(async () => {}),
    addSmallAttachment: vi.fn(async () => {}),
    createUploadSession: vi.fn(async () => ({
      uploadUrl: "https://upload.example.com/session-1",
    })),
    uploadChunk: vi.fn(async () => {}),
    patchMessage: vi.fn(async () => {}),
    moveMessage: vi.fn(async () => {}),
    deleteMessage: vi.fn(async () => {}),
    listAttachments: vi.fn(async () => ({ value: [] })),
    getAttachmentContent: vi.fn(async () => ({})),
    fetchDelta: vi.fn(async () => ({ value: [] })),
    createSubscription: vi.fn(async () => ({
      id: "sub-1",
      expirationDateTime: new Date(
        Date.now() + 3 * 24 * 60 * 60 * 1000
      ).toISOString(),
    })),
    renewSubscription: vi.fn(async () => {}),
    deleteSubscription: vi.fn(async () => {}),
  } satisfies GraphMailServiceInterface;

  return Object.assign(fake, overrides) as FakeGraphMailService;
}
