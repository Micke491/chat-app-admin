import jwt, { JwtPayload } from "jsonwebtoken";
import { connectDB } from "./db";
import User from "@/models/User";
import { resolveAdminRole } from "./permissions";
import type { AdminRole } from "@/models/User";

interface DecodedToken extends JwtPayload {
  userId?: string;
  id?: string;
  _id?: string;
  email?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  role: "user" | "admin";
  /** Effective admin tier: 'superadmin' | 'moderator' | null (not an admin). */
  adminRole: AdminRole | null;
  isBanned: boolean;
  timeoutUntil?: Date;
}

function extractToken(req: Request): string {
  const authHeader = req.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/(?:^|; )token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

/**
 * Verify a request's JWT and load the associated user. Returns null when the
 * token is missing/invalid, or when the account is banned, deactivated, or
 * currently timed out.
 */
export async function verifyToken(req: Request): Promise<AuthUser | null> {
  try {
    const token = extractToken(req);
    if (!token) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_SECRET is missing in env");
      return null;
    }

    const decoded = jwt.verify(token, secret) as DecodedToken;
    const id = decoded.userId || decoded.id || decoded._id;
    if (!id) return null;

    await connectDB();
    const user = await User.findById(id)
      .select("username email role adminRole isBanned isDeactivated timeoutUntil")
      .lean();

    if (!user || user.isBanned || user.isDeactivated) return null;
    if (user.timeoutUntil && new Date(user.timeoutUntil) > new Date()) return null;

    return {
      id,
      username: user.username,
      email: user.email ?? decoded.email,
      role: user.role || "user",
      adminRole: resolveAdminRole(user.role, user.adminRole),
      isBanned: user.isBanned || false,
      timeoutUntil: user.timeoutUntil,
    };
  } catch {
    return null;
  }
}
