import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { db } from "../db/connection.ts";
import { products, masterUnits } from "../db/schema.ts";
import { notDeleted } from "../db/helpers.ts";
import { authGuard, JWTPayload } from "../middlewares/auth.middleware.ts";

const product = new Hono();

// Apply authGuard to all product routes
product.use("*", authGuard);

// 1. List active products
product.get("/", async (c) => {
  const user = c.get("user") as JWTPayload;
  const includeDeleted = c.req.query("includeDeleted") === "true";
  const queryDeleted = includeDeleted && (user.roleId === 1 || user.roleId === 3);

  try {
    const conditions = [];
    if (!queryDeleted) {
      conditions.push(notDeleted(products));
    }

    const data = await db
      .select({
        id: products.id,
        name: products.name,
        baseUnitId: products.baseUnitId,
        baseUnitName: masterUnits.name,
        createdAt: products.createdAt,
        deletedAt: products.deletedAt
      })
      .from(products)
      .innerJoin(masterUnits, eq(products.baseUnitId, masterUnits.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return c.json({
      success: true,
      data
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 2. Create a new product (restricted to Admin - 1)
product.post("/", async (c) => {
  const user = c.get("user") as JWTPayload;
  
  if (user.roleId !== 1) {
    return c.json({ success: false, message: "Forbidden: Admin only" }, 403);
  }

  try {
    const body = await c.req.json();
    const { name, baseUnitId } = body;

    if (!name || !baseUnitId) {
      return c.json({ success: false, message: "Name and baseUnitId are required" }, 400);
    }

    // Verify unit exists
    const [unit] = await db
      .select()
      .from(masterUnits)
      .where(eq(masterUnits.id, baseUnitId));
      
    if (!unit) {
      return c.json({ success: false, message: "Invalid base unit ID" }, 400);
    }

    const [newProduct] = await db.insert(products).values({
      name,
      baseUnitId
    }).returning();

    return c.json({
      success: true,
      message: "Product created successfully",
      data: newProduct
    }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 3. Update a product (restricted to Admin - 1)
product.put("/:id", async (c) => {
  const user = c.get("user") as JWTPayload;
  const id = c.req.param("id");
  
  if (user.roleId !== 1) {
    return c.json({ success: false, message: "Forbidden: Admin only" }, 403);
  }

  try {
    const body = await c.req.json();
    const { name, baseUnitId } = body;

    const [existing] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), notDeleted(products)));

    if (!existing) {
      return c.json({ success: false, message: "Product not found" }, 404);
    }

    if (baseUnitId) {
      const [unit] = await db
        .select()
        .from(masterUnits)
        .where(eq(masterUnits.id, baseUnitId));
      if (!unit) {
        return c.json({ success: false, message: "Invalid base unit ID" }, 400);
      }
    }

    const [updatedProduct] = await db
      .update(products)
      .set({
        name: name || existing.name,
        baseUnitId: baseUnitId !== undefined ? Number(baseUnitId) : existing.baseUnitId
      })
      .where(eq(products.id, id))
      .returning();

    return c.json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 4. Soft Delete a product (restricted to Admin - 1)
product.delete("/:id", async (c) => {
  const user = c.get("user") as JWTPayload;
  const id = c.req.param("id");
  
  if (user.roleId !== 1) {
    return c.json({ success: false, message: "Forbidden: Admin only" }, 403);
  }

  try {
    const [existing] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), notDeleted(products)));

    if (!existing) {
      return c.json({ success: false, message: "Product not found" }, 404);
    }

    await db
      .update(products)
      .set({ deletedAt: new Date() })
      .where(eq(products.id, id));

    return c.json({
      success: true,
      message: "Product deleted successfully (soft delete)"
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default product;
