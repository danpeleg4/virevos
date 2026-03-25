export interface InboxMessage {
  id: string;
  gmailId?: string;
  threadId?: string;
  type: "email" | "chat";
  from: string;
  fromEmail?: string;
  initials: string;
  subject?: string;
  preview: string;
  body?: string;
  timestamp: Date | string;
  unread: boolean;
  starred: boolean;
  archived?: boolean;
  sent?: boolean;
  client: string;
  clientId?: number | null;
  labels?: string[];
  tags: string[];
}

export interface ThreadMessage {
  id: string;
  type: "email" | "chat";
  from: string;
  to: string;
  subject?: string;
  content: string;
  timestamp: string;
  date: Date;
  starred: boolean;
  actionItems?: string[];
}

export interface AttachedFile {
  id: string;
  name: string;
  size: string;
  type: "document" | "image" | "other";
  url?: string;
  path?: string;
  data?: string;
  mimeType?: string;
}

export interface ActionItem {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "in-progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate?: string;
  assignee?: string;
  tags: string[];
}

export interface ScheduledEmail {
  id: number;
  toEmail: string;
  toName: string | null;
  subject: string;
  bodyHtml: string;
  bodyText: string | null;
  scheduledAt: string;
  timezone: string;
  recurring: string | null;
  status: string;
  sentAt: string | null;
  errorMessage: string | null;
  clientId: number | null;
  createdAt: string | null;
}

export interface ScheduleDetails {
  date: Date;
  time: string;
  timezone: string;
  recurring?: "none" | "daily" | "weekly" | "monthly";
}
