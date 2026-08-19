import {
  formatDateOnlyString,
  parseDateOnlyString,
} from "@/lib/util/date_utils";

describe("formatDateOnlyString", () => {
  it("formats a local date as YYYY-MM-DD", () => {
    expect(formatDateOnlyString(new Date(2026, 7, 19))).toBe("2026-08-19");
  });

  it("pads single-digit months and days with a leading zero", () => {
    expect(formatDateOnlyString(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("round-trips through parseDateOnlyString without shifting the day", () => {
    const dateStr = "2026-12-31";
    expect(formatDateOnlyString(parseDateOnlyString(dateStr))).toBe(dateStr);
  });
});
