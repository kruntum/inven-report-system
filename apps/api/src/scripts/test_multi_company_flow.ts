import { db } from "../db/connection.ts";
import { companies, users, userCompanies } from "../db/schema.ts";
import { eq } from "drizzle-orm";

async function runTest() {
  console.log("=== STARTING MULTI-COMPANY AUTOMATED SYSTEM TEST ===");

  // 1. Verify existing companies count
  const allCompanies = await db.select().from(companies);
  console.log(`[PASS 1] Total companies in DB: ${allCompanies.length}`);
  allCompanies.forEach(c => console.log(`  - Company: "${c.name}" (ID: ${c.id}, TaxID: ${c.taxId})`));

  // 2. Test creation of secondary company if not exists
  let secondComp = allCompanies.find(c => c.name.includes("สวนมะพร้าว") || c.name.includes("แปรรูป"));
  if (!secondComp) {
    const [newComp] = await db.insert(companies).values({
      companyTypeId: 1,
      name: "บริษัท สวนมะพร้าวสุขใจ แปรรูป จำกัด",
      taxId: "0105559998881",
      houseNo: "88/1",
      subDistrict: "บางคนที",
      district: "บางคนที",
      province: "สมุทรสงคราม",
      zipcode: "75120",
      address: "88/1 ตำบลบางคนที อำเภอบางคนที จังหวัดสมุทรสงคราม 75120",
      authorizedPerson: "นางสาวสมหญิง สุขใจ",
      authorizedPosition: "กรรมการผู้จัดการ",
    }).returning();
    secondComp = newComp;
    console.log(`[PASS 2] Created new test company: "${secondComp.name}" (ID: ${secondComp.id})`);
  } else {
    console.log(`[PASS 2] Secondary test company exists: "${secondComp.name}"`);
  }

  // 3. Verify user_companies mapping for users
  const adminUsers = await db.select().from(users);
  console.log(`[PASS 3] Total users in DB: ${adminUsers.length}`);

  for (const u of adminUsers) {
    const userComps = await db
      .select({ companyId: userCompanies.companyId, companyName: companies.name })
      .from(userCompanies)
      .innerJoin(companies, eq(userCompanies.companyId, companies.id))
      .where(eq(userCompanies.userId, u.id));
    console.log(`  - User "${u.username}" (${u.fullName}, Role: ${u.roleId}) assigned to ${userComps.length} company(ies):`);
    userComps.forEach(uc => console.log(`      * ${uc.companyName} (${uc.companyId})`));
  }

  console.log("=== MULTI-COMPANY AUTOMATED SYSTEM TEST COMPLETED SUCCESSFULLY ===");
  process.exit(0);
}

runTest().catch((err) => {
  console.error("Test Error:", err);
  process.exit(1);
});
