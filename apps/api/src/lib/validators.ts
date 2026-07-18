import { z } from "zod";

// 1. Authentication Schemas
export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(100),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

export const registerSchema = z.object({
  companyId: z.string().uuid("Invalid Company ID").optional(),
  roleId: z.number().int().min(1).max(3),
  username: z.string().min(3).max(100),
  password: z.string().min(6).max(100),
  fullName: z.string().min(2).max(255),
});

// 2. Stock Transaction Schemas
// Note: We use string and refine/transform for Decimal values to maintain precision during validation
// 2. Stock Transaction Schemas
// Note: We use string and refine/transform for Decimal values to maintain precision during validation
export const createPartnerSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อคู่ค้า").max(255),
  partnerTypeId: z.number().int().min(1).max(4),
  regNo: z.string().max(100).optional().nullable(),
  address: z.string().max(1000).optional().nullable(),
});

export const createTransactionSchema = z.object({
  storageId: z.string().uuid("Invalid Storage Location ID").optional().nullable(),
  isDirectExport: z.boolean().optional().nullable(),
  productId: z.string().uuid("Invalid Product ID"),
  transactionTypeId: z.number().int().min(1).max(4),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, must be YYYY-MM-DD"),
  quantity: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Quantity must be a valid positive number",
  }),
  unitPrice: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Unit price must be a valid non-negative number",
  }).optional(),
  documentId: z.string().uuid("Invalid Document ID").optional().nullable(),
  partnerId: z.string().uuid("Invalid Partner ID").optional().nullable(),
  sourcePartnerId: z.string().uuid("Invalid Source Partner ID").optional().nullable(),
  saleType: z.string().optional().nullable(), // 'domestic' or 'export'
  destinationCountry: z.string().max(100).optional().nullable(),
  productionType: z.string().max(255).optional().nullable(),
  grossWeight: z.string().refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
    message: "Gross weight must be a valid non-negative number",
  }).optional().nullable(),
  netWeight: z.string().refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
    message: "Net weight must be a valid non-negative number",
  }).optional().nullable(),
  unit: z.string().max(50).optional().nullable(),
  pricingType: z.string().max(50).optional().nullable(),
  remarks: z.string().max(1000).optional().nullable(),
});

export const submitReportSchema = z.object({
  reportMonth: z.number().int().min(1).max(12),
  reportYear: z.number().int().min(2000).max(2100),
  productId: z.string().uuid("Invalid Product ID"),
  storageId: z.string().uuid("Invalid Storage Location ID").optional().nullable(),
  remarks: z.string().max(1000).optional().nullable(),
});
