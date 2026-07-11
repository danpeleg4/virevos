import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const isProd = process.env.NODE_ENV === "production";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set in the environment variables. Please check your root .env file."
  );
}

const client = postgres(url, {
  ssl: isProd ? "require" : false,
});

export const db = drizzle(client, { schema });
