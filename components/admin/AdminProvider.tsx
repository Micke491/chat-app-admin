"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client/api";
import { removeAuthToken, getAuthToken } from "@/lib/storage";
import type { Permission } from "@/lib/permissions";
import type { AdminRole } from "@/models/User";

export interface AdminMe {
  id: string;
  username: string;
  name: string;
  email: string;
  avatar: string;
  role: "user" | "admin";
  adminRole: AdminRole | null;
  permissions: Permission[];
}

interface AdminContextValue {
  admin: AdminMe | null;
  loading: boolean;
  can: (permission: Permission) => boolean;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!getAuthToken() && !document.cookie.includes("token=")) {
        router.replace("/");
        return;
      }
      try {
        const me = await apiFetch<AdminMe>("/api/admin/me");
        if (!cancelled) {
          setAdmin(me);
          setLoading(false);
        }
      } catch {
        removeAuthToken();
        router.replace("/");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const can = (permission: Permission) =>
    admin?.permissions.includes(permission) ?? false;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-chat-bg-primary gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-chat-border border-t-chat-accent animate-spin" />
        <p className="text-sm text-chat-text-tertiary">Verifying access…</p>
      </div>
    );
  }

  return (
    <AdminContext.Provider value={{ admin, loading, can }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within an AdminProvider");
  return ctx;
}

/** Render children only when the current admin has the given permission. */
export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { can } = useAdmin();
  return <>{can(permission) ? children : fallback}</>;
}
