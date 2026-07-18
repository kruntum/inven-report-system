import { Hono } from "hono";
import { eq, and, sql } from "drizzle-orm";
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

const reports = new Hono();

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

export default reports;
