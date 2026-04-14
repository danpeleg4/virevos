import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import axios from "axios";
import { getFreshOutlookAccessToken } from "@/lib/outlook_access";
import { downloadFile } from "@/lib/storage";
import { FILES_BUCKET } from "@/lib/supabase";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const LARGE_ATTACHMENT_THRESHOLD = 3 * 1024 * 1024; // 3 MB
const UPLOAD_CHUNK_SIZE = 3 * 327_680; // ~960 KB (must be multiple of 320 KB)

interface AttachmentInput {
  name: string;
  data?: string; // base64-encoded file content
  path?: string; // Supabase storage path (app files)
  url?: string; // hyperlink — appended to body, not uploaded
  mimeType?: string;
}

interface SendEmailBody {
  to: string;
  toName?: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  cc?: string[];
  replyToOutlookId?: string;
  attachments?: AttachmentInput[];
}

function buildRecipient(address: string, name?: string) {
  return { emailAddress: { address, name: name ?? address } };
}

function buildBodyHtml(
  html: string,
  urlAttachments: AttachmentInput[]
): string {
  if (urlAttachments.length === 0) return html;
  const links = urlAttachments
    .map((a) => `<a href="${a.url}">${a.name}</a>`)
    .join("<br>");
  return `${html}<br><br>${links}`;
}

async function resolveBuffer(att: AttachmentInput): Promise<Buffer | null> {
  if (att.data) {
    return Buffer.from(att.data, "base64");
  }
  if (att.path) {
    const bytes = await downloadFile(FILES_BUCKET, att.path);
    return Buffer.from(bytes);
  }
  return null;
}

async function addSmallAttachment(
  draftId: string,
  token: string,
  name: string,
  contentType: string,
  buffer: Buffer
): Promise<void> {
  await axios.post(
    `${GRAPH_BASE}/me/messages/${draftId}/attachments`,
    {
      "@odata.type": "#microsoft.graph.fileAttachment",
      name,
      contentType,
      contentBytes: buffer.toString("base64"),
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
}

async function addLargeAttachment(
  draftId: string,
  token: string,
  name: string,
  contentType: string,
  buffer: Buffer
): Promise<void> {
  // 1. Create upload session
  const sessionRes = await axios.post<{ uploadUrl: string }>(
    `${GRAPH_BASE}/me/messages/${draftId}/attachments/createUploadSession`,
    {
      AttachmentItem: {
        attachmentType: "file",
        name,
        size: buffer.length,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
  const { uploadUrl } = sessionRes.data;

  // 2. Upload in chunks to the session URL (no auth header needed)
  let offset = 0;
  while (offset < buffer.length) {
    const end = Math.min(offset + UPLOAD_CHUNK_SIZE, buffer.length);
    const chunk = buffer.slice(offset, end);
    await axios.put(uploadUrl, chunk, {
      headers: {
        "Content-Range": `bytes ${offset}-${end - 1}/${buffer.length}`,
        "Content-Type": contentType,
        "Content-Length": String(chunk.length),
      },
    });
    offset = end;
  }
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
  const { to, toName, subject, bodyHtml, cc, replyToOutlookId, attachments } =
    body;

  if (!to || !subject || !bodyHtml) {
    return NextResponse.json(
      { error: "Missing required fields: to, subject, bodyHtml" },
      { status: 400 }
    );
  }

  const fileAttachments = (attachments ?? []).filter((a) => a.data || a.path);
  const urlAttachments = (attachments ?? []).filter(
    (a) => a.url && !a.data && !a.path
  );

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const messagePayload = {
    subject,
    body: {
      contentType: "HTML",
      content: buildBodyHtml(bodyHtml, urlAttachments),
    },
    toRecipients: [buildRecipient(to, toName)],
    ...(cc?.length
      ? { ccRecipients: cc.map((addr) => buildRecipient(addr)) }
      : {}),
  };

  try {
    if (fileAttachments.length === 0) {
      // Fast path: no file attachments — use single-call APIs
      if (replyToOutlookId) {
        await axios.post(
          `${GRAPH_BASE}/me/messages/${replyToOutlookId}/reply`,
          { message: messagePayload },
          { headers }
        );
      } else {
        await axios.post(
          `${GRAPH_BASE}/me/sendMail`,
          { message: messagePayload, saveToSentItems: true },
          { headers }
        );
      }
      return NextResponse.json({ success: true });
    }

    // Draft-based path: required when file attachments are present
    let draftId: string;
    if (replyToOutlookId) {
      const res = await axios.post<{ id: string }>(
        `${GRAPH_BASE}/me/messages/${replyToOutlookId}/createReply`,
        { message: messagePayload },
        { headers }
      );
      draftId = res.data.id;
    } else {
      const res = await axios.post<{ id: string }>(
        `${GRAPH_BASE}/me/messages`,
        messagePayload,
        { headers }
      );
      draftId = res.data.id;
    }

    // Attach each file
    for (const att of fileAttachments) {
      const buffer = await resolveBuffer(att);
      if (!buffer) continue;
      const contentType = att.mimeType ?? "application/octet-stream";

      if (buffer.length < LARGE_ATTACHMENT_THRESHOLD) {
        await addSmallAttachment(draftId, token, att.name, contentType, buffer);
      } else {
        await addLargeAttachment(draftId, token, att.name, contentType, buffer);
      }
    }

    // Send the draft
    await axios.post(
      `${GRAPH_BASE}/me/messages/${draftId}/send`,
      {},
      { headers }
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const status =
      (err as { response?: { status?: number } }).response?.status ?? 500;
    const errMsg =
      (err as { response?: { data?: { error?: { message?: string } } } })
        .response?.data?.error?.message ?? "Failed to send email";

    console.error("[outlook/send POST]", err);
    return NextResponse.json({ error: errMsg }, { status });
  }
}
