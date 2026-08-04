import { PostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

let container: StartedPostgreSqlContainer;

export async function setup() {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  process.env.TEST_DATABASE_URL = container.getConnectionUri();
  // db/db.ts reads DATABASE_URL at import time, and the *_db.ts classes
  // import it for their `export const xDrizzle = new XDrizzle(db)` singleton,
  // so it must be set even though tests use `testDb` instead of that singleton.
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

  const migrationClient = postgres(process.env.TEST_DATABASE_URL, {
    max: 1,
    onnotice: () => {},
  });
  await migrate(drizzle(migrationClient), {
    migrationsFolder: "./db/migrations",
  });
  await migrationClient.end();
}

export async function teardown() {
  await container.stop();
}
