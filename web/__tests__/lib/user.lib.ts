import { changeRecordingStatus } from "@/lib/server_actions/user";
import { currentUser } from "@clerk/nextjs/server";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

const mockUpdateWhere = jest.fn();
const mockSet = jest.fn(() => ({ where: mockUpdateWhere }));
const mockSelectWhere = jest.fn();
const mockSelectFrom = jest.fn(() => ({ where: mockSelectWhere }));
const mockSelect = jest.fn(() => ({ from: mockSelectFrom }));

jest.mock("@db/db", () => ({
  db: {
    // eslint-disable-next-line prefer-spread
    select: (...args: never[]) => mockSelect.apply(null, args),
    update: jest.fn(() => ({ set: mockSet })),
  },
}));

const mockUser = { id: "user_1" };

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
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
    (currentUser as jest.Mock).mockResolvedValue(null);
    await expect(changeRecordingStatus()).rejects.toThrow("No user");
  });

  it("sets recordingStatus to false when it was true", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockResolvedValueOnce([{ recordingStatus: true }]);
    await changeRecordingStatus();
    expect(mockSet).toHaveBeenCalledWith({ recordingStatus: false });
  });

  it("sets recordingStatus to true when it was false", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockResolvedValueOnce([{ recordingStatus: false }]);
    await changeRecordingStatus();
    expect(mockSet).toHaveBeenCalledWith({ recordingStatus: true });
  });

  it("silently swallows errors (does not re-throw)", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockRejectedValueOnce(new Error("DB error"));
    await changeRecordingStatus(); // should not throw
  });
});
