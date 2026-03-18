import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  varchar,
  date,
  bigint,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// USERS
export const users = pgTable("users", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  user_id: varchar("user_id").notNull().unique(),
  name: text("name"),
  email: text("email").notNull(),
  image: text("image"),
  ai_credits: integer("ai_credits").notNull().default(10),
  recordingStatus: boolean("recordingStatus").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// CLIENTS
export const clients = pgTable("clients", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  industry: text("industry"),
  notes: text("notes"),
  status: text("status").notNull().default("active"),

  userId: varchar("user_id")
    .notNull()
    .references(() => users.user_id, { onDelete: "cascade" }),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// PROJECTS
export const projects = pgTable("projects", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),

  clientId: integer("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),

  name: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("in-progress"),
  dueDate: date("due_date").notNull().default("2025-01-01"),
  priority: text("priority").notNull().default("low"),
  health: text("health").notNull().default("On Track"),

  userId: varchar("user_id")
    .notNull()
    .references(() => users.user_id, { onDelete: "cascade" }),
});

// EVENTS
export const events = pgTable("events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  link: text("link"),
  dateTime: timestamp("date_time").notNull(),
  duration: integer("duration").notNull(),
  isMeeting: boolean().default(false),
  status: text("status"),
  tags: text("tags").array().default([]),
  hasNotes: boolean("has_notes").default(false),
  hasTranscript: boolean("has_transcript").default(false),
  ai_summary: text("ai_summary"),
  key_points: text("key_points").array(),
  action_items:
    jsonb("action_items").$type<
      Array<{
        task: string;
        owner: string;
        dueDate: string | null;
        completed: boolean;
        added?: boolean;
      }>
    >(),
  autoRescheduled: boolean("auto_rescheduled").default(false),
  conflictReason: text("conflict_reason"),
  origin: text("origin").default("app"),
  googleEventId: text("google_event_id"),

  userId: varchar("user_id")
    .notNull()
    .references(() => users.user_id, { onDelete: "cascade" }),
});

// NOTES
export const notes = pgTable("notes", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),

  userId: varchar("user_id").references(() => users.user_id),
  projectId: integer("project_id").references(() => projects.id),
});

// TASKS
export const tasks = pgTable("tasks", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.user_id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  projectId: integer("project_id").references(() => projects.id, {
    onDelete: "cascade",
  }),
  priority: text("priority").notNull().default("Low"),
  status: text("status").notNull().default("in-progress"),
  dueDate: date("due_date"),
  completed: boolean("completed").default(false),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// FILES
export const projectFiles = pgTable("project_files", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  userId: text("user_id").references(() => users.user_id),
  name: text("name").notNull(),
  path: text("path").notNull(),
  size: integer("size").notNull(),
  mimeType: text("mime_type"),
  createdAt: timestamp("created_at").defaultNow(),
});

// MEETING ATTENDEES
export const meetingAttendees = pgTable(
  "meeting_attendees",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    meetingId: text("meeting_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    initials: text("initials").notNull(),
  },
  (t) => [
    unique("meeting_attendees_meeting_id_name_unique").on(t.meetingId, t.name),
  ]
);

// GOOGLE TOKENS
export const googleTokens = pgTable("google_tokens", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  access_token: text("access_token").notNull(),
  refresh_token: text("refresh_token").notNull(),
  expires_in: bigint("expires_in", { mode: "number" }).notNull(),
  connected: boolean("connected").default(false),

  userId: varchar("user_id")
    .notNull()
    .references(() => users.user_id, { onDelete: "cascade" }),
});

// GOOGLE SYNC STATE
export const googleSyncState = pgTable("google_sync_state", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  channelId: text("channel_id").notNull(),
  resourceId: text("resource_id").notNull(),
  syncToken: text("sync_token"),
  channelExpiration: bigint("channel_expiration", { mode: "number" }),

  userId: varchar("user_id")
    .notNull()
    .unique()
    .references(() => users.user_id, { onDelete: "cascade" }),
});

// EMAILS - Gmail messages stored locally
export const emails = pgTable("emails", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  gmailId: text("gmail_id").notNull(),
  threadId: text("thread_id").notNull(),
  subject: text("subject").default("(no subject)"),
  snippet: text("snippet"),
  fromEmail: text("from_email"),
  fromName: text("from_name"),
  toEmails: text("to_emails").array().default([]),
  ccEmails: text("cc_emails").array().default([]),
  bodyHtml: text("body_html"),
  bodyText: text("body_text"),
  labelIds: text("label_ids").array().default([]),
  isRead: boolean("is_read").default(false),
  isStarred: boolean("is_starred").default(false),
  isArchived: boolean("is_archived").default(false),
  isSent: boolean("is_sent").default(false),
  sentAt: timestamp("sent_at").notNull(),
  clientId: integer("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.user_id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// EMAIL ATTACHMENTS
export const emailAttachments = pgTable("email_attachments", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  emailId: integer("email_id")
    .notNull()
    .references(() => emails.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  mimeType: text("mime_type"),
  size: integer("size"),
  gmailAttachmentId: text("gmail_attachment_id"),
  supabasePath: text("supabase_path"),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.user_id, { onDelete: "cascade" }),
});

// SCHEDULED EMAILS
export const scheduledEmails = pgTable("scheduled_emails", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  toEmail: text("to_email").notNull(),
  toName: text("to_name"),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  recurring: text("recurring").default("none"),
  status: text("status").notNull().default("pending"),
  awsScheduleName: text("aws_schedule_name"),
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  clientId: integer("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.user_id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// CONVERSATION SUMMARIES
export const conversationSummaries = pgTable("conversation_summaries", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  keyTopics: text("key_topics").array().default([]),
  actionItems: text("action_items").array().default([]),
  sentiment: text("sentiment").default("neutral"),
  emailCount: integer("email_count").default(0),
  generatedAt: timestamp("generated_at").defaultNow(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.user_id, { onDelete: "cascade" }),
});

// CLIENT PORTAL TOKENS
export const clientPortalTokens = pgTable("client_portal_tokens", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  enabled: boolean("enabled").default(true),
  settings: jsonb("settings")
    .$type<{
      brandColor?: string;
      welcomeMessage?: string;
      customDomain?: string;
      chatEnabled?: boolean;
      fileSharing?: boolean;
      aiChatBot?: boolean;
      emailNotifications?: boolean;
    }>()
    .default({}),
  lastAccessedAt: timestamp("last_accessed_at"),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.user_id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// SUBSCRIPTIONS
export const subscriptions = pgTable("subscriptions", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .unique()
    .references(() => users.user_id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  stripePriceId: text("stripe_price_id"),
  plan: text("plan").notNull().default("starter"), // "starter" | "professional" | "business"
  status: text("status").notNull().default("active"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// RELATIONS
export const usersRelations = relations(users, ({ many, one }) => ({
  clients: many(clients),
  projects: many(projects),
  tasks: many(tasks),
  meetings: many(events),
  googleTokens: many(googleTokens),
  googleSyncState: one(googleSyncState, {
    fields: [users.user_id],
    references: [googleSyncState.userId],
  }),
  emails: many(emails),
  scheduledEmails: many(scheduledEmails),
  conversationSummaries: many(conversationSummaries),
  clientPortalTokens: many(clientPortalTokens),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, {
    fields: [clients.userId],
    references: [users.user_id],
  }),
  projects: many(projects),
  emails: many(emails),
  scheduledEmails: many(scheduledEmails),
  conversationSummary: one(conversationSummaries, {
    fields: [clients.id],
    references: [conversationSummaries.clientId],
  }),
  portalToken: one(clientPortalTokens, {
    fields: [clients.id],
    references: [clientPortalTokens.clientId],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.user_id],
  }),
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  tasks: many(tasks),
  notes: many(notes),
  files: many(projectFiles),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.user_id],
  }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  user: one(users, {
    fields: [notes.userId],
    references: [users.user_id],
  }),
  project: one(projects, {
    fields: [notes.projectId],
    references: [projects.id],
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  user: one(users, {
    fields: [events.userId],
    references: [users.user_id],
  }),
  attendees: many(meetingAttendees),
  notes: many(notes),
}));

export const meetingAttendeesRelations = relations(
  meetingAttendees,
  ({ one }) => ({
    meeting: one(events, {
      fields: [meetingAttendees.meetingId],
      references: [events.id],
    }),
  })
);

export const googleRelations = relations(googleTokens, ({ one }) => ({
  user: one(users, {
    fields: [googleTokens.userId],
    references: [users.user_id],
  }),
}));

export const googleSyncStateRelations = relations(
  googleSyncState,
  ({ one }) => ({
    user: one(users, {
      fields: [googleSyncState.userId],
      references: [users.user_id],
    }),
  })
);

export const emailsRelations = relations(emails, ({ one, many }) => ({
  user: one(users, {
    fields: [emails.userId],
    references: [users.user_id],
  }),
  client: one(clients, {
    fields: [emails.clientId],
    references: [clients.id],
  }),
  attachments: many(emailAttachments),
}));

export const emailAttachmentsRelations = relations(
  emailAttachments,
  ({ one }) => ({
    email: one(emails, {
      fields: [emailAttachments.emailId],
      references: [emails.id],
    }),
    user: one(users, {
      fields: [emailAttachments.userId],
      references: [users.user_id],
    }),
  })
);

export const scheduledEmailsRelations = relations(
  scheduledEmails,
  ({ one }) => ({
    user: one(users, {
      fields: [scheduledEmails.userId],
      references: [users.user_id],
    }),
    client: one(clients, {
      fields: [scheduledEmails.clientId],
      references: [clients.id],
    }),
  })
);

export const conversationSummariesRelations = relations(
  conversationSummaries,
  ({ one }) => ({
    user: one(users, {
      fields: [conversationSummaries.userId],
      references: [users.user_id],
    }),
    client: one(clients, {
      fields: [conversationSummaries.clientId],
      references: [clients.id],
    }),
  })
);

export const clientPortalTokensRelations = relations(
  clientPortalTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [clientPortalTokens.userId],
      references: [users.user_id],
    }),
    client: one(clients, {
      fields: [clientPortalTokens.clientId],
      references: [clients.id],
    }),
  })
);
