import type { ScheduledEmailServiceInterface } from "@/api_client/ms_graph/scheduled_email_service";

export type FakeScheduledEmailService = {
  [K in keyof ScheduledEmailServiceInterface]: Mock<
    ScheduledEmailServiceInterface[K]
  >;
};

export function makeFakeScheduledEmailService(
  overrides: Partial<ScheduledEmailServiceInterface> = {}
): FakeScheduledEmailService {
  const fake = {
    getProfile: vi.fn(async () => ({ mail: "me@example.com" })),
    draftMessage: vi.fn(async () => ({
      id: "outlook-1",
      conversationId: "conv-1",
    })),
    sendDraftMessage: vi.fn(async () => {}),
  } satisfies ScheduledEmailServiceInterface;

  return Object.assign(fake, overrides) as FakeScheduledEmailService;
}
