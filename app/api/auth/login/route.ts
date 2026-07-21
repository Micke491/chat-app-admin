import { connectDB } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authLimiter, getIP } from "@/lib/ratelimit";
import { ok, fail } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { resolveAdminRole } from "@/lib/permissions";

export async function POST(req: Request) {
  try {
    await connectDB();

    const ip = getIP(req);
    const { success, reset } = await authLimiter.limit(ip);
    if (!success) {
      return fail("Too many attempts. Please try again later.", 429, {
        reset: reset.toString(),
      });
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return fail("Email and password are required", 400);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_SECRET is not defined");
      return fail("Server configuration error", 500);
    }

    const user = await User.findOne({ email });
    if (!user) return fail("Invalid credentials", 401);

    if (user.isBanned) return fail("This account has been banned", 403);
    if (user.isDeactivated) return fail("This account has been deactivated", 403);
    if (user.timeoutUntil && new Date(user.timeoutUntil) > new Date()) {
      return fail(
        `Your account is temporarily suspended until ${new Date(
          user.timeoutUntil
        ).toLocaleString()}`,
        403
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return fail("Invalid credentials", 401);

    // Only admins may sign in to the admin console.
    if (resolveAdminRole(user.role, user.adminRole) === null) {
      return fail("This account does not have admin access", 403);
    }

    const token = jwt.sign({ userId: user._id, email: user.email }, secret, {
      expiresIn: "7d",
    });

    await writeAudit(
      {
        id: String(user._id),
        username: user.username,
        email: user.email,
        role: user.role,
        adminRole: resolveAdminRole(user.role, user.adminRole),
        isBanned: false,
      },
      { action: "auth.login", targetType: "auth", ip }
    );

    return ok({ token });
  } catch (error) {
    console.error("Login error:", error);
    return fail("Internal server error", 500);
  }
}
