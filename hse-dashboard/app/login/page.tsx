"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  HardHat,
  AlertTriangle,
  Sparkles,
  Info,
  CheckCircle2,
  MapPin,
  Flame,
  ArrowRight,
  UserCheck,
  Building2,
} from "lucide-react";

const SITES = [
  "Tank Farm A",
  "Drilling Rig 3",
  "Processing Unit 4",
  "Warehouse Area",
  "Pipeline Section 7",
  "Substation C",
  "Chemical Storage Zone",
  "Compressor Station 2",
];

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user,
    role,
    isConfigured,
    signInWithPassword,
    signUpWithPassword,
    signInWithMagicLink,
    signInAsDemoOfficer,
    signInAsWorker,
  } = useAuth();

  // Active portal tab: 'worker' or 'officer'
  const [activePortal, setActivePortal] = useState<"worker" | "officer">("worker");

  // Worker Form State
  const [badgeId, setBadgeId] = useState("");
  const [workerName, setWorkerName] = useState("");
  const [workerSite, setWorkerSite] = useState("Tank Farm A");

  // Officer Form State
  const [officerMode, setOfficerMode] = useState<"login" | "signup" | "magic">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Check URL query param e.g. /login?portal=officer
  useEffect(() => {
    const portalParam = searchParams.get("portal");
    if (portalParam === "officer") {
      setActivePortal("officer");
    } else if (portalParam === "worker") {
      setActivePortal("worker");
    }
  }, [searchParams]);

  // Handle Worker Form Submit
  const handleWorkerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signInAsWorker({
      badgeId: badgeId.trim() || undefined,
      workerName: workerName.trim() || undefined,
      site: workerSite,
      isAnonymous: !badgeId.trim(),
    });
    router.push("/worker");
  };

  // Handle Quick Anonymous Worker Entry
  const handleAnonymousEntry = () => {
    signInAsWorker({
      isAnonymous: true,
      site: workerSite,
    });
    router.push("/worker");
  };

  // Handle Officer Form Submit
  const handleOfficerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (officerMode === "login") {
        const { error } = await signInWithPassword(email, password);
        if (error) throw error;
        router.push("/dashboard");
      } else if (officerMode === "signup") {
        const { error } = await signUpWithPassword(email, password, fullName);
        if (error) throw error;
        setSuccessMsg("Supervisor account registered! Check your email (or sign in).");
        if (!isConfigured) {
          router.push("/dashboard");
        }
      } else if (officerMode === "magic") {
        const { error } = await signInWithMagicLink(email);
        if (error) throw error;
        setSuccessMsg("Magic OTP link sent to corporate email.");
        if (!isConfigured) {
          router.push("/dashboard");
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Officer login failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoOfficerLogin = (roleType: "hse_officer" | "site_admin" = "hse_officer") => {
    signInAsDemoOfficer(roleType);
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/worker")}
            className="text-xs font-bold uppercase tracking-widest text-[#1C1917] hover:text-[#FF4500] transition-colors cursor-pointer hidden sm:block"
          >
            Direct SOS
          </button>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase bg-[#1C1917] text-[#E4E2DD] px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F59E0B] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F59E0B]" />
            </span>
            Access Gateway
          </div>
        </div>
      </nav>

      {/* Main Gateway Container */}
      <div className="max-w-xl w-full mx-auto px-4 py-8 flex-1 flex flex-col justify-center">
        {/* Gateway Card */}
        <div className="border-2 border-[#1C1917] bg-[#E4E2DD] shadow-2xl p-6 sm:p-8">
          
          {/* Top Title */}
          <div className="text-center mb-6 border-b-2 border-[#1C1917] pb-4">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#FF4500]">
              OIL India Industrial Safety System
            </span>
            <h1 className="font-display text-3xl sm:text-4xl uppercase leading-none mt-1">
              Select Your Portal
            </h1>
            <p className="text-xs font-medium text-[#1C1917]/60 mt-2">
              Separate access pathways for on-site field workforce and safety management.
            </p>
          </div>

          {/* TWO MAIN PORTAL SELECTOR TABS */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#1C1917] mb-6">
            <button
              type="button"
              onClick={() => {
                setActivePortal("worker");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-3 px-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                activePortal === "worker"
                  ? "bg-[#F59E0B] text-[#1C1917] font-black shadow-inner"
                  : "bg-transparent text-[#E4E2DD]/70 hover:text-white font-bold"
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <HardHat className="h-4 w-4" />
                <span>Field Worker</span>
              </div>
              <span className="text-[9px] uppercase tracking-widest opacity-80">
                Reporting & SOS Portal
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActivePortal("officer");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-3 px-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                activePortal === "officer"
                  ? "bg-[#FF4500] text-[#1C1917] font-black shadow-inner"
                  : "bg-transparent text-[#E4E2DD]/70 hover:text-white font-bold"
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <ShieldCheck className="h-4 w-4" />
                <span>HSE Officer</span>
              </div>
              <span className="text-[9px] uppercase tracking-widest opacity-80">
                Executive Command Suite
              </span>
            </button>
          </div>

          {/* =======================================================
              PORTAL 1: FIELD WORKER ENTRY (LOW FRICTION)
              ======================================================= */}
          {activePortal === "worker" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-3 bg-[#F59E0B]/10 border-2 border-[#F59E0B] text-xs">
                <p className="font-black uppercase text-[#1C1917] flex items-center gap-1.5">
                  <HardHat className="h-4 w-4 text-[#F59E0B]" />
                  Frictionless Safety Reporting
                </p>
                <p className="text-[#1C1917]/70 text-[11px] mt-0.5">
                  No passwords required. Log your badge ID for site tracking or submit completely anonymously.
                </p>
              </div>

              <form onSubmit={handleWorkerSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#1C1917]/60 mb-1">
                    Work Location / Rig Site
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1C1917]/40" />
                    <select
                      value={workerSite}
                      onChange={(e) => setWorkerSite(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-[#1C1917]/5 border-2 border-[#1C1917]/25 text-sm font-bold text-[#1C1917] appearance-none cursor-pointer focus:border-[#FF4500] focus:outline-none"
                    >
                      {SITES.map((site) => (
                        <option key={site} value={site}>
                          {site}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#1C1917]/60 mb-1">
                      Badge / Employee ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={badgeId}
                      onChange={(e) => setBadgeId(e.target.value)}
                      placeholder="e.g. RIG3-104"
                      className="w-full px-3 py-2.5 bg-[#1C1917]/5 border-2 border-[#1C1917]/25 text-sm font-bold text-[#1C1917] focus:border-[#FF4500] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#1C1917]/60 mb-1">
                      Worker Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={workerName}
                      onChange={(e) => setWorkerName(e.target.value)}
                      placeholder="e.g. Rahul Sen"
                      className="w-full px-3 py-2.5 bg-[#1C1917]/5 border-2 border-[#1C1917]/25 text-sm font-bold text-[#1C1917] focus:border-[#FF4500] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Enter with Badge button */}
                <button
                  type="submit"
                  className="w-full btn-slide bg-[#1C1917] text-[#E4E2DD] py-3.5 text-xs font-black uppercase tracking-widest border-2 border-[#1C1917] cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>
                    {badgeId.trim()
                      ? `Continue as Worker #${badgeId.toUpperCase()} →`
                      : "Enter Worker Safety App →"}
                  </span>
                </button>
              </form>

              {/* 1-Tap Anonymous Whistleblower */}
              <div className="pt-3 border-t-2 border-[#1C1917]/10 flex flex-col items-center">
                <button
                  type="button"
                  onClick={handleAnonymousEntry}
                  className="w-full py-2.5 px-4 bg-[#E4E2DD] hover:bg-[#F59E0B] text-[#1C1917] text-xs font-black uppercase tracking-wider border-2 border-[#1C1917] cursor-pointer transition-colors flex items-center justify-center gap-2"
                >
                  <UserCheck className="h-4 w-4 text-[#FF4500]" />
                  <span>1-Tap Anonymous Whistleblower Entry</span>
                </button>
                <p className="text-[9px] font-bold text-[#1C1917]/40 uppercase tracking-widest mt-2 text-center">
                  Protected under OIL India Zero-Retaliation Policy
                </p>
              </div>
            </div>
          )}

          {/* =======================================================
              PORTAL 2: HSE SAFETY OFFICER (SECURE CREDENTIALS)
              ======================================================= */}
          {activePortal === "officer" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Configuration Notice */}
              {!isConfigured && (
                <div className="p-3 bg-[#1C1917] text-[#E4E2DD] border border-[#1C1917] flex items-start gap-2.5 text-xs">
                  <Info className="h-4 w-4 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-[#F59E0B] uppercase tracking-wider text-[11px]">
                      Demo HSE Clearance Active
                    </p>
                    <p className="text-[#E4E2DD]/70 text-[11px] mt-0.5">
                      Use corporate credentials or click the 1-Click Fast Bypass below.
                    </p>
                  </div>
                </div>
              )}

              {/* Officer Sub-modes */}
              <div className="grid grid-cols-3 gap-[2px] bg-[#1C1917] p-[2px]">
                <button
                  type="button"
                  onClick={() => {
                    setOfficerMode("login");
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                    officerMode === "login"
                      ? "bg-[#E4E2DD] text-[#1C1917]"
                      : "bg-[#1C1917] text-[#E4E2DD]/70 hover:text-white"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOfficerMode("signup");
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                    officerMode === "signup"
                      ? "bg-[#E4E2DD] text-[#1C1917]"
                      : "bg-[#1C1917] text-[#E4E2DD]/70 hover:text-white"
                  }`}
                >
                  Sign Up
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOfficerMode("magic");
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                    officerMode === "magic"
                      ? "bg-[#E4E2DD] text-[#1C1917]"
                      : "bg-[#1C1917] text-[#E4E2DD]/70 hover:text-white"
                  }`}
                >
                  Magic Link
                </button>
              </div>

              {/* Officer Form */}
              <form onSubmit={handleOfficerSubmit} className="space-y-4">
                {officerMode === "signup" && (
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#1C1917]/60 mb-1">
                      Full Name & Title
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Kalyan Barua (Senior Safety Lead)"
                      className="w-full px-3 py-2.5 bg-[#1C1917]/5 border-2 border-[#1C1917]/25 text-sm font-medium text-[#1C1917] focus:border-[#FF4500] focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#1C1917]/60 mb-1">
                    Official Corporate Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1C1917]/40" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="supervisor@oilindia.in"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#1C1917]/5 border-2 border-[#1C1917]/25 text-sm font-medium text-[#1C1917] focus:border-[#FF4500] focus:outline-none"
                    />
                  </div>
                </div>

                {officerMode !== "magic" && (
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#1C1917]/60 mb-1">
                      Supervisor Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1C1917]/40" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-3 py-2.5 bg-[#1C1917]/5 border-2 border-[#1C1917]/25 text-sm font-medium text-[#1C1917] focus:border-[#FF4500] focus:outline-none"
                      />
                    </div>
                  </div>
                )}

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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-slide bg-[#1C1917] text-[#E4E2DD] py-3.5 text-xs font-black uppercase tracking-widest border-2 border-[#1C1917] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>
                    {loading
                      ? "Verifying Clearance…"
                      : officerMode === "login"
                      ? "Enter HSE Executive Dashboard →"
                      : officerMode === "signup"
                      ? "Register Safety Officer Account →"
                      : "Send Magic Link OTP →"}
                  </span>
                </button>
              </form>

              {/* 1-Click Fast Demo Officer Access */}
              <div className="pt-4 border-t-2 border-[#1C1917]/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#1C1917]/40 text-center mb-2.5">
                  1-Click Fast Officer Access
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDemoOfficerLogin("hse_officer")}
                    className="py-2.5 px-3 bg-[#FF4500] text-[#1C1917] text-[10px] font-black uppercase tracking-wider border-2 border-[#1C1917] cursor-pointer transition-colors flex items-center justify-center gap-1.5 hover:bg-[#1C1917] hover:text-[#E4E2DD]"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    HSE Lead
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoOfficerLogin("site_admin")}
                    className="py-2.5 px-3 bg-[#F59E0B] text-[#1C1917] text-[10px] font-black uppercase tracking-wider border-2 border-[#1C1917] cursor-pointer transition-colors flex items-center justify-center gap-1.5 hover:bg-[#1C1917] hover:text-[#E4E2DD]"
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    Site Admin
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-[10px] font-bold uppercase tracking-widest text-[#1C1917]/40 border-t border-[#1C1917]/10">
        SIFense Industrial Safety Security // OIL India Limited
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#E4E2DD] flex items-center justify-center font-black uppercase tracking-widest text-sm text-[#1C1917]">Loading SIFense Portal…</div>}>
      <LoginContent />
    </Suspense>
  );
}
