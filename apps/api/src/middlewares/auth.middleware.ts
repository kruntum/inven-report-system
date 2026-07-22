import { Context, Next } from "hono";
import { verify } from "hono/jwt";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("FATAL ERROR: JWT_SECRET environment variable is required in production!");
}

const JWT_SECRET = (process.env.JWT_SECRET || "aB3_kLm7_nPq9xWz5vR2hT8jYf4cDg6").replace(/['"]/g, "");

import { db } from "../db/connection.ts";
import { userCompanies } from "../db/schema.ts";
import { eq, and } from "drizzle-orm";

export interface JWTPayload {
  userId: string;
  roleId: number;
  companyId: string;
  username: string;
  fullName: string;
  activeCompanyId?: string;
}

// 1. Core Auth Middleware to verify token and attach user & active company to context
export async function authGuard(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ success: false, message: "Missing or invalid authorization token" }, 401);
  }

  const token = authHeader.substring(7);
  try {
    const payload = await verify(token, JWT_SECRET, "HS256") as any;
    const reqCompanyId = c.req.header("x-company-id");

    let activeCompanyId = payload.companyId;

    if (reqCompanyId) {
      if (payload.roleId === 1) {
        // Admin can access any company
        activeCompanyId = reqCompanyId;
      } else {
        // Non-admin: check if user has access to reqCompanyId in user_companies table
        const hasAccess = await db
          .select({ id: userCompanies.id })
          .from(userCompanies)
          .where(and(
            eq(userCompanies.userId, payload.userId),
            eq(userCompanies.companyId, reqCompanyId)
          ))
          .limit(1);

        if (hasAccess.length > 0) {
          activeCompanyId = reqCompanyId;
        }
      }
    }

    c.set("user", { ...payload, companyId: activeCompanyId });
    c.set("activeCompanyId", activeCompanyId);
    await next();
  } catch (error: any) {
    console.error("JWT Verification failed. Error:", error.message);
    return c.json({ success: false, message: "Unauthorized: Invalid or expired token" }, 401);
  }
}

// 2. Role-based authorization guard helper
export function requireRole(allowedRoles: number[]) {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as JWTPayload | undefined;
    
    if (!user) {
      return c.json({ success: false, message: "Unauthorized" }, 401);
    }
    
    if (!allowedRoles.includes(user.roleId)) {
      return c.json({ success: false, message: "Forbidden: You do not have permission to access this resource" }, 403);
    }
    
    await next();
  };
}
