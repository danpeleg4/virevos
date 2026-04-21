CREATE TABLE "meeting_transcripts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "meeting_transcripts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"meeting_id" text NOT NULL,
	"speaker_identity" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "meeting_transcripts" ADD CONSTRAINT "meeting_transcripts_meeting_id_events_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;