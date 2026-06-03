import {
  sendWeeklySummary,
  listUsersWithWeeklySummary,
  generateSummaryHtml,
  type WeeklyData,
} from "@/lib/weekly_summary";
import { sendEmail } from "@/lib/resend";
import { openai } from "@/lib/ai/ai_tools";

vi.mock("@/lib/resend", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/ai/ai_tools", () => ({
  openai: { responses: { create: vi.fn() } },
  MODEL: "gpt-5",
}));

vi.mock("@/lib/supabase/supabase", () => ({
  supabaseAdmin: {
    storage: {
      vectors: {
        from: () => ({
          index: () => ({
            queryVectors: vi.fn().mockResolvedValue({ data: { vectors: [] } }),
          }),
        }),
      },
    },
  },
}));

const mockSelectWhere = vi.fn();
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere }));
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));
const mockUpdateWhere = vi.fn();
const mockSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn(() => ({ set: mockSet }));

vi.mock("@db/db", () => ({
  db: {
    select: (...args: never[]) => mockSelect(...args),
    update: (...args: never[]) => mockUpdate(...args),
  },
}));

const responseFor = (text: string) => ({ output_text: text });

beforeEach(() => {
  mockSelectWhere.mockReset();
  mockUpdateWhere.mockReset().mockResolvedValue(undefined);
  mockSet.mockClear();
  mockSet.mockReturnValue({ where: mockUpdateWhere });
  mockUpdate.mockClear();
  mockUpdate.mockReturnValue({ set: mockSet });
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  mockSelect.mockReturnValue({ from: mockSelectFrom });
  (sendEmail as Mock).mockResolvedValue({ id: "email_1" });
  (openai.responses.create as Mock).mockResolvedValue(
    responseFor("<!doctype html><html><body><h1>Weekly</h1></body></html>")
  );
});

const baseData: WeeklyData = {
  rangeStart: new Date("2026-05-20T00:00:00Z"),
  rangeEnd: new Date("2026-05-27T00:00:00Z"),
  clientsCreated: 0,
  casesCreated: 0,
  caseNotesCreated: 0,
  caseFilesUploaded: 0,
  tasksCreated: 0,
  tasksCompleted: 0,
  meetingsHeld: 0,
  emailsSent: 0,
  emailsReceived: 0,
  scheduledEmailsSent: 0,
  portalMessages: 0,
  portalBookings: 0,
  documentRequests: 0,
  tasks: [],
  cases: [],
  meetings: [],
  clients: [],
  transcriptSnippets: [],
  emailSnippets: [],
};

// ─── listUsersWithWeeklySummary ──────────────────────────────────────────

describe("listUsersWithWeeklySummary", () => {
  it("returns rows for users opted in", async () => {
    mockSelectWhere.mockResolvedValueOnce([{ userId: "u1" }, { userId: "u2" }]);
    await expect(listUsersWithWeeklySummary()).resolves.toEqual([
      { userId: "u1" },
      { userId: "u2" },
    ]);
  });

  it("returns empty when nobody opted in", async () => {
    mockSelectWhere.mockResolvedValueOnce([]);
    await expect(listUsersWithWeeklySummary()).resolves.toEqual([]);
  });
});

// ─── generateSummaryHtml ──────────────────────────────────────────────────

describe("generateSummaryHtml", () => {
  it("returns model output when it looks like HTML", async () => {
    (openai.responses.create as Mock).mockResolvedValueOnce(
      responseFor("<!doctype html><html><body>Hi Jane</body></html>")
    );
    const html = await generateSummaryHtml("Jane", baseData);
    expect(html).toContain("<html");
    expect(html).toContain("Hi Jane");
  });

  it("falls back to a built-in template when the model returns junk", async () => {
    (openai.responses.create as Mock).mockResolvedValueOnce(
      responseFor("not html at all")
    );
    const html = await generateSummaryHtml("Jane", {
      ...baseData,
      tasksCreated: 3,
    });
    expect(html).toContain("<html");
    expect(html).toContain("Jane");
    expect(html).toContain("3 tasks created");
  });

  it("escapes the user name in the fallback template", async () => {
    (openai.responses.create as Mock).mockResolvedValueOnce(
      responseFor("nope")
    );
    const html = await generateSummaryHtml("<script>x</script>", baseData);
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("falls back to the built-in template when the AI call fails", async () => {
    (openai.responses.create as Mock).mockRejectedValueOnce(
      new Error("openai down")
    );
    const html = await generateSummaryHtml("Jane", baseData);
    expect(html).toContain("<html");
    expect(html).toContain("Jane");
  });
});

// ─── sendWeeklySummary ────────────────────────────────────────────────────

describe("sendWeeklySummary", () => {
  function seedUser(
    row: {
      email?: string | null;
      name?: string | null;
      weeklySummary?: boolean;
    } | null
  ) {
    mockSelectWhere.mockResolvedValueOnce(row === null ? [] : [row]);
    // Subsequent selects inside gatherWeekData all resolve to []
    mockSelectWhere.mockResolvedValue([]);
  }

  it("skips when the user does not exist", async () => {
    seedUser(null);
    await expect(sendWeeklySummary("missing")).resolves.toEqual({
      skipped: "user_not_found",
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("skips when the preference is off", async () => {
    seedUser({
      email: "x@y.com",
      name: "Jane",
      weeklySummary: false,
    });
    await expect(sendWeeklySummary("u1")).resolves.toEqual({
      skipped: "preference_off",
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("skips when the user has no email", async () => {
    seedUser({ email: null, name: "Jane", weeklySummary: true });
    await expect(sendWeeklySummary("u1")).resolves.toEqual({
      skipped: "no_email",
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("sends a summary email and increments ai_credits when enabled", async () => {
    seedUser({
      email: "jane@example.com",
      name: "Jane",
      weeklySummary: true,
    });

    const result = await sendWeeklySummary("u1");

    expect(result).toEqual({ emailId: "email_1" });
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "jane@example.com",
        subject: "Your weekly productivity summary",
      })
    );
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ ai_credits: expect.anything() })
    );
  });

  it("propagates send failures so the cron can record them", async () => {
    seedUser({
      email: "jane@example.com",
      name: "Jane",
      weeklySummary: true,
    });
    (sendEmail as Mock).mockRejectedValueOnce(new Error("resend boom"));

    await expect(sendWeeklySummary("u1")).rejects.toThrow("resend boom");
  });
});
