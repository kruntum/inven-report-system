import { db, client } from "./connection.ts";
import { 
  masterRoles, 
  masterCompanyTypes, 
  masterUnits, 
  masterTransactionTypes, 
  masterDocumentTypes, 
  masterReportStatuses,
  masterPartnerTypes,
  partners,
  companies,
  users,
  products,
  storageLocations
} from "./schema.ts";

async function main() {
  console.log("Seeding started...");

  // 1. Seed Master Roles
  console.log("Seeding master_roles...");
  await db.insert(masterRoles).values([
    { id: 1, name: "Admin (ผู้ดูแลระบบ)" },
    { id: 2, name: "Data Entry (ผู้บันทึกข้อมูล)" },
    { id: 3, name: "Gov Officer (เจ้าหน้าที่ตรวจสอบ)" }
  ]).onConflictDoNothing();

  // 2. Seed Master Company Types
  console.log("Seeding master_company_types...");
  await db.insert(masterCompanyTypes).values([
    { id: 1, name: "ผู้รับซื้อมะพร้าวผลอ่อน" },
    { id: 2, name: "ผู้รับซื้อน้ำมะพร้าว" },
    { id: 3, name: "โรงงานแปรรูป/ผลิตมะพร้าว" },
    { id: 4, name: "ผู้นำเข้ามะพร้าว" }
  ]).onConflictDoNothing();

  // 3. Seed Master Units
  console.log("Seeding master_units...");
  await db.insert(masterUnits).values([
    { id: 1, name: "ลูก" },
    { id: 2, name: "ตัน" },
    { id: 3, name: "กิโลกรัม" },
    { id: 4, name: "ลิตร" },
    { id: 5, name: "กล่อง" }
  ]).onConflictDoNothing();

  // 4. Seed Master Transaction Types
  console.log("Seeding master_transaction_types...");
  await db.insert(masterTransactionTypes).values([
    { id: 1, name: "รับซื้อ" },
    { id: 2, name: "จำหน่าย" },
    { id: 3, name: "ใช้ผลิต" },
    { id: 4, name: "ปรับปรุงยอด" }
  ]).onConflictDoNothing();

  // 5. Seed Master Document Types
  console.log("Seeding master_document_types...");
  await db.insert(masterDocumentTypes).values([
    { id: 1, name: "ใบเสร็จรับเงิน" },
    { id: 2, name: "ใบกำกับภาษี" },
    { id: 3, name: "สัญญาซื้อขาย" },
    { id: 4, name: "แบบ สกกร. 02" }
  ]).onConflictDoNothing();

  // 6. Seed Master Report Statuses
  console.log("Seeding master_report_statuses...");
  await db.insert(masterReportStatuses).values([
    { id: 1, name: "ร่าง (Draft)" },
    { id: 2, name: "ส่งแล้ว (Submitted)" },
    { id: 3, name: "อนุมัติ (Verified)" }
  ]).onConflictDoNothing();

  // 6.5. Seed Master Partner Types
  console.log("Seeding master_partner_types...");
  await db.insert(masterPartnerTypes).values([
    { id: 1, name: "โรงงานแปรรูป" },
    { id: 2, name: "สวน/เกษตรกร" },
    { id: 3, name: "ผู้รวบรวม/ลานเท" },
    { id: 4, name: "บริษัททั่วไป" }
  ]).onConflictDoNothing();

  // 7. Seed Default Company
  console.log("Seeding default company...");
  const [seededCompany] = await db.insert(companies).values([
    {
      name: "บริษัท มะพร้าวไทยรุ่งเรือง จำกัด",
      companyTypeId: 1, // ผู้รับซื้อมะพร้าวผลอ่อน
      taxId: "0105563000123",
      houseNo: "123/45",
      soi: "-",
      road: "พระราม 2",
      subDistrict: "แสมดำ",
      district: "บางขุนเทียน",
      province: "กรุงเทพมหานคร",
      zipcode: "10150",
      address: "123/45 ถนนพระราม 2 แขวงแสมดำ เขตบางขุนเทียน กรุงเทพมหานคร 10150",
      phone: "02-123-4567",
      email: "info@thaicoconutrr.com"
    }
  ]).onConflictDoUpdate({
    target: companies.taxId,
    set: { 
      name: "บริษัท มะพร้าวไทยรุ่งเรือง จำกัด", 
      houseNo: "123/45",
      soi: "-",
      road: "พระราม 2",
      subDistrict: "แสมดำ",
      district: "บางขุนเทียน",
      province: "กรุงเทพมหานคร",
      zipcode: "10150",
      address: "123/45 ถนนพระราม 2 แขวงแสมดำ เขตบางขุนเทียน กรุงเทพมหานคร 10150", 
      phone: "02-123-4567", 
      email: "info@thaicoconutrr.com" 
    }
  }).returning({ id: companies.id });

  const companyId = seededCompany?.id;

  if (companyId) {
    // 8. Seed Default Admin User
    console.log("Seeding default admin user...");
    const rawAdminPass = process.env.ADMIN_PASSWORD || "Qp6&vKd8#mXs2wR1";
    // We hash the password using Bun's native password hasher
    const passwordHash = await Bun.password.hash(rawAdminPass, {
      algorithm: "bcrypt",
      cost: 10
    });

    await db.insert(users).values([
      {
        companyId: companyId,
        roleId: 1, // Admin
        username: "admin",
        passwordHash: passwordHash,
        fullName: "สมชาย ยอดมะพร้าว (ผู้ดูแลระบบ)"
      }
    ]).onConflictDoUpdate({
      target: users.username,
      set: { passwordHash: passwordHash, fullName: "สมชาย ยอดมะพร้าว (ผู้ดูแลระบบ)" }
    });

    // 9. Seed Default Products
    console.log("Seeding default products...");
    const [seededProductSoft, seededProductLiquid] = await db.insert(products).values([
      { name: "มะพร้าวผลอ่อน", baseUnitId: 1 }, // ลูก
      { name: "น้ำมะพร้าวสด", baseUnitId: 2 }  // ตัน
    ]).returning({ id: products.id, name: products.name });

    // 10. Seed Default Storage Locations
    console.log("Seeding default storage locations...");
    await db.insert(storageLocations).values([
      {
        companyId: companyId,
        name: "โกดังสินค้า A (คลังรับมะพร้าวผลอ่อน)",
        address: "123/45 โกดังย่อย A ถนนพระราม 2 กรุงเทพฯ"
      },
      {
        companyId: companyId,
        name: "ถังเก็บเย็น B (คลังน้ำมะพร้าวสด)",
        address: "123/45 โรงสีเย็น B ถนนพระราม 2 กรุงเทพฯ"
      }
    ]);
  }

  console.log("Seeding completed successfully!");
  await client.end();
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
