import 'dotenv/config';
import {pgTable, text, integer, boolean, timestamp, serial, varchar, date} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Meetings Table
export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    user_id: varchar("user_id").notNull().unique(),
    name: text("name"),
    email: text("email").notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow(),
});

export const projects = pgTable("projects", {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    userId: varchar("user_id")
        .notNull()
        .references(() => users.user_id, { onDelete: "cascade" }),
});

export const tasks = pgTable("tasks", {
    id: serial("id").primaryKey(),
    user_id: varchar("user_id").notNull().references(() => users.user_id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    project_id: integer().references(() => projects.id, { onDelete: "cascade" }),
    priority: text("priority").notNull().default("Low"),
    status: text("status").notNull().default("in-progress"),
    dueDate: date("due_date").notNull().default("2025-01-01"),
    completed: boolean("completed").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

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

// Meeting Attendees Table
export const meetingAttendees = pgTable("meeting_attendees", {
    id: serial("id").primaryKey(),

    meetingId: text("meeting_id")
        .references(() => meetings.id, { onDelete: "cascade" })
        .notNull(),

    name: text("name").notNull(),
    initials: text("initials").notNull()
});

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

// Relations
export const projectsRelations = relations(projects, ({ many }) => ({
    tasks: many(tasks)
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
    project: one(projects, {
        fields: [tasks.project_id],
        references: [projects.id],
    }),
}));

export const meetingsRelations = relations(meetings, ({ many }) => ({
    attendees: many(meetingAttendees),
}));

export const meetingAttendeesRelations = relations(meetingAttendees, ({ one }) => ({
    meeting: one(meetings, {
        fields: [meetingAttendees.meetingId],
        references: [meetings.id],
    }),
}));

export const meetingsUsersRelations = relations(meetings, ({ one, many }) => ({
    user: one(users, {
        fields: [meetings.userId],
        references: [users.user_id],
    }),
    attendees: many(meetingAttendees),
}));