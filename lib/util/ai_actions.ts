import type {
  AIActionTone,
  AddClientToolResult,
  CreateCaseToolResult,
  CreateTaskToolResult,
  CreateEventToolResult,
} from "@/types/ai";

export interface AIActionContent {
  tone: AIActionTone;
  label: string;
}

/**
 * Maps a streamed `tool_result` event into a human-readable action that the
 * AI Assistant surfaces inline ("Created case · …", "Added task · …").
 * Returns `null` for results that should not be shown (unknown tools or
 * results whose `kind` indicates nothing happened).
 */
export function toolResultToAction(
  name: string,
  result: unknown
): AIActionContent | null {
  const kind = (result as { kind?: string } | null)?.kind;

  switch (name) {
    case "addClient": {
      if (kind !== "clients_updated") return null;
      const data = result as AddClientToolResult;
      return { tone: "client", label: `Added client · ${data.client.name}` };
    }
    case "updateClient":
      return kind === "client_updated"
        ? { tone: "client", label: "Updated client details" }
        : null;
    case "createCase": {
      if (kind !== "case_created") return null;
      const data = result as CreateCaseToolResult;
      return { tone: "case", label: `Created case · ${data.case.name}` };
    }
    case "updateCase":
      return kind === "case_updated"
        ? { tone: "case", label: "Updated case" }
        : null;
    case "createTask": {
      if (kind !== "task_created") return null;
      const data = result as CreateTaskToolResult;
      return { tone: "task", label: `Added task · ${data.task.title}` };
    }
    case "updateTask":
      return kind === "task_updated"
        ? { tone: "task", label: "Updated task" }
        : null;
    case "createEvent": {
      if (kind !== "event_created") return null;
      const data = result as CreateEventToolResult;
      return { tone: "calendar", label: `Scheduled · ${data.event.title}` };
    }
    case "updateEvent":
      return kind === "event_updated"
        ? { tone: "calendar", label: "Updated event" }
        : null;
    default:
      return null;
  }
}
