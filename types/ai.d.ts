export type ChatMessage = { role: "user" | "assistant"; content: string };

export type StreamEvent =
  | { type: "text_delta"; delta: string }
  | { type: "tool_result"; id: string; name: string; result: unknown }
  | { type: "done"; response_id?: string }
  | { type: "error"; message: string };

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export type AddClientToolResult = {
  kind: "clients_updated";
  client: {
    id: number;
    name: string;
    email: string;
    phone: string;
    industry: string;
    notes?: string;
  };
  message: string;
};

export type CreateProjectToolResult = {
  kind: "project_created";
  project: import("./projects").Project;
  message: string;
};

export type UpdateClientToolResult = {
  kind: "client_updated";
  message: string;
};

export type UpdateProjectToolResult = {
  kind: "project_updated";
  message: string;
};

export type CreateTaskToolResult = {
  kind: "task_created";
  task: import("./tasks").Task;
  message: string;
};

export type UpdateTaskToolResult = {
  kind: "task_updated";
  message: string;
};

export type CreateEventToolResult = {
  kind: "event_created";
  event: import("./meeting").Event;
  message: string;
};

export type UpdateEventToolResult = {
  kind: "event_updated";
  message: string;
};
