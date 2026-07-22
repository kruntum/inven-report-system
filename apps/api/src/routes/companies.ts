import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/connection.ts";
import { companies } from "../db/schema.ts";
import { authGuard, JWTPayload } from "../middlewares/auth.middleware.ts";
import { notDeleted } from "../db/helpers.ts";
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
  authorizedPerson: z.string().optional().default("-"),
  authorizedPosition: z.string().optional().default("-"),
});

// 1. GET current user's active company info
companiesRouter.get("/my", async (c) => {
  const user = c.get("user") as JWTPayload;
  try {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, user.companyId));
      
    if (!company || company.deletedAt !== null) {
      return c.json({ success: false, message: "Company not found or inactive" }, 404);
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
        authorizedPerson: data.authorizedPerson || "-",
        authorizedPosition: data.authorizedPosition || "-",
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

// 3. GET all active companies (or include deleted for Admin)
companiesRouter.get("/all", async (c) => {
  const user = c.get("user") as JWTPayload;
  const includeDeleted = c.req.query("includeDeleted") === "true";

  try {
    let query = db.select().from(companies);
    
    if (includeDeleted && user.roleId === 1) {
      // Admin requested all companies including soft-deleted ones
      const data = await query.orderBy(desc(companies.createdAt));
      return c.json({ success: true, data });
    }
    
    // Default: Return active (notDeleted) companies only
    const data = await query.where(notDeleted(companies)).orderBy(desc(companies.createdAt));
    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 4. POST create a new company (Admin only)
companiesRouter.post("/", async (c) => {
  const user = c.get("user") as JWTPayload;
  if (user.roleId !== 1) {
    return c.json({ success: false, message: "Forbidden: Admin only" }, 403);
  }

  try {
    const body = await c.req.json();
    const { name, taxId, houseNo, subDistrict, district, province, zipcode, phone, email, authorizedPerson, authorizedPosition } = body;

    if (!name || !taxId) {
      return c.json({ success: false, message: "กรุณาระบุชื่อบริษัทและเลขประจำตัวผู้เสียภาษี" }, 400);
    }

    const [dupCompany] = await db
      .select()
      .from(companies)
      .where(eq(companies.taxId, taxId));

    if (dupCompany) {
      return c.json({ success: false, message: "เลขประจำตัวผู้เสียภาษีนี้ถูกลงทะเบียนไว้แล้ว" }, 409);
    }

    const fullAddress = `${houseNo || ''} ตำบล${subDistrict || ''} อำเภอ${district || ''} จังหวัด${province || ''} ${zipcode || ''}`;

    const [newCompany] = await db
      .insert(companies)
      .values({
        companyTypeId: 1,
        name,
        taxId,
        houseNo: houseNo || "-",
        soi: body.soi || "-",
        road: body.road || "-",
        subDistrict: subDistrict || "-",
        district: district || "-",
        province: province || "-",
        zipcode: zipcode || "-",
        address: fullAddress,
        phone: phone || "-",
        email: email || "-",
        authorizedPerson: authorizedPerson || "-",
        authorizedPosition: authorizedPosition || "-",
      })
      .returning();

    return c.json({
      success: true,
      message: "ลงทะเบียนบริษัทใหม่สำเร็จ",
      data: newCompany,
    }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 5. PUT update specific company by ID (Admin only)
companiesRouter.put("/:id", async (c) => {
  const user = c.get("user") as JWTPayload;
  if (user.roleId !== 1) {
    return c.json({ success: false, message: "Forbidden: Admin only" }, 403);
  }

  const id = c.req.param("id");

  try {
    const body = await c.req.json();
    const { name, taxId, houseNo, subDistrict, district, province, zipcode, phone, email, authorizedPerson, authorizedPosition } = body;

    if (!name || !taxId) {
      return c.json({ success: false, message: "กรุณาระบุชื่อบริษัทและเลขประจำตัวผู้เสียภาษี" }, 400);
    }

    // Check taxId duplicate on other companies
    const [dupCompany] = await db
      .select()
      .from(companies)
      .where(eq(companies.taxId, taxId));

    if (dupCompany && dupCompany.id !== id) {
      return c.json({ success: false, message: "เลขประจำตัวผู้เสียภาษีนี้ถูกใช้งานโดยบริษัทอื่น" }, 409);
    }

    const fullAddress = `${houseNo || ''} ตำบล${subDistrict || ''} อำเภอ${district || ''} จังหวัด${province || ''} ${zipcode || ''}`;

    const [updatedCompany] = await db
      .update(companies)
      .set({
        name,
        taxId,
        houseNo: houseNo || "-",
        soi: body.soi || "-",
        road: body.road || "-",
        subDistrict: subDistrict || "-",
        district: district || "-",
        province: province || "-",
        zipcode: zipcode || "-",
        address: fullAddress,
        phone: phone || "-",
        email: email || "-",
        authorizedPerson: authorizedPerson || "-",
        authorizedPosition: authorizedPosition || "-",
        updatedAt: new Date(),
      })
      .where(eq(companies.id, id))
      .returning();

    return c.json({
      success: true,
      message: "แก้ไขข้อมูลผู้ประกอบการสำเร็จ",
      data: updatedCompany,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 6. DELETE soft-delete company (Admin only)
companiesRouter.delete("/:id", async (c) => {
  const user = c.get("user") as JWTPayload;
  if (user.roleId !== 1) {
    return c.json({ success: false, message: "Forbidden: Admin only" }, 403);
  }

  const id = c.req.param("id");

  try {
    const [deletedComp] = await db
      .update(companies)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(companies.id, id))
      .returning();

    if (!deletedComp) {
      return c.json({ success: false, message: "ไม่พบผู้ประกอบการที่ต้องการปิดใช้งาน" }, 404);
    }

    return c.json({
      success: true,
      message: `ปิดใช้งานผู้ประกอบการ "${deletedComp.name}" สำเร็จ`,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 7. PATCH restore soft-deleted company (Admin only)
companiesRouter.patch("/:id/restore", async (c) => {
  const user = c.get("user") as JWTPayload;
  if (user.roleId !== 1) {
    return c.json({ success: false, message: "Forbidden: Admin only" }, 403);
  }

  const id = c.req.param("id");

  try {
    const [restoredComp] = await db
      .update(companies)
      .set({
        deletedAt: null as any,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, id))
      .returning();

    if (!restoredComp) {
      return c.json({ success: false, message: "ไม่พบผู้ประกอบการที่ต้องการเปิดใช้งาน" }, 404);
    }

    return c.json({
      success: true,
      message: `เปิดใช้งานผู้ประกอบการ "${restoredComp.name}" อีกครั้งสำเร็จ`,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default companiesRouter;
