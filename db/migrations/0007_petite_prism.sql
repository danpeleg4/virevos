ALTER TABLE "projects" ALTER COLUMN "due_date" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "due_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "health";