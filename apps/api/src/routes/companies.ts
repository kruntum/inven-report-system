import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/connection.ts";
import { companies } from "../db/schema.ts";
import { authGuard, JWTPayload } from "../middlewares/auth.middleware.ts";
import { z } from "zod";

const companiesRouter = new Hono();

// Apply auth guard
companiesRouter.use("*", authGuard);

// Zod schema for validation
const updateCompanySchema = z.object({
  name: z.string().min(2, "ชื่อบริษัทต้องมีอย่างน้อย 2 ตัวอักษร"),
  taxId: z.string().length(13, "เลขประจำตัวผู้เสียภาษีต้องมี 13 หลัก"),
  houseNo: z.string().min(1, "กรุณากรอกเลขที่บ้าน"),
  soi: z.string().optional().default("-"),
  road: z.string().optional().default("-"),
  subDistrict: z.string().min(2, "กรุณากรอกตำบล/แขวง"),
  district: z.string().min(2, "กรุณากรอกอำเภอ/เขต"),
  province: z.string().min(2, "กรุณากรอกจังหวัด"),
  zipcode: z.string().length(5, "รหัสไปรษณีย์ต้องมี 5 หลัก"),
  phone: z.string().optional().default("-"),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง").optional().or(z.literal("")).default(""),
});

// 1. GET current user's company info
companiesRouter.get("/my", async (c) => {
  const user = c.get("user") as JWTPayload;
  try {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, user.companyId));
      
    if (!company) {
      return c.json({ success: false, message: "Company not found" }, 404);
    }
    
    return c.json({
      success: true,
      data: company,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 2. PUT update current user's company info
companiesRouter.put("/my", async (c) => {
  const user = c.get("user") as JWTPayload;
  try {
    const body = await c.req.json();
    const result = updateCompanySchema.safeParse(body);
    
    if (!result.success) {
      return c.json({ success: false, errors: result.error.flatten() }, 400);
    }
    
    const data = result.data;
    
    // Check if another company already has this taxId
    const [dupCompany] = await db
      .select()
      .from(companies)
      .where(eq(companies.taxId, data.taxId));
      
    if (dupCompany && dupCompany.id !== user.companyId) {
      return c.json({ success: false, message: "Tax ID is already registered by another company" }, 409);
    }
    
    // Concatenate full address string for backward compatibility
    const soiStr = data.soi && data.soi !== "-" ? ` ซอย${data.soi}` : "";
    const roadStr = data.road && data.road !== "-" ? ` ถนน${data.road}` : "";
    const fullAddress = `${data.houseNo}${soiStr}${roadStr} ตำบล${data.subDistrict} อำเภอ${data.district} จังหวัด${data.province} ${data.zipcode}`;
    
    const [updatedCompany] = await db
      .update(companies)
      .set({
        name: data.name,
        taxId: data.taxId,
        houseNo: data.houseNo,
        soi: data.soi || "-",
        road: data.road || "-",
        subDistrict: data.subDistrict,
        district: data.district,
        province: data.province,
        zipcode: data.zipcode,
        address: fullAddress,
        phone: data.phone || "-",
        email: data.email || "-",
        updatedAt: new Date(),
      })
      .where(eq(companies.id, user.companyId))
      .returning();
      
    return c.json({
      success: true,
      data: updatedCompany,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default companiesRouter;
