import { Hono } from "hono";
import { sign } from "hono/jwt";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "../db/connection.ts";
import { users, companies, userCompanies } from "../db/schema.ts";
import { loginSchema } from "../lib/validators.ts";
import { notDeleted } from "../db/helpers.ts";
import { authGuard, JWTPayload } from "../middlewares/auth.middleware.ts";

const JWT_SECRET = (process.env.JWT_SECRET || "aB3_kLm7_nPq9xWz5vR2hT8jYf4cDg6").replace(/['"]/g, "");
const auth = new Hono();

async function getUserCompaniesList(userId: string, roleId: number) {
  if (roleId === 1) {
    // Admin accesses all active companies
    return await db.select().from(companies).where(notDeleted(companies));
  }

  const userComps = await db
    .select({
      id: companies.id,
      name: companies.name,
      taxId: companies.taxId,
      houseNo: companies.houseNo,
      province: companies.province,
    })
    .from(userCompanies)
    .innerJoin(companies, eq(userCompanies.companyId, companies.id))
    .where(and(eq(userCompanies.userId, userId), notDeleted(companies)));

  return userComps;
}

// 1. User Registration (Accessible by Admin)
auth.post("/register", authGuard, async (c) => {
  const currentUser = c.get("user") as JWTPayload;
  if (currentUser.roleId !== 1) {
    return c.json({ success: false, message: "Forbidden: Admin only" }, 403);
  }

  try {
    const body = await c.req.json();
    const { username, password, fullName, roleId, companyIds, companyId } = body;

    if (!username || !password || !fullName || !roleId) {
      return c.json({ success: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน" }, 400);
    }

    // Check if username already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.username, username), notDeleted(users)));

    if (existingUser) {
      return c.json({ success: false, message: "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว" }, 409);
    }

    // Hash password using Bun's native bcrypt
    const passwordHash = await Bun.password.hash(password, {
      algorithm: "bcrypt",
      cost: 10,
    });

    const targetCompanyIds: string[] = Array.isArray(companyIds) && companyIds.length > 0
      ? companyIds
      : (companyId ? [companyId] : [currentUser.companyId]);

    // Create user
    const [newUser] = await db.insert(users).values({
      companyId: targetCompanyIds[0] || currentUser.companyId,
      roleId: Number(roleId),
      username,
      passwordHash,
      fullName,
    }).returning();

    // Map company associations
    if (targetCompanyIds.length > 0) {
      await db.insert(userCompanies).values(
        targetCompanyIds.map((cId) => ({
          userId: newUser.id,
          companyId: cId,
        }))
      );
    }

    return c.json({
      success: true,
      message: "เพิ่มผู้ใช้ระบบสำเร็จ",
      user: {
        id: newUser.id,
        username: newUser.username,
        fullName: newUser.fullName,
        roleId: newUser.roleId,
        companyId: newUser.companyId,
        companyIds: targetCompanyIds,
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

    // Fetch all companies this user has access to
    const allowedCompanies = await getUserCompaniesList(user.id, user.roleId);
    const activeCompany = allowedCompanies[0] || null;

    // Generate JWT Token payload
    const payload: JWTPayload = {
      userId: user.id,
      roleId: user.roleId,
      companyId: activeCompany?.id || user.companyId || "",
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
        companyId: activeCompany?.id || user.companyId,
        companyName: activeCompany?.name || "",
        companies: allowedCompanies,
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

    const allowedCompanies = await getUserCompaniesList(user.id, user.roleId);

    return c.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        roleId: user.roleId,
        companyId: userPayload.companyId || user.companyId,
        companies: allowedCompanies,
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 4. List all users (Admin only)
auth.get("/users", authGuard, async (c) => {
  const currentUser = c.get("user") as JWTPayload;
  if (currentUser.roleId !== 1) {
    return c.json({ success: false, message: "Forbidden: Admin only" }, 403);
  }
  try {
    const allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        roleId: users.roleId,
        companyId: users.companyId,
        createdAt: users.createdAt
      })
      .from(users)
      .where(notDeleted(users));

    // Attach company list for each user
    const usersWithCompanies = await Promise.all(
      allUsers.map(async (u) => {
        const uCompanies = await getUserCompaniesList(u.id, u.roleId);
        return {
          ...u,
          companies: uCompanies,
          companyIds: uCompanies.map((comp) => comp.id),
        };
      })
    );

    return c.json({ success: true, data: usersWithCompanies });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 5. Update user/staff details (Admin only)
auth.put("/users/:id", authGuard, async (c) => {
  const currentUser = c.get("user") as JWTPayload;
  const id = c.req.param("id");
  if (currentUser.roleId !== 1) {
    return c.json({ success: false, message: "Forbidden: Admin only" }, 403);
  }
  try {
    const body = await c.req.json();
    const { fullName, roleId, password, companyIds } = body;

    const [existing] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), notDeleted(users)));

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

    if (Array.isArray(companyIds) && companyIds.length > 0) {
      updateFields.companyId = companyIds[0];
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateFields)
      .where(eq(users.id, id))
      .returning();

    // Update user_companies relation if companyIds is provided
    if (Array.isArray(companyIds)) {
      await db.delete(userCompanies).where(eq(userCompanies.userId, id));
      if (companyIds.length > 0) {
        await db.insert(userCompanies).values(
          companyIds.map((cId: string) => ({
            userId: id,
            companyId: cId,
          }))
        );
      }
    }

    const updatedCompanies = await getUserCompaniesList(id, updatedUser.roleId);

    return c.json({
      success: true,
      message: "User updated successfully",
      data: {
        id: updatedUser.id,
        username: updatedUser.username,
        fullName: updatedUser.fullName,
        roleId: updatedUser.roleId,
        companies: updatedCompanies,
        companyIds: updatedCompanies.map((comp) => comp.id),
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 6. Soft Delete user/staff (Admin only)
auth.delete("/users/:id", authGuard, async (c) => {
  const currentUser = c.get("user") as JWTPayload;
  const id = c.req.param("id");
  if (currentUser.roleId !== 1) {
    return c.json({ success: false, message: "Forbidden: Admin only" }, 403);
  }

  if (currentUser.userId === id) {
    return c.json({ success: false, message: "Cannot delete your own account" }, 400);
  }

  try {
    const [existing] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), notDeleted(users)));

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
