export type DocumentRequestStatus =
  | "pending_approval"
  | "approved"
  | "declined";
export type DocumentRequestItemStatus = "pending" | "uploaded" | "rejected";

export type DocumentRequestItemAiVerdict =
  | "meets"
  | "does_not_meet"
  | "needs_review"
  | "skipped"
  | "error";

export interface DocumentRequestItem {
  id: number;
  name: string;
  description: string | null;
  sortOrder: number;
  status: DocumentRequestItemStatus;
  uploadedFileId: number | null;
  uploadedAt: string | null;
  aiVerdict: DocumentRequestItemAiVerdict | null;
  aiReasoning: string | null;
  aiAnalyzedAt: string | null;
  uploadedFile?: {
    id: number;
    name: string;
    path: string;
  } | null;
}

export interface PendingDocRequest {
  id: number;
  eventId: string;
  eventTitle: string;
  eventDateTime: string;
  clientId: number | null;
  status: DocumentRequestStatus;
  createdAt: string | null;
  items: DocumentRequestItem[];
}

export interface PortalDocumentRequest {
  id: number;
  eventTitle: string;
  eventDateTime: string;
  approvedAt: string | null;
  items: DocumentRequestItem[];
}

export interface DocumentRequestItemInput {
  id?: number;
  name: string;
  description?: string | null;
  sortOrder: number;
}

export interface UpdateDocumentRequestPatch {
  clientId?: number | null;
  items?: DocumentRequestItemInput[];
}
