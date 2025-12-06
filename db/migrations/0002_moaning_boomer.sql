ALTER TABLE "projects" DROP CONSTRAINT "projects_client_clients_id_fk";
--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "client" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_clients_name_fk" FOREIGN KEY ("client") REFERENCES "public"."clients"("name") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_name_unique" UNIQUE("name");