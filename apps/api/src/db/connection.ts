import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

const connectionString = process.env.DATABASE_URL || "postgresql://inven_admin:Xk9_mPv2_wLq8nR4_safe@localhost:6009/inven_report_db";

// Prepare the postgres client
export const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
});

// Prepare the drizzle database instance
export const db = drizzle(client, { schema });
export type DbType = typeof db;
export default db;
