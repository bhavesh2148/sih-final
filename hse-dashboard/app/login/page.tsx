"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  ArrowRight,
  HardHat,
  AlertTriangle,
  Sparkles,
  Info,
  CheckCircle2,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const {
    user,
    isConfigured,
    signInWithPassword,
    signUpWithPassword,
    signInWithMagicLink,
    signInAsDemo,
  } = useAuth();

  const [mode, setMode] = useState<"login" | "signup" | "magic">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // If already logged in, show redirect prompt or auto-redirect
  React.useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await signInWithPassword(email, password);
        if (error) throw error;
        router.push("/dashboard");
      } else if (mode === "signup") {
        const { error } = await signUpWithPassword(email, password, fullName);
        if (error) throw error;
        setSuccessMsg("Account created! Check your email for verification link (or sign in).");
        if (!isConfigured) {
          router.push("/dashboard");
        }
      } else if (mode === "magic") {
        const { error } = await signInWithMagicLink(email);
        if (error) throw error;
        setSuccessMsg("Magic sign-in link sent to your email!");
        if (!isConfigured) {
          router.push("/dashboard");
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (role: "hse_officer" | "site_admin" = "hse_officer") => {
    signInAsDemo(role);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#E4E2DD] text-[#1C1917] flex flex-col justify-between font-sans selection:bg-[#FF4500] selection:text-white">
      {/* Navigation */}
      <nav className="w-full px-6 py-4 flex justify-between items-center bg-[#E4E2DD]/80 backdrop-blur-md border-b-2 border-[#1C1917]/10">
        <div
          className="font-black text-xl uppercase tracking-tighter cursor-pointer flex items-center gap-1"
          onClick={() => router.push("/")}
        >
          SIFense<span className="text-[#FF4500]">.</span>
        </div>
        <button
          onClick={() => router.push("/worker")}
          className="text-xs font-bold uppercase tracking-widest flex items-center gap-1 hover:text-[#FF4500] transition-colors cursor-pointer"
        >
          Worker Portal <HardHat className="h-3.5 w-3.5" />
        </button>
      </nav>

      {/* Main Container */}
      <div className="max-w-md w-full mx-auto px-4 py-8 flex-1 flex flex-col justify-center">
        {/* Header Badge */}
        <div className="border-2 border-[#1C1917] bg-[#E4E2DD] shadow-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between border-b-2 border-[#1C1917] pb-4 mb-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF4500]">
                Access Control
              </span>
              <h1 className="font-display text-2xl sm:text-3xl uppercase leading-tight">
                HSE Officer Portal
              </h1>
            </div>
            <div className="p-2.5 bg-[#1C1917] text-[#E4E2DD]">
              <ShieldCheck className="h-6 w-6 text-[#F59E0B]" />
            </div>
          </div>

          {/* Configuration Notice */}
          {!isConfigured && (
            <div className="mb-6 p-3 bg-[#1C1917] text-[#E4E2DD] border border-[#1C1917] flex items-start gap-2.5 text-xs">
              <Info className="h-4 w-4 text-[#F59E0B] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#F59E0B] uppercase tracking-wider text-[11px]">
                  Demo Authentication Active
                </p>
                <p className="text-[#E4E2DD]/70 text-[11px] mt-0.5">
                  Supabase keys not yet detected. You can sign in with any credentials or click the 1-click demo button below.
                </p>
              </div>
            </div>
          )}

          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-3 gap-[2px] bg-[#1C1917] p-[2px] mb-6">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                mode === "login"
                  ? "bg-[#E4E2DD] text-[#1C1917]"
                  : "bg-[#1C1917] text-[#E4E2DD]/70 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                mode === "signup"
                  ? "bg-[#E4E2DD] text-[#1C1917]"
                  : "bg-[#1C1917] text-[#E4E2DD]/70 hover:text-white"
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("magic");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                mode === "magic"
                  ? "bg-[#E4E2DD] text-[#1C1917]"
                  : "bg-[#1C1917] text-[#E4E2DD]/70 hover:text-white"
              }`}
            >
              Magic OTP
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#1C1917]/60 mb-1">
                  Full Name & Designation
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1C1917]/40" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Kalyan Barua (Safety Lead)"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#1C1917]/5 border-2 border-[#1C1917]/20 text-sm font-medium text-[#1C1917] focus:border-[#FF4500] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#1C1917]/60 mb-1">
                Official Email (OIL India / Corporate)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1C1917]/40" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@oilindia.in"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#1C1917]/5 border-2 border-[#1C1917]/20 text-sm font-medium text-[#1C1917] focus:border-[#FF4500] focus:outline-none transition-colors"
                />
              </div>
            </div>

            {mode !== "magic" && (
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#1C1917]/60 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1C1917]/40" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#1C1917]/5 border-2 border-[#1C1917]/20 text-sm font-medium text-[#1C1917] focus:border-[#FF4500] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Error & Success Messages */}
            {errorMsg && (
              <div className="p-3 bg-[#FF4500]/10 border-2 border-[#FF4500] text-[#1C1917] text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#FF4500] flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-[#F59E0B]/20 border-2 border-[#F59E0B] text-[#1C1917] text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#1C1917] flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-slide bg-[#1C1917] text-[#E4E2DD] py-3 text-xs font-black uppercase tracking-widest border-2 border-[#1C1917] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>
                {loading
                  ? "Authenticating…"
                  : mode === "login"
                  ? "Enter HSE Command Center →"
                  : mode === "signup"
                  ? "Create Supervisor Account →"
                  : "Send Magic Link OTP →"}
              </span>
            </button>
          </form>

          {/* Quick Demo Access Bypass */}
          <div className="mt-6 pt-6 border-t-2 border-[#1C1917]/10">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#1C1917]/40 text-center mb-3">
              Fast Demo Bypass
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin("hse_officer")}
                className="py-2.5 px-3 bg-[#F59E0B] hover:bg-[#FF4500] text-[#1C1917] text-[10px] font-black uppercase tracking-wider border-2 border-[#1C1917] cursor-pointer transition-colors flex items-center justify-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                HSE Lead
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin("site_admin")}
                className="py-2.5 px-3 bg-[#E4E2DD] hover:bg-[#1C1917] hover:text-[#E4E2DD] text-[#1C1917] text-[10px] font-black uppercase tracking-wider border-2 border-[#1C1917] cursor-pointer transition-colors flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Site Admin
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-[10px] font-bold uppercase tracking-widest text-[#1C1917]/40 border-t border-[#1C1917]/10">
        SIFense Industrial Safety Security // OIL India Limited
      </footer>
    </div>
  );
}
