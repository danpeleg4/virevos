CREATE TABLE "google_sync_state" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "google_sync_state_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"channel_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"sync_token" text,
	"channel_expiration" bigint,
	"user_id" varchar NOT NULL,
	CONSTRAINT "google_sync_state_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "google_sync_state" ADD CONSTRAINT "google_sync_state_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;
