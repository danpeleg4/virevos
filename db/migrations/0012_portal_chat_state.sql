-- Per-conversation chat state for the agency-side inbox
ALTER TABLE "client_portal_tokens" ADD COLUMN "chat_starred" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "client_portal_tokens" ADD COLUMN "chat_archived" boolean DEFAULT false NOT NULL;
