jest.mock("@db/db", () => ({ db: {} }));
jest.mock("@db/schema", () => ({
  events: {},
  outlookEmails: {},
  outlookSyncState: {},
}));
jest.mock("drizzle-orm", () => ({
  and: jest.fn(),
  eq: jest.fn(),
}));
jest.mock("@/lib/outlook_access", () => ({
  getFreshOutlookAccessToken: jest.fn(),
}));

import { parseGraphDateTime } from "@/lib/outlook_sync";

describe("parseGraphDateTime", () => {
  it("parses Graph's tz-less dateTime as UTC (not local)", () => {
    const result = parseGraphDateTime({
      dateTime: "2026-04-25T19:00:00.0000000",
      timeZone: "UTC",
    });
    expect(result.getTime()).toBe(
      new Date("2026-04-25T19:00:00Z").getTime()
    );
  });

  it("preserves the UTC instant regardless of fractional seconds format", () => {
    const result = parseGraphDateTime({
      dateTime: "2026-01-15T08:30:45.1234567",
      timeZone: "UTC",
    });
    expect(result.toISOString()).toBe("2026-01-15T08:30:45.123Z");
  });

  it("does not shift by the host timezone offset", () => {
    // Regardless of where the test runs, the parsed instant must equal the
    // UTC moment encoded in the string. If we accidentally parsed as local,
    // the millisecond value would differ by getTimezoneOffset().
    // getTimezoneOffset returns (UTC - local) in minutes, so parsing the
    // same string as local produces an instant that is (offset * 60_000)
    // ms LATER than the UTC-parsed instant.
    const dateTime = "2026-07-04T12:00:00.0000000";
    const parsed = parseGraphDateTime({ dateTime, timeZone: "UTC" });
    const local = new Date(dateTime);
    const expectedDeltaMs = -local.getTimezoneOffset() * 60_000;
    expect(parsed.getTime() - local.getTime()).toBe(expectedDeltaMs);
  });
});
