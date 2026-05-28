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
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// USERS
export const users = pgTable("users", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  user_id: varchar("user_id").notNull().unique(),
  name: text("name"),
  email: text("email").notNull(),
  avatarPath: text("avatar_path"),
  jobTitle: text("job_title"),
  company: text("company"),
  bio: text("bio"),
  timezone: text("timezone"),
  ai_credits: integer("ai_credits").notNull().default(0),
  storage: bigint("storage", { mode: "number" }).notNull().default(0),
  recordingStatus: boolean("recordingStatus").notNull().default(true),
  weeklySummary: boolean("weekly_summary").notNull().default(false),
  productUpdates: boolean("product_updates").notNull().default(false),
  creditsResetAt: timestamp("credits_reset_at"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}).enableRLS();

// CLIENTS
export const clients = pgTable(
  "clients",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    notes: text("notes"),
    status: text("status").notNull().default("active"),

    userId: varchar("user_id")
      .notNull()
      .references(() => users.user_id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [index("clients_user_id_idx").on(t.userId)]
).enableRLS();

// CASES
export const cases = pgTable(
  "cases",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),

    clientId: integer("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),

    name: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull().default("active"),
    dueDate: date("due_date"),
    priority: text("priority").notNull().default("low"),

    userId: varchar("user_id")
      .notNull()
      .references(() => users.user_id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("cases_user_id_idx").on(t.userId),
    index("cases_client_id_idx").on(t.clientId),
  ]
).enableRLS();

// CASE FILES
export const caseFiles = pgTable(
  "case_files",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    caseId: integer("case_id")
      .notNull()
      .references(() => cases.id),
    userId: text("user_id").references(() => users.user_id),
    name: text("name").notNull(),
    path: text("path").notNull(),
    size: integer("size").notNull(),
    mimeType: text("mime_type"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("case_files_case_id_idx").on(t.caseId),
    index("case_files_user_id_idx").on(t.userId),
  ]
).enableRLS();

// CASE NOTES
export const caseNotes = pgTable(
  "case_notes",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),

    userId: varchar("user_id").references(() => users.user_id),
    caseId: integer("case_id").references(() => cases.id),
  },
  (t) => [
    index("case_notes_case_id_idx").on(t.caseId),
    index("case_notes_user_id_idx").on(t.userId),
  ]
).enableRLS();

// TASKS
export const tasks = pgTable(
  "tasks",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.user_id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    caseId: integer("case_id").references(() => cases.id, {
      onDelete: "cascade",
    }),
    priority: text("priority").notNull().default("Low"),
    status: text("status").notNull().default("in-progress"),
    dueDate: date("due_date"),
    completed: boolean("completed").default(false),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("tasks_user_id_idx").on(t.userId),
    index("tasks_case_id_idx").on(t.caseId),
  ]
).enableRLS();

// EVENTS
export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    link: text("link"),
    dateTime: timestamp("date_time").notNull(),
    duration: integer("duration").notNull(),
    isMeeting: boolean().default(false),
    meetingStartTimeEpoch: integer("meeting_start_time"),
    status: text("status"),
    tags: text("tags").array().default([]),
    hasNotes: boolean("has_notes").default(false),
    hasTranscript: boolean("has_transcript").default(false),
    ai_summary: text("ai_summary"),
    key_points: text("key_points").array(),
    action_items: jsonb("action_items").$type<
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
    outlookEventId: text("outlook_event_id"),
    recordingSize: bigint("recording_size", { mode: "number" }),

    clientId: integer("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),

    userId: varchar("user_id")
      .notNull()
      .references(() => users.user_id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("events_user_id_date_time_idx").on(t.userId, t.dateTime),
    index("events_google_event_id_idx").on(t.googleEventId),
    index("events_outlook_event_id_idx").on(t.outlookEventId),
    index("events_client_id_idx").on(t.clientId),
  ]
).enableRLS();

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
).enableRLS();

// MEETING TRANSCRIPTS
export const meetingTranscripts = pgTable(
  "meeting_transcripts",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    meetingId: text("meeting_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    speakerIdentity: text("speaker_identity").notNull(),
    text: text("text").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [index("meeting_transcripts_meeting_id_idx").on(t.meetingId)]
).enableRLS();

// MEETING DOCUMENT REQUESTS
export const meetingDocumentRequests = pgTable(
  "meeting_document_requests",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    clientId: integer("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.user_id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending_approval"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
  },
  (t) => [
    index("meeting_document_requests_user_id_status_idx").on(
      t.userId,
      t.status
    ),
    index("meeting_document_requests_event_id_idx").on(t.eventId),
  ]
).enableRLS();

// DOCUMENT REQUEST ITEMS
export const documentRequestItems = pgTable(
  "document_request_items",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    requestId: integer("request_id")
      .notNull()
      .references(() => meetingDocumentRequests.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status").notNull().default("pending"),
    uploadedFileId: integer("uploaded_file_id").references(() => caseFiles.id, {
      onDelete: "set null",
    }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
    aiVerdict: text("ai_verdict"),
    aiReasoning: text("ai_reasoning"),
    aiAnalyzedAt: timestamp("ai_analyzed_at", { withTimezone: true }),
  },
  (t) => [index("document_request_items_request_id_idx").on(t.requestId)]
).enableRLS();

// OUTLOOK TOKENS
export const outlookTokens = pgTable(
  "outlook_tokens",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    access_token: text("access_token").notNull(),
    refresh_token: text("refresh_token").notNull(),
    expires_in: bigint("expires_in", { mode: "number" }).notNull(),
    connected: boolean("connected").default(false),

    userId: varchar("user_id")
      .notNull()
      .references(() => users.user_id, { onDelete: "cascade" }),
  },
  (t) => [index("outlook_tokens_user_id_idx").on(t.userId)]
).enableRLS();

// OUTLOOK SYNC STATE
export const outlookSyncState = pgTable("outlook_sync_state", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  calendarSubscriptionId: text("calendar_subscription_id"),
  emailSubscriptionId: text("email_subscription_id"),
  calendarDeltaLink: text("calendar_delta_link"),
  emailDeltaLink: text("email_delta_link"),
  sentEmailDeltaLink: text("sent_email_delta_link"),
  clientState: text("client_state"),
  subscriptionExpiration: bigint("subscription_expiration", { mode: "number" }),

  userId: varchar("user_id")
    .notNull()
    .unique()
    .references(() => users.user_id, { onDelete: "cascade" }),
}).enableRLS();

// OUTLOOK EMAILS
export const outlookEmails = pgTable(
  "outlook_emails",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    outlookId: text("outlook_id").notNull(),
    conversationId: text("conversation_id").notNull(),
    subject: text("subject").default("(no subject)"),
    snippet: text("snippet"),
    fromEmail: text("from_email"),
    fromName: text("from_name"),
    toEmails: text("to_emails").array().default([]),
    ccEmails: text("cc_emails").array().default([]),
    bodyHtml: text("body_html"),
    bodyText: text("body_text"),
    isRead: boolean("is_read").default(false),
    isStarred: boolean("is_starred").default(false),
    isArchived: boolean("is_archived").default(false),
    isSent: boolean("is_sent").default(false),
    hasAttachments: boolean("has_attachments").default(false),
    sentAt: timestamp("sent_at").notNull(),
    clientId: integer("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.user_id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("outlook_emails_user_id_idx").on(t.userId),
    index("outlook_emails_outlook_id_idx").on(t.outlookId),
    index("outlook_emails_conversation_id_idx").on(t.conversationId),
    index("outlook_emails_client_id_idx").on(t.clientId),
  ]
).enableRLS();

// GOOGLE TOKENS
export const googleTokens = pgTable(
  "google_tokens",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    access_token: text("access_token").notNull(),
    refresh_token: text("refresh_token").notNull(),
    expires_in: bigint("expires_in", { mode: "number" }).notNull(),
    connected: boolean("connected").default(false),

    userId: varchar("user_id")
      .notNull()
      .references(() => users.user_id, { onDelete: "cascade" }),
  },
  (t) => [index("google_tokens_user_id_idx").on(t.userId)]
).enableRLS();

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
}).enableRLS();

// GOOGLE EMAILS
export const googleEmails = pgTable(
  "emails",
  {
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
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("emails_user_id_idx").on(t.userId),
    index("emails_gmail_id_idx").on(t.gmailId),
    index("emails_thread_id_idx").on(t.threadId),
    index("emails_client_id_idx").on(t.clientId),
  ]
).enableRLS();

// EMAIL ATTACHMENTS
export const emailAttachments = pgTable(
  "email_attachments",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    emailId: integer("email_id")
      .notNull()
      .references(() => googleEmails.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    mimeType: text("mime_type"),
    size: integer("size"),
    gmailAttachmentId: text("gmail_attachment_id"),
    supabasePath: text("supabase_path"),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.user_id, { onDelete: "cascade" }),
  },
  (t) => [
    index("email_attachments_email_id_idx").on(t.emailId),
    index("email_attachments_user_id_idx").on(t.userId),
  ]
).enableRLS();

// SCHEDULED EMAILS
export const scheduledEmails = pgTable(
  "scheduled_emails",
  {
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
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("scheduled_emails_user_id_idx").on(t.userId),
    index("scheduled_emails_status_scheduled_at_idx").on(
      t.status,
      t.scheduledAt
    ),
    index("scheduled_emails_client_id_idx").on(t.clientId),
  ]
).enableRLS();

// CLIENT PORTAL TOKENS
export const clientPortalTokens = pgTable(
  "client_portal_tokens",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    enabled: boolean("enabled").default(true),
    settings: jsonb("settings")
      .$type<{
        title?: string;
        brandColor?: string;
        welcomeMessage?: string;
        customDomain?: string;
        chatEnabled?: boolean;
        fileSharing?: boolean;
        aiChatBot?: boolean;
        emailNotifications?: boolean;
        meetingSchedulingEnabled?: boolean;
        availability?: {
          weeklySchedule: {
            [day: string]: {
              enabled: boolean;
              startTime: string;
              endTime: string;
            };
          };
          meetingDurations: number[];
          bufferMinutes: number;
          timezone: string;
        };
      }>()
      .default({}),
    lastAccessedAt: timestamp("last_accessed_at"),
    chatStarred: boolean("chat_starred").notNull().default(false),
    chatArchived: boolean("chat_archived").notNull().default(false),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.user_id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("client_portal_tokens_user_id_idx").on(t.userId),
    index("client_portal_tokens_client_id_idx").on(t.clientId),
  ]
).enableRLS();

// PORTAL MEETING BOOKINGS
export const portalMeetingBookings = pgTable(
  "portal_meeting_bookings",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    portalId: integer("portal_id")
      .notNull()
      .references(() => clientPortalTokens.id, { onDelete: "cascade" }),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.user_id, { onDelete: "cascade" }),
    clientName: text("client_name").notNull(),
    clientEmail: text("client_email").notNull(),
    dateTime: timestamp("date_time").notNull(),
    duration: integer("duration").notNull(),
    status: text("status").notNull().default("pending"),
    notes: text("notes"),
    meetingLink: text("meeting_link"),
    eventId: text("event_id").references(() => events.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("portal_meeting_bookings_user_id_idx").on(t.userId),
    index("portal_meeting_bookings_portal_id_idx").on(t.portalId),
    index("portal_meeting_bookings_client_id_idx").on(t.clientId),
  ]
).enableRLS();

// PORTAL CHAT MESSAGES
export const portalMessages = pgTable(
  "portal_messages",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    portalId: integer("portal_id")
      .notNull()
      .references(() => clientPortalTokens.id, { onDelete: "cascade" }),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.user_id, { onDelete: "cascade" }),
    senderType: text("sender_type").notNull(), // "client" | "agency"
    body: text("body").notNull(),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("portal_messages_portal_id_idx").on(t.portalId),
    index("portal_messages_user_id_idx").on(t.userId),
  ]
).enableRLS();

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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}).enableRLS();

// RELATIONS
export const usersRelations = relations(users, ({ many, one }) => ({
  clients: many(clients),
  cases: many(cases),
  tasks: many(tasks),
  meetings: many(events),
  googleTokens: many(googleTokens),
  googleSyncState: one(googleSyncState, {
    fields: [users.user_id],
    references: [googleSyncState.userId],
  }),
  emails: many(googleEmails),
  scheduledEmails: many(scheduledEmails),
  clientPortalTokens: many(clientPortalTokens),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, {
    fields: [clients.userId],
    references: [users.user_id],
  }),
  cases: many(cases),
  emails: many(googleEmails),
  scheduledEmails: many(scheduledEmails),
  portalToken: one(clientPortalTokens, {
    fields: [clients.id],
    references: [clientPortalTokens.clientId],
  }),
}));

export const casesRelations = relations(cases, ({ one, many }) => ({
  user: one(users, {
    fields: [cases.userId],
    references: [users.user_id],
  }),
  client: one(clients, {
    fields: [cases.clientId],
    references: [clients.id],
  }),
  tasks: many(tasks),
  caseNotes: many(caseNotes),
  files: many(caseFiles),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.user_id],
  }),
  case: one(cases, {
    fields: [tasks.caseId],
    references: [cases.id],
  }),
}));

export const caseNotesRelations = relations(caseNotes, ({ one }) => ({
  user: one(users, {
    fields: [caseNotes.userId],
    references: [users.user_id],
  }),
  case: one(cases, {
    fields: [caseNotes.caseId],
    references: [cases.id],
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  user: one(users, {
    fields: [events.userId],
    references: [users.user_id],
  }),
  client: one(clients, {
    fields: [events.clientId],
    references: [clients.id],
  }),
  attendees: many(meetingAttendees),
  transcripts: many(meetingTranscripts),
  caseNotes: many(caseNotes),
  documentRequests: many(meetingDocumentRequests),
}));

export const meetingDocumentRequestsRelations = relations(
  meetingDocumentRequests,
  ({ one, many }) => ({
    event: one(events, {
      fields: [meetingDocumentRequests.eventId],
      references: [events.id],
    }),
    client: one(clients, {
      fields: [meetingDocumentRequests.clientId],
      references: [clients.id],
    }),
    user: one(users, {
      fields: [meetingDocumentRequests.userId],
      references: [users.user_id],
    }),
    items: many(documentRequestItems),
  })
);

export const documentRequestItemsRelations = relations(
  documentRequestItems,
  ({ one }) => ({
    request: one(meetingDocumentRequests, {
      fields: [documentRequestItems.requestId],
      references: [meetingDocumentRequests.id],
    }),
    uploadedFile: one(caseFiles, {
      fields: [documentRequestItems.uploadedFileId],
      references: [caseFiles.id],
    }),
  })
);

export const meetingAttendeesRelations = relations(
  meetingAttendees,
  ({ one }) => ({
    meeting: one(events, {
      fields: [meetingAttendees.meetingId],
      references: [events.id],
    }),
  })
);

export const meetingTranscriptsRelations = relations(
  meetingTranscripts,
  ({ one }) => ({
    meeting: one(events, {
      fields: [meetingTranscripts.meetingId],
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

export const emailsRelations = relations(googleEmails, ({ one, many }) => ({
  user: one(users, {
    fields: [googleEmails.userId],
    references: [users.user_id],
  }),
  client: one(clients, {
    fields: [googleEmails.clientId],
    references: [clients.id],
  }),
  attachments: many(emailAttachments),
}));

export const emailAttachmentsRelations = relations(
  emailAttachments,
  ({ one }) => ({
    email: one(googleEmails, {
      fields: [emailAttachments.emailId],
      references: [googleEmails.id],
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

export const outlookTokensRelations = relations(outlookTokens, ({ one }) => ({
  user: one(users, {
    fields: [outlookTokens.userId],
    references: [users.user_id],
  }),
}));

export const outlookSyncStateRelations = relations(
  outlookSyncState,
  ({ one }) => ({
    user: one(users, {
      fields: [outlookSyncState.userId],
      references: [users.user_id],
    }),
  })
);

export const outlookEmailsRelations = relations(outlookEmails, ({ one }) => ({
  user: one(users, {
    fields: [outlookEmails.userId],
    references: [users.user_id],
  }),
  client: one(clients, {
    fields: [outlookEmails.clientId],
    references: [clients.id],
  }),
}));

export const clientPortalTokensRelations = relations(
  clientPortalTokens,
  ({ one, many }) => ({
    user: one(users, {
      fields: [clientPortalTokens.userId],
      references: [users.user_id],
    }),
    client: one(clients, {
      fields: [clientPortalTokens.clientId],
      references: [clients.id],
    }),
    bookings: many(portalMeetingBookings),
    messages: many(portalMessages),
  })
);

export const portalMessagesRelations = relations(portalMessages, ({ one }) => ({
  portal: one(clientPortalTokens, {
    fields: [portalMessages.portalId],
    references: [clientPortalTokens.id],
  }),
  client: one(clients, {
    fields: [portalMessages.clientId],
    references: [clients.id],
  }),
  user: one(users, {
    fields: [portalMessages.userId],
    references: [users.user_id],
  }),
}));

export const portalMeetingBookingsRelations = relations(
  portalMeetingBookings,
  ({ one }) => ({
    portal: one(clientPortalTokens, {
      fields: [portalMeetingBookings.portalId],
      references: [clientPortalTokens.id],
    }),
    client: one(clients, {
      fields: [portalMeetingBookings.clientId],
      references: [clients.id],
    }),
    user: one(users, {
      fields: [portalMeetingBookings.userId],
      references: [users.user_id],
    }),
    event: one(events, {
      fields: [portalMeetingBookings.eventId],
      references: [events.id],
    }),
  })
);
