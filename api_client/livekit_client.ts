import {
  AccessToken,
  AgentDispatchClient,
  EgressClient,
  EncodedFileOutput,
  EncodedOutputs,
  WebhookEvent,
  WebhookReceiver,
} from "livekit-server-sdk";

export interface LiveKitClientInterface {
  /** Verifies and decodes a LiveKit webhook request. Throws when invalid. */
  receiveWebhook(body: string, authHeader?: string): Promise<WebhookEvent>;
  createToken(
    identity: string,
    room: string,
    ttlSeconds: number
  ): Promise<string>;
  dispatchAgent(roomName: string, agentName: string): Promise<void>;
  /** True when an egress is already STARTING or ACTIVE for the room. */
  hasActiveEgress(roomName: string): Promise<boolean>;
  startCompositeEgress(roomName: string, filepath: string): Promise<void>;
}

export class LiveKitClient implements LiveKitClientInterface {
  private _receiver: WebhookReceiver | undefined;
  private _egress: EgressClient | undefined;

  private receiver(): WebhookReceiver {
    if (!this._receiver) {
      this._receiver = new WebhookReceiver(
        process.env.LIVEKIT_API_KEY!,
        process.env.LIVEKIT_API_SECRET!
      );
    }
    return this._receiver;
  }

  private egress(): EgressClient {
    if (!this._egress) {
      this._egress = new EgressClient(process.env.NEXT_PUBLIC_LIVEKIT_URL!);
    }
    return this._egress;
  }

  async receiveWebhook(
    body: string,
    authHeader?: string
  ): Promise<WebhookEvent> {
    return this.receiver().receive(body, authHeader);
  }

  async createToken(
    identity: string,
    room: string,
    ttlSeconds: number
  ): Promise<string> {
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
      { identity, ttl: ttlSeconds }
    );
    at.addGrant({ roomJoin: true, room });
    return at.toJwt();
  }

  async dispatchAgent(roomName: string, agentName: string): Promise<void> {
    // AgentDispatchClient requires https:// host, not wss://
    const livekitHost = process.env.NEXT_PUBLIC_LIVEKIT_URL!.replace(
      /^wss?:\/\//,
      "https://"
    );
    const dispatchClient = new AgentDispatchClient(
      livekitHost,
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!
    );
    await dispatchClient.createDispatch(roomName, agentName);
  }

  async hasActiveEgress(roomName: string): Promise<boolean> {
    const existingEgresses = await this.egress().listEgress({ roomName });
    return existingEgresses.some(
      (e) => e.status === 0 || e.status === 1 // STARTING or ACTIVE
    );
  }

  async startCompositeEgress(
    roomName: string,
    filepath: string
  ): Promise<void> {
    const outputs: EncodedOutputs = {
      file: new EncodedFileOutput({
        filepath,
        output: {
          case: "s3",
          value: {
            accessKey: process.env.SUPABASE_S3_ACCESS_KEY_ID,
            secret: process.env.SUPABASE_S3_SECRET_ACCESS_KEY,
            endpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/s3`,
            bucket: "recording",
            region: "auto",
            forcePathStyle: true,
          },
        },
      }),
    };
    await this.egress().startRoomCompositeEgress(roomName, outputs);
  }
}

export const liveKitClient = new LiveKitClient();
