import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "../config/env";

const client = postgres(env.DATABASE_URL, {
  prepare: false,
  max: env.NODE_ENV === "test" ? 2 : 10,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => undefined,
});

export const db = drizzle(client, { schema, logger: false });
export type DB = typeof db;

export async function closeDb() {
  await client.end({ timeout: 5 });
}
