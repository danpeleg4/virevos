ALTER TABLE "document_request_items" ADD COLUMN "ai_verdict" text;--> statement-breakpoint
ALTER TABLE "document_request_items" ADD COLUMN "ai_reasoning" text;--> statement-breakpoint
ALTER TABLE "document_request_items" ADD COLUMN "ai_analyzed_at" timestamp with time zone;