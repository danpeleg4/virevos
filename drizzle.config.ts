import { defineConfig } from "drizzle-kit";
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, './.env') });

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
