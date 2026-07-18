import { Hono } from "hono";
import { sign } from "hono/jwt";
import { eq, and } from "drizzle-orm";
import { db } from "../db/connection.ts";
import { users, companies } from "../db/schema.ts";
import { loginSchema, registerSchema } from "../lib/validators.ts";
import { notDeleted } from "../db/helpers.ts";
import { authGuard, JWTPayload } from "../middlewares/auth.middleware.ts";

const JWT_SECRET = (process.env.JWT_SECRET || "aB3_kLm7_nPq9xWz5vR2hT8jYf4cDg6").replace(/['"]/g, "");
const auth = new Hono();

// 1. User Registration (Accessible locally or restricted by admin in production)
auth.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    const result = registerSchema.safeParse(body);
    
    if (!result.success) {
      return c.json({ success: false, errors: result.error.flatten() }, 400);
    }
    
    const { companyId, roleId, username, password, fullName } = result.data;
    
    // Check if username already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.username, username), notDeleted(users)));
      
    if (existingUser) {
      return c.json({ success: false, message: "Username already exists" }, 409);
    }

    // Check if company exists if provided
    if (companyId) {
      const [company] = await db
        .select()
        .from(companies)
        .where(and(eq(companies.id, companyId), notDeleted(companies)));
      if (!company) {
        return c.json({ success: false, message: "Company not found" }, 404);
      }
    }

    // Hash password using Bun's native bcrypt
    const passwordHash = await Bun.password.hash(password, {
      algorithm: "bcrypt",
      cost: 10,
    });

    // Create user
    const [newUser] = await db.insert(users).values({
      companyId: companyId || null,
      roleId,
      username,
      passwordHash,
      fullName,
    }).returning();

    return c.json({
      success: true,
      message: "User registered successfully",
      user: {
        id: newUser.id,
        username: newUser.username,
        fullName: newUser.fullName,
        roleId: newUser.roleId,
        companyId: newUser.companyId
      }
    }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 2. User Authentication (Login)
auth.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const result = loginSchema.safeParse(body);
    
    if (!result.success) {
      return c.json({ success: false, errors: result.error.flatten() }, 400);
    }
    
    const { username, password } = result.data;
    
    // Fetch active user
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.username, username), notDeleted(users)));
      
    if (!user) {
      return c.json({ success: false, message: "Invalid username or password" }, 401);
    }
    
    // Verify password with Bun's native password verifier
    const isPasswordValid = await Bun.password.verify(password, user.passwordHash);
    if (!isPasswordValid) {
      return c.json({ success: false, message: "Invalid username or password" }, 401);
    }

    // Load company details
    let companyName = "";
    if (user.companyId) {
      const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, user.companyId));
      if (company) {
        companyName = company.name;
      }
    }

    // Generate JWT Token payload
    const payload: JWTPayload = {
      userId: user.id,
      roleId: user.roleId,
      companyId: user.companyId || "",
      username: user.username,
      fullName: user.fullName
    };

    const token = await sign(payload, JWT_SECRET);

    return c.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        roleId: user.roleId,
        companyId: user.companyId,
        companyName
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 3. Retrieve logged-in user profile
auth.get("/me", authGuard, async (c) => {
  const userPayload = c.get("user") as JWTPayload;
  
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userPayload.userId), notDeleted(users)));
      
    if (!user) {
      return c.json({ success: false, message: "User not found" }, 404);
    }

    return c.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        roleId: user.roleId,
        companyId: user.companyId
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 4. List all users of the company (Admin only)
auth.get("/users", authGuard, async (c) => {
  const user = c.get("user") as JWTPayload;
  if (user.roleId !== 1) {
    return c.json({ success: false, message: "Forbidden: Admin only" }, 403);
  }
  try {
    const data = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        roleId: users.roleId,
        createdAt: users.createdAt
      })
      .from(users)
      .where(and(eq(users.companyId, user.companyId), notDeleted(users)));
    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 5. Update user/staff details (Admin only)
auth.put("/users/:id", authGuard, async (c) => {
  const user = c.get("user") as JWTPayload;
  const id = c.req.param("id");
  if (user.roleId !== 1) {
    return c.json({ success: false, message: "Forbidden: Admin only" }, 403);
  }
  try {
    const body = await c.req.json();
    const { fullName, roleId, password } = body;
    
    const [existing] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.companyId, user.companyId), notDeleted(users)));
      
    if (!existing) {
      return c.json({ success: false, message: "User not found" }, 404);
    }

    const updateFields: any = {
      fullName: fullName || existing.fullName,
      roleId: roleId !== undefined ? Number(roleId) : existing.roleId,
      updatedAt: new Date()
    };

    if (password) {
      updateFields.passwordHash = await Bun.password.hash(password, {
        algorithm: "bcrypt",
        cost: 10
      });
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateFields)
      .where(eq(users.id, id))
      .returning();

    return c.json({
      success: true,
      message: "User updated successfully",
      data: {
        id: updatedUser.id,
        username: updatedUser.username,
        fullName: updatedUser.fullName,
        roleId: updatedUser.roleId
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 6. Soft Delete user/staff (Admin only)
auth.delete("/users/:id", authGuard, async (c) => {
  const user = c.get("user") as JWTPayload;
  const id = c.req.param("id");
  if (user.roleId !== 1) {
    return c.json({ success: false, message: "Forbidden: Admin only" }, 403);
  }
  
  if (user.userId === id) {
    return c.json({ success: false, message: "Cannot delete your own account" }, 400);
  }

  try {
    const [existing] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.companyId, user.companyId), notDeleted(users)));
      
    if (!existing) {
      return c.json({ success: false, message: "User not found" }, 404);
    }

    await db
      .update(users)
      .set({ deletedAt: new Date() })
      .where(eq(users.id, id));

    return c.json({
      success: true,
      message: "User deleted successfully (soft delete)"
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default auth;
