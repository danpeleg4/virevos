DROP TABLE "emails" CASCADE;--> statement-breakpoint
DROP TABLE "google_sync_state" CASCADE;--> statement-breakpoint
DROP TABLE "google_tokens" CASCADE;--> statement-breakpoint
ALTER TABLE "email_attachments" DROP CONSTRAINT IF EXISTS "email_attachments_email_id_emails_id_fk";
--> statement-breakpoint
DROP INDEX "events_google_event_id_idx";--> statement-breakpoint
ALTER TABLE "email_attachments" ADD CONSTRAINT "email_attachments_email_id_outlook_emails_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."outlook_emails"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_attachments" DROP COLUMN "gmail_attachment_id";--> statement-breakpoint
ALTER TABLE "events" DROP COLUMN "google_event_id";--> statement-breakpoint
ALTER TABLE "scheduled_emails" DROP COLUMN "aws_schedule_name";