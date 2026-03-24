import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { emails, clients } from "@db/schema";
import { eq } from "drizzle-orm";
import axios from "axios";
import {
  getGmailClient,
  buildRawEmail,
  parseEmailAddress,
  EmailAttachment,
} from "@/lib/gmail_client";
import { s3, S3_BUCKET } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      to,
      toName,
      subject,
      bodyHtml,
      bodyText,
      threadId,
      attachments: rawAttachments,
    } = body as {
      to: string;
      toName?: string;
      subject: string;
      bodyHtml: string;
      bodyText?: string;
      threadId?: string;
      attachments?: Array<{ name: string; url?: string; path?: string; data?: string; mimeType?: string }>;
    };

    if (!to || !subject || !bodyHtml) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, bodyHtml" },
        { status: 400 }
      );
    }

    const gmail = await getGmailClient(user.id);
    if (!gmail) {
      return NextResponse.json(
        { error: "Gmail not connected. Please connect your Google account." },
        { status: 400 }
      );
    }

    // Get user's Gmail address
    const profileRes = await gmail.users.getProfile({ userId: "me" });
    const fromEmail =
      profileRes.data.emailAddress ||
      user.emailAddresses?.[0]?.emailAddress ||
      "";
    const fromName = user.fullName || "";

    const attachments: EmailAttachment[] = [];
    if (rawAttachments && rawAttachments.length > 0) {
      for (const att of rawAttachments) {
        try {
          let buffer: Buffer | null = null;
          let mimeType = "application/octet-stream";

          if (att.data) {
            buffer = Buffer.from(att.data, "base64");
            mimeType = att.mimeType || mimeType;
          } else if (att.path) {
            const result = await s3.send(
              new GetObjectCommand({ Bucket: S3_BUCKET, Key: att.path })
            );
            if (!result.Body) throw new Error("Empty S3 body");
            buffer = Buffer.from(await result.Body.transformToByteArray());
            mimeType = result.ContentType || mimeType;
          } else if (att.url) {
            const res = await axios.get<ArrayBuffer>(att.url, {
              responseType: "arraybuffer",
            });
            buffer = Buffer.from(res.data);
          }

          if (!buffer) continue;
          attachments.push({
            name: att.name,
            contentBase64: buffer.toString("base64"),
            mimeType,
          });
        } catch (err) {
          console.error(`Failed to fetch attachment "${att.name}":`, err);
        }
      }
    }

    const rawEmail = buildRawEmail({
      to,
      toName,
      from: fromEmail,
      fromName,
      subject,
      bodyHtml,
      bodyText,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    const sendParams = {
      userId: "me",
      requestBody: {
        raw: rawEmail,
        ...(threadId ? { threadId } : {}),
      },
    };

    const sendRes = await gmail.users.messages.send(sendParams);
    const gmailId = sendRes.data.id!;
    const sentThreadId = sendRes.data.threadId!;

    // Try to match recipient to a client
    let clientId: number | null = null;
    const toEmailAddr = parseEmailAddress(to).email || to;

    // Simple email match
    const allClients = await db
      .select({ id: clients.id, email: clients.email })
      .from(clients)
      .where(eq(clients.userId, user.id));
    for (const c of allClients) {
      if (c.email?.toLowerCase() === toEmailAddr.toLowerCase()) {
        clientId = c.id;
        break;
      }
    }

    // Save sent email to DB
    await db.insert(emails).values({
      gmailId,
      threadId: sentThreadId,
      subject,
      snippet:
        bodyText?.slice(0, 200) ||
        bodyHtml.replace(/<[^>]*>/g, "").slice(0, 200),
      fromEmail,
      fromName,
      toEmails: [toEmailAddr],
      bodyHtml,
      bodyText: bodyText || null,
      labelIds: ["SENT"],
      isRead: true,
      isStarred: false,
      isArchived: false,
      isSent: true,
      sentAt: new Date(),
      clientId,
      userId: user.id,
    });

    return NextResponse.json({ success: true, gmailId });
  } catch (err) {
    console.error("[api/gmail/send POST]", err);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
