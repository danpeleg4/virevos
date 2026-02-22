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

type ActionItem = {
  task: string;
  owner: string;
  dueDate: string;
  completed: boolean;
};

interface MeetingNote {
  id: string;
  title: string;
  dateTime: string;
  time: string;
  duration: string;
  attendees: { name: string; initials: string }[];
  ai_summary: string;
  actionItems: ActionItem[];
  key_points: string[];
  transcript: { speaker: string; time: string; text: string }[];
  tags: string[];
  hasTranscript: boolean;
  status: string;
}

type Transcript = {
  speaker: string;
  time: string;
  text: string;
};

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
  ai_summary?: string;
  key_points?: string[];
  actionItems?: ActionItem[];
  tags?: string[];
  transcript?: Transcript[];
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
