import { Resend } from "resend";

let cached: Resend | null = null;

export function getResend(): Resend {
  if (cached) return cached;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  cached = new Resend(apiKey);
  return cached;
}

export const DEFAULT_FROM =
  process.env.RESEND_FROM_EMAIL ?? "Virevos <noreply@virevos.com>";

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<{ id: string }> {
  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: opts.from ?? DEFAULT_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  if (error) {
    throw new Error(
      `Resend send failed: ${error.message ?? JSON.stringify(error)}`
    );
  }
  if (!data?.id) {
    throw new Error("Resend send failed: no id returned");
  }
  return { id: data.id };
}
