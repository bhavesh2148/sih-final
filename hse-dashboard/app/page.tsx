"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";
import { ArrowUpRight, ShieldCheck, HardHat, AlertTriangle, Radio, Lock, User } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#E4E2DD] text-[#1C1917] font-sans overflow-x-hidden relative selection:bg-[#FF4500] selection:text-white">
      
      {/* Styles now in globals.css */}

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 px-6 py-4 flex justify-between items-center bg-[#E4E2DD]/80 backdrop-blur-md border-b border-[#1C1917]/10">
        <div className="font-black text-xl uppercase tracking-tighter cursor-pointer" onClick={() => router.push("/")}>
          SIFense<span className="text-[#FF4500]">.</span>
        </div>
        <div className="hidden md:flex gap-8 text-xs font-bold uppercase tracking-[0.15em] items-center">
          <button onClick={() => router.push("/dashboard")} className="hover:text-[#FF4500] transition-colors cursor-pointer">Dashboard</button>
          <button onClick={() => router.push("/worker")} className="hover:text-[#FF4500] transition-colors cursor-pointer">Worker App</button>
          {user ? (
            <button
              onClick={() => router.push("/dashboard")}
              className="text-[#FF4500] font-black uppercase text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <User className="h-3.5 w-3.5" />
              <span>Officer Active</span>
            </button>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="hover:text-[#FF4500] text-[#1C1917] font-black uppercase text-xs flex items-center gap-1 cursor-pointer"
            >
              <Lock className="h-3 w-3" />
              <span>Login</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-[#1C1917] text-[#E4E2DD] px-3 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F59E0B] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F59E0B]"></span>
          </span>
          Live
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative min-h-screen flex flex-col justify-center px-6 md:px-12 pt-20 overflow-hidden">
        {/* Animated Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-[#FF4500] rounded-full filter blur-[140px] mix-blend-multiply animate-blob-1 pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-[#F59E0B] rounded-full filter blur-[140px] mix-blend-multiply animate-blob-2 pointer-events-none"></div>

        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <div className="slide-up flex items-center gap-3 mb-8">
            <AlertTriangle className="h-5 w-5 text-[#FF4500]" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#1C1917]">AI-Powered PSIF Precursor Detection</span>
          </div>
          
<h1 className="font-display text-[10vw] md:text-[7vw] uppercase text-[#FFF0EB] slide-up delay-100">
  Detect<br />
  <span className="ml-[8vw] text-[#330E00]">Risks.</span>
</h1>
<h1 className="font-display text-[10vw] md:text-[7vw] uppercase text-[#FFF0EB] slide-up delay-200 mt-2">
  Prevent<br />
  <span className="ml-[8vw] text-[#330E00]">Fatalities.</span>
</h1>

          <div className="mt-12 flex flex-col md:flex-row md:items-end justify-between gap-8 slide-up delay-300">
            <p className="max-w-md text-lg md:text-xl font-medium text-[#1C1917]/80 leading-relaxed">
              Shifting from reactive accident counting to proactive, predictive safety management for OIL India.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => router.push("/dashboard")}
                className="btn-slide bg-[#1C1917] text-[#E4E2DD] px-8 py-4 text-sm font-bold uppercase tracking-widest border-none cursor-pointer flex items-center gap-2"
              >
                <span>HSE Dashboard <ArrowUpRight className="h-4 w-4" /></span>
              </button>
              <button 
                onClick={() => router.push("/worker")}
                className="btn-slide bg-transparent text-[#1C1917] border-2 border-[#1C1917] px-8 py-4 text-sm font-bold uppercase tracking-widest cursor-pointer flex items-center gap-2 hover:border-[#FF4500]"
              >
                <span>Worker App <HardHat className="h-4 w-4" /></span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Category Divider / Campaign Block */}
      <section className="relative py-32 px-6 md:px-12 bg-[#D9D6D0]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.15)_0%,transparent_70%)] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-12 relative z-10">
          <div className="md:col-span-8">
            <h2 className="font-display text-[12vw] md:text-[8vw] uppercase text-[#1C1917]/90">
              Two Paths.<br />
              <span className="text-[#FF4500]">Zero Compromise.</span>
            </h2>
          </div>
          
          <div className="md:col-span-4 flex flex-col justify-end gap-6">
            <div className="border-t-2 border-[#1C1917]/20 pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Radio className="h-4 w-4 text-[#FF4500]" />
                <span className="text-xs font-bold uppercase tracking-widest">Emergency Protocol</span>
              </div>
              <p className="text-sm font-medium text-[#1C1917]/70 mb-4">
                Bypasses AI inference. Instant supervisor alert for active, life-threatening dangers.
              </p>
              <button onClick={() => router.push("/worker")} className="text-xs font-bold uppercase tracking-widest text-[#FF4500] flex items-center gap-1 hover:gap-2 transition-all cursor-pointer">
                Launch SOS <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            
            <div className="border-t-2 border-[#1C1917]/20 pt-6">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-4 w-4 text-[#F59E0B]" />
                <span className="text-xs font-bold uppercase tracking-widest">Predictive Analysis</span>
              </div>
              <p className="text-sm font-medium text-[#1C1917]/70 mb-4">
                Semantic twin matching and causal chain extraction for near-miss reporting.
              </p>
              <button onClick={() => router.push("/dashboard")} className="text-xs font-bold uppercase tracking-widest text-[#1C1917] flex items-center gap-1 hover:gap-2 hover:text-[#FF4500] transition-all cursor-pointer">
                View Analytics <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid (Brutalist Cards) */}
      <section className="py-32 px-6 md:px-12 bg-[#E4E2DD]">
        <div className="max-w-7xl mx-auto w-full">
          <div className="flex items-end justify-between mb-16 border-b-2 border-[#1C1917] pb-4">
            <h3 className="font-display text-4xl md:text-6xl uppercase">System Core</h3>
            <span className="text-xs font-bold uppercase tracking-widest hidden md:block">v2.6.0 // OIL India</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-[#1C1917] border-2 border-[#1C1917]">
            {/* Card 1 */}
            <div className="bg-[#E4E2DD] p-8 md:p-12 hover:bg-[#F59E0B] transition-colors duration-500 group cursor-pointer" onClick={() => router.push("/dashboard")}>
              <div className="text-xs font-bold uppercase tracking-widest mb-8 text-[#1C1917]/50 group-hover:text-[#1C1917]">01 / Detection</div>
              <h4 className="font-display text-3xl uppercase mb-4 text-[#1C1917]">Energy-Barrier<br />Scoring</h4>
              <p className="text-sm font-medium text-[#1C1917]/70 group-hover:text-[#1C1917]">
                Calculates SIF potential using the DEKRA framework. High energy + absent barrier = critical risk.
              </p>
            </div>
            {/* Card 2 */}
            <div className="bg-[#E4E2DD] p-8 md:p-12 hover:bg-[#FF4500] transition-colors duration-500 group cursor-pointer" onClick={() => router.push("/dashboard")}>
              <div className="text-xs font-bold uppercase tracking-widest mb-8 text-[#1C1917]/50 group-hover:text-white">02 / Intelligence</div>
              <h4 className="font-display text-3xl uppercase mb-4 text-[#1C1917]">Historical<br />Twins</h4>
              <p className="text-sm font-medium text-[#1C1917]/70 group-hover:text-white">
                SBERT semantic search finds past incidents that mean the same thing, not just share keywords.
              </p>
            </div>
            {/* Card 3 */}
            <div className="bg-[#E4E2DD] p-8 md:12 hover:bg-[#1C1917] transition-colors duration-500 group cursor-pointer" onClick={() => router.push("/worker")}>
              <div className="text-xs font-bold uppercase tracking-widest mb-8 text-[#1C1917]/50 group-hover:text-[#F59E0B]">03 / Resilience</div>
              <h4 className="font-display text-3xl uppercase mb-4 text-[#1C1917] group-hover:text-white">Offline-First<br />Queue</h4>
              <p className="text-sm font-medium text-[#1C1917]/70 group-hover:text-[#E4E2DD]">
                LocalStorage sync ensures zero data loss in remote, low-bandwidth oil field environments.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1C1917] text-[#E4E2DD] py-20 px-6 md:px-12 relative overflow-hidden">
        <div className="absolute bottom-0 right-0 font-display text-[25vw] text-white/[0.03] leading-none pointer-events-none select-none">
          2026
        </div>
        
        <div className="max-w-7xl mx-auto w-full relative z-10 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2">
            <div className="font-black text-4xl uppercase tracking-tighter mb-6 cursor-pointer" onClick={() => router.push("/")}>
              SIFense<span className="text-[#FF4500]">.</span>
            </div>
            <p className="text-sm font-medium text-[#E4E2DD]/60 max-w-xs">
              Built for the OIL India Safety & Environment Department. Protecting the workforce through predictive AI.
            </p>
          </div>
          
          <div>
            <h5 className="text-xs font-bold uppercase tracking-widest text-[#F59E0B] mb-4">Platform</h5>
            <ul className="space-y-2 text-sm font-medium text-[#E4E2DD]/80">
              <li className="hover:text-white cursor-pointer" onClick={() => router.push("/dashboard")}>HSE Dashboard</li>
              <li className="hover:text-white cursor-pointer" onClick={() => router.push("/worker")}>Worker App</li>
              <li className="hover:text-white cursor-pointer">API Documentation</li>
            </ul>
          </div>
          
          <div>
            <h5 className="text-xs font-bold uppercase tracking-widest text-[#F59E0B] mb-4">System</h5>
            <ul className="space-y-2 text-sm font-medium text-[#E4E2DD]/80">
              <li className="hover:text-white cursor-pointer">SBERT Model v1.2</li>
              <li className="hover:text-white cursor-pointer">Fallback Logic</li>
              <li className="hover:text-white cursor-pointer">Status: Online</li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto w-full mt-20 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center text-xs font-medium text-[#E4E2DD]/40">
          <p>© 2026 SIFense. All rights reserved.</p>
          <p className="mt-2 md:mt-0">Designed with Safety & Precision.</p>
        </div>
      </footer>
    </div>
  );
}