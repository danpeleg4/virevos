import { changeRecordingStatus, ensureUserRow } from "@/lib/user";
import { getCurrentUser } from "@/lib/supabase/auth";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const mockUpdateWhere = vi.fn();
const mockSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockSelectWhere = vi.fn();
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere }));
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));
const mockOnConflictDoNothing = vi.fn();
const mockInsertValues = vi.fn(() => ({
  onConflictDoNothing: mockOnConflictDoNothing,
}));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

vi.mock("@db/db", () => ({
  db: {
    // eslint-disable-next-line prefer-spread
    select: (...args: never[]) => mockSelect.apply(null, args),
    update: vi.fn(() => ({ set: mockSet })),
    // eslint-disable-next-line prefer-spread
    insert: (...args: never[]) => mockInsert.apply(null, args),
  },
}));

const mockUser = { id: "user_1" };

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  mockUpdateWhere.mockResolvedValue(undefined);
  mockSet.mockReturnValue({ where: mockUpdateWhere });
  mockSelectWhere.mockResolvedValue([{ recordingStatus: false }]);
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  mockSelect.mockReturnValue({ from: mockSelectFrom });
  mockOnConflictDoNothing.mockResolvedValue(undefined);
  mockInsertValues.mockReturnValue({
    onConflictDoNothing: mockOnConflictDoNothing,
  });
  mockInsert.mockReturnValue({ values: mockInsertValues });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ─── changeRecordingStatus ────────────────────────────────────────────────

describe("changeRecordingStatus", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(changeRecordingStatus()).rejects.toThrow("No user");
  });

  it("sets recordingStatus to false when it was true", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockResolvedValueOnce([{ recordingStatus: true }]);
    await changeRecordingStatus();
    expect(mockSet).toHaveBeenCalledWith({ recordingStatus: false });
  });

  it("sets recordingStatus to true when it was false", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockResolvedValueOnce([{ recordingStatus: false }]);
    await changeRecordingStatus();
    expect(mockSet).toHaveBeenCalledWith({ recordingStatus: true });
  });

  it("silently swallows errors (does not re-throw)", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockRejectedValueOnce(new Error("DB error"));
    await changeRecordingStatus(); // should not throw
  });
});

// ─── ensureUserRow ────────────────────────────────────────────────────────

describe("ensureUserRow", () => {
  it("does nothing when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await ensureUserRow();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("inserts a row with user data from the session", async () => {
    (getCurrentUser as Mock).mockResolvedValue({
      id: "user_1",
      email: "test@example.com",
      user_metadata: { name: "Test User" },
    });

    await ensureUserRow();

    expect(mockInsertValues).toHaveBeenCalledWith({
      user_id: "user_1",
      email: "test@example.com",
      name: "Test User",
    });
    expect(mockOnConflictDoNothing).toHaveBeenCalled();
  });

  it("falls back to empty strings when email/name are missing", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });

    await ensureUserRow();

    expect(mockInsertValues).toHaveBeenCalledWith({
      user_id: "user_1",
      email: "",
      name: "",
    });
  });

  it("propagates DB errors", async () => {
    (getCurrentUser as Mock).mockResolvedValue({
      id: "user_1",
      email: "x@y.com",
    });
    mockOnConflictDoNothing.mockRejectedValueOnce(new Error("DB down"));

    await expect(ensureUserRow()).rejects.toThrow("DB down");
  });
});
