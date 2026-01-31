CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"link" text,
	"date" date DEFAULT '2025-01-01' NOT NULL,
	"time" text NOT NULL,
	"duration" integer NOT NULL,
	"isMeeting" boolean DEFAULT false,
	"status" text,
	"has_notes" boolean DEFAULT false,
	"has_transcript" boolean DEFAULT false,
	"auto_rescheduled" boolean DEFAULT false,
	"conflict_reason" text,
	"origin" text DEFAULT 'app',
	"google_event_id" text,
	"user_id" varchar NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meetings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "meetings" CASCADE;--> statement-breakpoint
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_meeting_id_events_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;