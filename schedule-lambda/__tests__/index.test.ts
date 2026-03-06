jest.mock("@repo/db/db", () => ({
  db: {
    update: jest.fn(),
  },
}));

jest.mock("@repo/db/schema", () => ({
  events: {},
}));

jest.mock("drizzle-orm", () => ({
  eq: jest.fn().mockReturnValue("eq-result"),
}));

import { handler } from "../src/index";
import { db } from "@repo/db/db";
import { eq } from "drizzle-orm";

describe("schedule-lambda handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockDbUpdate() {
    const mockWhere = jest.fn().mockResolvedValue(undefined);
    const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
    (db.update as jest.Mock).mockReturnValue({ set: mockSet });
    return { mockSet, mockWhere };
  }

  it("updates the event status to active", async () => {
    const { mockSet, mockWhere } = mockDbUpdate();

    await handler({ userId: "user_1", id: "event-123" });

    expect(db.update).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith({ status: "active" });
    expect(mockWhere).toHaveBeenCalledWith("eq-result");
    expect(eq).toHaveBeenCalledWith(undefined, "event-123"); // events.id is undefined in the mock
  });

  it("logs the user id", async () => {
    mockDbUpdate();
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    await handler({ userId: "user_42", id: "event-99" });

    expect(consoleSpy).toHaveBeenCalledWith("user_42");
    consoleSpy.mockRestore();
  });

  it("handles a db error without throwing", async () => {
    (db.update as jest.Mock).mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockRejectedValue(new Error("DB error")),
      }),
    });
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(handler({ userId: "user_1", id: "event-123" })).resolves.not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
