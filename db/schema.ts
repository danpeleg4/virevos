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
    onDelete: "cascade",
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

// Events
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
  action_items: jsonb("action_items").$type<Array<{task: string; owner: string; dueDate: string | null; completed: boolean; added?: boolean}>>(),
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
export const meetingAttendees = pgTable("meeting_attendees", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  meetingId: text("meeting_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
});

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

// RELATIONS
export const usersRelations = relations(users, ({ many }) => ({
  clients: many(clients),
  projects: many(projects),
  tasks: many(tasks),
  meetings: many(events),
  googleTokens: many(googleTokens),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, {
    fields: [clients.userId],
    references: [users.user_id],
  }),
  projects: many(projects),
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
