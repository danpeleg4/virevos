import {
  addAClient,
  updateExistingClient,
  deleteClient,
  updateNotes,
  toggleClientStatus,
} from "@/lib/clients";
import { currentUser } from "@clerk/nextjs/server";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

const mockAssertCanAddClient = jest.fn();
jest.mock("@/lib/plan_limits", () => ({
  assertCanAddClient: (...args: unknown[]) => mockAssertCanAddClient(...args),
}));

const mockWhere = jest.fn();
const mockSet = jest.fn(() => ({ where: mockWhere }));
const mockReturning = jest.fn();
const mockValues = jest.fn(() => ({ returning: mockReturning }));

jest.mock("@db/db", () => ({
  db: {
    insert: jest.fn(() => ({ values: mockValues })),
    update: jest.fn(() => ({ set: mockSet })),
    delete: jest.fn(() => ({ where: mockWhere })),
  },
}));

const mockUser = { id: "user_1" };

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  mockWhere.mockResolvedValue(undefined);
  mockSet.mockReturnValue({ where: mockWhere });
  mockValues.mockReturnValue({ returning: mockReturning });
  mockReturning.mockResolvedValue([]);
  mockAssertCanAddClient.mockResolvedValue(undefined);
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ─── addAClient ───────────────────────────────────────────────────────────

describe("addAClient", () => {
  const baseInput = {
    name: "John",
    email: "john@example.com",
    phone: "",
    industry: "",
    notes: "",
  };

  it("returns server error when unauthenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);
    const result = await addAClient(baseInput);
    expect(result).toEqual({ message: "Server error" });
  });

  it("returns 400 when name is missing", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    const result = (await addAClient({ ...baseInput, name: "" })) as any;
    expect(result.status).toBe(400);
  });

  it("returns 400 when email is missing", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    const result = (await addAClient({ ...baseInput, email: "" })) as any;
    expect(result.status).toBe(400);
  });

  it("returns 400 when email format is invalid", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    const result = (await addAClient({
      ...baseInput,
      email: "not-an-email",
    })) as any;
    expect(result.status).toBe(400);
  });

  it("inserts client and returns the created record", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    const created = {
      id: 1,
      name: "John",
      email: "john@example.com",
      userId: "user_1",
    };
    mockReturning.mockResolvedValueOnce([created]);

    const result = await addAClient(baseInput);

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "John",
        email: "john@example.com",
        userId: "user_1",
      })
    );
    expect(result).toEqual(created);
  });

  it("returns server error on DB error", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockReturning.mockRejectedValueOnce(new Error("DB error"));

    const result = await addAClient(baseInput);
    expect(result).toEqual({ message: "Server error" });
  });

  it("returns server error when plan limit is reached", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockAssertCanAddClient.mockRejectedValueOnce(
      new Error(
        "Client limit reached. The starter plan allows up to 5 clients."
      )
    );

    const result = await addAClient(baseInput);
    expect(result).toEqual({ message: "Server error" });
  });
});

// ─── updateExistingClient ─────────────────────────────────────────────────

describe("updateExistingClient", () => {
  it("throws when unauthenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);
    await expect(updateExistingClient({ id: 1 })).rejects.toThrow("No user");
  });

  it("returns early without DB call when no non-empty fields provided", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    await updateExistingClient({ id: 1, name: "", email: "" });
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("calls db.update only with non-empty fields", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    await updateExistingClient({ id: 1, name: "Updated Name", email: "" });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Updated Name" })
    );
    expect(mockSet).toHaveBeenCalledWith(
      expect.not.objectContaining({ email: expect.anything() })
    );
  });

  it("updates all fields when all are provided", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    await updateExistingClient({
      id: 1,
      name: "Name",
      email: "email@example.com",
      phone: "555-1234",
      industry: "Tech",
      notes: "Some notes",
    });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Name",
        email: "email@example.com",
        phone: "555-1234",
        industry: "Tech",
        notes: "Some notes",
      })
    );
  });
});

// ─── deleteClient ─────────────────────────────────────────────────────────

describe("deleteClient", () => {
  it("throws when unauthenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);
    await expect(deleteClient({ id: 1 })).rejects.toThrow("No user");
  });

  it("calls db.delete with correct where clause", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    await deleteClient({ id: 42 });
    expect(mockWhere).toHaveBeenCalledTimes(1);
  });
});

// ─── updateNotes ──────────────────────────────────────────────────────────

describe("updateNotes", () => {
  it("throws when unauthenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);
    await expect(updateNotes({ id: 1, notes: "hi" })).rejects.toThrow(
      "No user"
    );
  });

  it("calls db.update with { notes } and correct where clause", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    await updateNotes({ id: 7, notes: "my notes" });
    expect(mockSet).toHaveBeenCalledWith({ notes: "my notes" });
    expect(mockWhere).toHaveBeenCalledTimes(1);
  });
});

// ─── toggleClientStatus ───────────────────────────────────────────────────

describe("toggleClientStatus", () => {
  it("throws when unauthenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);
    await expect(
      toggleClientStatus({ id: 1, status: "inactive" })
    ).rejects.toThrow("No user");
  });

  it("sets status to inactive", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    await toggleClientStatus({ id: 5, status: "inactive" });
    expect(mockSet).toHaveBeenCalledWith({ status: "inactive" });
    expect(mockWhere).toHaveBeenCalledTimes(1);
  });

  it("sets status to active", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    await toggleClientStatus({ id: 5, status: "active" });
    expect(mockSet).toHaveBeenCalledWith({ status: "active" });
    expect(mockWhere).toHaveBeenCalledTimes(1);
  });
});
