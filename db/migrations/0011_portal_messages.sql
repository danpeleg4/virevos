-- Portal chat messages: one row per message exchanged in a client portal thread
CREATE TABLE "portal_messages" (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal_messages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
        "portal_id" integer NOT NULL,
        "client_id" integer NOT NULL,
        "user_id" varchar NOT NULL,
        "sender_type" text NOT NULL,
        "body" text NOT NULL,
        "read_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "portal_messages" ADD CONSTRAINT "portal_messages_portal_id_client_portal_tokens_id_fk" FOREIGN KEY ("portal_id") REFERENCES "public"."client_portal_tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_messages" ADD CONSTRAINT "portal_messages_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_messages" ADD CONSTRAINT "portal_messages_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_portal_messages_portal_created" ON "portal_messages" ("portal_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_portal_messages_user_unread" ON "portal_messages" ("user_id","read_at");
