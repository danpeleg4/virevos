import { changeRecordingStatus } from "@/lib/user";
import { currentUser } from "@clerk/nextjs/server";

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

const mockUpdateWhere = vi.fn();
const mockSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockSelectWhere = vi.fn();
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere }));
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));

vi.mock("@db/db", () => ({
  db: {
    // eslint-disable-next-line prefer-spread
    select: (...args: never[]) => mockSelect.apply(null, args),
    update: vi.fn(() => ({ set: mockSet })),
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
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ─── changeRecordingStatus ────────────────────────────────────────────────

describe("changeRecordingStatus", () => {
  it("throws when unauthenticated", async () => {
    (currentUser as Mock).mockResolvedValue(null);
    await expect(changeRecordingStatus()).rejects.toThrow("No user");
  });

  it("sets recordingStatus to false when it was true", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockResolvedValueOnce([{ recordingStatus: true }]);
    await changeRecordingStatus();
    expect(mockSet).toHaveBeenCalledWith({ recordingStatus: false });
  });

  it("sets recordingStatus to true when it was false", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockResolvedValueOnce([{ recordingStatus: false }]);
    await changeRecordingStatus();
    expect(mockSet).toHaveBeenCalledWith({ recordingStatus: true });
  });

  it("silently swallows errors (does not re-throw)", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockRejectedValueOnce(new Error("DB error"));
    await changeRecordingStatus(); // should not throw
  });
});
