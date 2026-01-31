ALTER TABLE "events" ADD COLUMN "date_time" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "events" DROP COLUMN "date";--> statement-breakpoint
ALTER TABLE "events" DROP COLUMN "time";