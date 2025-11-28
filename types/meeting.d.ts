// Shared Meeting-related types used across client and server
export type MeetingType = "zoom" | "google-meet" | "in-person";

export type MeetingStatus = "scheduled" | "rescheduled" | "conflict" | "completed";

export interface Attendee {
    name: string;
    initials: string;
}

// Full Meeting object as stored/returned by the API
export interface Meeting {
    id: string;
    title: string;
    description: string;
    link: string; // meeting/join URL if applicable
    date: string; // YYYY-MM-DD
    time: string; // e.g., "3:30 PM"
    duration: number; // in minutes
    type: MeetingType;
    attendees?: Attendee[];
    status: MeetingStatus;
    conflictReason?: string | null | undefined;
    autoRescheduled?: boolean;
    hasNotes?: boolean;
    hasTranscript?: boolean;
}

// Input payload when creating a new meeting (prior to link generation)
export interface NewMeetingInput {
    id: string;
    title: string;
    description: string;
    date: string;
    time: string;
    duration: number;
    type: MeetingType;
    attendees?: Attendee[];
    status: Extract<MeetingStatus, "scheduled" | "rescheduled" | "conflict" | "completed">;
    hasNotes?: boolean;
    hasTranscript?: boolean;
    autoRescheduled?: boolean;
    conflictReason?: string | null;
}
