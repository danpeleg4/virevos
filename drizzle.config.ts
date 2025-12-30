import 'dotenv/config';
import { defineConfig } from "drizzle-kit";

const isProd = process.env.NODE_ENV === "production";

export default defineConfig({
    dialect: "postgresql",
    schema: "./db/schema.ts",
    out: "./db/migrations",
    dbCredentials: {
        url: process.env.DATABASE_URL!,
        ssl: isProd
            ? { rejectUnauthorized: false }
            : false
    },
    verbose: true,
});
