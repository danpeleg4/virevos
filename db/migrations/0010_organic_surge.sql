ALTER TABLE "meetings" ADD COLUMN "is_google_good" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "meetings" DROP COLUMN "google_cal_uid";