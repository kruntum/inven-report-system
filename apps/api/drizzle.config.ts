import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://inven_admin:Xk9_mPv2_wLq8nR4_safe@localhost:6009/inven_report_db",
  },
  verbose: true,
  strict: true,
});
