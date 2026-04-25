-- Rename tables
ALTER TABLE "projects" RENAME TO "cases";--> statement-breakpoint
ALTER TABLE "project_files" RENAME TO "case_files";--> statement-breakpoint
ALTER TABLE "project_notes" RENAME TO "case_notes";--> statement-breakpoint

-- Rename project_id columns to case_id
ALTER TABLE "case_files" RENAME COLUMN "project_id" TO "case_id";--> statement-breakpoint
ALTER TABLE "case_notes" RENAME COLUMN "project_id" TO "case_id";--> statement-breakpoint
ALTER TABLE "tasks" RENAME COLUMN "project_id" TO "case_id";--> statement-breakpoint

-- Drop old foreign key constraints
ALTER TABLE "case_files" DROP CONSTRAINT "project_files_project_id_projects_id_fk";--> statement-breakpoint
ALTER TABLE "case_notes" DROP CONSTRAINT "project_notes_project_id_projects_id_fk";--> statement-breakpoint
ALTER TABLE "cases" DROP CONSTRAINT "projects_client_id_clients_id_fk";--> statement-breakpoint
ALTER TABLE "cases" DROP CONSTRAINT "projects_user_id_users_user_id_fk";--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_project_id_projects_id_fk";--> statement-breakpoint

-- Re-add foreign key constraints with new names
ALTER TABLE "case_files" ADD CONSTRAINT "case_files_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_files" ADD CONSTRAINT "case_files_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_notes" ADD CONSTRAINT "case_notes_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_notes" ADD CONSTRAINT "case_notes_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;
