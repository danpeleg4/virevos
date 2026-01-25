export type MeetingStatus = "scheduled" | "rescheduled" | "conflict" | "completed" | "cancelled" | "ended" | "upcoming";

export interface Attendee {
    name: string;
    initials: string;
}

export interface Event {
    id: string;
    title: string;
    description: string;
    link?: string;
    date: string;
    time: string;
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

export interface NewMeetingInput {
    id: number;
    title: string;
    description: string;
    date: string;
    time: string;
    duration: number;
    attendees?: Attendee[];
    status: MeetingStatus;
    hasNotes?: boolean;
    hasTranscript?: boolean;
    autoRescheduled?: boolean;
    conflictReason?: string | null;
    isMeeting: boolean;
    utcISO: string;
}