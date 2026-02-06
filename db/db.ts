import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

const isProd = process.env.NODE_ENV === "production";

const url = process.env.DATABASE_URL;
if (!url) {
    throw new Error("DATABASE_URL is not set in the environment variables. Please check your root .env file.");
}

export const db = drizzle({
    schema,
    connection: {
        connectionString: url,
        ssl: isProd
            ? { rejectUnauthorized: false }
            : false
    },
});
