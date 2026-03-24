ALTER TABLE "users" ALTER COLUMN "ai_credits" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "storage" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "image";