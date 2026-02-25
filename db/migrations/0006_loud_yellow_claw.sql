ALTER TABLE "tasks" ALTER COLUMN "due_date" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "due_date" DROP NOT NULL;