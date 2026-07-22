import { Hono } from "hono";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../db/connection.ts";
import { 
  monthlyReports, 
  stockTransactions, 
  products, 
  storageLocations, 
  masterReportStatuses, 
  partners,
  companies
} from "../db/schema.ts";
import { notDeleted } from "../db/helpers.ts";
import { submitReportSchema } from "../lib/validators.ts";
import { authGuard, JWTPayload } from "../middlewares/auth.middleware.ts";
import { Decimal } from "decimal.js";
import XlsxPopulate from "xlsx-populate";
import path from "path";
import fs from "fs";
import JSZip from "jszip";
import dayjs from "dayjs";

const reports = new Hono();

// Helper to format Date/String to DD/MM/YYYY
function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  return dayjs(date).format("DD/MM/YYYY");
}

// Apply authGuard to all reports routes
reports.use("*", authGuard);

// 1. List monthly reports for user's company
reports.get("/", async (c) => {
  const user = c.get("user") as JWTPayload;
  const month = c.req.query("month") ? Number(c.req.query("month")) : undefined;
  const year = c.req.query("year") ? Number(c.req.query("year")) : undefined;

  try {
    const conditions = [eq(monthlyReports.companyId, user.companyId)];
    if (month) conditions.push(eq(monthlyReports.reportMonth, month));
    if (year) conditions.push(eq(monthlyReports.reportYear, year));

    const data = await db
      .select({
        id: monthlyReports.id,
        reportMonth: monthlyReports.reportMonth,
        reportYear: monthlyReports.reportYear,
        productId: monthlyReports.productId,
        productName: products.name,
        storageId: monthlyReports.storageId,
        storageName: sql<string>`coalesce(${storageLocations.name}, 'รวมทุกสถานที่จัดเก็บ')`,
        totalPurchaseQty: monthlyReports.totalPurchaseQty,
        avgPurchasePrice: monthlyReports.avgPurchasePrice,
        totalSalesQty: monthlyReports.totalSalesQty,
        avgSalesPrice: monthlyReports.avgSalesPrice,
        totalSalesDomesticQty: monthlyReports.totalSalesDomesticQty,
        avgSalesDomesticPrice: monthlyReports.avgSalesDomesticPrice,
        totalSalesExportQty: monthlyReports.totalSalesExportQty,
        avgSalesExportPrice: monthlyReports.avgSalesExportPrice,
        totalUsageQty: monthlyReports.totalUsageQty,
        endingBalanceQty: monthlyReports.endingBalanceQty,
        partnerDetailsJson: monthlyReports.partnerDetailsJson,
        statusId: monthlyReports.statusId,
        statusName: masterReportStatuses.name,
        submittedAt: monthlyReports.submittedAt,
        remarks: monthlyReports.remarks,
        createdAt: monthlyReports.createdAt,
        updatedAt: monthlyReports.updatedAt,
        // Joined Company Info
        companyName: companies.name,
        companyTaxId: companies.taxId,
        companyHouseNo: companies.houseNo,
        companySoi: companies.soi,
        companyRoad: companies.road,
        companySubDistrict: companies.subDistrict,
        companyDistrict: companies.district,
        companyProvince: companies.province,
        companyZipcode: companies.zipcode,
        companyPhone: companies.phone,
        companyEmail: companies.email,
      })
      .from(monthlyReports)
      .innerJoin(products, eq(monthlyReports.productId, products.id))
      .leftJoin(storageLocations, eq(monthlyReports.storageId, storageLocations.id))
      .innerJoin(masterReportStatuses, eq(monthlyReports.statusId, masterReportStatuses.id))
      .innerJoin(companies, eq(monthlyReports.companyId, companies.id))
      .where(and(...conditions));

    return c.json({
      success: true,
      data
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 2. Generate/Draft a monthly report summary (with partner DOA/GAP details)
reports.post("/generate", async (c) => {
  const user = c.get("user") as JWTPayload;

  try {
    const body = await c.req.json();
    const result = submitReportSchema.safeParse(body);

    if (!result.success) {
      return c.json({ success: false, errors: result.error.flatten() }, 400);
    }

    const { reportMonth, reportYear, productId, storageId, remarks } = result.data;

    // Check if a report already exists and is submitted
    const [existingReport] = await db
      .select()
      .from(monthlyReports)
      .where(and(
        eq(monthlyReports.companyId, user.companyId),
        eq(monthlyReports.productId, productId),
        eq(monthlyReports.reportMonth, reportMonth),
        eq(monthlyReports.reportYear, reportYear)
      ));

    if (existingReport && existingReport.statusId > 1) {
      return c.json({ 
        success: false, 
        message: "Cannot regenerate a report that has already been submitted or verified" 
      }, 400);
    }

    // 1. Calculate previous month/year to find Beginning Balance
    let prevMonth = reportMonth - 1;
    let prevYear = reportYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = reportYear - 1;
    }

    const [prevReport] = await db
      .select()
      .from(monthlyReports)
      .where(and(
        eq(monthlyReports.companyId, user.companyId),
        eq(monthlyReports.productId, productId),
        eq(monthlyReports.reportMonth, prevMonth),
        eq(monthlyReports.reportYear, prevYear)
      ));

    let beginningBalance = new Decimal(0);
    if (prevReport) {
      beginningBalance = new Decimal(prevReport.endingBalanceQty);
    }

    // 2. Query all transactions of the company for this specific month/year, product, and storage
    // Join main and source partners to get supplier information (factory registration, GAP number, source origins)
    const mainPartners = alias(partners, "main_partners");
    const sourcePartners = alias(partners, "source_partners");

    const txs = await db
      .select({
        id: stockTransactions.id,
        transactionTypeId: stockTransactions.transactionTypeId,
        transactionDate: stockTransactions.transactionDate,
        quantity: stockTransactions.quantity,
        unitPrice: stockTransactions.unitPrice,
        saleType: stockTransactions.saleType,
        destinationCountry: stockTransactions.destinationCountry,
        productionType: stockTransactions.productionType,
        partnerId: stockTransactions.partnerId,
        partnerName: mainPartners.name,
        partnerRegNo: mainPartners.regNo,
        partnerTypeId: mainPartners.partnerTypeId,
        sourcePartnerId: stockTransactions.sourcePartnerId,
        sourcePartnerName: sourcePartners.name,
        sourcePartnerRegNo: sourcePartners.regNo
      })
      .from(stockTransactions)
      .leftJoin(mainPartners, eq(stockTransactions.partnerId, mainPartners.id))
      .leftJoin(sourcePartners, eq(stockTransactions.sourcePartnerId, sourcePartners.id))
      .where(and(
        eq(stockTransactions.companyId, user.companyId),
        eq(stockTransactions.productId, productId),
        sql`EXTRACT(MONTH FROM ${stockTransactions.transactionDate}) = ${reportMonth}`,
        sql`EXTRACT(YEAR FROM ${stockTransactions.transactionDate}) = ${reportYear}`,
        notDeleted(stockTransactions)
      ));

    // 3. Process aggregates using decimal.js
    let totalPurchaseQty = new Decimal(0);
    let totalPurchaseValue = new Decimal(0);
    
    let totalSalesQty = new Decimal(0);
    let totalSalesValue = new Decimal(0);

    let totalSalesDomesticQty = new Decimal(0);
    let totalSalesDomesticValue = new Decimal(0);
    let totalSalesExportQty = new Decimal(0);
    let totalSalesExportValue = new Decimal(0);

    let totalUsageQty = new Decimal(0);
    let totalAdjustQty = new Decimal(0);

    // List to collect supplier/factory details for มพอ. 01 reporting
    const partnerList: any[] = [];
    const productionList: string[] = [];

    for (const tx of txs) {
      const q = new Decimal(tx.quantity);
      const p = tx.unitPrice ? new Decimal(tx.unitPrice) : new Decimal(0);
      const val = q.mul(p);

      if (tx.transactionTypeId === 1) { // รับซื้อ
        totalPurchaseQty = totalPurchaseQty.add(q);
        totalPurchaseValue = totalPurchaseValue.add(val);

        // Collect partner detail records
        partnerList.push({
          id: tx.partnerId,
          name: tx.partnerName || "ไม่ระบุคู่ค้า",
          regNo: tx.partnerRegNo || null,
          partnerTypeId: tx.partnerTypeId,
          sourcePartnerName: tx.sourcePartnerName || null,
          sourcePartnerRegNo: tx.sourcePartnerRegNo || null,
          quantity: tx.quantity,
          unitPrice: tx.unitPrice,
          transactionDate: tx.transactionDate
        });
      } else if (tx.transactionTypeId === 2) { // จำหน่าย
        totalSalesQty = totalSalesQty.add(q);
        totalSalesValue = totalSalesValue.add(val);

        if (tx.saleType === "export") {
          totalSalesExportQty = totalSalesExportQty.add(q);
          totalSalesExportValue = totalSalesExportValue.add(val);
        } else {
          totalSalesDomesticQty = totalSalesDomesticQty.add(q);
          totalSalesDomesticValue = totalSalesDomesticValue.add(val);
        }
      } else if (tx.transactionTypeId === 3) { // ใช้ผลิต
        totalUsageQty = totalUsageQty.add(q);
        if (tx.productionType) {
          productionList.push(`${tx.productionType} (${Number(tx.quantity).toLocaleString()})`);
        }
      } else if (tx.transactionTypeId === 4) { // ปรับปรุงยอด
        totalAdjustQty = totalAdjustQty.add(q);
      }
    }

    // Weighted Averages
    const avgPurchasePrice = totalPurchaseQty.gt(0) 
      ? totalPurchaseValue.div(totalPurchaseQty).toFixed(2) 
      : "0.00";

    const avgSalesPrice = totalSalesQty.gt(0) 
      ? totalSalesValue.div(totalSalesQty).toFixed(2) 
      : "0.00";

    const avgSalesDomesticPrice = totalSalesDomesticQty.gt(0)
      ? totalSalesDomesticValue.div(totalSalesDomesticQty).toFixed(2)
      : "0.00";

    const avgSalesExportPrice = totalSalesExportQty.gt(0)
      ? totalSalesExportValue.div(totalSalesExportQty).toFixed(2)
      : "0.00";

    // Ending Balance
    const endingBalanceQty = beginningBalance
      .add(totalPurchaseQty)
      .sub(totalSalesQty)
      .sub(totalUsageQty)
      .add(totalAdjustQty);

    const partnerDetailsJson = JSON.stringify({
      partners: partnerList,
      productions: productionList
    });

    let reportId = "";
    if (existingReport) {
      // Update existing draft report
      const [updated] = await db
        .update(monthlyReports)
        .set({
          totalPurchaseQty: totalPurchaseQty.toString(),
          avgPurchasePrice,
          totalSalesQty: totalSalesQty.toString(),
          avgSalesPrice,
          totalSalesDomesticQty: totalSalesDomesticQty.toString(),
          avgSalesDomesticPrice,
          totalSalesExportQty: totalSalesExportQty.toString(),
          avgSalesExportPrice,
          totalUsageQty: totalUsageQty.toString(),
          endingBalanceQty: endingBalanceQty.toString(),
          partnerDetailsJson,
          remarks: remarks || null,
          updatedAt: new Date()
        })
        .where(eq(monthlyReports.id, existingReport.id))
        .returning();
      reportId = updated.id;
    } else {
      // Insert new draft report
      const [inserted] = await db
        .insert(monthlyReports)
        .values({
          companyId: user.companyId,
          productId,
          storageId: storageId || null,
          reportMonth,
          reportYear,
          totalPurchaseQty: totalPurchaseQty.toString(),
          avgPurchasePrice,
          totalSalesQty: totalSalesQty.toString(),
          avgSalesPrice,
          totalSalesDomesticQty: totalSalesDomesticQty.toString(),
          avgSalesDomesticPrice,
          totalSalesExportQty: totalSalesExportQty.toString(),
          avgSalesExportPrice,
          totalUsageQty: totalUsageQty.toString(),
          endingBalanceQty: endingBalanceQty.toString(),
          partnerDetailsJson,
          remarks: remarks || null,
          statusId: 1 // Draft
        })
        .returning();
      reportId = inserted.id;
    }

    const [updatedReport] = await db
      .select({
        id: monthlyReports.id,
        reportMonth: monthlyReports.reportMonth,
        reportYear: monthlyReports.reportYear,
        productId: monthlyReports.productId,
        productName: products.name,
        storageId: monthlyReports.storageId,
        storageName: sql<string>`coalesce(${storageLocations.name}, 'รวมทุกสถานที่จัดเก็บ')`,
        totalPurchaseQty: monthlyReports.totalPurchaseQty,
        avgPurchasePrice: monthlyReports.avgPurchasePrice,
        totalSalesQty: monthlyReports.totalSalesQty,
        avgSalesPrice: monthlyReports.avgSalesPrice,
        totalSalesDomesticQty: monthlyReports.totalSalesDomesticQty,
        avgSalesDomesticPrice: monthlyReports.avgSalesDomesticPrice,
        totalSalesExportQty: monthlyReports.totalSalesExportQty,
        avgSalesExportPrice: monthlyReports.avgSalesExportPrice,
        totalUsageQty: monthlyReports.totalUsageQty,
        endingBalanceQty: monthlyReports.endingBalanceQty,
        partnerDetailsJson: monthlyReports.partnerDetailsJson,
        statusId: monthlyReports.statusId,
        statusName: masterReportStatuses.name,
        submittedAt: monthlyReports.submittedAt,
        remarks: monthlyReports.remarks
      })
      .from(monthlyReports)
      .innerJoin(products, eq(monthlyReports.productId, products.id))
      .leftJoin(storageLocations, eq(monthlyReports.storageId, storageLocations.id))
      .innerJoin(masterReportStatuses, eq(monthlyReports.statusId, masterReportStatuses.id))
      .where(eq(monthlyReports.id, reportId));

    return c.json({
      success: true,
      message: "Monthly report generated successfully as Draft",
      data: updatedReport
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 3. Submit monthly report to Gov
reports.post("/submit/:id", async (c) => {
  const user = c.get("user") as JWTPayload;
  const id = c.req.param("id");

  try {
    // Verify report exists and belongs to company
    const [report] = await db
      .select()
      .from(monthlyReports)
      .where(and(
        eq(monthlyReports.id, id),
        eq(monthlyReports.companyId, user.companyId)
      ));

    if (!report) {
      return c.json({ success: false, message: "Monthly report not found" }, 404);
    }

    if (report.statusId > 1) {
      return c.json({ success: false, message: "Report has already been submitted" }, 400);
    }

    // Update status to Submitted (2) and set submitted_at timestamp
    const [submittedReport] = await db
      .update(monthlyReports)
      .set({
        statusId: 2, // Submitted
        submittedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(monthlyReports.id, id))
      .returning();

    return c.json({
      success: true,
      message: "Monthly report submitted successfully to the Department of Internal Trade",
      data: submittedReport
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 4. Revert submitted monthly report to Draft
reports.post("/revert/:id", async (c) => {
  const user = c.get("user") as JWTPayload;
  const id = c.req.param("id");

  try {
    // Verify report exists and belongs to company
    const [report] = await db
      .select()
      .from(monthlyReports)
      .where(and(
        eq(monthlyReports.id, id),
        eq(monthlyReports.companyId, user.companyId)
      ));

    if (!report) {
      return c.json({ success: false, message: "Monthly report not found" }, 404);
    }

    if (report.statusId === 1) {
      return c.json({ success: false, message: "Report is already in Draft status" }, 400);
    }

    if (report.statusId === 3) {
      return c.json({ success: false, message: "Cannot revert a report that has already been verified by the officer" }, 400);
    }

    // Update status to Draft (1) and nullify submittedAt
    const [revertedReport] = await db
      .update(monthlyReports)
      .set({
        statusId: 1, // Draft
        submittedAt: null,
        updatedAt: new Date()
      })
      .where(eq(monthlyReports.id, id))
      .returning();

    return c.json({
      success: true,
      message: "Monthly report reverted to Draft successfully",
      data: revertedReport
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 5. Delete monthly report (only if Draft)
reports.delete("/:id", async (c) => {
  const user = c.get("user") as JWTPayload;
  const id = c.req.param("id");

  try {
    const [report] = await db
      .select()
      .from(monthlyReports)
      .where(and(
        eq(monthlyReports.id, id),
        eq(monthlyReports.companyId, user.companyId)
      ));

    if (!report) {
      return c.json({ success: false, message: "ไม่พบข้อมูลรายงานประจำเดือน" }, 404);
    }

    if (report.statusId > 1) {
      return c.json({ success: false, message: "ไม่สามารถลบรายงานที่นำส่งหรือรับรองแล้วได้" }, 400);
    }

    await db
      .delete(monthlyReports)
      .where(eq(monthlyReports.id, id));

    return c.json({
      success: true,
      message: "ลบรายงานประจำเดือนสำเร็จ"
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Helper functions for Excel generation
const getMonthNameThai = (m: number) =>
  ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
   "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"][m - 1] ?? "";

const getLastDayOfMonth = (month: number, year: number) =>
  new Date(year, month, 0).getDate();

const parsePartnerDetailsRawText = (jsonStr: string): string => {
  if (!jsonStr) return "-";
  try {
    const data = JSON.parse(jsonStr);
    const list: any[] = Array.isArray(data) ? data : (data.partners || []);
    if (!list.length) return "-";
    const seen = new Set<string>();
    const formatted = list
      .map((item) => {
        let label = item.name || "-";
        if (item.regNo) label += ` (DOA: ${item.regNo})`;
        return label;
      })
      .filter((l) => { if (seen.has(l)) return false; seen.add(l); return true; });
    return formatted.slice(0, 3).join("\n");
  } catch { return "-"; }
};

const renderUsageTypesText = (r: any) => {
  const parts: string[] = [];
  if (Number(r.totalSalesExportQty) > 0) parts.push("ส่งออกต่างประเทศ");
  if (Number(r.totalSalesDomesticQty) > 0) parts.push("จำหน่ายในประเทศ");
  if (Number(r.totalUsageQty) > 0) parts.push("ใช้แปรรูปผลิต");
  return parts.join("\n");
};

const renderUsageQtysText = (r: any) => {
  const parts: string[] = [];
  if (Number(r.totalSalesExportQty) > 0) parts.push(Number(r.totalSalesExportQty).toLocaleString());
  if (Number(r.totalSalesDomesticQty) > 0) parts.push(Number(r.totalSalesDomesticQty).toLocaleString());
  if (Number(r.totalUsageQty) > 0) parts.push(Number(r.totalUsageQty).toLocaleString());
  return parts.join("\n");
};

// 6. Export monthly report as Excel (xlsx-populate template approach)
reports.get("/:id/excel", async (c) => {
  const user = c.get("user") as JWTPayload;
  const id = c.req.param("id");

  try {
    const [report] = await db
      .select({
        id: monthlyReports.id,
        productId: monthlyReports.productId,
        productName: products.name,
        reportMonth: monthlyReports.reportMonth,
        reportYear: monthlyReports.reportYear,
        totalPurchaseQty: monthlyReports.totalPurchaseQty,
        avgPurchasePrice: monthlyReports.avgPurchasePrice,
        totalSalesQty: monthlyReports.totalSalesQty,
        totalSalesDomesticQty: monthlyReports.totalSalesDomesticQty,
        avgSalesDomesticPrice: monthlyReports.avgSalesDomesticPrice,
        totalSalesExportQty: monthlyReports.totalSalesExportQty,
        avgSalesExportPrice: monthlyReports.avgSalesExportPrice,
        totalUsageQty: monthlyReports.totalUsageQty,
        endingBalanceQty: monthlyReports.endingBalanceQty,
        partnerDetailsJson: monthlyReports.partnerDetailsJson,
        remarks: monthlyReports.remarks,
        statusId: monthlyReports.statusId,
        companyName: companies.name,
        companyTaxId: companies.taxId,
        companyHouseNo: companies.houseNo,
        companySoi: companies.soi,
        companyRoad: companies.road,
        companySubDistrict: companies.subDistrict,
        companyDistrict: companies.district,
        companyProvince: companies.province,
        companyZipcode: companies.zipcode,
        companyPhone: companies.phone,
        companyEmail: companies.email,
        companyTypeId: companies.companyTypeId,
        authorizedPerson: companies.authorizedPerson,
        authorizedPosition: companies.authorizedPosition,
      })
      .from(monthlyReports)
      .innerJoin(companies, eq(monthlyReports.companyId, companies.id))
      .innerJoin(products, eq(monthlyReports.productId, products.id))
      .where(and(
        eq(monthlyReports.id, id),
        eq(monthlyReports.companyId, user.companyId)
      ));

    if (!report) {
      return c.json({ success: false, message: "ไม่พบข้อมูลรายงานประจำเดือน" }, 404);
    }

    // Load the original template file (relative path resolves correctly in Bun backend context)
    let templatePath = path.resolve("../web/public/file/TEMPLATE.xlsx");
    if (!fs.existsSync(templatePath)) {
      templatePath = path.resolve("./apps/web/public/file/TEMPLATE.xlsx");
    }
    if (!fs.existsSync(templatePath)) {
      return c.json({ success: false, message: "ไม่พบไฟล์ต้นแบบ TEMPLATE.xlsx ในระบบ" }, 500);
    }

    // Query all reports for the same company, month, and year to support multiple products in the same sheet
    const allReports = await db
      .select({
        id: monthlyReports.id,
        productId: monthlyReports.productId,
        productName: products.name,
        reportMonth: monthlyReports.reportMonth,
        reportYear: monthlyReports.reportYear,
        endingBalanceQty: monthlyReports.endingBalanceQty,
        remarks: monthlyReports.remarks,
      })
      .from(monthlyReports)
      .innerJoin(products, eq(monthlyReports.productId, products.id))
      .where(and(
        eq(monthlyReports.reportMonth, report.reportMonth),
        eq(monthlyReports.reportYear, report.reportYear),
        eq(monthlyReports.companyId, user.companyId)
      ))
      .orderBy(products.name);

    interface ExcelRowData {
      productName: string;
      avgSalesDomesticPrice: number | null;
      avgSalesExportPrice: number | null;
      beginningBalance: number;
      purchaseQty: number | null;
      purchasePartner: string | null;
      purchasePrice: number | null;
      usageType: string | null;
      usageQty: number | null;
      endingBalance: number;
      remarks: string | null;
    }

    const allRowData: ExcelRowData[] = [];

    for (const r of allReports) {
      // 1. Get previous month's report to find beginning balance
      let prevMonth = report.reportMonth - 1;
      let prevYear = report.reportYear;
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear = report.reportYear - 1;
      }

      const [prevReport] = await db
        .select()
        .from(monthlyReports)
        .where(and(
          eq(monthlyReports.companyId, user.companyId),
          eq(monthlyReports.productId, r.productId),
          eq(monthlyReports.reportMonth, prevMonth),
          eq(monthlyReports.reportYear, prevYear)
        ));

      const beginningBalance = prevReport ? Number(prevReport.endingBalanceQty || 0) : 0;

      // 2. Query actual transactions for this product in the given month (ordered by date and time)
      const mainPartners = alias(partners, "main_partners");
      const sourcePartners = alias(partners, "source_partners");

      const txs = await db
        .select({
          id: stockTransactions.id,
          transactionTypeId: stockTransactions.transactionTypeId,
          transactionDate: stockTransactions.transactionDate,
          quantity: stockTransactions.quantity,
          unitPrice: stockTransactions.unitPrice,
          saleType: stockTransactions.saleType,
          destinationCountry: stockTransactions.destinationCountry,
          productionType: stockTransactions.productionType,
          partnerId: stockTransactions.partnerId,
          partnerName: mainPartners.name,
          sourcePartnerName: sourcePartners.name,
          invoiceNo: stockTransactions.invoiceNo,
          containerNo: stockTransactions.containerNo,
          remarks: stockTransactions.remarks
        })
        .from(stockTransactions)
        .leftJoin(mainPartners, eq(stockTransactions.partnerId, mainPartners.id))
        .leftJoin(sourcePartners, eq(stockTransactions.sourcePartnerId, sourcePartners.id))
        .where(and(
          eq(stockTransactions.companyId, user.companyId),
          eq(stockTransactions.productId, r.productId),
          gte(stockTransactions.transactionDate, `${report.reportYear}-${String(report.reportMonth).padStart(2, "0")}-01`),
          lte(stockTransactions.transactionDate, `${report.reportYear}-${String(report.reportMonth).padStart(2, "0")}-${String(getLastDayOfMonth(report.reportMonth, report.reportYear)).padStart(2, "0")}`),
          notDeleted(stockTransactions)
        ))
        .orderBy(stockTransactions.transactionDate, stockTransactions.transactionTypeId, stockTransactions.createdAt);

      if (txs.length === 0) {
        // If there are no transactions, render at least one summary row to retain beginning/ending balance report
        allRowData.push({
          productName: r.productName || "",
          avgSalesDomesticPrice: null,
          avgSalesExportPrice: null,
          beginningBalance,
          purchaseQty: null,
          purchasePartner: null,
          purchasePrice: null,
          usageType: null,
          usageQty: null,
          endingBalance: Number(r.endingBalanceQty || 0),
          remarks: r.remarks || null
        });
      } else {
        let currentBalance = beginningBalance;
        for (const tx of txs) {
          const qty = Number(tx.quantity);
          const price = tx.unitPrice ? Number(tx.unitPrice) : null;
          const prevBalance = currentBalance;

          let purchaseQty: number | null = null;
          let purchasePartner: string | null = null;
          let purchasePrice: number | null = null;
          let usageType: string | null = null;
          let usageQty: number | null = null;
          let domesticPrice: number | null = null;
          let exportPrice: number | null = null;

          // Create unified remarks containing transaction date, invoice, container no, and custom remarks
          const noteParts: string[] = [];
          if (tx.transactionDate) {
            const dateLabel = tx.transactionTypeId === 1 ? "วันที่รับซื้อ" : "วันที่จำหน่าย";
            noteParts.push(`${dateLabel}: ${formatDate(tx.transactionDate)}`);
          }
          if (tx.invoiceNo) {
            noteParts.push(`INV: ${tx.invoiceNo}`);
          }
          if (tx.containerNo) {
            noteParts.push(`ตู้: ${tx.containerNo}`);
          }
          if (tx.remarks) {
            noteParts.push(`หมายเหตุ: ${tx.remarks}`);
          }
          const combinedRemarks = noteParts.length > 0 ? noteParts.join(" | ") : null;

          if (tx.transactionTypeId === 1) { // รับซื้อ
            purchaseQty = qty;
            purchasePrice = price;
            currentBalance += qty;

            let partnerText = tx.partnerName || "ไม่ระบุคู่ค้า";
            if (tx.sourcePartnerName) {
              partnerText += ` (จากโรงงาน: ${tx.sourcePartnerName})`;
            }
            purchasePartner = partnerText;

            // In purchase mode, the product description (e.g. มะพร้าวควั่น) should show up in column H (usageType) or can be left blank?
            // Usually, standard มพอ. ๐๑ column H is "รูปแบบการผลิต". Let's show productionType there if provided!
            if (tx.productionType) {
              usageType = tx.productionType;
            }
          } else if (tx.transactionTypeId === 2) { // จำหน่าย
            usageQty = qty;
            currentBalance -= qty;

            if (tx.saleType === "export") {
              exportPrice = price;
              usageType = tx.productionType || "ส่งออกต่างประเทศ";
            } else {
              domesticPrice = price;
              usageType = tx.productionType || "จำหน่ายในประเทศ";
            }
          } else if (tx.transactionTypeId === 3) { // ใช้ผลิต
            usageQty = qty;
            currentBalance -= qty;
            usageType = tx.productionType || "ใช้ผลิตในโรงงาน";
          } else if (tx.transactionTypeId === 4) { // ปรับปรุงยอด
            purchaseQty = qty;
            currentBalance += qty;
            purchasePartner = "ปรับปรุงยอดคลังสินค้า";
            if (tx.productionType) {
              usageType = tx.productionType;
            }
          }

          allRowData.push({
            productName: r.productName || "",
            avgSalesDomesticPrice: domesticPrice,
            avgSalesExportPrice: exportPrice,
            beginningBalance: prevBalance,
            purchaseQty,
            purchasePartner,
            purchasePrice,
            usageType,
            usageQty,
            endingBalance: currentBalance,
            remarks: combinedRemarks
          });
        }
      }
    }

    // Unzip the file to replace checkbox text and shift drawing row anchors dynamically
    const templateBytes = fs.readFileSync(templatePath);
    const zip = await JSZip.loadAsync(templateBytes);
    const drawingXmlPath = "xl/drawings/drawing1.xml";
    const N = allRowData.length;

    if (zip.files[drawingXmlPath]) {
      let drawingXml = await zip.files[drawingXmlPath].async("text");

      // Checkboxes configuration based on database rules:
      let checkBuyer = "◻";
      let checkExporter = "◻";
      let checkManufacturer = "◻";

      const compTypeId = report.companyTypeId;
      if (compTypeId === 1 || compTypeId === 2) {
        checkBuyer = "☑";
      } else if (compTypeId === 3) {
        checkManufacturer = "☑";
      }

      if (Number(report.totalSalesExportQty) > 0) {
        checkExporter = "☑";
      }

      if (checkBuyer === "◻" && checkExporter === "◻" && checkManufacturer === "◻") {
        checkBuyer = "☑";
      }

      let checkFruit = "◻";
      let checkJuice = "◻";
      const pName = report.productName || "";
      if (pName.includes("ผลอ่อน") || pName.includes("ผล")) {
        checkFruit = "☑";
      } else if (pName.includes("น้ำ")) {
        checkJuice = "☑";
      } else {
        if (compTypeId === 1) checkFruit = "☑";
        if (compTypeId === 2) checkJuice = "☑";
      }

      drawingXml = drawingXml.replace("◻ ผู้รับซื้อ", `${checkBuyer} ผู้รับซื้อ`);
      drawingXml = drawingXml.replace("◻ ผู้ส่งออก", `${checkExporter} ผู้ส่งออก`);
      drawingXml = drawingXml.replace(
        "◻ ผู้ผลิตเครื่องดื่มจากมะพร้าวที่ได้รับอนุญาตจากสำนักงานคณะกรรมการอาหารและยา",
        `${checkManufacturer} ผู้ผลิตเครื่องดื่มจากมะพร้าวที่ได้รับอนุญาตจากสำนักงานคณะกรรมการอาหารและยา`
      );
      drawingXml = drawingXml.replace("◻ มะพร้าวผลอ่อน", `${checkFruit} มะพร้าวผลอ่อน`);
      drawingXml = drawingXml.replace("◻ น้ำมะพร้าว", `${checkJuice} น้ำมะพร้าว`);

      // Replace signatory details dynamically using robust regex to handle exact dot length variations
      const authorizedPerson = report.authorizedPerson && report.authorizedPerson !== "-" ? report.authorizedPerson : "...................................................";
      const authorizedPosition = report.authorizedPosition && report.authorizedPosition !== "-" ? report.authorizedPosition : "...................................................";

      // Match "(...dots...)" where dots length is between 45 and 60
      drawingXml = drawingXml.replace(/\(\.{45,60}\)/g, `(  ${authorizedPerson}  )`);
      
      // Match "ตำแหน่ง...dots..." where dots length is between 55 and 75
      // Insert 13 spaces at the front to center the position line correctly below the name
      drawingXml = drawingXml.replace(/ตำแหน่ง\.{55,75}/g, `             ตำแหน่ง ${authorizedPosition}`);

      // Current download date
      const nowDay = dayjs().format("D");
      const nowMonthName = getMonthNameThai(dayjs().month() + 1);
      const nowYearBE = dayjs().year() + 543;
      
      // Match "วันที่...dots...เดือน...dots...พ.ศ. ...dots..."
      drawingXml = drawingXml.replace(/วันที่\.{5,15}เดือน\.{25,38}พ\.ศ\.\s*\.{8,15}/g, `วันที่   ${nowDay}   เดือน   ${nowMonthName}   พ.ศ.   ${nowYearBE}`);

      // DYNAMIC DRAWING SHIFT: Shift row anchors of drawings below the table (fromRow >= 27)
      if (N > 6) {
        const rowsToInsert = N - 6;
        
        drawingXml = drawingXml.replace(/<xdr:twoCellAnchor>([\s\S]*?)<\/xdr:twoCellAnchor>/g, (anchorBlock) => {
          const fromRowMatch = anchorBlock.match(/<xdr:from>[\s\S]*?<xdr:row>(\d+?)<\/xdr:row>/);
          if (fromRowMatch) {
            const fromRow = parseInt(fromRowMatch[1], 10);
            if (fromRow >= 27) {
              // Update from row anchor
              anchorBlock = anchorBlock.replace(/<xdr:from>([\s\S]*?)<xdr:row>\d+?<\/xdr:row>/, (fromBlock) => {
                return fromBlock.replace(/<xdr:row>\d+?<\/xdr:row>/, `<xdr:row>${fromRow + rowsToInsert}</xdr:row>`);
              });
              
              // Update to row anchor
              const toRowMatch = anchorBlock.match(/<xdr:to>[\s\S]*?<xdr:row>(\d+?)<\/xdr:row>/);
              if (toRowMatch) {
                const toRow = parseInt(toRowMatch[1], 10);
                anchorBlock = anchorBlock.replace(/<xdr:to>([\s\S]*?)<xdr:row>\d+?<\/xdr:row>/, (toBlock) => {
                  return toBlock.replace(/<xdr:row>\d+?<\/xdr:row>/, `<xdr:row>${toRow + rowsToInsert}</xdr:row>`);
                });
              }
            }
          }
          return anchorBlock;
        });
      }

      zip.file(drawingXmlPath, drawingXml);
    }

    const updatedBuffer = await zip.generateAsync({ type: "nodebuffer" });

    // Load the updated buffer into xlsx-populate for cell-level operations
    const workbook = await XlsxPopulate.fromDataAsync(updatedBuffer);
    const worksheet = workbook.sheet(0);

    // Replace the text in metadata rows (rows 12 to 16) directly in Excel while preserving shapes
    const A12 = worksheet.cell("A12");
    let valA12 = (A12.value() || "") as string;
    valA12 = valA12.replace("{companyName}", report.companyName || "");
    valA12 = valA12.replace("{companyTaxId}", report.companyTaxId || "");
    A12.value(valA12);

    const A13 = worksheet.cell("A13");
    let valA13 = (A13.value() || "") as string;
    valA13 = valA13.replace("{companyHouseNo}", report.companyHouseNo || "");
    valA13 = valA13.replace("{companySubDistrict}", report.companySubDistrict || "");
    valA13 = valA13.replace("{companyDistrict}", report.companyDistrict || "");
    A13.value(valA13);

    const A14 = worksheet.cell("A14");
    let valA14 = (A14.value() || "") as string;
    valA14 = valA14.replace("{companyProvince}", report.companyProvince || "");
    valA14 = valA14.replace("{companyZipcode}", report.companyZipcode || "");
    valA14 = valA14.replace("{companyPhone}", report.companyPhone || "");
    A14.value(valA14);

    const A15 = worksheet.cell("A15");
    let valA15 = (A15.value() || "") as string;
    valA15 = valA15.replace("{userFullName}", user.fullName || "ผู้ประกอบการ");
    valA15 = valA15.replace("{companyPhone}", report.companyPhone || "");
    A15.value(valA15);

    const A16 = worksheet.cell("A16");
    let valA16 = (A16.value() || "") as string;
    valA16 = valA16.replace("{beginDate}", "1");
    valA16 = valA16.replace("{endDate}", String(getLastDayOfMonth(report.reportMonth, report.reportYear)));
    valA16 = valA16.replace("{monthName}", getMonthNameThai(report.reportMonth));
    valA16 = valA16.replace("{buddhistYear}", String(report.reportYear + 543));
    A16.value(valA16);

    // Helper method to copy style cell by cell safely in xlsx-populate
    const copyCellStylesSafely = (srcCell: any, destCell: any) => {
      const styleKeys = [
        "bold", "italic", "underline", "strikethrough", "fontColor",
        "fontFamily", "fontSize", "horizontalAlignment", "verticalAlignment",
        "wrapText", "numberFormat", "fill", "border"
      ];
      styleKeys.forEach(key => {
        try {
          const val = srcCell.style(key);
          if (val !== undefined && val !== null) {
            destCell.style(key, val);
          }
        } catch (e) {
          // ignore
        }
      });
    };

    const copyRowStyles = (srcRowNum: number, destRowNum: number) => {
      const srcRow = worksheet.row(srcRowNum);
      const destRow = worksheet.row(destRowNum);
      const height = srcRow.height();
      if (height !== undefined) destRow.height(height);
      for (let c = 1; c <= 11; c++) {
        copyCellStylesSafely(srcRow.cell(c), destRow.cell(c));
      }
    };

    // Dynamically shift rows down if we have more than the 6 pre-designed rows (rows 22 to 27)
    if (N > 6) {
      const rowsToInsert = N - 6;
      const startShiftRow = 23;
      const endTemplateRow = 150; // shift up to row 150 to cover all signing blocks safely

      // Shift bottom rows (from row 150 down to row 23) down by rowsToInsert
      for (let r = endTemplateRow; r >= startShiftRow; r--) {
        const srcRow = worksheet.row(r);
        const destRow = worksheet.row(r + rowsToInsert);

        // Copy row height
        const h = srcRow.height();
        if (h !== undefined) destRow.height(h);

        // Copy cells
        for (let c = 1; c <= 11; c++) {
          const srcCell = srcRow.cell(c);
          const destCell = destRow.cell(c);
          destCell.value(srcCell.value());
          copyCellStylesSafely(srcCell, destCell);
        }

        // Clear cells of the original row that will be overwritten with new data
        if (r < 23 + rowsToInsert) {
          for (let c = 1; c <= 11; c++) {
            srcRow.cell(c).value(null);
          }
        }
      }

      // Copy borders and styles from row 22 to the newly cleared data rows
      for (let i = 1; i <= rowsToInsert; i++) {
        copyRowStyles(22, 22 + i);
      }
    }

    // Populate data for all rows
    for (let idx = 0; idx < N; idx++) {
      const r = allRowData[idx];
      const rowNum = 22 + idx;
      const curRow = worksheet.row(rowNum);
      
      curRow.height(30);

      // Column A: ชนิด
      curRow.cell(1).value(r.productName || null);
      
      // Column B & C: ราคาจำหน่าย ในประเทศ / ส่งออก
      curRow.cell(2).value(r.avgSalesDomesticPrice);
      curRow.cell(3).value(r.avgSalesExportPrice);

      // Column D: ปริมาณคงเหลือยกมา
      curRow.cell(4).value(r.beginningBalance);

      // Column E: ปริมาณซื้อเข้า
      curRow.cell(5).value(r.purchaseQty);

      // Column F: รับซื้อจาก
      curRow.cell(6).value(r.purchasePartner);

      // Column G: ราคารับซื้อ
      curRow.cell(7).value(r.purchasePrice);

      // Column H: รูปแบบการผลิต
      curRow.cell(8).value(r.usageType);

      // Column I: จำนวน
      curRow.cell(9).value(r.usageQty);

      // Column J: ปริมาณคงเหลือยกไป
      curRow.cell(10).value(r.endingBalance);

      // Column K: หมายเหตุ
      curRow.cell(11).value(r.remarks || null);

      // Reset style color to black and clean horizontal borders to meet the layout requirements
      const isLastRow = idx === N - 1;
      for (let c = 1; c <= 11; c++) {
        const cell = curRow.cell(c);
        
        // Force color to black to overwrite legacy blue signature styles
        cell.style("fontColor", "000000");

        // Force Column 11 (Remarks / คอลัมน์ K) to be left-aligned
        if (c === 11) {
          cell.style("horizontalAlignment", "left");
        }

        // Format borders: no horizontal lines inside table, closed with medium line at bottom
        if (isLastRow) {
          cell.style("border", {
            top: null,
            bottom: { style: "medium" },
            left: { style: "thin" },
            right: { style: "thin" }
          });
        } else {
          cell.style("border", {
            top: null,
            bottom: null,
            left: { style: "thin" },
            right: { style: "thin" }
          });
        }
      }
    }

    // Clear leftover pre-designed rows if we have fewer than 6 reports
    if (N < 6) {
      for (let rowNum = 22 + N; rowNum <= 27; rowNum++) {
        const curRow = worksheet.row(rowNum);
        for (let c = 1; c <= 11; c++) {
          curRow.cell(c).value(null);
        }
      }
    }

    // Output workbook buffer and return
    const buffer = await workbook.outputAsync();
    
    c.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    c.header("Content-Disposition", `attachment; filename="report_${report.reportMonth}_${report.reportYear + 543}.xlsx"`);
    
    return c.body(buffer);
  } catch (error: any) {
    console.error("Excel generation error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default reports;
