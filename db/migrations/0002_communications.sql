CREATE TABLE "emails" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "gmail_id" text NOT NULL,
  "thread_id" text NOT NULL,
  "subject" text DEFAULT '(no subject)',
  "snippet" text,
  "from_email" text,
  "from_name" text,
  "to_emails" text[] DEFAULT '{}',
  "cc_emails" text[] DEFAULT '{}',
  "body_html" text,
  "body_text" text,
  "label_ids" text[] DEFAULT '{}',
  "is_read" boolean DEFAULT false,
  "is_starred" boolean DEFAULT false,
  "is_archived" boolean DEFAULT false,
  "is_sent" boolean DEFAULT false,
  "sent_at" timestamp NOT NULL,
  "client_id" integer REFERENCES "clients"("id") ON DELETE SET NULL,
  "user_id" varchar NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX "emails_gmail_id_user_id_idx" ON "emails"("gmail_id", "user_id");

CREATE TABLE "email_attachments" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "email_id" integer NOT NULL REFERENCES "emails"("id") ON DELETE CASCADE,
  "filename" text NOT NULL,
  "mime_type" text,
  "size" integer,
  "gmail_attachment_id" text,
  "supabase_path" text,
  "user_id" varchar NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE
);

CREATE TABLE "scheduled_emails" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "to_email" text NOT NULL,
  "to_name" text,
  "subject" text NOT NULL,
  "body_html" text NOT NULL,
  "body_text" text,
  "scheduled_at" timestamp NOT NULL,
  "timezone" text NOT NULL DEFAULT 'UTC',
  "recurring" text DEFAULT 'none',
  "status" text NOT NULL DEFAULT 'pending',
  "aws_schedule_name" text,
  "sent_at" timestamp,
  "error_message" text,
  "client_id" integer REFERENCES "clients"("id") ON DELETE SET NULL,
  "user_id" varchar NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE "conversation_summaries" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "client_id" integer NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
  "summary" text NOT NULL,
  "key_topics" text[] DEFAULT '{}',
  "action_items" text[] DEFAULT '{}',
  "sentiment" text DEFAULT 'neutral',
  "email_count" integer DEFAULT 0,
  "generated_at" timestamp DEFAULT now(),
  "user_id" varchar NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE
);

CREATE TABLE "client_portal_tokens" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "client_id" integer NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
  "token" text NOT NULL UNIQUE,
  "enabled" boolean DEFAULT true,
  "settings" jsonb DEFAULT '{}',
  "last_accessed_at" timestamp,
  "user_id" varchar NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now()
);
