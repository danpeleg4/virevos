import {
  addAClient,
  updateExistingClient,
  deleteClient,
  updateNotes,
} from "@/lib/clients";
import { currentUser } from "@clerk/nextjs/server";

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

const mockAssertCanAddClient = vi.fn();
vi.mock("@/lib/plan_limits", () => ({
  assertCanAddClient: (...args: unknown[]) => mockAssertCanAddClient(...args),
}));

const mockWhere = vi.fn();
const mockSet = vi.fn(() => ({ where: mockWhere }));
const mockReturning = vi.fn();
const mockValues = vi.fn(() => ({ returning: mockReturning }));

vi.mock("@db/db", () => ({
  db: {
    insert: vi.fn(() => ({ values: mockValues })),
    update: vi.fn(() => ({ set: mockSet })),
    delete: vi.fn(() => ({ where: mockWhere })),
  },
}));

const mockUser = { id: "user_1" };

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  mockWhere.mockResolvedValue(undefined);
  mockSet.mockReturnValue({ where: mockWhere });
  mockValues.mockReturnValue({ returning: mockReturning });
  mockReturning.mockResolvedValue([]);
  mockAssertCanAddClient.mockResolvedValue(undefined);
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("addAClient", () => {
  const baseInput = {
    name: "John",
    email: "john@example.com",
    phone: "",
    notes: "",
  };

  it("returns Unauthorized message when unauthenticated", async () => {
    (currentUser as Mock).mockResolvedValue(null);
    const result = await addAClient(baseInput);
    expect(result).toEqual({ message: "Unauthorized" });
  });

  it("returns validation message when name is missing", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    const result = await addAClient({ ...baseInput, name: "" });
    expect(result).toEqual({ message: "name is required" });
  });

  it("returns validation message when email is missing", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    const result = await addAClient({ ...baseInput, email: "" });
    expect(result).toEqual({ message: "email is required" });
  });

  it("returns validation message when email format is invalid", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    const result = await addAClient({ ...baseInput, email: "not-an-email" });
    expect(result).toEqual({ message: "email is not a valid email" });
  });

  it("inserts client and returns the created record", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
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
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockReturning.mockRejectedValueOnce(new Error("DB error"));

    const result = await addAClient(baseInput);
    expect(result).toEqual({ message: "Server error" });
  });
});

describe("updateExistingClient", () => {
  it("throws when unauthenticated", async () => {
    (currentUser as Mock).mockResolvedValue(null);
    await expect(updateExistingClient({ id: 1 })).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("returns early without DB call when no non-empty fields provided", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    await updateExistingClient({ id: 1, name: "", email: "" });
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("calls db.update only with non-empty fields", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    await updateExistingClient({ id: 1, name: "Updated Name", email: "" });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Updated Name" })
    );
    expect(mockSet).toHaveBeenCalledWith(
      expect.not.objectContaining({ email: expect.anything() })
    );
  });

  it("updates all fields when all are provided", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    await updateExistingClient({
      id: 1,
      name: "Name",
      email: "email@example.com",
      phone: "555-1234",
      notes: "Some notes",
      status: "inactive",
    });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Name",
        email: "email@example.com",
        phone: "555-1234",
        notes: "Some notes",
        status: "inactive",
      })
    );
  });

  it("updates status when provided alone", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    await updateExistingClient({ id: 1, status: "active" });
    expect(mockSet).toHaveBeenCalledWith({ status: "active" });
  });

  it("rejects an invalid status value", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    await expect(
      updateExistingClient({
        id: 1,
        status: "bogus" as unknown as "active",
      })
    ).rejects.toThrow();
    expect(mockSet).not.toHaveBeenCalled();
  });
});

describe("deleteClient", () => {
  it("throws when unauthenticated", async () => {
    (currentUser as Mock).mockResolvedValue(null);
    await expect(deleteClient({ id: 1 })).rejects.toThrow("Unauthorized");
  });

  it("calls db.delete with correct where clause", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    await deleteClient({ id: 42 });
    expect(mockWhere).toHaveBeenCalledTimes(1);
  });
});

describe("updateNotes", () => {
  it("throws when unauthenticated", async () => {
    (currentUser as Mock).mockResolvedValue(null);
    await expect(updateNotes({ id: 1, notes: "hi" })).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("calls db.update with { notes } and correct where clause", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    await updateNotes({ id: 7, notes: "my notes" });
    expect(mockSet).toHaveBeenCalledWith({ notes: "my notes" });
    expect(mockWhere).toHaveBeenCalledTimes(1);
  });
});
