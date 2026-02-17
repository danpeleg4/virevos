export type MeetingStatus =
  | "scheduled"
  | "rescheduled"
  | "conflict"
  | "completed"
  | "cancelled"
  | "ended"
  | "upcoming";

export interface Attendee {
  name: string;
  initials: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  link?: string;
  dateTime: Date;
  duration: number;
  attendees?: Attendee[];
  status?: MeetingStatus | string;
  conflictReason?: string | null | undefined;
  autoRescheduled?: boolean;
  hasNotes?: boolean;
  hasTranscript?: boolean;
  googleEventId?: string | null;
  isMeeting: boolean;
}

type RawChunk = {
  id: string;
  chunk_text: string;
  speaker: string;
  start_time: number;
  end_time: number;
  room: string;
};

type TranscribedChunk = {
  speaker: string;
  time: string;
  text: string;
  startTime: number;
};