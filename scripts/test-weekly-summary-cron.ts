import { config } from "dotenv";

config({ path: ".env.local" });

const url =
  process.argv[2] ??
  process.env.WEEKLY_SUMMARY_URL ??
  "http://localhost:3000/api/cron/weekly-summary";

const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("CRON_SECRET is not set in .env.local");
  process.exit(1);
}

const TIMEOUT_MS = Number(process.env.WEEKLY_SUMMARY_TIMEOUT_MS ?? 300_000);

async function main() {
  const startedAt = Date.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { authorization: `Bearer ${secret}` },
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") {
      console.error(
        `Aborted after ${TIMEOUT_MS}ms — server is hanging. Check dev-server logs to see which step is stuck.`
      );
      process.exit(2);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const elapsed = Date.now() - startedAt;
  const text = await res.text();

  console.log(`HTTP ${res.status} in ${elapsed}ms`);
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2));
  } catch {
    console.log(text);
  }

  if (!res.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
