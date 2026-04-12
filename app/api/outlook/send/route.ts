import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import axios from "axios";
import { getFreshOutlookAccessToken } from "@/lib/outlook_access";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

interface SendEmailBody {
  to: string;
  toName?: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  cc?: string[];
  replyToOutlookId?: string; // outlook message ID to reply to
}

function buildRecipient(address: string, name?: string) {
  return { emailAddress: { address, name: name ?? address } };
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const token = await getFreshOutlookAccessToken(user.id);
  if (!token) {
    return NextResponse.json(
      { error: "Outlook account not connected" },
      { status: 403 }
    );
  }

  const body = (await req.json()) as SendEmailBody;
  const { to, toName, subject, bodyHtml, bodyText, cc, replyToOutlookId } = body;

  if (!to || !subject || !bodyHtml) {
    return NextResponse.json(
      { error: "Missing required fields: to, subject, bodyHtml" },
      { status: 400 }
    );
  }

  const message = {
    subject,
    body: {
      contentType: "HTML",
      content: bodyHtml,
    },
    toRecipients: [buildRecipient(to, toName)],
    ...(cc?.length
      ? { ccRecipients: cc.map((addr) => buildRecipient(addr)) }
      : {}),
    // Provide plain-text body as an internet message header when available
    ...(bodyText
      ? {
          uniqueBody: {
            contentType: "Text",
            content: bodyText,
          },
        }
      : {}),
  };

  try {
    if (replyToOutlookId) {
      // Reply to an existing message
      await axios.post(
        `${GRAPH_BASE}/me/messages/${replyToOutlookId}/reply`,
        { message },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } else {
      // Send a new message
      await axios.post(
        `${GRAPH_BASE}/me/sendMail`,
        { message, saveToSentItems: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const status =
      (err as { response?: { status?: number } }).response?.status ?? 500;
    const message =
      (err as { response?: { data?: { error?: { message?: string } } } })
        .response?.data?.error?.message ?? "Failed to send email";

    console.error("[outlook/send POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
