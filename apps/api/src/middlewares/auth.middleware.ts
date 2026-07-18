import { Context, Next } from "hono";
import { verify } from "hono/jwt";

const JWT_SECRET = (process.env.JWT_SECRET || "aB3_kLm7_nPq9xWz5vR2hT8jYf4cDg6").replace(/['"]/g, "");

export interface JWTPayload {
  userId: string;
  roleId: number;
  companyId: string;
  username: string;
  fullName: string;
}

// 1. Core Auth Middleware to verify token and attach user to context
export async function authGuard(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ success: false, message: "Missing or invalid authorization token" }, 401);
  }

  const token = authHeader.substring(7);
  try {
    const payload = await verify(token, JWT_SECRET, "HS256") as any;
    
    // Set user payload in Hono context
    c.set("user", payload);
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
