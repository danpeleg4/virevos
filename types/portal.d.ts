export interface AvailabilityDay {
  enabled: boolean;
  startTime: string; // "HH:MM" 24h format
  endTime: string; // "HH:MM" 24h format
}

export interface PortalAvailability {
  weeklySchedule: Record<string, AvailabilityDay>;
  meetingDurations: number[];
  bufferMinutes: number;
  timezone: string;
}

export interface PortalMeetingBooking {
  id: number;
  portalId: number;
  clientId: number;
  userId: string;
  clientName: string;
  clientEmail: string;
  dateTime: string; // ISO string
  duration: number;
  status: "pending" | "confirmed" | "cancelled";
  notes: string | null;
  meetingLink: string | null;
  eventId: string | null;
  createdAt: string | null;
}

export interface BookingInput {
  clientName: string;
  clientEmail: string;
  dateTime: string; // ISO string of selected slot
  duration: number;
  notes?: string;
}

export interface TimeSlot {
  startTime: string; // ISO string
  available: boolean;
}

export interface PortalRecord {
  id: number;
  clientId: number;
  clientName: string | null;
  token: string;
  enabled: boolean;
  settings: {
    title?: string;
    brandColor?: string;
    welcomeMessage?: string;
    customDomain?: string;
    chatEnabled?: boolean;
    fileSharing?: boolean;
    aiChatBot?: boolean;
    emailNotifications?: boolean;
    meetingSchedulingEnabled?: boolean;
    availability?: PortalAvailability;
  };
  portalUrl: string;
  lastAccessedAt: string | null;
}

import type { PortalDocumentRequest } from "./document_requests";

export interface PortalData {
  client: {
    id: number;
    name: string;
    email: string | null;
  };
  settings: {
    title?: string;
    brandColor?: string;
    welcomeMessage?: string;
    chatEnabled?: boolean;
    fileSharing?: boolean;
    meetingSchedulingEnabled?: boolean;
    availability?: PortalAvailability;
  };
  cases: Array<{
    id: number;
    name: string;
    status: string;
    dueDate: string;
    priority: string;
    description: string | null;
  }>;
  messages: Array<{
    id: number;
    subject: string | null;
    preview: string;
    from: string;
    isSent: boolean;
    sentAt: string;
    isRead: boolean;
  }>;
  files: Array<{
    id: number;
    name: string;
    size: number;
    mimeType: string | null;
    path: string;
    createdAt: string | null;
  }>;
  bookings: Array<{
    id: number;
    dateTime: string;
    duration: number;
    status: string;
    meetingLink: string | null;
  }>;
  documentRequests: PortalDocumentRequest[];
}
