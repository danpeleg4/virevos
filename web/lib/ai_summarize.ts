import OpenAI from "openai";
import { db } from "@db/db";
import { emails, clients } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateClientSummary(
  userId: string,
  clientId: number
): Promise<{
  summary: string;
  keyTopics: string[];
  actionItems: string[];
  sentiment: "positive" | "neutral" | "needs-attention";
  emailCount: number;
}> {
  const clientEmails = await db
    .select()
    .from(emails)
    .where(and(eq(emails.userId, userId), eq(emails.clientId, clientId)))
    .orderBy(desc(emails.sentAt))
    .limit(50);

  const clientInfo = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
    .limit(1);

  if (clientEmails.length === 0) {
    return {
      summary: "No emails found for this client.",
      keyTopics: [],
      actionItems: [],
      sentiment: "neutral",
      emailCount: 0,
    };
  }

  const emailSummaries = clientEmails
    .map(
      (e) =>
        `[${e.isSent ? "SENT" : "RECEIVED"} ${e.sentAt.toISOString()}]\nSubject: ${e.subject}\n${
          e.bodyText?.slice(0, 500) || e.snippet || ""
        }`
    )
    .join("\n\n---\n\n");

  const prompt = `You are analyzing email communications between a business and their client "${
    clientInfo[0]?.name || "Unknown"
  }".

Here are the most recent email exchanges (up to 50):

${emailSummaries}

Please provide:
1. A concise 2-3 paragraph summary of the overall communication
2. Key topics discussed (as a JSON array of strings)
3. Action items identified (as a JSON array of strings)
4. Overall sentiment: "positive", "neutral", or "needs-attention"

Respond with valid JSON only:
{
  "summary": "...",
  "keyTopics": ["..."],
  "actionItems": ["..."],
  "sentiment": "positive|neutral|needs-attention"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_tokens: 1000,
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  return {
    summary: result.summary || "",
    keyTopics: result.keyTopics || [],
    actionItems: result.actionItems || [],
    sentiment: result.sentiment || "neutral",
    emailCount: clientEmails.length,
  };
}
