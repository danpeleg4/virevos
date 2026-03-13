// --- DB mocks ---
const mockDbUpdate = jest.fn();
const mockDbSelect = jest.fn();
const mockDbInsert = jest.fn();

jest.mock("@repo/db/db", () => ({
  db: {
    update: mockDbUpdate,
    select: mockDbSelect,
    insert: mockDbInsert,
  },
}));

jest.mock("@repo/db/schema", () => ({
  events: {},
  scheduledEmails: {},
  emails: {},
  users: {},
  clients: {},
  googleTokens: {},
}));

jest.mock("drizzle-orm", () => ({
  eq: jest.fn().mockReturnValue("eq-result"),
}));

// --- googleapis mock ---
const mockGetProfile = jest.fn();
const mockMessagesSend = jest.fn();
const mockRefreshAccessToken = jest.fn();
const mockSetCredentials = jest.fn();

jest.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: mockSetCredentials,
        refreshAccessToken: mockRefreshAccessToken,
      })),
    },
    gmail: jest.fn().mockReturnValue({
      users: {
        getProfile: mockGetProfile,
        messages: { send: mockMessagesSend },
      },
    }),
  },
}));

// --- AWS Scheduler mock ---
const mockSchedulerSend = jest.fn();
jest.mock("@aws-sdk/client-scheduler", () => ({
  SchedulerClient: jest.fn().mockImplementation(() => ({ send: mockSchedulerSend })),
  DeleteScheduleCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

import { handler } from "../src/index";
import { db } from "@repo/db/db";
import { eq } from "drizzle-orm";

// Helpers for chained Drizzle mock calls
function setupSelectOnce(rows: unknown[]) {
  const mockLimit = jest.fn().mockResolvedValue(rows);
  const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
  const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
  mockDbSelect.mockReturnValueOnce({ from: mockFrom });
  return { mockFrom, mockWhere, mockLimit };
}

function setupSelectNoLimitOnce(rows: unknown[]) {
  const mockWhere = jest.fn().mockResolvedValue(rows);
  const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
  mockDbSelect.mockReturnValueOnce({ from: mockFrom });
  return { mockFrom, mockWhere };
}

function setupUpdate() {
  const mockWhere = jest.fn().mockResolvedValue(undefined);
  const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
  mockDbUpdate.mockReturnValue({ set: mockSet });
  return { mockSet, mockWhere };
}

function setupInsert() {
  const mockValues = jest.fn().mockResolvedValue(undefined);
  mockDbInsert.mockReturnValue({ values: mockValues });
  return { mockValues };
}

const pendingEmail = {
  id: 42,
  status: "pending",
  userId: "user_1",
  toEmail: "client@example.com",
  toName: "Client Name",
  subject: "Hello",
  bodyHtml: "<p>Hello</p>",
  bodyText: "Hello",
  clientId: null,
  awsScheduleName: "email-42-123456",
};

const validToken = {
  access_token: "fresh_token",
  refresh_token: "refresh_token",
  expires_in: Date.now() + 3_600_000, // 1 hour from now
  connected: true,
  userId: "user_1",
};

describe("schedule-lambda handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSchedulerSend.mockResolvedValue({});
  });

  // ─── Meeting events ────────────────────────────────────────────────────────

  describe("meeting events", () => {
    it("updates the event status to active", async () => {
      const { mockSet, mockWhere } = setupUpdate();

      await handler({ userId: "user_1", id: "event-123" });

      expect(db.update).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith({ status: "active" });
      expect(mockWhere).toHaveBeenCalledWith("eq-result");
      expect(eq).toHaveBeenCalledWith(undefined, "event-123");
    });

    it("logs the user id", async () => {
      setupUpdate();
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      await handler({ userId: "user_42", id: "event-99" });

      expect(consoleSpy).toHaveBeenCalledWith("user_42");
      consoleSpy.mockRestore();
    });

    it("handles a db error without throwing", async () => {
      mockDbUpdate.mockReturnValue({
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

  // ─── Scheduled email events ────────────────────────────────────────────────

  describe("scheduled_email events", () => {
    const emailEvent = { type: "scheduled_email" as const, scheduledEmailId: 42 };

    it("sends the email, stores it, marks sent, and deletes the schedule", async () => {
      setupSelectOnce([pendingEmail]);           // scheduledEmails
      setupSelectOnce([validToken]);             // googleTokens
      setupSelectOnce([{ name: "Dan" }]);        // users
      setupSelectNoLimitOnce([]);                // clients (no match)
      setupInsert();                             // emails.insert
      setupUpdate();                             // scheduledEmails.update (sent)

      mockGetProfile.mockResolvedValue({ data: { emailAddress: "dan@example.com" } });
      mockMessagesSend.mockResolvedValue({ data: { id: "gmail-id-1", threadId: "thread-1" } });

      await handler(emailEvent);

      expect(mockMessagesSend).toHaveBeenCalledTimes(1);
      expect(mockDbInsert).toHaveBeenCalledTimes(1);
      const { mockSet } = setupUpdate();
      expect(mockDbUpdate).toHaveBeenCalled();
      expect(mockSchedulerSend).toHaveBeenCalledTimes(1);
    });

    it("marks failed when Gmail token is not available", async () => {
      setupSelectOnce([pendingEmail]);  // scheduledEmails
      setupSelectOnce([]);              // googleTokens → no rows
      const { mockSet, mockWhere } = setupUpdate();

      await handler(emailEvent);

      expect(mockMessagesSend).not.toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith({
        status: "failed",
        errorMessage: "Gmail not connected for user",
      });
      expect(mockWhere).toHaveBeenCalledWith("eq-result");
    });

    it("marks failed when gmail.users.messages.send throws", async () => {
      setupSelectOnce([pendingEmail]);           // scheduledEmails
      setupSelectOnce([validToken]);             // googleTokens
      setupSelectOnce([{ name: "Dan" }]);        // users

      mockGetProfile.mockResolvedValue({ data: { emailAddress: "dan@example.com" } });
      mockMessagesSend.mockRejectedValue(new Error("Send failed"));
      const { mockSet, mockWhere } = setupUpdate();

      await handler(emailEvent);

      expect(mockSet).toHaveBeenCalledWith({
        status: "failed",
        errorMessage: "Send failed",
      });
      expect(mockWhere).toHaveBeenCalledWith("eq-result");
      expect(mockDbInsert).not.toHaveBeenCalled();
      expect(mockSchedulerSend).not.toHaveBeenCalled();
    });

    it("skips sending when email status is not pending", async () => {
      setupSelectOnce([{ ...pendingEmail, status: "sent" }]);

      await handler(emailEvent);

      expect(mockMessagesSend).not.toHaveBeenCalled();
      expect(mockDbUpdate).not.toHaveBeenCalled();
      expect(mockDbInsert).not.toHaveBeenCalled();
    });

    it("does not call DeleteScheduleCommand when awsScheduleName is null", async () => {
      setupSelectOnce([{ ...pendingEmail, awsScheduleName: null }]);
      setupSelectOnce([validToken]);
      setupSelectOnce([{ name: "Dan" }]);
      setupSelectNoLimitOnce([]);
      setupInsert();
      setupUpdate();

      mockGetProfile.mockResolvedValue({ data: { emailAddress: "dan@example.com" } });
      mockMessagesSend.mockResolvedValue({ data: { id: "gmail-id-2", threadId: "thread-2" } });

      await handler(emailEvent);

      expect(mockSchedulerSend).not.toHaveBeenCalled();
    });

    it("matches client by email when clientId is null", async () => {
      setupSelectOnce([pendingEmail]);
      setupSelectOnce([validToken]);
      setupSelectOnce([{ name: "Dan" }]);
      setupSelectNoLimitOnce([
        { id: 99, email: "other@example.com" },
        { id: 100, email: "client@example.com" },
      ]);
      const { mockValues } = setupInsert();
      setupUpdate();

      mockGetProfile.mockResolvedValue({ data: { emailAddress: "dan@example.com" } });
      mockMessagesSend.mockResolvedValue({ data: { id: "gmail-id-3", threadId: "thread-3" } });

      await handler(emailEvent);

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 100 })
      );
    });

    it("does nothing when scheduled email is not found", async () => {
      setupSelectOnce([]); // no rows
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      await handler(emailEvent);

      expect(consoleSpy).toHaveBeenCalledWith("Scheduled email not found:", 42);
      expect(mockMessagesSend).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
