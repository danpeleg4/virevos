export interface MeetingType {
    id: number;
    name: string;
    duration: number;
    description: string;
    color: string;
    bookingLink?: string;
    active: boolean;
    maxPerDay?: number;
}

export type MeetingStatus = "scheduled" | "rescheduled" | "conflict" | "completed" | "cancelled" | "ended" | "upcoming";

export interface Attendee {
    name: string;
    initials: string;
}

export interface Meeting {
    id: int;
    title: string;
    description: string;
    link: string;
    date: string;
    time: string;
    duration: number;
    type: MeetingTypePlatform;
    attendees?: Attendee[];
    status: MeetingStatus | string;
    conflictReason?: string | null | undefined;
    autoRescheduled?: boolean;
    hasNotes?: boolean;
    hasTranscript?: boolean;
    googleEventId?: string | null;
}

export interface NewMeetingInput {
    id: number;
    title: string;
    description: string;
    date: string;
    time: string;
    duration: number;
    type: string;
    attendees?: Attendee[];
    status: MeetingStatus;
    hasNotes?: boolean;
    hasTranscript?: boolean;
    autoRescheduled?: boolean;
    conflictReason?: string | null;
}