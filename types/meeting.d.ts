export interface Meeting {
    id: string;
    title: string;
    description: string;
    date: string;
    time: string;
    duration: number;
    type: "zoom" | "google-meet" | "in-person";
    attendees?: { name: string; initials: string }[];
    status: "scheduled" | "rescheduled" | "conflict" | "completed";
    conflictReason?: string;
    autoRescheduled?: boolean;
    hasNotes?: boolean;
    hasTranscript?: boolean;
}
