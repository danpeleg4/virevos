import {
  assertCanAddClient,
  assertCanAddCase,
  assertCanUseAI,
  assertCanAddFile,
  getUserPlan,
} from "@/lib/plan_limits";

const AI_CREDIT_LIMITS: Record<PlanId, number> = {
  starter: 50,
  professional: 250,
  business: 500,
};

const STORAGE_LIMIT_BYTES: Record<PlanId, number> = {
  starter: 1 * 1024 * 1024 * 1024,
  professional: 50 * 1024 * 1024 * 1024,
  business: 250 * 1024 * 1024 * 1024,
};
const mockDbWhere = vi.fn().mockResolvedValue([]);
const mockDbFrom = vi.fn(() => ({ where: mockDbWhere }));

vi.mock("@db/db", () => ({
  db: {
    select: vi.fn(() => ({ from: mockDbFrom })),
  },
}));

const mockGetUserSubscriptionByUserId = vi.fn();

vi.mock("@/lib/billing", () => ({
  getUserSubscriptionByUserId: (...args: unknown[]) =>
    mockGetUserSubscriptionByUserId(...args),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
vi.mock("@clerk/nextjs/server", () => ({ currentUser: vi.fn() }));

function mockSubscription(plan: string) {
  mockGetUserSubscriptionByUserId.mockResolvedValue({ plan });
}

function mockClientCount(count: number) {
  mockDbWhere.mockResolvedValueOnce([{ count }]);
}

beforeEach(() => {
  vi.clearAllMocks();
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

// ─── assertCanAddCase ──────────────────────────────────────────────────

describe("assertCanAddCase", () => {
  it("does not throw for professional plan", async () => {
    mockSubscription("professional");
    await expect(assertCanAddCase("user_1")).resolves.toBeUndefined();
  });

  it("does not throw for business plan", async () => {
    mockSubscription("business");
    await expect(assertCanAddCase("user_1")).resolves.toBeUndefined();
  });
});

// ─── AI_CREDIT_LIMITS / STORAGE_LIMIT_BYTES constants ────────────────────

describe("AI_CREDIT_LIMITS", () => {
  it("returns 50 for starter", () => {
    expect(AI_CREDIT_LIMITS.starter).toBe(50);
  });

  it("returns 250 for professional", () => {
    expect(AI_CREDIT_LIMITS.professional).toBe(250);
  });

  it("returns 500 for business", () => {
    expect(AI_CREDIT_LIMITS.business).toBe(500);
  });
});

describe("STORAGE_LIMIT_BYTES", () => {
  it("returns 1GB for starter", () => {
    expect(STORAGE_LIMIT_BYTES.starter).toBe(1 * 1024 * 1024 * 1024);
  });

  it("returns 50GB for professional", () => {
    expect(STORAGE_LIMIT_BYTES.professional).toBe(50 * 1024 * 1024 * 1024);
  });

  it("returns 250GB for business", () => {
    expect(STORAGE_LIMIT_BYTES.business).toBe(250 * 1024 * 1024 * 1024);
  });
});

// ─── assertCanUseAI ───────────────────────────────────────────────────────

describe("assertCanUseAI", () => {
  it("does not throw when usage is below the plan limit", async () => {
    mockSubscription("starter");
    mockDbWhere.mockResolvedValueOnce([{ ai_credits: 10 }]);
    await expect(assertCanUseAI("user_1")).resolves.toBeUndefined();
  });

  it("throws when usage equals the plan limit", async () => {
    mockSubscription("starter");
    mockDbWhere.mockResolvedValueOnce([{ ai_credits: 50 }]);
    await expect(assertCanUseAI("user_1")).rejects.toThrow(
      /AI credit limit reached/
    );
  });

  it("throws when usage exceeds the plan limit", async () => {
    mockSubscription("starter");
    mockDbWhere.mockResolvedValueOnce([{ ai_credits: 99 }]);
    await expect(assertCanUseAI("user_1")).rejects.toThrow(
      /AI credit limit reached/
    );
  });

  it("throws when user row is not found", async () => {
    mockSubscription("starter");
    mockDbWhere.mockResolvedValueOnce([]);
    await expect(assertCanUseAI("user_1")).rejects.toThrow(
      /AI credit limit reached/
    );
  });

  it("uses the correct limit for professional plan (250)", async () => {
    mockSubscription("professional");
    mockDbWhere.mockResolvedValueOnce([{ ai_credits: 249 }]);
    await expect(assertCanUseAI("user_1")).resolves.toBeUndefined();
  });

  it("throws at professional plan limit (250)", async () => {
    mockSubscription("professional");
    mockDbWhere.mockResolvedValueOnce([{ ai_credits: 250 }]);
    await expect(assertCanUseAI("user_1")).rejects.toThrow(
      /AI credit limit reached/
    );
  });

  it("uses the correct limit for business plan (500)", async () => {
    mockSubscription("business");
    mockDbWhere.mockResolvedValueOnce([{ ai_credits: 499 }]);
    await expect(assertCanUseAI("user_1")).resolves.toBeUndefined();
  });
});

// ─── assertCanAddFile ─────────────────────────────────────────────────────

const ONE_GB = 1024 * 1024 * 1024;

describe("assertCanAddFile", () => {
  it("does not throw when current storage + file fits within limit", async () => {
    mockSubscription("starter");
    mockDbWhere.mockResolvedValueOnce([{ storage: 0 }]);
    await expect(
      assertCanAddFile("user_1", ONE_GB - 1)
    ).resolves.toBeUndefined();
  });

  it("throws when current storage + file exceeds the limit", async () => {
    mockSubscription("starter");
    mockDbWhere.mockResolvedValueOnce([{ storage: ONE_GB - 100 }]);
    await expect(assertCanAddFile("user_1", 200)).rejects.toThrow(
      /Storage limit reached/
    );
  });

  it("throws when current storage exactly equals the limit", async () => {
    mockSubscription("starter");
    mockDbWhere.mockResolvedValueOnce([{ storage: ONE_GB }]);
    await expect(assertCanAddFile("user_1", 1)).rejects.toThrow(
      /Storage limit reached/
    );
  });

  it("defaults to 0 storage when user row is not found", async () => {
    mockSubscription("starter");
    mockDbWhere.mockResolvedValueOnce([]);
    await expect(
      assertCanAddFile("user_1", ONE_GB - 1)
    ).resolves.toBeUndefined();
  });

  it("uses the correct limit for professional plan (50GB)", async () => {
    mockSubscription("professional");
    mockDbWhere.mockResolvedValueOnce([{ storage: 49 * ONE_GB }]);
    await expect(assertCanAddFile("user_1", ONE_GB)).resolves.toBeUndefined();
  });

  it("throws when professional limit is exceeded", async () => {
    mockSubscription("professional");
    mockDbWhere.mockResolvedValueOnce([{ storage: 50 * ONE_GB }]);
    await expect(assertCanAddFile("user_1", 1)).rejects.toThrow(
      /Storage limit reached/
    );
  });
});
