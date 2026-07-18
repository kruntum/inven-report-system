import { db } from "./db/connection.ts";
import { monthlyReports, companies } from "./db/schema.ts";
import { eq } from "drizzle-orm";

async function run() {
  try {
    const data = await db
      .select({
        id: monthlyReports.id,
        companyName: companies.name,
        companyProvince: companies.province,
        companyDistrict: companies.district,
        companySubDistrict: companies.subDistrict,
      })
      .from(monthlyReports)
      .innerJoin(companies, eq(monthlyReports.companyId, companies.id))
      .limit(1);
    console.log("Joined report database sample:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
run();
