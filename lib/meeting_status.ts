type MeetingLike = {
  isMeeting?: boolean | null;
  status?: string | null;
  dateTime: Date | string;
};

export function deriveMeetingStatus<T extends MeetingLike>(
  meeting: T,
  now: Date = new Date(),
): T {
  if (!meeting.isMeeting) return meeting;
  if (meeting.status === "active" || meeting.status === "ended") return meeting;
  const start =
    meeting.dateTime instanceof Date
      ? meeting.dateTime
      : new Date(meeting.dateTime);
  if (start <= now) {
    return { ...meeting, status: "active" };
  }
  return meeting;
}
