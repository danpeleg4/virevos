import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

const isProd = process.env.NODE_ENV === "production";

export const db = drizzle({
    schema,
    connection: {
        connectionString: process.env.DATABASE_URL!,
        ssl: isProd ? { rejectUnauthorized: true } : false,
    },
});
