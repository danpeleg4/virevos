import {
  addAClient,
  updateExistingClient,
  deleteClient,
  updateNotes,
  getClients,
  getClientMain,
  getClientCases,
  getPortalEnabledClients,
} from "@/lib/workspace/clients";
import { getCurrentUser } from "@/lib/supabase/auth";
import type { UpdateClientInput } from "@/types/clients";
import {
  canonicalClientRow,
  canonicalClientWithCounts,
  makeFakeClientsDb,
} from "../fakes/fake_clients_db";
import { makeFakeBillingDb } from "../fakes/fake_billing_db";
import { makeFakePlanLimitsDb } from "../fakes/fake_plan_limits_db";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const mockAssertCanAddClient = vi.fn();
vi.mock("@/lib/plan_limits", () => ({
  assertCanAddClient: (...args: unknown[]) => mockAssertCanAddClient(...args),
}));

const clientsDb = makeFakeClientsDb();
const billingDb = makeFakeBillingDb();
const planLimitsDb = makeFakePlanLimitsDb();

const mockUser = { id: "user_1" };

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  (getCurrentUser as Mock).mockResolvedValue(mockUser);
  mockAssertCanAddClient.mockResolvedValue(undefined);
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ─── getClients ───────────────────────────────────────────────────────────

describe("getClients", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(getClients(clientsDb)).rejects.toThrow("Unauthorized");
  });

  it("returns the user's clients with case counts", async () => {
    await expect(getClients(clientsDb)).resolves.toEqual([
      canonicalClientWithCounts,
    ]);
    expect(clientsDb.getClientsWithCaseCounts).toHaveBeenCalledWith("user_1");
  });
});

// ─── getClientMain ────────────────────────────────────────────────────────

describe("getClientMain", () => {
  it("returns null when the client does not exist", async () => {
    clientsDb.getClientWithCaseCounts.mockResolvedValueOnce([]);
    await expect(getClientMain(99, clientsDb)).resolves.toBeNull();
  });

  it("returns the client with its portal url", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.test";

    const result = await getClientMain(1, clientsDb);

    expect(result?.client).toEqual(
      expect.objectContaining({ id: 1, name: "Jane Client" })
    );
    expect(result?.portal).toEqual(
      expect.objectContaining({
        token: "portal-token-1",
        portalUrl: "https://app.test/portal/portal-token-1",
      })
    );
  });

  it("returns a null portal when none exists", async () => {
    clientsDb.getPortalTokenByClient.mockResolvedValueOnce([]);

    const result = await getClientMain(1, clientsDb);

    expect(result?.portal).toBeNull();
  });
});

// ─── getClientCases ───────────────────────────────────────────────────────

describe("getClientCases", () => {
  it("maps task counts into stats", async () => {
    clientsDb.getClientCasesWithStats.mockResolvedValueOnce([
      {
        id: 5,
        name: "Estate Case",
        description: null,
        status: "active",
        dueDate: null,
        priority: "medium",
        clientId: 1,
        userId: "user_1",
        clientName: "Jane Client",
        totalTasks: 4,
        completedTasks: 1,
      },
    ]);

    const result = await getClientCases(1, clientsDb);

    expect(result).toEqual([
      expect.objectContaining({
        id: 5,
        stats: { totalTasks: 4, completedTasks: 1, percentage: 25 },
      }),
    ]);
  });
});

// ─── getPortalEnabledClients ──────────────────────────────────────────────

describe("getPortalEnabledClients", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(getPortalEnabledClients(clientsDb)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("returns portal-enabled clients", async () => {
    await expect(getPortalEnabledClients(clientsDb)).resolves.toEqual([
      { id: 1, name: "Jane Client", email: "jane@client.com" },
    ]);
  });
});

// ─── addAClient ───────────────────────────────────────────────────────────

describe("addAClient", () => {
  const baseInput = {
    name: "John",
    email: "john@example.com",
    phone: "",
    notes: "",
  };

  const callAddAClient = (input: typeof baseInput) =>
    addAClient(input, clientsDb, planLimitsDb, billingDb);

  it("returns Unauthorized message when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    const result = await callAddAClient(baseInput);
    expect(result).toEqual({ message: "Unauthorized" });
    expect(clientsDb.txAddClientAndPortal).not.toHaveBeenCalled();
  });

  it("returns the plan-limit message when the limit is reached", async () => {
    mockAssertCanAddClient.mockRejectedValueOnce(
      new Error("Client limit reached")
    );

    const result = await callAddAClient(baseInput);

    expect(result).toEqual({ message: "Server error" });
    expect(clientsDb.txAddClientAndPortal).not.toHaveBeenCalled();
  });

  it("returns a validation message for a missing name", async () => {
    const result = await callAddAClient({ ...baseInput, name: "  " });

    expect(result).toEqual({ message: "name is required" });
    expect(clientsDb.txAddClientAndPortal).not.toHaveBeenCalled();
  });

  it("returns a validation message for an invalid email", async () => {
    const result = await callAddAClient({ ...baseInput, email: "nope" });

    expect(result).toEqual({
      message: expect.stringContaining("email"),
    });
    expect(clientsDb.txAddClientAndPortal).not.toHaveBeenCalled();
  });

  it("inserts the client and its portal in one transaction, returning the created row", async () => {
    const result = await callAddAClient(baseInput);

    expect(clientsDb.txAddClientAndPortal).toHaveBeenCalledWith({
      name: "John",
      email: "john@example.com",
      phone: null,
      status: "active",
      notes: undefined,
      userId: "user_1",
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 42,
        name: "John",
        clientId: 42,
        token: expect.any(String),
      })
    );
  });

  it("returns Server error when the transaction fails", async () => {
    clientsDb.txAddClientAndPortal.mockRejectedValueOnce(new Error("db down"));

    const result = await callAddAClient(baseInput);

    expect(result).toEqual({ message: "Server error" });
  });
});

// ─── updateExistingClient ─────────────────────────────────────────────────

describe("updateExistingClient", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(
      updateExistingClient({ id: 1, name: "X" }, clientsDb)
    ).rejects.toThrow("Unauthorized");
  });

  it("does nothing when no updatable fields are provided", async () => {
    await updateExistingClient({ id: 1 }, clientsDb);
    expect(clientsDb.updateClient).not.toHaveBeenCalled();
  });

  it("skips empty-string fields", async () => {
    await updateExistingClient(
      { id: 1, name: "", email: "", phone: "" },
      clientsDb
    );
    expect(clientsDb.updateClient).not.toHaveBeenCalled();
  });

  it("throws when neither id nor clientName is provided", async () => {
    await expect(
      updateExistingClient({ email: "new@x.com" }, clientsDb)
    ).rejects.toThrow("id or clientName is required");
    expect(clientsDb.updateClient).not.toHaveBeenCalled();
  });

  it("throws Validation error when no client found via getClientByName", async () => {
    clientsDb.getClientByName.mockResolvedValueOnce([]);
    await expect(
      updateExistingClient(
        { clientName: "Nobody", email: "new@x.com" },
        clientsDb
      )
    ).rejects.toThrow("No client found");
    expect(clientsDb.updateClient).not.toHaveBeenCalled();
  });

  it("looks up the client by clientName when id is not provided", async () => {
    clientsDb.getClientByName.mockResolvedValueOnce([
      { ...canonicalClientRow, id: 7, name: "Jane Client" },
    ]);
    await updateExistingClient(
      { clientName: "Jane Client", email: "new@x.com" },
      clientsDb
    );
    expect(clientsDb.getClientByName).toHaveBeenCalledWith(
      "user_1",
      "Jane Client"
    );
    expect(clientsDb.updateClient).toHaveBeenCalledWith(7, "user_1", {
      email: "new@x.com",
    });
  });

  it("updates the provided fields scoped to the user", async () => {
    await updateExistingClient(
      { id: 1, name: "Johnny", status: "inactive" },
      clientsDb
    );
    expect(clientsDb.updateClient).toHaveBeenCalledWith(1, "user_1", {
      name: "Johnny",
      status: "inactive",
    });
  });

  it("rejects an invalid status", async () => {
    await expect(
      updateExistingClient(
        { id: 1, status: "archived" as UpdateClientInput["status"] },
        clientsDb
      )
    ).rejects.toThrow("status must be one of");
    expect(clientsDb.updateClient).not.toHaveBeenCalled();
  });
});

// ─── deleteClient ─────────────────────────────────────────────────────────

describe("deleteClient", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(deleteClient({ id: 1 }, clientsDb)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("deletes the client scoped to the user", async () => {
    await deleteClient({ id: 7 }, clientsDb);
    expect(clientsDb.deleteClient).toHaveBeenCalledWith(7, "user_1");
  });
});

// ─── updateNotes ──────────────────────────────────────────────────────────

describe("updateNotes", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(
      updateNotes({ id: 1, notes: "hello" }, clientsDb)
    ).rejects.toThrow("Unauthorized");
  });

  it("allows clearing notes with an empty string", async () => {
    await updateNotes({ id: 1, notes: "" }, clientsDb);
    expect(clientsDb.updateClient).toHaveBeenCalledWith(1, "user_1", {
      notes: "",
    });
  });

  it("persists trimmed notes", async () => {
    await updateNotes({ id: 1, notes: "  call back  " }, clientsDb);
    expect(clientsDb.updateClient).toHaveBeenCalledWith(1, "user_1", {
      notes: "call back",
    });
  });
});
