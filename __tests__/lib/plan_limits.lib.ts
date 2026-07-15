import {
  assertCanAddClient,
  assertCanAddCase,
  assertCanUseAI,
  assertCanAddFile,
  getUserPlan,
  resetDueAiCredits,
} from "@/lib/plan_limits";
import {
  canonicalSubscriptionRow,
  makeFakeBillingDb,
} from "../fakes/fake_billing_db";
import { makeFakePlanLimitsDb } from "../fakes/fake_plan_limits_db";

vi.mock("@/lib/supabase/auth", () => ({ getCurrentUser: vi.fn() }));

const billingDb = makeFakeBillingDb();
const planLimitsDb = makeFakePlanLimitsDb();

// the fake billing row defaults to the professional plan; a starter user is
// simulated by removing the subscription row
function useStarterPlan() {
  billingDb.getSubscriptionByUserId.mockResolvedValueOnce([]);
}

function useBusinessPlan() {
  billingDb.getSubscriptionByUserId.mockResolvedValueOnce([
    { ...canonicalSubscriptionRow, plan: "business" },
  ]);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getUserPlan ──────────────────────────────────────────────────────────

describe("getUserPlan", () => {
  it("returns the plan from the subscription", async () => {
    const plan = await getUserPlan("user_1", billingDb);
    expect(plan).toBe("professional");
  });

  it("returns starter when there is no subscription row", async () => {
    useStarterPlan();
    const plan = await getUserPlan("user_1", billingDb);
    expect(plan).toBe("starter");
  });
});

// ─── assertCanAddClient ───────────────────────────────────────────────────

describe("assertCanAddClient", () => {
  it("does not throw for professional plan (no limit)", async () => {
    await expect(
      assertCanAddClient("user_1", planLimitsDb, billingDb)
    ).resolves.toBeUndefined();
    expect(planLimitsDb.countClients).not.toHaveBeenCalled();
  });

  it("does not throw for business plan (no limit)", async () => {
    useBusinessPlan();
    await expect(
      assertCanAddClient("user_1", planLimitsDb, billingDb)
    ).resolves.toBeUndefined();
  });

  it("allows a starter user below the limit", async () => {
    useStarterPlan();
    planLimitsDb.countClients.mockResolvedValueOnce([{ count: 4 }]);

    await expect(
      assertCanAddClient("user_1", planLimitsDb, billingDb)
    ).resolves.toBeUndefined();
  });

  it("throws when a starter user hits the client limit", async () => {
    useStarterPlan();
    planLimitsDb.countClients.mockResolvedValueOnce([{ count: 5 }]);

    await expect(
      assertCanAddClient("user_1", planLimitsDb, billingDb)
    ).rejects.toThrow("Client limit reached");
  });
});

// ─── assertCanAddCase ─────────────────────────────────────────────────────

describe("assertCanAddCase", () => {
  it("does not throw for paid plans", async () => {
    await expect(
      assertCanAddCase("user_1", planLimitsDb, billingDb)
    ).resolves.toBeUndefined();
    expect(planLimitsDb.countCases).not.toHaveBeenCalled();
  });

  it("allows a starter user below the limit", async () => {
    useStarterPlan();
    planLimitsDb.countCases.mockResolvedValueOnce([{ count: 0 }]);

    await expect(
      assertCanAddCase("user_1", planLimitsDb, billingDb)
    ).resolves.toBeUndefined();
  });

  it("throws when a starter user hits the case limit", async () => {
    useStarterPlan();
    planLimitsDb.countCases.mockResolvedValueOnce([{ count: 5 }]);

    await expect(
      assertCanAddCase("user_1", planLimitsDb, billingDb)
    ).rejects.toThrow("Case limit reached");
  });
});

// ─── assertCanUseAI ───────────────────────────────────────────────────────

describe("assertCanUseAI", () => {
  it("allows usage below the plan's credit limit", async () => {
    planLimitsDb.getAiCredits.mockResolvedValueOnce([{ ai_credits: 249 }]);

    await expect(
      assertCanUseAI("user_1", planLimitsDb, billingDb)
    ).resolves.toBeUndefined();
  });

  it("throws at the professional credit limit", async () => {
    planLimitsDb.getAiCredits.mockResolvedValueOnce([{ ai_credits: 250 }]);

    await expect(
      assertCanUseAI("user_1", planLimitsDb, billingDb)
    ).rejects.toThrow("AI credit limit reached");
  });

  it("throws at the starter credit limit", async () => {
    useStarterPlan();
    planLimitsDb.getAiCredits.mockResolvedValueOnce([{ ai_credits: 50 }]);

    await expect(
      assertCanUseAI("user_1", planLimitsDb, billingDb)
    ).rejects.toThrow("AI credit limit reached");
  });

  it("throws when the user row is missing", async () => {
    planLimitsDb.getAiCredits.mockResolvedValueOnce([]);

    await expect(
      assertCanUseAI("user_1", planLimitsDb, billingDb)
    ).rejects.toThrow("AI credit limit reached");
  });
});

// ─── assertCanAddFile ─────────────────────────────────────────────────────

describe("assertCanAddFile", () => {
  it("allows a file within the storage limit", async () => {
    planLimitsDb.getStorage.mockResolvedValueOnce([{ storage: 0 }]);

    await expect(
      assertCanAddFile("user_1", 1024, planLimitsDb, billingDb)
    ).resolves.toBeUndefined();
  });

  it("throws when the file would exceed the starter limit", async () => {
    useStarterPlan();
    planLimitsDb.getStorage.mockResolvedValueOnce([
      { storage: 1024 * 1024 * 1024 - 10 },
    ]);

    await expect(
      assertCanAddFile("user_1", 100, planLimitsDb, billingDb)
    ).rejects.toThrow("Storage limit reached");
  });

  it("treats a missing user row as zero storage", async () => {
    planLimitsDb.getStorage.mockResolvedValueOnce([]);

    await expect(
      assertCanAddFile("user_1", 1024, planLimitsDb, billingDb)
    ).resolves.toBeUndefined();
  });
});

// ─── resetDueAiCredits ────────────────────────────────────────────────────

describe("resetDueAiCredits", () => {
  it("resets due users and reports the count", async () => {
    planLimitsDb.resetDueCredits.mockResolvedValueOnce([
      { id: "user_1" },
      { id: "user_2" },
    ]);

    const result = await resetDueAiCredits(planLimitsDb);

    expect(result).toEqual({ reset: 2 });
    const [now, nextReset] = planLimitsDb.resetDueCredits.mock.calls[0];
    // the next reset lands ~30 days after now
    const diffDays =
      (nextReset.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
    expect(Math.round(diffDays)).toBe(30);
  });

  it("reports zero when nobody is due", async () => {
    planLimitsDb.resetDueCredits.mockResolvedValueOnce([]);

    await expect(resetDueAiCredits(planLimitsDb)).resolves.toEqual({
      reset: 0,
    });
  });
});
