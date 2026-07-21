"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  MessagesSquare,
  MessageSquare,
  BookImage,
  AlertCircle,
  Megaphone,
  Bot,
  ScrollText,
  Settings,
  LogOut,
  Shield,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { removeAuthToken } from "@/lib/storage";
import { useAdmin } from "./AdminProvider";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar } from "./ui";
import type { Permission } from "@/lib/permissions";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
  exact?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard.view", exact: true },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3, permission: "analytics.view" },
    ],
  },
  {
    title: "Moderation",
    items: [
      { href: "/admin/users", label: "Users", icon: Users, permission: "users.view" },
      { href: "/admin/chats", label: "Chats & Groups", icon: MessagesSquare, permission: "chats.view" },
      { href: "/admin/messages", label: "Messages", icon: MessageSquare, permission: "messages.view" },
      { href: "/admin/stories", label: "Stories", icon: BookImage, permission: "stories.view" },
      { href: "/admin/reports", label: "Reports", icon: AlertCircle, permission: "reports.view" },
    ],
  },
  {
    title: "Platform",
    items: [
      { href: "/admin/broadcast", label: "Broadcast", icon: Megaphone, permission: "broadcast.view" },
      { href: "/admin/bot", label: "Bot", icon: Bot, permission: "bot.view" },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/admin/audit", label: "Audit Log", icon: ScrollText, permission: "audit.view" },
      { href: "/admin/settings", label: "Settings", icon: Settings, permission: "settings.view" },
    ],
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { admin, can } = useAdmin();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [pathname]);

  function logout() {
    removeAuthToken();
    router.push("/");
  }

  const groups = NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => can(i.permission)),
  })).filter((g) => g.items.length > 0);

  const roleLabel =
    admin?.adminRole === "superadmin"
      ? "Super Admin"
      : admin?.adminRole === "moderator"
      ? "Moderator"
      : "Admin";

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {groups.map((group) => (
        <div key={group.title} className="mb-4">
          <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-chat-text-tertiary/70">
            {group.title}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 ${
                    mobile ? "py-3" : "py-2.5"
                  } rounded-lg transition-all duration-150 group ${
                    active
                      ? "bg-chat-bg-primary text-chat-text-primary shadow-sm border border-chat-border/50"
                      : "text-chat-text-secondary hover:text-chat-text-primary hover:bg-chat-bg-primary/30"
                  }`}
                >
                  <Icon
                    size={16}
                    className={`shrink-0 transition-colors ${
                      active ? "text-chat-accent" : "group-hover:text-chat-text-primary"
                    }`}
                  />
                  <span className={`flex-1 text-[13px] ${active ? "font-medium" : "font-normal"}`}>
                    {item.label}
                  </span>
                  {active && (
                    <motion.div
                      layoutId={mobile ? undefined : "activeNav"}
                      className="w-1.5 h-1.5 rounded-full bg-chat-accent"
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );

  const Identity = () => (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar src={admin?.avatar} name={admin?.username || "?"} className="w-9 h-9" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-chat-text-primary truncate">
          {admin?.name || admin?.username}
        </p>
        <p className="text-[11px] text-chat-accent font-medium leading-tight">{roleLabel}</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-chat-bg-primary font-sans">
      {/* Mobile header */}
      <header className="lg:hidden flex items-center justify-between px-5 py-4 bg-chat-bg-secondary border-b border-chat-border sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-chat-accent to-chat-accent-hover flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.3)]">
            <Shield size={14} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-chat-text-primary">VokiToki Admin</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle compact />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-chat-text-secondary hover:text-chat-text-primary transition-colors"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="lg:hidden fixed inset-x-0 top-[65px] bottom-0 bg-chat-bg-primary z-40 border-t border-chat-border overflow-y-auto custom-scrollbar"
          >
            <nav className="p-4">
              <NavLinks mobile />
              <div className="mt-2 pt-4 border-t border-chat-border">
                <button
                  onClick={logout}
                  className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-chat-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-all"
                >
                  <LogOut size={18} />
                  <span className="text-sm font-medium">Back to app</span>
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-chat-bg-secondary border-r border-chat-border sticky top-0 h-screen">
        <div className="p-5 border-b border-chat-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-chat-accent to-chat-accent-hover flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-chat-text-primary leading-tight">
                VokiToki Admin
              </p>
              <p className="text-[11px] text-chat-text-tertiary leading-tight mt-0.5">
                Control Center
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto custom-scrollbar">
          <NavLinks />
        </nav>

        <div className="p-3 border-t border-chat-border flex flex-col gap-1">
          <div className="px-2 py-2">
            <Identity />
          </div>
          <ThemeToggle />
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-chat-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-all group"
          >
            <LogOut size={16} className="transition-transform group-hover:-translate-x-0.5" />
            <span className="text-[13px] font-medium text-left">Back to app</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">{children}</main>
    </div>
  );
}
