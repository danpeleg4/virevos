export interface MeetingType {
    id: number;
    name: string;
    duration: number;
    description: string;
    color: string;
    bookingLink?: string;
    active: boolean;
    maxBookings?: number | null;
    maxPerDay?: number;
    bufferTime?: number;
    confirmationEmail?: boolean;
    reminderEmail?: boolean;
    requiresApproval?: boolean;
}

export type MeetingStatus = "scheduled" | "rescheduled" | "conflict" | "completed";

export interface Attendee {
    name: string;
    initials: string;
}

export interface Meeting {
    id: string;
    title: string;
    description: string;
    link: string;
    date: string;
    time: string;
    duration: number;
    type: MeetingTypePlatform;
    attendees?: Attendee[];
    status: MeetingStatus;
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
    status: Extract<MeetingStatus, "scheduled" | "rescheduled" | "conflict" | "completed">;
    hasNotes?: boolean;
    hasTranscript?: boolean;
    autoRescheduled?: boolean;
    conflictReason?: string | null;
}