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
    logoUrl?: string;
    customDomain?: string;
    chatEnabled?: boolean;
    fileSharing?: boolean;
    aiChatBot?: boolean;
    emailNotifications?: boolean;
  };
  portalUrl: string;
  lastAccessedAt: string | null;
}

export interface PortalData {
  client: {
    id: number;
    name: string;
    email: string | null;
    industry: string | null;
  };
  settings: {
    title?: string;
    brandColor?: string;
    welcomeMessage?: string;
    logoUrl?: string;
    chatEnabled?: boolean;
    fileSharing?: boolean;
  };
  projects: Array<{
    id: number;
    name: string;
    status: string;
    dueDate: string;
    health: string;
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
}
