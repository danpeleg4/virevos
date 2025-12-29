CREATE TABLE "meeting_types" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"duration" integer NOT NULL,
	"platform" text NOT NULL,
	"description" text,
	"color" text NOT NULL,
	"max_bookings" integer,
	"user_id" varchar NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meeting_types" ADD CONSTRAINT "meeting_types_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;