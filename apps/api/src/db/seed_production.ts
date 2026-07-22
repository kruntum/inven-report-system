import { db, client } from "./connection.ts";
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

function mapRows(rows: any[]) {
  return rows.map((row) => {
    const newRow = { ...row };
    for (const key of Object.keys(newRow)) {
      const val = newRow[key];
      // Convert ISO timestamp strings containing 'T' (e.g. 2026-07-22T04:12:00.000Z) into Date objects
      if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
        newRow[key] = new Date(val);
      }
    }
    return newRow;
  });
}

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
  console.log("🏢 Seeding companies (2 records)...");
  if (2 > 0) {
    await db.insert(companies).values(mapRows([
  {
    "id": "18a6edd8-9e99-446b-82ca-241e299a9f0f",
    "companyTypeId": 1,
    "name": "บริษัท สวนมะพร้าวสุขใจ แปรรูป จำกัด",
    "taxId": "0105559998881",
    "houseNo": "88/1",
    "soi": "-",
    "road": "-",
    "subDistrict": "คลองโคน",
    "district": "เมืองสมุทรสงคราม",
    "province": "สมุทรสงคราม",
    "zipcode": "75000",
    "address": "88/1 ตำบลคลองโคน อำเภอเมืองสมุทรสงคราม จังหวัดสมุทรสงคราม 75000",
    "phone": "-",
    "email": "-",
    "authorizedPerson": "นางสาวสมหญิง สุขใจ",
    "authorizedPosition": "กรรมการผู้จัดการ",
    "createdAt": "2026-07-22T02:11:30.194Z",
    "updatedAt": "2026-07-22T04:35:51.407Z",
    "deletedAt": null
  },
  {
    "id": "658168ff-a7e0-4688-bc7f-b820c96d337a",
    "companyTypeId": 1,
    "name": "เอเชีย ไทย อิมพอร์ต แอนด์ เอ็กซ์พอร์ต จำกัด",
    "taxId": "0205563001511",
    "houseNo": "52/35-36",
    "soi": "-",
    "road": "-",
    "subDistrict": "ทุ่งสุขลา",
    "district": "ศรีราชา",
    "province": "ชลบุรี",
    "zipcode": "20230",
    "address": "52/35-36 ตำบลทุ่งสุขลา อำเภอศรีราชา จังหวัดชลบุรี 20230",
    "phone": "02-1207411",
    "email": "tummy@asiathai.co.th",
    "authorizedPerson": "นางสาวนิภาพร ปัญญาเมืองใจ",
    "authorizedPosition": "กรรมการบริษัท",
    "createdAt": "2026-07-11T04:41:17.525Z",
    "updatedAt": "2026-07-21T05:39:11.537Z",
    "deletedAt": null
  }
]));
  }

  console.log("👥 Seeding users (2 records)...");
  if (2 > 0) {
    await db.insert(users).values(mapRows([
  {
    "id": "a7a8d811-9271-4851-bcf7-81cf52795f28",
    "companyId": "658168ff-a7e0-4688-bc7f-b820c96d337a",
    "roleId": 1,
    "username": "admin",
    "passwordHash": "$2b$10$ucRaDxZ.0iAN/jskSiry2O5ragODpcXeQ5D.URh3YH.8HDpnxkSEK",
    "fullName": "เฉลิมฤทธิ์ ทองคำ",
    "createdAt": "2026-07-11T04:41:17.579Z",
    "updatedAt": "2026-07-20T11:28:26.255Z",
    "deletedAt": null
  },
  {
    "id": "e8d38e87-0fe3-4443-b98b-22863519d2ed",
    "companyId": "658168ff-a7e0-4688-bc7f-b820c96d337a",
    "roleId": 2,
    "username": "chompoo",
    "passwordHash": "$2b$10$dVQSvn60T6c9qbYq1bGdqutFU1vhzEXFItYkE2yGAyIhoj.mQGD/.",
    "fullName": "นางสาวชมพู่",
    "createdAt": "2026-07-22T02:00:38.254Z",
    "updatedAt": "2026-07-22T02:32:07.410Z",
    "deletedAt": null
  }
]));
  }

  console.log("🔗 Seeding userCompanies relations (3 records)...");
  if (3 > 0) {
    await db.insert(userCompanies).values(mapRows([
  {
    "id": "a48f40a0-9272-4a6a-88e5-25cbc0fbd75b",
    "userId": "a7a8d811-9271-4851-bcf7-81cf52795f28",
    "companyId": "658168ff-a7e0-4688-bc7f-b820c96d337a",
    "createdAt": "2026-07-22T02:09:49.963Z"
  },
  {
    "id": "1c847287-7e9f-4583-9744-ce2d265754e8",
    "userId": "e8d38e87-0fe3-4443-b98b-22863519d2ed",
    "companyId": "658168ff-a7e0-4688-bc7f-b820c96d337a",
    "createdAt": "2026-07-22T02:32:07.407Z"
  },
  {
    "id": "2bdb352e-6765-4bd2-903e-f220ad1792ca",
    "userId": "e8d38e87-0fe3-4443-b98b-22863519d2ed",
    "companyId": "18a6edd8-9e99-446b-82ca-241e299a9f0f",
    "createdAt": "2026-07-22T02:32:07.407Z"
  }
]));
  }

  console.log("📦 Seeding products (8 records)...");
  if (8 > 0) {
    await db.insert(products).values(mapRows([
  {
    "id": "4b3128cc-1946-4617-ab8a-dfd2524cf2d9",
    "name": "มะพร้าวผลอ่อน",
    "baseUnitId": 1,
    "createdAt": "2026-07-11T04:41:17.583Z",
    "deletedAt": null
  },
  {
    "id": "c0e9cdac-5b10-447e-b44d-c58c0c7bcf12",
    "name": "น้ำมะพร้าวสด",
    "baseUnitId": 2,
    "createdAt": "2026-07-13T10:33:26.936Z",
    "deletedAt": "2026-07-13T11:05:14.608Z"
  },
  {
    "id": "9172b73d-cb4c-474e-a8cb-41ddf7876f30",
    "name": "มะพร้าวผลอ่อน",
    "baseUnitId": 1,
    "createdAt": "2026-07-13T10:33:26.936Z",
    "deletedAt": "2026-07-13T11:05:17.108Z"
  },
  {
    "id": "82e275a0-4972-4927-a814-dfbaadc26ab9",
    "name": "น้ำมะพร้าวสด",
    "baseUnitId": 2,
    "createdAt": "2026-07-13T06:52:14.064Z",
    "deletedAt": "2026-07-20T09:40:25.151Z"
  },
  {
    "id": "3fe315cd-5fe2-4d65-9c81-61c6048c3e43",
    "name": "น้ำมะพร้าวสด",
    "baseUnitId": 2,
    "createdAt": "2026-07-16T02:59:05.260Z",
    "deletedAt": "2026-07-20T09:40:33.574Z"
  },
  {
    "id": "9c2185f2-7ea7-4669-82d0-e854e9c0ada3",
    "name": "มะพร้าวผลอ่อน",
    "baseUnitId": 1,
    "createdAt": "2026-07-16T02:59:05.260Z",
    "deletedAt": "2026-07-20T09:40:35.854Z"
  },
  {
    "id": "d428e9fc-4b08-4491-bfc7-2bba08c07f84",
    "name": "มะพร้าวผลอ่อน",
    "baseUnitId": 2,
    "createdAt": "2026-07-13T06:52:14.064Z",
    "deletedAt": "2026-07-20T09:40:40.108Z"
  },
  {
    "id": "f74a7624-3ca0-454f-9a11-b3893724bf66",
    "name": "น้ำมะพร้าวสด",
    "baseUnitId": 1,
    "createdAt": "2026-07-11T04:41:17.583Z",
    "deletedAt": "2026-07-22T02:56:39.204Z"
  }
]));
  }

  console.log("🏬 Seeding storage locations (9 records)...");
  if (9 > 0) {
    await db.insert(storageLocations).values(mapRows([
  {
    "id": "039bb4fa-85df-4a4c-8829-ca74d5c2d581",
    "companyId": "658168ff-a7e0-4688-bc7f-b820c96d337a",
    "name": "ส่งมอบโดยตรง (ไม่ผ่านคลัง)",
    "address": "สำนักงานใหญ่ (สำหรับการจำหน่ายและส่งออกโดยตรงไม่ผ่านคลังสินค้า)",
    "createdAt": "2026-07-13T10:40:13.268Z",
    "deletedAt": null
  },
  {
    "id": "dc49073f-f7e6-41f8-aa38-b352328bdeb2",
    "companyId": "658168ff-a7e0-4688-bc7f-b820c96d337a",
    "name": "ถังเก็บเย็น B (คลังน้ำมะพร้าวสด)",
    "address": "123/45 โรงสีเย็น B ถนนพระราม 2 กรุงเทพฯ",
    "createdAt": "2026-07-16T02:59:05.263Z",
    "deletedAt": "2026-07-20T09:53:58.444Z"
  },
  {
    "id": "74b045de-eeb1-40dc-8ca0-68b989e3626a",
    "companyId": "658168ff-a7e0-4688-bc7f-b820c96d337a",
    "name": "โกดังสินค้า A (คลังรับมะพร้าวผลอ่อน)",
    "address": "123/45 โกดังย่อย A ถนนพระราม 2 กรุงเทพฯ",
    "createdAt": "2026-07-16T02:59:05.263Z",
    "deletedAt": "2026-07-20T09:54:00.358Z"
  },
  {
    "id": "f94760b8-7a5d-4395-87c0-ab51cb94f261",
    "companyId": "658168ff-a7e0-4688-bc7f-b820c96d337a",
    "name": "โกดังสินค้า A (คลังรับมะพร้าวผลอ่อน)",
    "address": "123/45 โกดังย่อย A ถนนพระราม 2 กรุงเทพฯ",
    "createdAt": "2026-07-11T04:41:17.585Z",
    "deletedAt": "2026-07-20T09:54:03.067Z"
  },
  {
    "id": "d955bcbd-241f-41ea-88a0-96fae22f8401",
    "companyId": "658168ff-a7e0-4688-bc7f-b820c96d337a",
    "name": "ถังเก็บเย็น B (คลังน้ำมะพร้าวสด)",
    "address": "123/45 โรงสีเย็น B ถนนพระราม 2 กรุงเทพฯ",
    "createdAt": "2026-07-11T04:41:17.585Z",
    "deletedAt": "2026-07-20T09:54:05.101Z"
  },
  {
    "id": "92c18ecc-343e-4e5e-b6d9-bc52310b14f9",
    "companyId": "658168ff-a7e0-4688-bc7f-b820c96d337a",
    "name": "โกดังสินค้า A (คลังรับมะพร้าวผลอ่อน)",
    "address": "123/45 โกดังย่อย A ถนนพระราม 2 กรุงเทพฯ",
    "createdAt": "2026-07-13T06:52:14.067Z",
    "deletedAt": "2026-07-20T09:54:06.844Z"
  },
  {
    "id": "8dba0fec-9f2c-4f44-bb4d-348a8db759c8",
    "companyId": "658168ff-a7e0-4688-bc7f-b820c96d337a",
    "name": "ถังเก็บเย็น B (คลังน้ำมะพร้าวสด)",
    "address": "123/45 โรงสีเย็น B ถนนพระราม 2 กรุงเทพฯ",
    "createdAt": "2026-07-13T06:52:14.067Z",
    "deletedAt": "2026-07-20T09:54:08.665Z"
  },
  {
    "id": "25b9b305-597f-462f-a595-4d8631054baa",
    "companyId": "658168ff-a7e0-4688-bc7f-b820c96d337a",
    "name": "โกดังสินค้า A (คลังรับมะพร้าวผลอ่อน)",
    "address": "123/45 โกดังย่อย A ถนนพระราม 2 กรุงเทพฯ",
    "createdAt": "2026-07-13T10:33:26.940Z",
    "deletedAt": "2026-07-20T09:54:10.779Z"
  },
  {
    "id": "c0a64e17-14b9-4140-a084-d2d737eaf72a",
    "companyId": "658168ff-a7e0-4688-bc7f-b820c96d337a",
    "name": "ถังเก็บเย็น B (คลังน้ำมะพร้าวสด)",
    "address": "123/45 โรงสีเย็น B ถนนพระราม 2 กรุงเทพฯ",
    "createdAt": "2026-07-13T10:33:26.940Z",
    "deletedAt": "2026-07-20T09:54:13.030Z"
  }
]));
  }

  console.log("🤝 Seeding partners (9 records)...");
  if (9 > 0) {
    await db.insert(partners).values(mapRows([
  {
    "id": "dd5da901-1a59-4e9d-82ae-fd0ec633b6ea",
    "companyId": "658168ff-a7e0-4688-bc7f-b820c96d337a",
    "name": "สวนลุงพล",
    "partnerTypeId": 1,
    "regNo": "DOA 50000 99 11 010121",
    "address": "123/45 ถนนพระราม 2 แขวงแสมดำ เขตบางขุนเทียน กรุงเทพมหานคร 10150",
    "createdAt": "2026-07-13T10:38:01.523Z",
    "deletedAt": null
  },
  {
    "id": "82a7a0d6-46c7-4cab-a5f5-ff812603899e",
    "companyId": "658168ff-a7e0-4688-bc7f-b820c96d337a",
    "name": "SHENZHEN MEILIN ZHENGGUANGHE INDUSTRIAL CO.,LTD.",
    "partnerTypeId": 4,
    "regNo": null,
    "address": "ROOM 1411B,HONGCHANG PLAZA,NO.2001,SHENNAN EAST ROAD,XINNAN COMMUNITY,NANHU STREET,LUOHU DISTRICT,SHENZHEN",
    "createdAt": "2026-07-22T04:52:47.976Z",
    "deletedAt": null
  },
  {
    "id": "d5f679ab-f52a-407a-b787-e1cee4e79424",
    "companyId": "658168ff-a7e0-4688-bc7f-b820c96d337a",
    "name": "TIANJIN BOXIN INTERNATIONAL FREIGHT FORWARDING CO.,LTD.",
    "partnerTypeId": 4,
    "regNo": null,
    "address": "NO. 8TH FLOOR,E3AB BUILDING, FINANCIAL STREET, DEVELOPMENT AREA BINHAI NEW DISTRICT, TIANJIN , CHINA",
    "createdAt": "2026-07-22T04:53:20.265Z",
    "deletedAt": null
  },
  {
    "id": "001f1cd5-bf17-4183-97e1-4bb0b2e6795a",
    "companyId": "658168ff-a7e0-4688-bc7f-b820c96d337a",
    "name": "XIAMEN HONGRISHENG IMPORT AND EXPORT CO.,LTD",
    "partnerTypeId": 4,
    "regNo": null,
    "address": "UNIT 1702B, YINLONG BUILDING, NO.258 DONGDU ROAD, HULI DISTRICT, XIAMEN, CHINA",
    "createdAt": "2026-07-22T04:53:59.411Z",
    "deletedAt": null
  },
  {
    "id": "a9336b2c-4764-404c-a409-e763d24fca8a",
    "companyId": "658168ff-a7e0-4688-bc7f-b820c96d337a",
    "name": "ABC",
    "partnerTypeId": 4,
    "regNo": null,
    "address": "china",
    "createdAt": "2026-07-20T09:36:18.076Z",
    "deletedAt": "2026-07-22T04:54:06.911Z"
  },
  {
    "id": "670f7e0c-147d-4561-bcfa-b148689b99e3",
    "companyId": "658168ff-a7e0-4688-bc7f-b820c96d337a",
    "name": "SHAANXI TIANREN YINONG AGRICULTURAL DEVELOPMENT CO., LTD.",
    "partnerTypeId": 4,
    "regNo": null,
    "address": "NO. 66, ZONE B, CHINA AGRICULTURAL CHANNEL NEW TOWN, PAGODA DISTRICT, YAN'AN CITY, SHAANXI PROVINCE",
    "createdAt": "2026-07-22T04:55:08.629Z",
    "deletedAt": null
  },
  {
    "id": "f6c19930-7044-4cc0-9971-0d4ce1864243",
    "companyId": "658168ff-a7e0-4688-bc7f-b820c96d337a",
    "name": "SHANGHAI GOODFARMER BANANA CO.,LTD.",
    "partnerTypeId": 4,
    "regNo": null,
    "address": "ROOM 1211, BUILDING 2, NO. 1800, XINYANG ROAD, FENGXIAN DISTRICT, SHANGHAI, CHINA.",
    "createdAt": "2026-07-22T04:55:40.024Z",
    "deletedAt": null
  },
  {
    "id": "ae46eb70-2440-49a4-a38d-156f03b7c544",
    "companyId": "658168ff-a7e0-4688-bc7f-b820c96d337a",
    "name": "SHENZHEN MEILIN ZHENGGUANGHE INDUSTRIAL CO.,LTD.",
    "partnerTypeId": 4,
    "regNo": null,
    "address": "ROOM 1411B,HONGCHANG PLAZA,NO.2001,SHENNAN EAST ROAD,XINNAN COMMUNITY,NANHU STREET,LUOHU DISTRICT,SHENZHEN",
    "createdAt": "2026-07-22T04:56:07.189Z",
    "deletedAt": null
  },
  {
    "id": "c7f2bf0c-d4cd-42d8-a1bc-ccb9c4f13575",
    "companyId": "658168ff-a7e0-4688-bc7f-b820c96d337a",
    "name": "SHENZHEN FANTAI FRESH SUPPLY CHAIN CO.,LTD",
    "partnerTypeId": 4,
    "regNo": null,
    "address": "717,BUILDING 1, NO.101, LIANYUN ROAD, XINMU COMMUNITY, PINGHU STREET,LONGGANG DISTRICT, SHENZHEN",
    "createdAt": "2026-07-22T04:57:50.788Z",
    "deletedAt": null
  }
]));
  }

  console.log("📄 Seeding documents (0 records)...");
  if (0 > 0) {
    await db.insert(documents).values(mapRows([]));
  }

  console.log("📈 Seeding stock transactions (0 records)...");
  if (0 > 0) {
    const txs = mapRows([]);
    const chunkSize = 200;
    for (let i = 0; i < txs.length; i += chunkSize) {
      const chunk = txs.slice(i, i + chunkSize);
      await db.insert(stockTransactions).values(chunk);
    }
  }

  console.log("📊 Seeding monthly reports (0 records)...");
  if (0 > 0) {
    await db.insert(monthlyReports).values(mapRows([]));
  }

  console.log("🎉 Production seeding completed successfully!");
  await client.end();
}

main().catch((err) => {
  console.error("❌ Production seeding failed:", err);
  process.exit(1);
});
