CREATE TABLE "outlook_emails" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "outlook_emails_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"outlook_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"subject" text DEFAULT '(no subject)',
	"snippet" text,
	"from_email" text,
	"from_name" text,
	"to_emails" text[] DEFAULT '{}',
	"cc_emails" text[] DEFAULT '{}',
	"body_html" text,
	"body_text" text,
	"is_read" boolean DEFAULT false,
	"is_starred" boolean DEFAULT false,
	"is_archived" boolean DEFAULT false,
	"is_sent" boolean DEFAULT false,
	"sent_at" timestamp NOT NULL,
	"client_id" integer,
	"user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "outlook_sync_state" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "outlook_sync_state_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"calendar_subscription_id" text,
	"email_subscription_id" text,
	"calendar_delta_link" text,
	"email_delta_link" text,
	"client_state" text,
	"subscription_expiration" bigint,
	"user_id" varchar NOT NULL,
	CONSTRAINT "outlook_sync_state_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "outlook_tokens" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "outlook_tokens_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_in" bigint NOT NULL,
	"connected" boolean DEFAULT false,
	"user_id" varchar NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "outlook_event_id" text;--> statement-breakpoint
ALTER TABLE "outlook_emails" ADD CONSTRAINT "outlook_emails_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outlook_emails" ADD CONSTRAINT "outlook_emails_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outlook_sync_state" ADD CONSTRAINT "outlook_sync_state_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outlook_tokens" ADD CONSTRAINT "outlook_tokens_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;