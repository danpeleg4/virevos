import { deriveMeetingStatus } from "@/lib/meeting_status";

describe("deriveMeetingStatus", () => {
  const now = new Date("2026-05-08T12:00:00Z");

  it("returns the meeting unchanged when isMeeting is false", () => {
    const meeting = {
      isMeeting: false,
      status: "upcoming",
      dateTime: new Date("2026-01-01T00:00:00Z"),
    };
    expect(deriveMeetingStatus(meeting, now)).toBe(meeting);
  });

  it("returns the meeting unchanged when status is already 'active'", () => {
    const meeting = {
      isMeeting: true,
      status: "active",
      dateTime: new Date("2026-01-01T00:00:00Z"),
    };
    expect(deriveMeetingStatus(meeting, now)).toBe(meeting);
  });

  it("returns the meeting unchanged when status is 'ended'", () => {
    const meeting = {
      isMeeting: true,
      status: "ended",
      dateTime: new Date("2026-01-01T00:00:00Z"),
    };
    expect(deriveMeetingStatus(meeting, now)).toBe(meeting);
  });

  it("flips 'upcoming' to 'active' when dateTime is in the past", () => {
    const meeting = {
      isMeeting: true,
      status: "upcoming",
      dateTime: new Date("2026-05-08T11:00:00Z"),
    };
    const result = deriveMeetingStatus(meeting, now);
    expect(result.status).toBe("active");
    expect(result).not.toBe(meeting);
  });

  it("keeps 'upcoming' when dateTime is in the future", () => {
    const meeting = {
      isMeeting: true,
      status: "upcoming",
      dateTime: new Date("2026-05-08T13:00:00Z"),
    };
    expect(deriveMeetingStatus(meeting, now)).toBe(meeting);
  });

  it("flips when dateTime is exactly now", () => {
    const meeting = {
      isMeeting: true,
      status: "upcoming",
      dateTime: now,
    };
    const result = deriveMeetingStatus(meeting, now);
    expect(result.status).toBe("active");
  });

  it("accepts a string dateTime", () => {
    const meeting = {
      isMeeting: true,
      status: "upcoming",
      dateTime: "2026-05-08T11:00:00Z",
    };
    const result = deriveMeetingStatus(meeting, now);
    expect(result.status).toBe("active");
  });

  it("flips other non-terminal statuses (e.g. 'scheduled') in the past", () => {
    const meeting = {
      isMeeting: true,
      status: "scheduled",
      dateTime: new Date("2026-05-08T11:00:00Z"),
    };
    const result = deriveMeetingStatus(meeting, now);
    expect(result.status).toBe("active");
  });

  it("preserves non-status fields when flipping", () => {
    const meeting = {
      id: "evt_1",
      isMeeting: true,
      status: "upcoming",
      dateTime: new Date("2026-05-08T11:00:00Z"),
      title: "Standup",
    };
    const result = deriveMeetingStatus(meeting, now);
    expect(result).toEqual({ ...meeting, status: "active" });
  });
});
