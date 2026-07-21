import { connectDB } from "./db";
import { verifyToken, type AuthUser } from "./auth";
import { hasPermission, type Permission } from "./permissions";
import { adminLimiter, getIP } from "./ratelimit";
import { writeAudit, type AuditEntry } from "./audit";
import { fail } from "./api";

export interface AdminContext {
  auth: AuthUser;
  ip: string;
  /** Write an audit entry attributed to the current admin + request IP. */
  audit: (entry: AuditEntry) => Promise<void>;
}

type Handler<Ctx> = (
  req: Request,
  admin: AdminContext,
  routeCtx: Ctx
) => Promise<Response> | Response;

/**
 * Wrap an admin API route handler with the full guard stack:
 *  1. DB connection
 *  2. rate limiting (fail-open on limiter errors)
 *  3. JWT verification + admin check
 *  4. permission check
 *  5. structured error handling
 *
 * The handler receives an {@link AdminContext} with the authenticated admin,
 * request IP, and a pre-bound `audit()` helper.
 */
export function withAdmin<Ctx = unknown>(
  permission: Permission | Permission[] | null,
  handler: Handler<Ctx>
) {
  return async (req: Request, routeCtx: Ctx): Promise<Response> => {
    try {
      await connectDB();

      const ip = getIP(req);
      try {
        const { success } = await adminLimiter.limit(`admin:${ip}`);
        if (!success) {
          return fail("Too many requests. Slow down.", 429);
        }
      } catch {
        // Limiter unavailable — allow the request rather than lock admins out.
      }

      const auth = await verifyToken(req);
      if (!auth) return fail("Unauthorized", 401);
      if (auth.adminRole === null) return fail("Forbidden: admin access required", 403);

      const required = permission
        ? Array.isArray(permission)
          ? permission
          : [permission]
        : [];
      for (const p of required) {
        if (!hasPermission(auth.adminRole, p)) {
          return fail("Forbidden: insufficient permissions", 403);
        }
      }

      const admin: AdminContext = {
        auth,
        ip,
        audit: (entry) => writeAudit(auth, { ip, ...entry }),
      };

      return await handler(req, admin, routeCtx);
    } catch (err) {
      console.error("[ADMIN API] unhandled error", err);
      return fail("Internal server error", 500);
    }
  };
}
