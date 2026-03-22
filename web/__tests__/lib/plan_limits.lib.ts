import {
  assertCanAddClient,
  assertCanAddProject,
  getUserPlan,
} from "@/lib/plan_limits";

const mockDbWhere = jest.fn().mockResolvedValue([]);
const mockDbFrom = jest.fn(() => ({ where: mockDbWhere }));

jest.mock("@db/db", () => ({
  db: {
    select: jest.fn(() => ({ from: mockDbFrom })),
  },
}));

const mockGetUserSubscriptionByUserId = jest.fn();

jest.mock("@/lib/billing", () => ({
  getUserSubscriptionByUserId: (...args: unknown[]) =>
    mockGetUserSubscriptionByUserId(...args),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock("@clerk/nextjs/server", () => ({ currentUser: jest.fn() }));

function mockSubscription(plan: string) {
  mockGetUserSubscriptionByUserId.mockResolvedValue({ plan });
}

function mockClientCount(count: number) {
  mockDbWhere.mockResolvedValueOnce([{ count }]);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDbFrom.mockReturnValue({ where: mockDbWhere });
  mockDbWhere.mockResolvedValue([{ count: 1 }]);
});

// ─── getUserPlan ──────────────────────────────────────────────────────────

describe("getUserPlan", () => {
  it("returns the plan from the subscription", async () => {
    mockSubscription("professional");
    const plan = await getUserPlan("user_1");
    expect(plan).toBe("professional");
  });

  it("returns starter when subscription defaults", async () => {
    mockSubscription("starter");
    const plan = await getUserPlan("user_1");
    expect(plan).toBe("starter");
  });
});

// ─── assertCanAddClient ───────────────────────────────────────────────────

describe("assertCanAddClient", () => {
  it("does not throw for professional plan (no limit)", async () => {
    mockSubscription("professional");
    await expect(assertCanAddClient("user_1")).resolves.toBeUndefined();
    expect(mockDbWhere).not.toHaveBeenCalled();
  });

  it("does not throw for business plan (no limit)", async () => {
    mockSubscription("business");
    await expect(assertCanAddClient("user_1")).resolves.toBeUndefined();
  });

  it("does not throw when starter plan has fewer than 5 clients", async () => {
    mockSubscription("starter");
    mockClientCount(3);
    await expect(assertCanAddClient("user_1")).resolves.toBeUndefined();
  });

  it("throws when starter plan has reached 5 client limit", async () => {
    mockSubscription("starter");
    mockClientCount(5);
    await expect(assertCanAddClient("user_1")).rejects.toThrow(
      /Client limit reached/
    );
  });

  it("throws when starter plan exceeds 5 client limit", async () => {
    mockSubscription("starter");
    mockClientCount(7);
    await expect(assertCanAddClient("user_1")).rejects.toThrow(
      /Client limit reached/
    );
  });
});

// ─── assertCanAddProject ──────────────────────────────────────────────────

describe("assertCanAddProject", () => {
  it("does not throw for professional plan", async () => {
    mockSubscription("professional");
    await expect(assertCanAddProject("user_1")).resolves.toBeUndefined();
  });

  it("does not throw for business plan", async () => {
    mockSubscription("business");
    await expect(assertCanAddProject("user_1")).resolves.toBeUndefined();
  });
});
