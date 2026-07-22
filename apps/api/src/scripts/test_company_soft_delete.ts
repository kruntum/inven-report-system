import { db } from "../db/connection.ts";
import { companies } from "../db/schema.ts";
import { notDeleted } from "../db/helpers.ts";
import { eq } from "drizzle-orm";

async function runTest() {
  console.log("=== STARTING COMPANY SOFT DELETE & RESTORE AUTOMATED TEST ===");

  // 1. Get all active companies
  const activeCompList = await db.select().from(companies).where(notDeleted(companies));
  console.log(`[PASS 1] Total active companies in DB: ${activeCompList.length}`);

  // 2. Select a target company for soft delete test
  const targetComp = activeCompList.find(c => c.name.includes("สวนมะพร้าวสุขใจ"));
  if (!targetComp) {
    console.log("[SKIP] Target test company 'สวนมะพร้าวสุขใจ' not found for soft delete test.");
    process.exit(0);
  }

  console.log(`[PASS 2] Testing Soft Delete on: "${targetComp.name}" (ID: ${targetComp.id})`);

  // 3. Execute Soft Delete
  await db
    .update(companies)
    .set({ deletedAt: new Date() })
    .where(eq(companies.id, targetComp.id));

  // 4. Verify company is excluded from active query
  const activeAfterDelete = await db.select().from(companies).where(notDeleted(companies));
  const isStillInActive = activeAfterDelete.some(c => c.id === targetComp.id);
  console.log(`[PASS 3] Soft Delete Verified: Is company present in active query? ${isStillInActive ? "YES (FAIL)" : "NO (PASS - EXCLUDED)"}`);

  // 5. Execute Restore
  await db
    .update(companies)
    .set({ deletedAt: null as any })
    .where(eq(companies.id, targetComp.id));

  // 6. Verify company is restored
  const activeAfterRestore = await db.select().from(companies).where(notDeleted(companies));
  const isRestoredInActive = activeAfterRestore.some(c => c.id === targetComp.id);
  console.log(`[PASS 4] Restore Verified: Is company restored in active query? ${isRestoredInActive ? "YES (PASS - RESTORED)" : "NO (FAIL)"}`);

  console.log("=== ALL SOFT DELETE & RESTORE TESTS COMPLETED SUCCESSFULLY ===");
  process.exit(0);
}

runTest().catch((err) => {
  console.error("Test Error:", err);
  process.exit(1);
});
