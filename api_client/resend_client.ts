import { Resend } from "resend";

export const DEFAULT_FROM =
  process.env.RESEND_FROM_EMAIL ?? "Virevos <noreply@virevos.com>";

let _instance: Resend | undefined;

function getInstance(): Resend {
  if (!_instance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not set");
    }
    _instance = new Resend(apiKey);
  }
  return _instance;
}

// Lazy proxy so the SDK (and its env key) is only touched on first real call.
const resendSdk = new Proxy({} as Resend, {
  get(_: Resend, prop: string | symbol) {
    return getInstance()[prop as keyof Resend];
  },
});

export interface ResendClientInterface {
  sendEmail(opts: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }): Promise<{ id: string }>;
}

export class ResendApiClient implements ResendClientInterface {
  constructor(private readonly sdk: Resend) {}

  async sendEmail(opts: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }): Promise<{ id: string }> {
    const { data, error } = await this.sdk.emails.send({
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
}

export const resendApiClient = new ResendApiClient(resendSdk);
