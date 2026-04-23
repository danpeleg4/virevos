CREATE TABLE "portal_meeting_bookings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal_meeting_bookings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"portal_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"client_name" text NOT NULL,
	"client_email" text NOT NULL,
	"date_time" timestamp NOT NULL,
	"duration" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"meeting_link" text,
	"event_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "portal_meeting_bookings" ADD CONSTRAINT "portal_meeting_bookings_portal_id_client_portal_tokens_id_fk" FOREIGN KEY ("portal_id") REFERENCES "public"."client_portal_tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_meeting_bookings" ADD CONSTRAINT "portal_meeting_bookings_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_meeting_bookings" ADD CONSTRAINT "portal_meeting_bookings_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_meeting_bookings" ADD CONSTRAINT "portal_meeting_bookings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;