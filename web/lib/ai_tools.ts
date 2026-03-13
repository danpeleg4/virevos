import OpenAI from "openai";
import { CreateClientInput } from "@/types/clients";
import { addAClient } from "@/lib/server_actions/clients";
import { getPastMeetingTranscript } from "@/lib/server_actions/meetings";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const MODEL = "gpt-4o";
export const MAX_STEPS = 5;

export const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
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
          industry: {
            type: "string",
            description: "The industry of the client",
          },
          notes: {
            type: "string",
            description: "Notes that can be added to the client",
          },
        },
        required: ["name", "email", "phone", "industry"],
      },
    },
  },
  {
    type: "function",
    function: {
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
      },
    },
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
  throw new Error(`Unknown tool: ${name}`);
}
