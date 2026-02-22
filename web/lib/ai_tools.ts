import {
    FlexibleSchema,
    stepCountIs,
    tool, ToolLoopAgent,
} from "ai";
import {CreateClientInput} from "@/types/clients";
import {addAClient} from "@/lib/server_actions/clients";
import {getPastMeetingTranscript} from "@/lib/server_actions/meetings";
import {z} from "zod";

export const agent = new ToolLoopAgent({
    model: "openai/gpt-4o",
    stopWhen: stepCountIs(5),
    tools: {
        addClient: tool({
            description: "Create a new client",
            inputSchema: z.object({
                createClientInput: z.object({
                    name: z.string().describe("The name of the client"),
                    email: z.string().email().describe("The email of the client"),
                    phone: z.string().describe("The phone number of the client"),
                    industry: z.string().describe("The industry of the client"),
                    notes: z
                        .string()
                        .optional()
                        .describe("notes that can be added to the client"),
                }),
            }) as FlexibleSchema,
            execute: async ({
                                createClientInput,
                            }: {
                createClientInput: CreateClientInput;
            }) => {
                const res = await addAClient(createClientInput);
                return {
                    kind: "clients_updated",
                    client: res,
                    message: "Client created successfully",
                };
            },
        }),
        getPastMeetingData: tool({
            description:
                "Get meeting transcript data and does semantic search to find relevant info",
            inputSchema: z.object({
                text: z.string().describe("Text to apply semantic search"),
            }) as FlexibleSchema,
            execute: async ({ text }: { text: string }) => {
                const res = await getPastMeetingTranscript(text);
                const combinedText = res.join("\n");
                return {
                    kind: "meeting_data",
                    message: combinedText,
                };
            },
        }),
    },
});