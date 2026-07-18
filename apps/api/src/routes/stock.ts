import { Hono } from "hono";
import { eq, and, gte, lte, desc, gt } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../db/connection.ts";
import { 
  stockTransactions, 
  products, 
  storageLocations, 
  masterTransactionTypes, 
  masterUnits, 
  monthlyReports, 
  partners, 
  masterPartnerTypes 
} from "../db/schema.ts";
import { notDeleted } from "../db/helpers.ts";
import { createTransactionSchema, createPartnerSchema } from "../lib/validators.ts";
import { authGuard, JWTPayload } from "../middlewares/auth.middleware.ts";

const stock = new Hono();

// Apply authGuard to all stock routes
stock.use("*", authGuard);

// 1. List transactions for user's company (including joined partner and source partner details)
stock.get("/", async (c) => {
  const user = c.get("user") as JWTPayload;
  const includeDeleted = c.req.query("includeDeleted") === "true";
  const queryDeleted = includeDeleted && (user.roleId === 1 || user.roleId === 3);

  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");
  const storageId = c.req.query("storageId");
  const productId = c.req.query("productId");

  try {
    const conditions = [eq(stockTransactions.companyId, user.companyId)];

    if (!queryDeleted) {
      conditions.push(notDeleted(stockTransactions));
    }
    if (startDate) {
      conditions.push(gte(stockTransactions.transactionDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(stockTransactions.transactionDate, endDate));
    }
    if (storageId) {
      conditions.push(eq(stockTransactions.storageId, storageId));
    }
    if (productId) {
      conditions.push(eq(stockTransactions.productId, productId));
    }

    // Join partners twice using aliases for normalized 3NF structure
    const mainPartners = alias(partners, "main_partners");
    const sourcePartners = alias(partners, "source_partners");

    const data = await db
      .select({
        id: stockTransactions.id,
        transactionDate: stockTransactions.transactionDate,
        productId: stockTransactions.productId,
        productName: products.name,
        baseUnitName: masterUnits.name,
        storageId: stockTransactions.storageId,
        storageName: storageLocations.name,
        transactionTypeId: stockTransactions.transactionTypeId,
        transactionTypeName: masterTransactionTypes.name,
        quantity: stockTransactions.quantity,
        unitPrice: stockTransactions.unitPrice,
        documentId: stockTransactions.documentId,
        partnerId: stockTransactions.partnerId,
        partnerName: mainPartners.name,
        partnerRegNo: mainPartners.regNo,
        partnerTypeId: mainPartners.partnerTypeId,
        partnerTypeName: masterPartnerTypes.name,
        sourcePartnerId: stockTransactions.sourcePartnerId,
        sourcePartnerName: sourcePartners.name,
        sourcePartnerRegNo: sourcePartners.regNo,
        saleType: stockTransactions.saleType,
        destinationCountry: stockTransactions.destinationCountry,
        productionType: stockTransactions.productionType,
        grossWeight: stockTransactions.grossWeight,
        netWeight: stockTransactions.netWeight,
        unit: stockTransactions.unit,
        pricingType: stockTransactions.pricingType,
        remarks: stockTransactions.remarks,
        createdAt: stockTransactions.createdAt,
        deletedAt: stockTransactions.deletedAt
      })
      .from(stockTransactions)
      .innerJoin(products, eq(stockTransactions.productId, products.id))
      .innerJoin(masterUnits, eq(products.baseUnitId, masterUnits.id))
      .innerJoin(storageLocations, eq(stockTransactions.storageId, storageLocations.id))
      .innerJoin(masterTransactionTypes, eq(stockTransactions.transactionTypeId, masterTransactionTypes.id))
      .leftJoin(mainPartners, eq(stockTransactions.partnerId, mainPartners.id))
      .leftJoin(masterPartnerTypes, eq(mainPartners.partnerTypeId, masterPartnerTypes.id))
      .leftJoin(sourcePartners, eq(stockTransactions.sourcePartnerId, sourcePartners.id))
      .where(and(...conditions))
      .orderBy(desc(stockTransactions.transactionDate), desc(stockTransactions.createdAt));

    return c.json({
      success: true,
      data
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 2. Record a new transaction (receive, sales, usage, adjust)
stock.post("/", async (c) => {
  const user = c.get("user") as JWTPayload;

  try {
    const body = await c.req.json();
    const result = createTransactionSchema.safeParse(body);

    if (!result.success) {
      return c.json({ success: false, errors: result.error.flatten() }, 400);
    }

    const {
      storageId,
      isDirectExport,
      productId,
      transactionTypeId,
      transactionDate,
      quantity,
      unitPrice,
      documentId,
      partnerId,
      sourcePartnerId,
      saleType,
      destinationCountry,
      productionType,
      grossWeight,
      netWeight,
      unit,
      pricingType,
      remarks
    } = result.data;

    let finalStorageId = storageId;

    if (isDirectExport) {
      // Find or create virtual direct shipping warehouse
      const [virtualStorage] = await db
        .select()
        .from(storageLocations)
        .where(and(
          eq(storageLocations.companyId, user.companyId),
          eq(storageLocations.name, "ส่งมอบโดยตรง (ไม่ผ่านคลัง)"),
          notDeleted(storageLocations)
        ));

      if (virtualStorage) {
        finalStorageId = virtualStorage.id;
      } else {
        const [newVirtual] = await db.insert(storageLocations).values({
          companyId: user.companyId,
          name: "ส่งมอบโดยตรง (ไม่ผ่านคลัง)",
          address: "สำนักงานใหญ่ (สำหรับการจำหน่ายและส่งออกโดยตรงไม่ผ่านคลังสินค้า)"
        }).returning();
        finalStorageId = newVirtual.id;
      }
    } else {
      if (!storageId) {
        return c.json({ success: false, message: "กรุณาระบุสถานที่เก็บสินค้า" }, 400);
      }
      // 1. Verify Storage Location belongs to the user's company and exists
      const [storage] = await db
        .select()
        .from(storageLocations)
        .where(and(
          eq(storageLocations.id, storageId),
          eq(storageLocations.companyId, user.companyId),
          notDeleted(storageLocations)
        ));

      if (!storage) {
        return c.json({ success: false, message: "Storage location not found or access denied" }, 404);
      }
    }

    // 2. Verify Product exists and is active
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), notDeleted(products)));

    if (!product) {
      return c.json({ success: false, message: "Product not found or inactive" }, 404);
    }

    // 3. Block transaction if monthly report has been submitted/verified
    const txDate = new Date(transactionDate);
    const txMonth = txDate.getMonth() + 1;
    const txYear = txDate.getFullYear();

    const [submittedReport] = await db
      .select()
      .from(monthlyReports)
      .where(and(
        eq(monthlyReports.companyId, user.companyId),
        eq(monthlyReports.productId, productId),
        eq(monthlyReports.reportMonth, txMonth),
        eq(monthlyReports.reportYear, txYear),
        gt(monthlyReports.statusId, 1)
      ));

    if (submittedReport) {
      return c.json({
        success: false,
        message: "Cannot add transactions to a period that has already been submitted to the government"
      }, 400);
    }

    // Insert transaction using decimal strings (Drizzle decimal handles strings to maintain precision)
    const [newTx] = await db.insert(stockTransactions).values({
      companyId: user.companyId,
      storageId: finalStorageId!,
      productId,
      transactionTypeId,
      transactionDate,
      quantity, // Decimal string
      unitPrice: unitPrice || null, // Decimal string or null
      documentId: documentId || null,
      partnerId: partnerId || null,
      sourcePartnerId: sourcePartnerId || null,
      saleType: saleType || null,
      destinationCountry: destinationCountry || null,
      productionType: productionType || null,
      grossWeight: grossWeight || null,
      netWeight: netWeight || null,
      unit: unit || null,
      pricingType: pricingType || null,
      remarks: remarks || null
    }).returning();

    return c.json({
      success: true,
      message: "Stock transaction recorded successfully",
      data: newTx
    }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 3. Update stock transaction
stock.put("/:id", async (c) => {
  const user = c.get("user") as JWTPayload;
  const id = c.req.param("id");

  try {
    const body = await c.req.json();
    
    // 1. Verify transaction exists and belongs to the company
    const [existing] = await db
      .select()
      .from(stockTransactions)
      .where(and(
        eq(stockTransactions.id, id),
        eq(stockTransactions.companyId, user.companyId),
        notDeleted(stockTransactions)
      ));

    if (!existing) {
      return c.json({ success: false, message: "Stock transaction not found or access denied" }, 404);
    }

    // 2. Block transaction update if monthly report has been submitted/verified
    const originalDate = new Date(existing.transactionDate);
    const originalMonth = originalDate.getMonth() + 1;
    const originalYear = originalDate.getFullYear();

    const [submittedReport] = await db
      .select()
      .from(monthlyReports)
      .where(and(
        eq(monthlyReports.companyId, user.companyId),
        eq(monthlyReports.productId, existing.productId),
        eq(monthlyReports.reportMonth, originalMonth),
        eq(monthlyReports.reportYear, originalYear),
        gt(monthlyReports.statusId, 1)
      ));

    if (submittedReport) {
      return c.json({
        success: false,
        message: "Cannot edit transactions for a period that has already been submitted to the government"
      }, 400);
    }

    // 3. Resolve target storage location if changing
    let finalStorageId = existing.storageId;
    const { storageId, isDirectExport, productId, transactionTypeId, transactionDate, quantity, unitPrice, partnerId, sourcePartnerId, saleType, destinationCountry, productionType, grossWeight, netWeight, pricingType, remarks } = body;

    if (isDirectExport !== undefined || storageId !== undefined) {
      const targetDirectExport = isDirectExport !== undefined ? isDirectExport : (existing.storageId === null); // virtual check
      if (targetDirectExport) {
        // Resolve virtual storage location
        const [virtualStorage] = await db
          .select()
          .from(storageLocations)
          .where(and(
            eq(storageLocations.companyId, user.companyId),
            eq(storageLocations.name, "ส่งมอบโดยตรง (ไม่ผ่านคลัง)"),
            notDeleted(storageLocations)
          ));

        if (virtualStorage) {
          finalStorageId = virtualStorage.id;
        } else {
          const [newVirtual] = await db.insert(storageLocations).values({
            companyId: user.companyId,
            name: "ส่งมอบโดยตรง (ไม่ผ่านคลัง)",
            address: "สำนักงานใหญ่ (สำหรับการจำหน่ายและส่งออกโดยตรงไม่ผ่านคลังสินค้า)"
          }).returning();
          finalStorageId = newVirtual.id;
        }
      } else if (storageId) {
        // Verify Storage Location belongs to the company
        const [storage] = await db
          .select()
          .from(storageLocations)
          .where(and(
            eq(storageLocations.id, storageId),
            eq(storageLocations.companyId, user.companyId),
            notDeleted(storageLocations)
          ));

        if (!storage) {
          return c.json({ success: false, message: "Storage location not found or access denied" }, 404);
        }
        finalStorageId = storageId;
      }
    }

    // 4. Verify Product exists if changing
    if (productId) {
      const [product] = await db
        .select()
        .from(products)
        .where(and(eq(products.id, productId), notDeleted(products)));

      if (!product) {
        return c.json({ success: false, message: "Product not found or inactive" }, 404);
      }
    }

    // Resolve unit name if product changes
    let finalUnit = existing.unit;
    if (productId && productId !== existing.productId) {
      const [prod] = await db.select().from(products).where(eq(products.id, productId));
      if (prod) {
        const [unitObj] = await db.select().from(masterUnits).where(eq(masterUnits.id, prod.baseUnitId));
        finalUnit = unitObj ? unitObj.name : null;
      }
    }

    // 5. Update transaction
    const [updatedTx] = await db
      .update(stockTransactions)
      .set({
        storageId: finalStorageId,
        productId: productId || existing.productId,
        transactionTypeId: transactionTypeId !== undefined ? Number(transactionTypeId) : existing.transactionTypeId,
        transactionDate: transactionDate || existing.transactionDate,
        quantity: quantity !== undefined ? quantity.toString() : existing.quantity,
        unitPrice: unitPrice !== undefined ? (unitPrice ? unitPrice.toString() : null) : existing.unitPrice,
        partnerId: partnerId !== undefined ? partnerId : existing.partnerId,
        sourcePartnerId: sourcePartnerId !== undefined ? sourcePartnerId : existing.sourcePartnerId,
        saleType: saleType !== undefined ? saleType : existing.saleType,
        destinationCountry: destinationCountry !== undefined ? destinationCountry : existing.destinationCountry,
        productionType: productionType !== undefined ? productionType : existing.productionType,
        grossWeight: grossWeight !== undefined ? (grossWeight ? grossWeight.toString() : null) : existing.grossWeight,
        netWeight: netWeight !== undefined ? (netWeight ? netWeight.toString() : null) : existing.netWeight,
        unit: finalUnit,
        pricingType: pricingType !== undefined ? pricingType : existing.pricingType,
        remarks: remarks !== undefined ? remarks : existing.remarks,
        updatedAt: new Date()
      })
      .where(eq(stockTransactions.id, id))
      .returning();

    return c.json({
      success: true,
      message: "Stock transaction updated successfully",
      data: updatedTx
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 3. Soft Delete transaction
stock.delete("/:id", async (c) => {
  const user = c.get("user") as JWTPayload;
  const id = c.req.param("id");

  try {
    // Verify transaction exists and belongs to the company
    const [existing] = await db
      .select()
      .from(stockTransactions)
      .where(and(
        eq(stockTransactions.id, id),
        eq(stockTransactions.companyId, user.companyId),
        notDeleted(stockTransactions)
      ));

    if (!existing) {
      return c.json({ success: false, message: "Stock transaction not found or access denied" }, 404);
    }

    // Block deletion if monthly report has been submitted/verified
    const txDate = new Date(existing.transactionDate);
    const txMonth = txDate.getMonth() + 1;
    const txYear = txDate.getFullYear();

    const [submittedReport] = await db
      .select()
      .from(monthlyReports)
      .where(and(
        eq(monthlyReports.companyId, user.companyId),
        eq(monthlyReports.productId, existing.productId),
        eq(monthlyReports.reportMonth, txMonth),
        eq(monthlyReports.reportYear, txYear),
        gt(monthlyReports.statusId, 1)
      ));

    if (submittedReport) {
      return c.json({
        success: false,
        message: "Cannot delete transactions from a period that has already been submitted to the government"
      }, 400);
    }

    // Apply Soft Delete timestamp
    await db
      .update(stockTransactions)
      .set({ deletedAt: new Date() })
      .where(eq(stockTransactions.id, id));

    return c.json({
      success: true,
      message: "Stock transaction deleted successfully (soft delete)"
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 4. List all partners for the user's company
stock.get("/partners", async (c) => {
  const user = c.get("user") as JWTPayload;
  try {
    const data = await db
      .select({
        id: partners.id,
        name: partners.name,
        partnerTypeId: partners.partnerTypeId,
        partnerTypeName: masterPartnerTypes.name,
        regNo: partners.regNo,
        address: partners.address,
        createdAt: partners.createdAt
      })
      .from(partners)
      .innerJoin(masterPartnerTypes, eq(partners.partnerTypeId, masterPartnerTypes.id))
      .where(and(
        eq(partners.companyId, user.companyId),
        notDeleted(partners)
      ))
      .orderBy(desc(partners.createdAt));

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 5. Create a new partner
stock.post("/partners", async (c) => {
  const user = c.get("user") as JWTPayload;
  try {
    const body = await c.req.json();
    const result = createPartnerSchema.safeParse(body);
    if (!result.success) {
      return c.json({ success: false, errors: result.error.flatten() }, 400);
    }

    const [newPartner] = await db
      .insert(partners)
      .values({
        companyId: user.companyId,
        name: result.data.name,
        partnerTypeId: result.data.partnerTypeId,
        regNo: result.data.regNo || null,
        address: result.data.address || null
      })
      .returning();

    return c.json({ success: true, data: newPartner }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 6. Update a partner
stock.put("/partners/:id", async (c) => {
  const user = c.get("user") as JWTPayload;
  const id = c.req.param("id");

  try {
    const body = await c.req.json();
    const result = createPartnerSchema.safeParse(body);
    if (!result.success) {
      return c.json({ success: false, errors: result.error.flatten() }, 400);
    }

    const [existing] = await db
      .select()
      .from(partners)
      .where(and(eq(partners.id, id), eq(partners.companyId, user.companyId), notDeleted(partners)));

    if (!existing) {
      return c.json({ success: false, message: "Partner not found" }, 404);
    }

    const [updatedPartner] = await db
      .update(partners)
      .set({
        name: result.data.name,
        partnerTypeId: result.data.partnerTypeId,
        regNo: result.data.regNo || null,
        address: result.data.address || null
      })
      .where(eq(partners.id, id))
      .returning();

    return c.json({ success: true, data: updatedPartner });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 7. Soft Delete a partner
stock.delete("/partners/:id", async (c) => {
  const user = c.get("user") as JWTPayload;
  const id = c.req.param("id");

  try {
    const [existing] = await db
      .select()
      .from(partners)
      .where(and(eq(partners.id, id), eq(partners.companyId, user.companyId), notDeleted(partners)));

    if (!existing) {
      return c.json({ success: false, message: "Partner not found" }, 404);
    }

    await db
      .update(partners)
      .set({ deletedAt: new Date() })
      .where(eq(partners.id, id));

    return c.json({
      success: true,
      message: "Partner deleted successfully (soft delete)"
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default stock;
