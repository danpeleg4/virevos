ALTER TABLE "tasks" DROP CONSTRAINT "tasks_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "user_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;