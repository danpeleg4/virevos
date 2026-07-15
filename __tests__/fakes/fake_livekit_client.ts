import type { LiveKitClientInterface } from "@/api_client/livekit_client";

export type FakeLiveKitClient = {
  [K in keyof LiveKitClientInterface]: Mock<LiveKitClientInterface[K]>;
};

export function makeFakeLiveKitClient(
  overrides: Partial<LiveKitClientInterface> = {}
): FakeLiveKitClient {
  const fake = {
    receiveWebhook: vi.fn(async () => ({}) as never),
    createToken: vi.fn(async () => "jwt-token"),
    dispatchAgent: vi.fn(async () => {}),
    hasActiveEgress: vi.fn(async () => false),
    startCompositeEgress: vi.fn(async () => {}),
  } satisfies LiveKitClientInterface;

  return Object.assign(fake, overrides) as FakeLiveKitClient;
}
