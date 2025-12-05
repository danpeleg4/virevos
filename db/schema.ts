import 'dotenv/config';
import {
    pgTable, text, integer, boolean, timestamp,
    serial, varchar, date
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* ======================
       USERS TABLE
====================== */

export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    user_id: varchar("user_id").notNull().unique(),
    name: text("name"),
    email: text("email").notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow(),
});

/* ======================
       CLIENTS
====================== */

export const clients = pgTable("clients", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),

    user_id: varchar("user_id")
        .notNull()
        .references(() => users.user_id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

/* ======================
       PROJECTS
====================== */

export const projects = pgTable("projects", {
    id: serial("id").primaryKey(),
    client: integer("client")
        .notNull()
        .references(() => clients.id, { onDelete: "cascade" }),

    name: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull().default("in-progress"),
    progress: integer("progress").notNull().default(0),
    dueDate: date("due_date").notNull().default("2025-01-01"),
    totalTasks: integer("total_tasks").notNull().default(0),
    tasksCompleted: integer("tasks_completed").notNull().default(0),
    priority: text("priority").notNull().default("low"),
    health: text("health").notNull().default("On Track"),
    userId: varchar("user_id")
        .notNull()
        .references(() => users.user_id, { onDelete: "cascade" }),
});

/* ======================
        TAGS
====================== */

export const tags = pgTable("tags", {
    id: serial("id").primaryKey(),
    name: text("name").notNull().unique(),

    projectId: integer("project_id")
        .notNull()
        .references(() => projects.id, { onDelete: "cascade" }),
});

/* ======================
        NOTES
====================== */

export const notes = pgTable("notes", {
    id: serial("id").primaryKey(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),

    // Optional linking fields:
    userId: varchar("user_id").references(() => users.user_id),
    projectId: integer("project_id").references(() => projects.id),
    meetingId: text("meeting_id").references(() => meetings.id),
});

/* ======================
        TASKS
====================== */

export const tasks = pgTable("tasks", {
    id: serial("id").primaryKey(),

    user_id: varchar("user_id")
        .notNull()
        .references(() => users.user_id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    description: text("description"),

    project_id: integer("project_id")
        .references(() => projects.id, { onDelete: "cascade" }),

    priority: text("priority").notNull().default("Low"),
    status: text("status").notNull().default("in-progress"),
    dueDate: date("due_date").notNull().default("2025-01-01"),
    completed: boolean("completed").default(false),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

/* ======================
        MEETINGS
====================== */

export const meetings = pgTable("meetings", {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    link: text("link"),

    date: date("date").notNull().default("2025-01-01"),
    time: text("time").notNull(),
    duration: integer("duration").notNull(),
    type: text("type").notNull(),
    status: text("status").notNull(),

    hasNotes: boolean("has_notes").default(false),
    hasTranscript: boolean("has_transcript").default(false),
    autoRescheduled: boolean("auto_rescheduled").default(false),
    conflictReason: text("conflict_reason"),

    userId: varchar("user_id")
        .notNull()
        .references(() => users.user_id, { onDelete: "cascade" }),
});

/* ======================
   MEETING ATTENDEES
====================== */

export const meetingAttendees = pgTable("meeting_attendees", {
    id: serial("id").primaryKey(),

    meetingId: text("meeting_id")
        .notNull()
        .references(() => meetings.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    initials: text("initials").notNull()
});

/* ======================
      ZOOM TOKENS
====================== */

export const zoomTokens = pgTable("zoom_tokens", {
    id: serial("id").primaryKey(),
    access_token: text("access_token").notNull(),
    refresh_token: text("refresh_token").notNull(),
    expires_in: integer("expires_in").notNull(),
    connected: boolean("connected").default(false),

    userId: varchar("user_id")
        .notNull()
        .references(() => users.user_id, { onDelete: "cascade" }),
});

/* ======================
       RELATIONS
====================== */

// USERS
export const usersRelations = relations(users, ({ many }) => ({
    clients: many(clients),
    projects: many(projects),
    tasks: many(tasks),
    meetings: many(meetings),
    zoomTokens: many(zoomTokens),
}));

// CLIENTS
export const clientsRelations = relations(clients, ({ one, many }) => ({
    user: one(users, {
        fields: [clients.user_id],
        references: [users.user_id],
    }),
    projects: many(projects),
}));

// PROJECTS
export const projectsRelations = relations(projects, ({ one, many }) => ({
    user: one(users, {
        fields: [projects.userId],
        references: [users.user_id],
    }),
    client: one(clients, {
        fields: [projects.client],
        references: [clients.id],
    }),
    tasks: many(tasks),
    tags: many(tags),
    notes: many(notes),
}));

// TASKS
export const tasksRelations = relations(tasks, ({ one }) => ({
    user: one(users, {
        fields: [tasks.user_id],
        references: [users.user_id],
    }),
    project: one(projects, {
        fields: [tasks.project_id],
        references: [projects.id],
    }),
}));

// TAGS
export const tagsRelations = relations(tags, ({ one }) => ({
    project: one(projects, {
        fields: [tags.projectId],
        references: [projects.id],
    }),
}));

// NOTES
export const notesRelations = relations(notes, ({ one }) => ({
    user: one(users, {
        fields: [notes.userId],
        references: [users.user_id],
    }),
    project: one(projects, {
        fields: [notes.projectId],
        references: [projects.id],
    }),
    meeting: one(meetings, {
        fields: [notes.meetingId],
        references: [meetings.id],
    }),
}));

// MEETINGS
export const meetingsRelations = relations(meetings, ({ one, many }) => ({
    user: one(users, {
        fields: [meetings.userId],
        references: [users.user_id],
    }),
    attendees: many(meetingAttendees),
    notes: many(notes),
}));

// MEETING ATTENDEES
export const meetingAttendeesRelations = relations(meetingAttendees, ({ one }) => ({
    meeting: one(meetings, {
        fields: [meetingAttendees.meetingId],
        references: [meetings.id],
    }),
}));

// ZOOM TOKENS
export const zoomRelations = relations(zoomTokens, ({ one }) => ({
    user: one(users, {
        fields: [zoomTokens.userId],
        references: [users.user_id],
    }),
}));
