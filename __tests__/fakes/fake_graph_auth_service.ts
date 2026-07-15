import type { GraphAuthServiceInterface } from "@/api_client/ms_graph/graph_auth_service";

export type FakeGraphAuthService = {
  [K in keyof GraphAuthServiceInterface]: Mock<GraphAuthServiceInterface[K]>;
};

export function makeFakeGraphAuthService(
  overrides: Partial<GraphAuthServiceInterface> = {}
): FakeGraphAuthService {
  const fake = {
    exchangeCode: vi.fn(async () => ({
      access_token: "access-token-1",
      refresh_token: "refresh-token-1",
      expires_in: 3600,
    })),
    refreshToken: vi.fn(async () => ({
      access_token: "access-token-2",
      refresh_token: "refresh-token-2",
      expires_in: 3600,
    })),
  } satisfies GraphAuthServiceInterface;

  return Object.assign(fake, overrides) as FakeGraphAuthService;
}
