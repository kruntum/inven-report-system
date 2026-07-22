import { db } from "../db/connection.ts";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Starting user_companies migration...");

  // 1. Create table user_companies if not exists
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_companies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT user_companies_user_company_unique UNIQUE (user_id, company_id)
    );
  `);
  console.log("Table user_companies ensured.");

  // 2. Populate user_companies from existing users.company_id
  await db.execute(sql`
    INSERT INTO user_companies (user_id, company_id)
    SELECT id AS user_id, company_id
    FROM users
    WHERE company_id IS NOT NULL
    ON CONFLICT (user_id, company_id) DO NOTHING;
  `);

  console.log("Migrated existing user company relations successfully.");
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
