"use client";

import { useState, useEffect } from "react";
import { Shield, Mail, Lock, AlertCircle, Loader2, EyeOff, Eye, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { setAuthToken, getAuthToken, removeAuthToken } from "@/lib/storage";
import { apiFetch } from "@/lib/client/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function checkSession() {
      if (!getAuthToken()) return;
      try {
        await apiFetch("/api/admin/me");
        router.replace("/admin");
      } catch {
        removeAuthToken();
      }
    }
    checkSession();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch<{ token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setAuthToken(data.token, rememberMe);
      window.location.href = "/admin";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-chat-bg-primary text-chat-text-primary font-sans flex items-center justify-center px-4 relative overflow-hidden selection:bg-chat-accent/30">
      <div className="ambient-glow">
        <div className="ambient-glow-inner" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[440px]"
      >
        <div className="bg-chat-glass backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-chat-border p-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-chat-accent to-chat-accent-hover rounded-2xl shadow-xl shadow-chat-accent/20 mb-6">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black text-chat-text-primary tracking-tight">
              VokiToki Admin
            </h1>
            <p className="text-chat-text-secondary font-medium mt-2">
              Sign in to the control center
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm font-medium">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-chat-text-tertiary ml-1">
                Email address
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-chat-text-tertiary group-focus-within:text-chat-accent transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-chat-input border border-chat-border rounded-2xl text-chat-text-primary placeholder-chat-text-tertiary focus:outline-none focus:ring-2 focus:ring-chat-accent/50 transition-all font-medium"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-chat-text-tertiary ml-1">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-chat-text-tertiary group-focus-within:text-chat-accent transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-chat-input border border-chat-border rounded-2xl text-chat-text-primary placeholder-chat-text-tertiary focus:outline-none focus:ring-2 focus:ring-chat-accent/50 transition-all font-medium"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-chat-text-tertiary hover:text-chat-text-secondary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer group px-1">
              <div className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="w-5 h-5 border-2 border-chat-border rounded-lg group-hover:border-chat-accent/50 transition-colors peer-checked:border-chat-accent peer-checked:bg-chat-accent" />
                <CheckCircle
                  size={14}
                  className="absolute text-white scale-0 peer-checked:scale-100 transition-transform"
                />
              </div>
              <span className="text-sm font-medium text-chat-text-secondary group-hover:text-chat-text-primary transition-colors">
                Keep me signed in
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-chat-accent text-white font-bold rounded-2xl hover:bg-chat-accent-hover transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2 shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign in"}
            </button>
          </form>

          <p className="mt-8 text-center text-chat-text-tertiary text-xs">
            Authorized personnel only. All actions are logged.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
