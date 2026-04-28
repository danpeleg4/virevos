-- Add clientId to events
ALTER TABLE "events" ADD COLUMN "client_id" integer;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- Meeting document requests (one per meeting that produces a checklist)
CREATE TABLE "meeting_document_requests" (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "meeting_document_requests_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
        "event_id" text NOT NULL,
        "client_id" integer,
        "user_id" varchar NOT NULL,
        "status" text DEFAULT 'pending_approval' NOT NULL,
        "created_at" timestamp with time zone DEFAULT now(),
        "approved_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "meeting_document_requests" ADD CONSTRAINT "meeting_document_requests_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_document_requests" ADD CONSTRAINT "meeting_document_requests_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_document_requests" ADD CONSTRAINT "meeting_document_requests_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_mdr_user_status" ON "meeting_document_requests" ("user_id","status");--> statement-breakpoint

-- Individual checklist items
CREATE TABLE "document_request_items" (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "document_request_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
        "request_id" integer NOT NULL,
        "name" text NOT NULL,
        "description" text,
        "sort_order" integer DEFAULT 0 NOT NULL,
        "status" text DEFAULT 'pending' NOT NULL,
        "uploaded_file_id" integer,
        "uploaded_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "document_request_items" ADD CONSTRAINT "document_request_items_request_id_meeting_document_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."meeting_document_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_request_items" ADD CONSTRAINT "document_request_items_uploaded_file_id_case_files_id_fk" FOREIGN KEY ("uploaded_file_id") REFERENCES "public"."case_files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_dri_request" ON "document_request_items" ("request_id","sort_order");
