"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = (localStorage.getItem("admin-theme") as Theme) || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("admin-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  const Icon = theme === "dark" ? Sun : Moon;

  if (compact) {
    return (
      <button
        onClick={toggle}
        title={theme === "dark" ? "Switch to light" : "Switch to dark"}
        className="p-2 rounded-lg text-chat-text-secondary hover:text-chat-text-primary hover:bg-chat-bg-hover transition-all"
      >
        <Icon size={18} />
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-chat-text-secondary hover:text-chat-text-primary hover:bg-chat-bg-primary/40 transition-all"
    >
      <Icon size={16} />
      <span className="text-[13px] font-medium">
        {theme === "dark" ? "Light mode" : "Dark mode"}
      </span>
    </button>
  );
}
