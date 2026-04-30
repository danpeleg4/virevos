import OpenAI from "openai";
import { CreateClientInput, UpdateClientInput } from "@/types/clients";
import { addAClient, updateExistingClient } from "@/lib/clients";
import { getPastMeetingTranscript } from "@/lib/meetings";
import { searchEmails } from "@/lib/gmail_sync";
import { createCase, updateCase } from "@/lib/cases";
import { addProjectTasksAction, updateTask } from "@/lib/tasks";
import { addMeetingToCalendar, updateEvent } from "@/lib/calendar";
import { Case } from "@/types/cases";
import { Task } from "@/types/tasks";
import { Event } from "@/types/meeting";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const MODEL = "gpt-5";
export const MAX_STEPS = 5;

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
    name: "getPastMeetingData",
    description:
      "Get meeting transcript data and does semantic search to find relevant info",
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
        clientId: {
          type: ["number", "null"],
          description: "Associated client ID",
        },
      },
      required: [
        "name",
        "description",
        "status",
        "dueDate",
        "priority",
        "clientId",
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
        id: { type: "number", description: "The ID of the client to update" },
        name: { type: ["string", "null"], description: "New name" },
        email: { type: ["string", "null"], description: "New email" },
        phone: { type: ["string", "null"], description: "New phone number" },
        notes: { type: ["string", "null"], description: "New notes" },
      },
      required: ["id", "name", "email", "phone", "notes"],
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
        id: { type: "number", description: "The ID of the case to update" },
        name: { type: ["string", "null"], description: "New name" },
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
      required: ["id", "name", "description", "status", "dueDate", "priority"],
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
        id: { type: "number", description: "The ID of the task to update" },
        title: { type: ["string", "null"], description: "New title" },
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
      required: ["id", "title", "description", "priority", "status", "dueDate"],
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
    name: "searchEmails",
    description:
      "Search emails using semantic similarity to find relevant email threads and conversations",
    parameters: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Text to apply semantic search against the emails index",
        },
      },
      required: ["text"],
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
        id: { type: "string", description: "The ID of the event to update" },
        title: { type: ["string", "null"], description: "New title" },
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
        "id",
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
];

export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  if (name === "addClient") {
    const res = await addAClient(args as unknown as CreateClientInput);
    return {
      kind: "clients_updated",
      client: res,
      message: "Client created successfully",
    };
  }
  if (name === "getPastMeetingData") {
    const res = await getPastMeetingTranscript(args.text as string);
    return {
      kind: "meeting_data",
      message: res.join("\n"),
    };
  }
  if (name === "searchEmails") {
    const res = await searchEmails(args.text as string);
    return {
      kind: "email_search_results",
      emails: res,
    };
  }
  if (name === "createCase") {
    const res = await createCase(args as unknown as Case);
    return {
      kind: "case_created",
      case: res,
      message: "Case created successfully",
    };
  }
  if (name === "updateClient") {
    await updateExistingClient(args as unknown as UpdateClientInput);
    return {
      kind: "client_updated",
      message: "Client updated successfully",
    };
  }
  if (name === "updateCase") {
    await updateCase(
      args as unknown as {
        id: number;
        name?: string;
        description?: string;
        status?: string;
        dueDate?: string;
        priority?: string;
      }
    );
    return {
      kind: "case_updated",
      message: "Case updated successfully",
    };
  }
  if (name === "createTask") {
    const res = await addProjectTasksAction(args as unknown as Task);
    return {
      kind: "task_created",
      task: res,
      message: "Task created successfully",
    };
  }
  if (name === "updateTask") {
    await updateTask(
      args as unknown as {
        id: number;
        title?: string;
        description?: string;
        priority?: string;
        status?: string;
        dueDate?: string | null;
      }
    );
    return {
      kind: "task_updated",
      message: "Task updated successfully",
    };
  }
  if (name === "createEvent") {
    const res = await addMeetingToCalendar(args as unknown as Event);
    return {
      kind: "event_created",
      event: res,
      message: "Event created successfully",
    };
  }
  if (name === "updateEvent") {
    await updateEvent(
      args as unknown as {
        id: string;
        title?: string;
        description?: string;
        dateTime?: string;
        duration?: number;
        status?: string;
      }
    );
    return {
      kind: "event_updated",
      message: "Event updated successfully",
    };
  }
  throw new Error(`Unknown tool: ${name}`);
}
