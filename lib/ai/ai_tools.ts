import type OpenAI from "openai";
import { CreateClientInput, UpdateClientInput } from "@/types/clients";
import { addAClient, updateExistingClient } from "@/lib/workspace/clients";
import type { ClientsDB } from "@db/classes/clients_db";
import { meetingTranscriptSemanticSearch } from "@/lib/workspace/meetings";
import type { MeetingsDB } from "@db/classes/meetings_db";
import type { OpenAIClientInterface } from "@/api_client/openai_client";
import type { StorageClientInterface } from "@/api_client/supabase_storage_client";
import { createCase, updateCase } from "@/lib/workspace/cases";
import type { CasesDB } from "@db/classes/cases_db";
import type { PlanLimitsDB } from "@db/classes/plan_limits_db";
import type { BillingDB } from "@db/classes/billing_db";
import { addProjectTasksAction, updateTask } from "@/lib/workspace/tasks";
import type { TasksDB } from "@db/classes/tasks_db";
import { addMeetingToCalendar, updateEvent } from "@/lib/workspace/calendar";
import type { CalendarDB } from "@db/classes/calendar_db";
import type { GraphCalendarServiceInterface } from "@/api_client/ms_graph/graph_calendar_service";
import type { OutlookDB } from "@db/classes/outlook_db";
import type { GraphAuthServiceInterface } from "@/api_client/ms_graph/graph_auth_service";
import { getEmailData, getRecentEmails } from "@/lib/emails";
import type { EmailsDB } from "@db/classes/emails_db";
import { Case } from "@/types/cases";
import { Task } from "@/types/tasks";
import { Event } from "@/types/meeting";

export const MODEL = "gpt-5";
export const MAX_STEPS = 5;

/** Dependency bundle for executeTool — positional threading isn't practical
 *  across this many tool branches, so callers assemble this once from
 *  singletons and pass it through. */
export interface AiToolDeps {
  clientsDb: ClientsDB;
  casesDb: CasesDB;
  tasksDb: TasksDB;
  calendarDb: CalendarDB;
  meetingsDb: MeetingsDB;
  emailsDb: EmailsDB;
  planLimitsDb: PlanLimitsDB;
  billingDb: BillingDB;
  outlookDb: OutlookDB;
  openaiClient: OpenAIClientInterface;
  storage: StorageClientInterface;
  graphCalendar: GraphCalendarServiceInterface;
  graphAuthService: GraphAuthServiceInterface;
}

export const tools: OpenAI.Responses.Tool[] = [
  {
    type: "function",
    name: "addClient",
    description: "Create a new client",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "The name of the client" },
        email: { type: "string", description: "The email of the client" },
        phone: {
          type: "string",
          description: "The phone number of the client",
        },
        notes: {
          type: ["string", "null"],
          description: "Notes that can be added to the client",
        },
      },
      required: ["name", "email", "phone", "notes"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "meetingTranscriptSemanticSearch",
    description:
      "Does semantic search to find relevant info about from a user's meetings",
    parameters: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Text to apply semantic search",
        },
      },
      required: ["text"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "createCase",
    description: "Create a new case",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "The name of the case" },
        description: {
          type: ["string", "null"],
          description: "Case description",
        },
        status: { type: ["string", "null"], description: "Case status" },
        dueDate: {
          type: ["string", "null"],
          description: "Due date as ISO string",
        },
        priority: { type: ["string", "null"], description: "Case priority" },
        clientName: {
          type: ["string", "null"],
          description: "Name of the associated client, or null for no client",
        },
      },
      required: [
        "name",
        "description",
        "status",
        "dueDate",
        "priority",
        "clientName",
      ],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "updateClient",
    description: "Update an existing client",
    parameters: {
      type: "object",
      properties: {
        clientName: {
          type: "string",
          description:
            "The current name of the client to update (used to look up the client)",
        },
        name: {
          type: ["string", "null"],
          description: "New name, or null to keep it unchanged",
        },
        email: { type: ["string", "null"], description: "New email" },
        phone: { type: ["string", "null"], description: "New phone number" },
        notes: { type: ["string", "null"], description: "New notes" },
      },
      required: ["clientName", "name", "email", "phone", "notes"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "updateCase",
    description: "Update an existing case",
    parameters: {
      type: "object",
      properties: {
        caseName: {
          type: "string",
          description:
            "The current name of the case to update (used to look up the case)",
        },
        name: {
          type: ["string", "null"],
          description: "New name, or null to keep it unchanged",
        },
        description: {
          type: ["string", "null"],
          description: "New description",
        },
        status: { type: ["string", "null"], description: "New status" },
        dueDate: {
          type: ["string", "null"],
          description: "New due date as ISO string",
        },
        priority: { type: ["string", "null"], description: "New priority" },
      },
      required: [
        "caseName",
        "name",
        "description",
        "status",
        "dueDate",
        "priority",
      ],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "createTask",
    description: "Create a new task",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "The title of the task" },
        description: {
          type: ["string", "null"],
          description: "Task description",
        },
        projectId: {
          type: ["number", "null"],
          description: "Associated project ID",
        },
        priority: { type: ["string", "null"], description: "Task priority" },
        dueDate: {
          type: ["string", "null"],
          description: "Due date as ISO string",
        },
      },
      required: ["title", "description", "projectId", "priority", "dueDate"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "updateTask",
    description: "Update an existing task",
    parameters: {
      type: "object",
      properties: {
        taskTitle: {
          type: "string",
          description:
            "The current title of the task to update (used to look up the task)",
        },
        title: {
          type: ["string", "null"],
          description: "New title, or null to keep it unchanged",
        },
        description: {
          type: ["string", "null"],
          description: "New description",
        },
        priority: { type: ["string", "null"], description: "New priority" },
        status: { type: ["string", "null"], description: "New status" },
        dueDate: {
          type: ["string", "null"],
          description: "New due date as ISO string or null",
        },
      },
      required: [
        "taskTitle",
        "title",
        "description",
        "priority",
        "status",
        "dueDate",
      ],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "createEvent",
    description: "Create a new calendar event or meeting",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Event title" },
        dateTime: {
          type: "string",
          description: "Start date/time as ISO string",
        },
        duration: { type: "number", description: "Duration in minutes" },
        description: {
          type: ["string", "null"],
          description: "Event description",
        },
        isMeeting: {
          type: ["boolean", "null"],
          description: "Whether this is a video meeting",
        },
        link: { type: ["string", "null"], description: "Meeting link" },
      },
      required: [
        "title",
        "dateTime",
        "duration",
        "description",
        "isMeeting",
        "link",
      ],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "updateEvent",
    description: "Update an existing calendar event",
    parameters: {
      type: "object",
      properties: {
        eventTitle: {
          type: "string",
          description:
            "The current title of the event to update (used to look up the event)",
        },
        title: {
          type: ["string", "null"],
          description: "New title, or null to keep it unchanged",
        },
        description: {
          type: ["string", "null"],
          description: "New description",
        },
        dateTime: {
          type: ["string", "null"],
          description: "New start date/time as ISO string",
        },
        duration: {
          type: ["number", "null"],
          description: "New duration in minutes",
        },
        status: { type: ["string", "null"], description: "New status" },
      },
      required: [
        "eventTitle",
        "title",
        "description",
        "dateTime",
        "duration",
        "status",
      ],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "getEmailData",
    description:
      "Semantic search across the user's synced emails. Use this when the user is looking for emails about a TOPIC, SENDER, or CONTENT (e.g. 'find emails about the Acme deal', 'what did Alice say last week'). Returns up to 10 emails ranked by similarity to the query, each with subject, sender, sent date, sent/received flag, and a snippet. Do NOT use for chronological 'last N emails' queries — use getRecentEmails instead.",
    parameters: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description:
            "Natural-language search query (topic, sender, keywords, or paraphrased content).",
        },
      },
      required: ["text"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "getRecentEmails",
    description:
      "Fetch the user's most recent INBOX emails in chronological order (newest first). Use this for 'summarize my last N emails', 'what's in my inbox', 'recent emails', etc. Returns subject, sender, sent date, snippet, and a truncated body (~1500 chars) for each email so you can summarize.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description:
            "How many recent emails to fetch (1-25). Default to 5 if the user did not specify.",
        },
      },
      required: ["limit"],
      additionalProperties: false,
    },
    strict: true,
  },
];

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  deps: AiToolDeps
): Promise<unknown> {
  if (name === "addClient") {
    const res = await addAClient(
      args as unknown as CreateClientInput,
      deps.clientsDb,
      deps.planLimitsDb,
      deps.billingDb
    );
    return {
      kind: "clients_updated",
      client: res,
      message: "Client created successfully",
    };
  }
  if (name === "meetingTranscriptSemanticSearch") {
    const res = await meetingTranscriptSemanticSearch(
      args.text as string,
      deps.meetingsDb,
      deps.openaiClient,
      deps.storage
    );
    return {
      kind: "meeting_data",
      message: res.join("\n"),
    };
  }
  if (name === "createCase") {
    const res = await createCase(
      args as unknown as Case,
      deps.casesDb,
      deps.planLimitsDb,
      deps.billingDb
    );
    return {
      kind: "case_created",
      case: res,
      message: "Case created successfully",
    };
  }
  if (name === "updateClient") {
    await updateExistingClient(
      args as unknown as UpdateClientInput,
      deps.clientsDb
    );
    return {
      kind: "client_updated",
      message: "Client updated successfully",
    };
  }
  if (name === "updateCase") {
    await updateCase(
      args as unknown as {
        caseName?: string;
        name?: string;
        description?: string;
        status?: string;
        dueDate?: string;
        priority?: string;
      },
      deps.casesDb
    );
    return {
      kind: "case_updated",
      message: "Case updated successfully",
    };
  }
  if (name === "createTask") {
    const res = await addProjectTasksAction(
      args as unknown as Task,
      deps.tasksDb
    );
    return {
      kind: "task_created",
      task: res,
      message: "Task created successfully",
    };
  }
  if (name === "updateTask") {
    await updateTask(
      args as unknown as {
        taskTitle?: string;
        title?: string;
        description?: string;
        priority?: string;
        status?: string;
        dueDate?: string | null;
      },
      deps.tasksDb
    );
    return {
      kind: "task_updated",
      message: "Task updated successfully",
    };
  }
  if (name === "createEvent") {
    const res = await addMeetingToCalendar(
      args as unknown as Event,
      deps.calendarDb,
      deps.graphCalendar,
      deps.outlookDb,
      deps.graphAuthService
    );
    return {
      kind: "event_created",
      event: res,
      message: "Event created successfully",
    };
  }
  if (name === "updateEvent") {
    await updateEvent(
      args as unknown as {
        eventTitle?: string;
        title?: string;
        description?: string;
        dateTime?: string;
        duration?: number;
        status?: string;
      },
      deps.calendarDb,
      deps.graphCalendar,
      deps.outlookDb,
      deps.graphAuthService
    );
    return {
      kind: "event_updated",
      message: "Event updated successfully",
    };
  }
  if (name === "getEmailData") {
    const hits = await getEmailData(
      args.text as string,
      deps.emailsDb,
      deps.openaiClient,
      deps.storage
    );
    return {
      kind: "email_data",
      emails: hits,
      message:
        hits.length === 0
          ? "No matching emails found."
          : `Found ${hits.length} matching email${hits.length === 1 ? "" : "s"}.`,
    };
  }
  if (name === "getRecentEmails") {
    const hits = await getRecentEmails(args.limit as number, deps.emailsDb);
    return {
      kind: "recent_emails",
      emails: hits,
      message:
        hits.length === 0
          ? "No emails found in the inbox."
          : `Returning ${hits.length} most recent email${hits.length === 1 ? "" : "s"}.`,
    };
  }
  throw new Error(`Unknown tool: ${name}`);
}
