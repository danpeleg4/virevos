import type { ResendClientInterface } from "@/api_client/resend_client";

export type FakeResendClient = {
  [K in keyof ResendClientInterface]: Mock<ResendClientInterface[K]>;
};

export function makeFakeResendClient(
  overrides: Partial<ResendClientInterface> = {}
): FakeResendClient {
  const fake = {
    sendEmail: vi.fn(async () => ({ id: "resend-msg-1" })),
  } satisfies ResendClientInterface;

  return Object.assign(fake, overrides) as FakeResendClient;
}
