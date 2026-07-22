import { db, client } from "../db/connection.ts";
import { 
  companies, 
  users, 
  userCompanies, 
  products, 
  storageLocations, 
  partners, 
  documents,
  stockTransactions, 
  monthlyReports 
} from "../db/schema.ts";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Starting database export to production seed script...");

  // Fetch all records chronologically and logically
  console.log("📥 Fetching companies...");
  const companiesList = await db.select().from(companies);

  console.log("📥 Fetching users...");
  const usersList = await db.select().from(users);

  console.log("📥 Fetching userCompanies relations...");
  const userCompaniesList = await db.select().from(userCompanies);

  console.log("📥 Fetching products...");
  const productsList = await db.select().from(products);

  console.log("📥 Fetching storage locations...");
  const storageLocationsList = await db.select().from(storageLocations);

  console.log("📥 Fetching partners...");
  const partnersList = await db.select().from(partners);

  console.log("📥 Fetching documents...");
  const documentsList = await db.select().from(documents);

  console.log("📥 Fetching stock transactions...");
  const stockTransactionsList = await db.select().from(stockTransactions);

  console.log("📥 Fetching monthly reports...");
  const monthlyReportsList = await db.select().from(monthlyReports);

  // Generate output file content
  const targetFilePath = path.join(__dirname, "../db/seed_production.ts");

  let content = `import { db, client } from "./connection.ts";
import { 
  companies, 
  users, 
  userCompanies, 
  products, 
  storageLocations, 
  partners, 
  documents,
  stockTransactions, 
  monthlyReports,
  masterRoles, 
  masterCompanyTypes, 
  masterUnits, 
  masterTransactionTypes, 
  masterDocumentTypes, 
  masterReportStatuses,
  masterPartnerTypes
} from "./schema.ts";

async function main() {
  console.log("🏁 Starting production database seeding...");

  // 1. Seed Master Data (to make sure lookup entries exist)
  console.log("1️⃣ Seeding Master Lookup tables...");
  await db.insert(masterRoles).values([
    { id: 1, name: "Admin (ผู้ดูแลระบบ)" },
    { id: 2, name: "Data Entry (ผู้บันทึกข้อมูล)" },
    { id: 3, name: "Gov Officer (เจ้าหน้าที่ตรวจสอบ)" }
  ]).onConflictDoNothing();

  await db.insert(masterCompanyTypes).values([
    { id: 1, name: "ผู้รับซื้อมะพร้าวผลอ่อน" },
    { id: 2, name: "ผู้รับซื้อน้ำมะพร้าว" },
    { id: 3, name: "โรงงานแปรรูป/ผลิตมะพร้าว" },
    { id: 4, name: "ผู้นำเข้ามะพร้าว" }
  ]).onConflictDoNothing();

  await db.insert(masterUnits).values([
    { id: 1, name: "ลูก" },
    { id: 2, name: "ตัน" },
    { id: 3, name: "กิโลกรัม" },
    { id: 4, name: "ลิตร" },
    { id: 5, name: "กล่อง" }
  ]).onConflictDoNothing();

  await db.insert(masterTransactionTypes).values([
    { id: 1, name: "รับซื้อ" },
    { id: 2, name: "จำหน่าย" },
    { id: 3, name: "ใช้ผลิต" },
    { id: 4, name: "ปรับปรุงยอด" }
  ]).onConflictDoNothing();

  await db.insert(masterDocumentTypes).values([
    { id: 1, name: "ใบเสร็จรับเงิน" },
    { id: 2, name: "ใบกำกับภาษี" },
    { id: 3, name: "สัญญาซื้อขาย" },
    { id: 4, name: "แบบ สกกร. 02" }
  ]).onConflictDoNothing();

  await db.insert(masterReportStatuses).values([
    { id: 1, name: "ร่าง (Draft)" },
    { id: 2, name: "ส่งแล้ว (Submitted)" },
    { id: 3, name: "อนุมัติ (Verified)" }
  ]).onConflictDoNothing();

  await db.insert(masterPartnerTypes).values([
    { id: 1, name: "โรงงานแปรรูป" },
    { id: 2, name: "สวน/เกษตรกร" },
    { id: 3, name: "ผู้รวบรวม/ลานเท" },
    { id: 4, name: "บริษัททั่วไป" }
  ]).onConflictDoNothing();

  // 2. Clear existing production data (except master tables) to avoid key violations during re-seed
  console.log("🧹 Clearing existing data (excluding master tables)...");
  await db.delete(monthlyReports);
  await db.delete(stockTransactions);
  await db.delete(documents);
  await db.delete(partners);
  await db.delete(storageLocations);
  await db.delete(products);
  await db.delete(userCompanies);
  await db.delete(users);
  await db.delete(companies);

  // 3. Seed exported content
  console.log("🏢 Seeding companies (${companiesList.length} records)...");
  if (${companiesList.length} > 0) {
    await db.insert(companies).values(${JSON.stringify(companiesList, null, 2)});
  }

  console.log("👥 Seeding users (${usersList.length} records)...");
  if (${usersList.length} > 0) {
    await db.insert(users).values(${JSON.stringify(usersList, null, 2)});
  }

  console.log("🔗 Seeding userCompanies relations (${userCompaniesList.length} records)...");
  if (${userCompaniesList.length} > 0) {
    await db.insert(userCompanies).values(${JSON.stringify(userCompaniesList, null, 2)});
  }

  console.log("📦 Seeding products (${productsList.length} records)...");
  if (${productsList.length} > 0) {
    await db.insert(products).values(${JSON.stringify(productsList, null, 2)});
  }

  console.log("🏬 Seeding storage locations (${storageLocationsList.length} records)...");
  if (${storageLocationsList.length} > 0) {
    await db.insert(storageLocations).values(${JSON.stringify(storageLocationsList, null, 2)});
  }

  console.log("🤝 Seeding partners (${partnersList.length} records)...");
  if (${partnersList.length} > 0) {
    await db.insert(partners).values(${JSON.stringify(partnersList, null, 2)});
  }

  console.log("📄 Seeding documents (${documentsList.length} records)...");
  if (${documentsList.length} > 0) {
    await db.insert(documents).values(${JSON.stringify(documentsList, null, 2)});
  }

  console.log("📈 Seeding stock transactions (${stockTransactionsList.length} records)...");
  if (${stockTransactionsList.length} > 0) {
    // Chunking insertions to prevent PostgreSQL placeholder limits if records are very large
    const txs = ${JSON.stringify(stockTransactionsList, null, 2)};
    const chunkSize = 200;
    for (let i = 0; i < txs.length; i += chunkSize) {
      const chunk = txs.slice(i, i + chunkSize);
      await db.insert(stockTransactions).values(chunk);
    }
  }

  console.log("📊 Seeding monthly reports (${monthlyReportsList.length} records)...");
  if (${monthlyReportsList.length} > 0) {
    await db.insert(monthlyReports).values(${JSON.stringify(monthlyReportsList, null, 2)});
  }

  console.log("🎉 Production seeding completed successfully!");
  await client.end();
}

main().catch((err) => {
  console.error("❌ Production seeding failed:", err);
  process.exit(1);
});
`;

  fs.writeFileSync(targetFilePath, content);
  console.log(`✅ Production seed file written successfully to: ${targetFilePath}`);

  await client.end();
}

main().catch((err) => {
  console.error("❌ Export failed:", err);
  process.exit(1);
});
