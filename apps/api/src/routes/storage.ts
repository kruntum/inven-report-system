import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { db } from "../db/connection.ts";
import { storageLocations } from "../db/schema.ts";
import { notDeleted } from "../db/helpers.ts";
import { authGuard, JWTPayload } from "../middlewares/auth.middleware.ts";

const storage = new Hono();

// Apply authGuard to all storage routes
storage.use("*", authGuard);

// 1. List active storage locations
storage.get("/", async (c) => {
  const user = c.get("user") as JWTPayload;
  const includeDeleted = c.req.query("includeDeleted") === "true";
  
  // Only Admin (1) and Gov Officer (3) can query deleted items
  const queryDeleted = includeDeleted && (user.roleId === 1 || user.roleId === 3);

  try {
    const conditions = [eq(storageLocations.companyId, user.companyId)];
    if (!queryDeleted) {
      conditions.push(notDeleted(storageLocations));
    }

    const data = await db
      .select()
      .from(storageLocations)
      .where(and(...conditions));

    return c.json({
      success: true,
      data
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 2. Create a new storage location
storage.post("/", async (c) => {
  const user = c.get("user") as JWTPayload;
  
  try {
    const body = await c.req.json();
    const { name, address } = body;
    
    if (!name || !address) {
      return c.json({ success: false, message: "Name and address are required" }, 400);
    }

    const [newStorage] = await db.insert(storageLocations).values({
      companyId: user.companyId,
      name,
      address
    }).returning();

    return c.json({
      success: true,
      message: "Storage location created successfully",
      data: newStorage
    }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 3. Soft Delete a storage location
storage.delete("/:id", async (c) => {
  const user = c.get("user") as JWTPayload;
  const id = c.req.param("id");

  try {
    const [existing] = await db
      .select()
      .from(storageLocations)
      .where(and(eq(storageLocations.id, id), eq(storageLocations.companyId, user.companyId)));

    if (!existing) {
      return c.json({ success: false, message: "Storage location not found" }, 404);
    }

    // Perform soft delete
    await db
      .update(storageLocations)
      .set({ deletedAt: new Date() })
      .where(eq(storageLocations.id, id));

    return c.json({
      success: true,
      message: "Storage location deleted successfully (soft delete)"
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 4. Update a storage location
storage.put("/:id", async (c) => {
  const user = c.get("user") as JWTPayload;
  const id = c.req.param("id");

  try {
    const body = await c.req.json();
    const { name, address } = body;

    const [existing] = await db
      .select()
      .from(storageLocations)
      .where(and(eq(storageLocations.id, id), eq(storageLocations.companyId, user.companyId), notDeleted(storageLocations)));

    if (!existing) {
      return c.json({ success: false, message: "Storage location not found" }, 404);
    }

    const [updatedStorage] = await db
      .update(storageLocations)
      .set({
        name: name || existing.name,
        address: address || existing.address
      })
      .where(eq(storageLocations.id, id))
      .returning();

    return c.json({
      success: true,
      message: "Storage location updated successfully",
      data: updatedStorage
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default storage;
