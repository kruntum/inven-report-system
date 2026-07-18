import { 
  pgTable, uuid, varchar, text, timestamp, integer, 
  decimal, date, index, unique
} from "drizzle-orm/pg-core";

// ==========================================
// 1. MASTER TABLES (Lookup Data)
// ==========================================

export const masterRoles = pgTable("master_roles", {
  id: integer("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
});

export const masterCompanyTypes = pgTable("master_company_types", {
  id: integer("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
});

export const masterUnits = pgTable("master_units", {
  id: integer("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
});

export const masterTransactionTypes = pgTable("master_transaction_types", {
  id: integer("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
});

export const masterDocumentTypes = pgTable("master_document_types", {
  id: integer("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
});

export const masterReportStatuses = pgTable("master_report_statuses", {
  id: integer("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
});


// ==========================================
// 2. CORE TABLES (+ Soft Delete, timestamps)
// ==========================================

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyTypeId: integer("company_type_id")
    .references(() => masterCompanyTypes.id, { onDelete: "restrict" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  taxId: varchar("tax_id", { length: 20 }).notNull().unique(),
  houseNo: varchar("house_no", { length: 50 }).notNull().default(""),
  soi: varchar("soi", { length: 100 }).default(""),
  road: varchar("road", { length: 100 }).default(""),
  subDistrict: varchar("sub_district", { length: 100 }).notNull().default(""),
  district: varchar("district", { length: 100 }).notNull().default(""),
  province: varchar("province", { length: 100 }).notNull().default(""),
  zipcode: varchar("zipcode", { length: 10 }).notNull().default(""),
  address: text("address").notNull().default(""),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),  // Soft Delete
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "restrict" }),
  roleId: integer("role_id")
    .references(() => masterRoles.id, { onDelete: "restrict" })
    .notNull(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),  // Soft Delete
});

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  baseUnitId: integer("base_unit_id")
    .references(() => masterUnits.id, { onDelete: "restrict" })
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),  // Soft Delete
});

export const storageLocations = pgTable("storage_locations", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "restrict" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),  // Soft Delete
});


// ==========================================
// 3. PARTNERS, TRANSACTION & DOCUMENT TABLES
// ==========================================

export const masterPartnerTypes = pgTable("master_partner_types", {
  id: integer("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
});

export const partners = pgTable("partners", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "restrict" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  partnerTypeId: integer("partner_type_id")
    .references(() => masterPartnerTypes.id, { onDelete: "restrict" })
    .notNull(),
  regNo: varchar("reg_no", { length: 100 }), // DOA Number or GAP Number
  address: text("address"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),  // Soft Delete
});

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "restrict" })
    .notNull(),
  documentTypeId: integer("document_type_id")
    .references(() => masterDocumentTypes.id, { onDelete: "restrict" })
    .notNull(),
  filePath: text("file_path").notNull(),
  fileExtension: varchar("file_extension", { length: 10 }).notNull(),
  remarks: text("remarks"),
  uploadDate: timestamp("upload_date", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),  // Soft Delete
});

export const stockTransactions = pgTable("stock_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "restrict" })
    .notNull(),
  storageId: uuid("storage_id")
    .references(() => storageLocations.id, { onDelete: "restrict" })
    .notNull(),
  productId: uuid("product_id")
    .references(() => products.id, { onDelete: "restrict" })
    .notNull(),
  transactionTypeId: integer("trans_type_id")
    .references(() => masterTransactionTypes.id, { onDelete: "restrict" })
    .notNull(),
  transactionDate: date("transaction_date").notNull(),
  quantity: decimal("quantity", { precision: 14, scale: 4 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 14, scale: 2 }),
  documentId: uuid("document_id")
    .references(() => documents.id, { onDelete: "set null" }),  // set null on document delete
  partnerId: uuid("partner_id")
    .references(() => partners.id, { onDelete: "restrict" }),
  sourcePartnerId: uuid("source_partner_id")
    .references(() => partners.id, { onDelete: "restrict" }), // Original factory/source partner (for collectors)
  saleType: varchar("sale_type", { length: 50 }), // 'domestic' or 'export'
  destinationCountry: varchar("destination_country", { length: 100 }), // Export destination country
  productionType: varchar("production_type", { length: 255 }), // e.g. production details
  grossWeight: decimal("gross_weight", { precision: 14, scale: 4 }), // น้ำหนักรวมแพ็กเกจ
  netWeight: decimal("net_weight", { precision: 14, scale: 4 }), // น้ำหนักเนื้อ ไม่รวมกล่อง
  unit: varchar("unit", { length: 50 }), // ชื่อหน่วยนับ เช่น ลูก, ตัน
  pricingType: varchar("pricing_type", { length: 50 }), // 'per_unit' | 'per_weight'
  remarks: text("remarks"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),  // Soft Delete
}, (table) => [
  index("idx_stock_tx_company").on(table.companyId),
  index("idx_stock_tx_date").on(table.transactionDate),
  index("idx_stock_tx_product").on(table.productId),
]);


// ==========================================
// 4. REPORTING TABLE (สำหรับส่งรัฐทุกวันที่ 5)
// ==========================================

export const monthlyReports = pgTable("monthly_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "restrict" })
    .notNull(),
  productId: uuid("product_id")
    .references(() => products.id, { onDelete: "restrict" })
    .notNull(),
  storageId: uuid("storage_id")
    .references(() => storageLocations.id, { onDelete: "restrict" }), // Nullable
  reportMonth: integer("report_month").notNull(),
  reportYear: integer("report_year").notNull(),
  
  totalPurchaseQty: decimal("total_purchase_qty", { precision: 14, scale: 4 }).default("0"),
  avgPurchasePrice: decimal("avg_purchase_price", { precision: 14, scale: 2 }).default("0"),
  totalSalesQty: decimal("total_sales_qty", { precision: 14, scale: 4 }).default("0"),
  avgSalesPrice: decimal("avg_sales_price", { precision: 14, scale: 2 }).default("0"),
  totalSalesDomesticQty: decimal("total_sales_domestic_qty", { precision: 14, scale: 4 }).default("0"),
  avgSalesDomesticPrice: decimal("avg_sales_domestic_price", { precision: 14, scale: 2 }).default("0"),
  totalSalesExportQty: decimal("total_sales_export_qty", { precision: 14, scale: 4 }).default("0"),
  avgSalesExportPrice: decimal("avg_sales_export_price", { precision: 14, scale: 2 }).default("0"),
  totalUsageQty: decimal("total_usage_qty", { precision: 14, scale: 4 }).default("0"),
  endingBalanceQty: decimal("ending_balance_qty", { precision: 14, scale: 4 }).notNull(),
  partnerDetailsJson: text("partner_details_json"),
  remarks: text("remarks"),
  statusId: integer("status_id")
    .references(() => masterReportStatuses.id, { onDelete: "restrict" })
    .notNull()
    .default(1),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  unique("uq_monthly_report").on(
    table.companyId, table.productId,
    table.reportMonth, table.reportYear
  ),
  index("idx_report_company_period").on(
    table.companyId, table.reportMonth, table.reportYear
  ),
]);
