import {
  type JobContext,
  type JobProcess,
  ServerOptions,
  cli,
  defineAgent,
  voice,
} from "@livekit/agents";
import * as openai from "@livekit/agents-plugin-openai";
import * as silero from "@livekit/agents-plugin-silero";
import { fileURLToPath } from "node:url";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    proc.userData.vad = await silero.VAD.load();
  },

  entry: async (ctx: JobContext) => {
    await ctx.connect();

    const vad = ctx.proc.userData.vad as silero.VAD;

    const session = new voice.AgentSession({
      vad,
      stt: new openai.STT({ model: "gpt-4o-transcribe" }),
    });

    session.on(
      voice.AgentSessionEventTypes.UserInputTranscribed,
      async (event: voice.UserInputTranscribedEvent) => {
        if (!event.isFinal) return;

        try {
          await axios.post(
            `${process.env.NEXT_PUBLIC_APP_URL}/api/transcript-chunk`,
            {
              roomId: ctx.room.name,
              speakerIdentity: event.speakerId ?? "unknown",
              text: event.transcript,
            },
            {
              headers: {
                Authorization: `Bearer ${process.env.LIVEKIT_API_KEY_AGENT}`,
              },
            }
          );
        } catch (err) {
          console.error("Failed to save transcript chunk:", err);
        }
      }
    );

    await session.start({
      agent: new voice.Agent({
        instructions: "Transcribe all speech accurately.",
      }),
      room: ctx.room,
      outputOptions: {
        transcriptionEnabled: false,
      },
    });
  },
});

cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: "transcription-agent",
  })
);
