import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "@db/schema";
import { users } from "@db/schema";

const client = postgres(process.env.TEST_DATABASE_URL!, {
  max: 1,
  onnotice: () => {},
});

export const testDb = drizzle(client, { schema });

export async function resetDb() {
  await testDb.execute(sql`
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
      END LOOP;
    END $$;
  `);
}

export async function seedUser(userId: string) {
  await testDb.insert(users).values({
    userId,
    email: `${userId}@example.com`,
  });
}
