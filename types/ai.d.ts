export type ChatMessage = { role: "user" | "assistant"; content: string };

export type FormFieldType = "text" | "textarea" | "date" | "select";

export interface AIFormField {
  name: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options: string[];
  placeholder: string | null;
}

export interface AIFormRequest {
  callId: string;
  title: string;
  fields: AIFormField[];
}

export type StreamEvent =
  | { type: "text_delta"; delta: string }
  | { type: "tool_result"; id: string; name: string; result: unknown }
  | { type: "form_request"; id: string; form: AIFormRequest }
  | { type: "done"; response_id?: string }
  | { type: "error"; message: string };

export type AIActionTone = "client" | "case" | "task" | "calendar";

export interface AIAction {
  id: string;
  tone: AIActionTone;
  label: string;
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: AIAction[];
  form?: AIFormRequest;
  formSubmitted?: boolean;
}

export type AddClientToolResult = {
  kind: "clients_updated";
  client: {
    id: number;
    name: string;
    email: string;
    phone: string;
    notes?: string;
  };
  message: string;
};

export type CreateCaseToolResult = {
  kind: "case_created";
  case: import("./cases").Case;
  message: string;
};

export type UpdateClientToolResult = {
  kind: "client_updated";
  message: string;
};

export type UpdateCaseToolResult = {
  kind: "case_updated";
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
