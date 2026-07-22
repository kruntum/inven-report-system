import { z } from "zod";

export const productFormSchema = z.object({
  name: z.string().min(2, "ชื่อสินค้าต้องมีอย่างน้อย 2 ตัวอักษร"),
  baseUnitId: z.coerce.number().int().min(1).max(5),
});

export const storageFormSchema = z.object({
  name: z.string().min(2, "ชื่อสถานที่เก็บต้องมีอย่างน้อย 2 ตัวอักษร"),
  address: z.string().min(5, "ที่อยู่สถานที่เก็บต้องมีอย่างน้อย 5 ตัวอักษร"),
});

export const partnerFormSchema = z.object({
  name: z.string().min(2, "ชื่อคู่ค้าต้องมีอย่างน้อย 2 ตัวอักษร"),
  partnerTypeId: z.coerce.number().int().min(1).max(4),
  regNo: z.string().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable().or(z.literal("")),
});

export const userFormSchema = z.object({
  username: z.string().min(3, "Username ต้องมีอย่างน้อย 3 ตัวอักษร"),
  fullName: z.string().min(2, "ชื่อ-นามสกุลต้องมีอย่างน้อย 2 ตัวอักษร"),
  roleId: z.coerce.number().int().min(1).max(3),
  password: z.string().optional().or(z.literal("")),
});

export const generateReportFormSchema = z.object({
  reportMonth: z.coerce.number().int().min(1).max(12),
  reportYear: z.coerce.number().int().min(2000).max(2100),
  productId: z.string().uuid("กรุณาเลือกรายการสินค้า"),
  storageId: z.string().optional().nullable(),
});

export const companyFormSchema = z.object({
  name: z.string().min(2, "ชื่อบริษัทต้องมีอย่างน้อย 2 ตัวอักษร"),
  taxId: z.string().length(13, "เลขประจำตัวผู้เสียภาษีต้องมี 13 หลัก"),
  houseNo: z.string().min(1, "กรุณากรอกเลขที่บ้าน"),
  soi: z.string().optional().nullable().or(z.literal("")),
  road: z.string().optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable().or(z.literal("")),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง").optional().nullable().or(z.literal("")),
  authorizedPerson: z.string().optional().nullable().or(z.literal("")),
  authorizedPosition: z.string().optional().nullable().or(z.literal("")),
});

export const transactionFormSchema = z.object({
  storageId: z.string().uuid("กรุณาเลือกสถานที่เก็บสินค้า").optional().nullable().or(z.literal("")),
  isDirectExport: z.boolean().optional().nullable(),
  productId: z.string().uuid("กรุณาเลือกรายการสินค้า"),
  transactionTypeId: z.coerce.number().int().min(1).max(4),
  transactionDate: z.string().min(1, "กรุณาเลือกวันที่ทำรายการ"),
  quantity: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "ปริมาณต้องเป็นตัวเลขที่มีค่ามากกว่าศูนย์",
  }),
  unitPrice: z.string().refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
    message: "ราคาต่อหน่วยต้องไม่ติดลบ",
  }).optional().nullable().or(z.literal("")),
  partnerId: z.string().uuid("กรุณาเลือกคู่ค้า").optional().nullable().or(z.literal("")),
  sourcePartnerId: z.string().uuid("กรุณาเลือกโรงงานต้นทาง").optional().nullable().or(z.literal("")),
  saleType: z.string().optional().nullable().or(z.literal("")), // 'domestic' or 'export'
  destinationCountry: z.string().max(100).optional().nullable().or(z.literal("")),
  invoiceNo: z.string().max(100).optional().nullable().or(z.literal("")),
  containerNo: z.string().max(100).optional().nullable().or(z.literal("")),
  productionType: z.string().max(255).optional().nullable().or(z.literal("")),
  grossWeight: z.string().refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
    message: "น้ำหนักรวมสุทธิ/แพ็กเกจต้องไม่ติดลบ",
  }).optional().nullable().or(z.literal("")),
  netWeight: z.string().refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
    message: "น้ำหนักเนื้อต้องไม่ติดลบ",
  }).optional().nullable().or(z.literal("")),
  unit: z.string().max(50).optional().nullable().or(z.literal("")),
  pricingType: z.string().optional().nullable().or(z.literal("")), // 'per_unit' | 'per_weight'
  remarks: z.string().max(1000).optional().nullable().or(z.literal("")),
});
