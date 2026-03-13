export type ChatMessage = { role: "user" | "assistant"; content: string };

export type StreamEvent =
  | { type: "text_delta"; delta: string }
  | { type: "tool_result"; id: string; name: string; result: unknown }
  | { type: "done" }
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
