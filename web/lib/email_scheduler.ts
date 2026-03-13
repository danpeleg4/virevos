import {
  SchedulerClient,
  CreateScheduleCommand,
  DeleteScheduleCommand,
} from "@aws-sdk/client-scheduler";

const scheduler = new SchedulerClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_SCHEDULER_ACESS_KEY!, // note: intentional typo matching env var
    secretAccessKey: process.env.AWS_SCHEDULER_SECRET_KEY!,
  },
});

function formatForScheduler(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const Y = date.getUTCFullYear();
  const M = pad(date.getUTCMonth() + 1);
  const D = pad(date.getUTCDate());
  const h = pad(date.getUTCHours());
  const m = pad(date.getUTCMinutes());
  const s = pad(date.getUTCSeconds());
  return `${Y}-${M}-${D}T${h}:${m}:${s}`;
}

export async function createEmailSchedule(
  scheduledEmailId: number,
  scheduledAt: Date
): Promise<string> {
  const scheduleName = `email-${scheduledEmailId}-${Date.now()}`;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL_NGROK || process.env.NEXT_PUBLIC_APP_URL;

  const command = new CreateScheduleCommand({
    Name: scheduleName,
    ScheduleExpression: `at(${formatForScheduler(scheduledAt)})`,
    FlexibleTimeWindow: { Mode: "OFF" },
    Target: {
      Arn: process.env.AWS_TARGET_LAMBDA_ARN!,
      RoleArn: process.env.AWS_SCHEDULE_ROLE_ARN!,
      Input: JSON.stringify({
        type: "scheduled_email",
        scheduledEmailId,
        callbackUrl: `${appUrl}/api/webhooks/scheduled-email`,
        secret: process.env.WEBHOOK_SECRET || "virevos-scheduled-email",
      }),
    },
  });

  await scheduler.send(command);
  return scheduleName;
}

export async function deleteEmailSchedule(scheduleName: string): Promise<void> {
  const command = new DeleteScheduleCommand({ Name: scheduleName });
  await scheduler.send(command);
}
