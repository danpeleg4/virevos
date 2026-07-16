CREATE TABLE "demo_requests" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "demo_requests_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"email" text NOT NULL,
	"company" text,
	"message" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "demo_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "demo_requests_created_at_idx" ON "demo_requests" USING btree ("created_at");