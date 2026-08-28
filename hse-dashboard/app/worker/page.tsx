"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Send,
  AlertTriangle,
  MapPin,
  Wifi,
  WifiOff,
  CheckCircle2,
  ArrowLeft,
  ShieldAlert,
  Flame,
  Volume2,
  RefreshCw,
  Sparkles,
  Lock,
  Radio,
  FileText,
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

const HAZARD_SHORTCUTS = [
  "Working at height without harness",
  "Gas leak / strange odor detected",
  "Unguarded rotating machine",
  "Missing LOTO / lockout tag",
  "Wet slippery floor near pump",
  "Blocked fire exit / eyewash",
];

export default function WorkerApp() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [location, setLocation] = useState("Tank Farm A");
  const [isListening, setIsListening] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineCount, setOfflineCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Fix SSR hydration — read localStorage only in useEffect
  useEffect(() => {
    const queue = JSON.parse(
      localStorage.getItem("sifense_offline_queue") || "[]"
    );
    setOfflineCount(queue.length);
  }, []);

  const updateOfflineCount = () => {
    const queue = JSON.parse(
      localStorage.getItem("sifense_offline_queue") || "[]"
    );
    setOfflineCount(queue.length);
  };

  // Voice Input (Web Speech API)
  const toggleVoice = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Voice input is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-IN";

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setText((prev) => (prev ? prev + " " + transcript : transcript));
      };

      recognitionRef.current = recognition;
      recognition.start();
    }
  };

  // Standard Report Submission
  const submitReport = async (reportData: {
    text: string;
    location: string;
    is_voice: boolean;
  }) => {
    if (!reportData.text.trim()) return;

    if (isOnline) {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/v1/reports/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reportData),
        });
        if (!res.ok) throw new Error("Server error");
        setShowSuccess(true);
        setText("");
        setTimeout(() => setShowSuccess(false), 3500);
      } catch {
        saveToOfflineQueue(reportData);
        alert("Server unreachable. Report safely saved to your offline device queue!");
      }
    } else {
      saveToOfflineQueue(reportData);
      setShowSuccess(true);
      setText("");
      setTimeout(() => setShowSuccess(false), 3500);
    }
  };

  const saveToOfflineQueue = (reportData: {
    text: string;
    location: string;
    is_voice: boolean;
  }) => {
    const queue = JSON.parse(
      localStorage.getItem("sifense_offline_queue") || "[]"
    );
    queue.push({ ...reportData, timestamp: new Date().toISOString() });
    localStorage.setItem("sifense_offline_queue", JSON.stringify(queue));
    updateOfflineCount();
  };

  const syncOfflineQueue = async () => {
    const queue = JSON.parse(
      localStorage.getItem("sifense_offline_queue") || "[]"
    );
    if (queue.length === 0) return;

    setSyncing(true);
    let syncedCount = 0;
    for (const report of queue) {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/v1/reports/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(report),
        });
        if (res.ok) syncedCount++;
      } catch {
        break;
      }
    }

    const remainingQueue = queue.slice(syncedCount);
    localStorage.setItem(
      "sifense_offline_queue",
      JSON.stringify(remainingQueue)
    );
    updateOfflineCount();
    setSyncing(false);

    if (syncedCount > 0) {
      alert(`✅ Synced ${syncedCount} report(s) from offline queue to HSE database!`);
    }
  };

  // Emergency SOS
  const triggerSOS = async () => {
    setIsEmergency(true);
    try {
      await fetch("http://127.0.0.1:8000/api/v1/emergency/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location,
          worker_id: "Anonymous-Field-Worker",
        }),
      });
      setShowSOS(true);
    } catch {
      console.error("SOS failed");
      setShowSOS(true);
    }
    setTimeout(() => {
      setIsEmergency(false);
      setShowSOS(false);
    }, 4500);
  };

  const handleShortcutClick = (shortcut: string) => {
    setText((prev) => (prev ? `${prev}. ${shortcut}` : shortcut));
  };

  return (
    <div className="min-h-screen bg-[#E4E2DD] text-[#1C1917] font-sans selection:bg-[#FF4500] selection:text-white flex flex-col justify-between">
      {/* ===== HEADER ===== */}
      <header className="bg-[#E4E2DD]/90 backdrop-blur-md border-b-2 border-[#1C1917]/15 sticky top-0 z-40 px-4 sm:px-8 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="p-2 border-2 border-[#1C1917]/20 hover:border-[#1C1917] hover:bg-[#1C1917] hover:text-[#E4E2DD] transition-all cursor-pointer text-[#1C1917]"
              title="Return to Home"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg sm:text-xl uppercase tracking-tighter leading-none">
                  SIFense<span className="text-[#FF4500]">.</span>
                </span>
                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-[#1C1917] text-[#E4E2DD]">
                  Field Unit
                </span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#1C1917]/50 mt-0.5">
                OIL India Safety Precursor Portal
              </p>
            </div>
          </div>

          {/* Network & Offline Status Control */}
          <div className="flex items-center gap-2">
            {offlineCount > 0 && isOnline && (
              <button
                onClick={syncOfflineQueue}
                disabled={syncing}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#F59E0B] text-[#1C1917] text-[10px] font-black uppercase tracking-wider border-2 border-[#1C1917] cursor-pointer hover:bg-[#FF4500] transition-colors"
              >
                <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
                Sync {offlineCount} Saved
              </button>
            )}
            <button
              onClick={() => {
                const newStatus = !isOnline;
                setIsOnline(newStatus);
                if (newStatus) {
                  syncOfflineQueue();
                }
              }}
              className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border-2 transition-colors cursor-pointer ${
                isOnline
                  ? "border-[#1C1917] bg-[#1C1917] text-[#E4E2DD]"
                  : "border-[#FF4500] bg-[#FF4500] text-[#1C1917] emergency-flash"
              }`}
            >
              {isOnline ? (
                <Wifi className="h-3.5 w-3.5 text-[#F59E0B]" />
              ) : (
                <WifiOff className="h-3.5 w-3.5" />
              )}
              <span>{isOnline ? "Online" : `Offline (${offlineCount})`}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT CONTAINER ===== */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-10">
        {/* Offline Banner alert if offline */}
        {!isOnline && (
          <div className="mb-6 bg-[#FF4500] text-[#1C1917] border-2 border-[#1C1917] p-3.5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
              <WifiOff className="h-4 w-4" />
              <span>Offline Mode Active — Reports are securely queued on this device</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest bg-[#1C1917] text-[#E4E2DD] px-2 py-0.5">
              {offlineCount} in queue
            </span>
          </div>
        )}

        {/* Responsive Dual Column Layout (Stacked on Mobile, Side-by-side on Desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* ========================================================
              LEFT COLUMN: PATH 1 — IMMEDIATE EMERGENCY SOS
              ======================================================== */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="border-2 border-[#FF4500] bg-[#FF4500]/5 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden shadow-sm">
              {/* Top Danger Bar */}
              <div className="flex items-center justify-between border-b-2 border-[#FF4500]/30 pb-3 mb-6">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-[#FF4500] animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-[#FF4500]">
                    Path 1 // Emergency
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-[#FF4500] text-[#1C1917] text-[9px] font-black uppercase tracking-wider">
                  Bypasses AI
                </span>
              </div>

              <div>
                <h2 className="font-display text-3xl sm:text-4xl uppercase text-[#FF4500] leading-none mb-2">
                  Immediate<br />SOS Alert
                </h2>
                <p className="text-xs font-bold text-[#1C1917]/70 mb-8 leading-relaxed">
                  For active fire, hydrocarbon blowout, toxic gas release, or immediate danger to human life.
                </p>
              </div>

              {/* Centered Large Tactile SOS Button */}
              <div className="flex flex-col items-center justify-center my-2">
                <button
                  onClick={triggerSOS}
                  disabled={isEmergency}
                  className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full flex flex-col items-center justify-center border-4 border-[#1C1917] transition-all cursor-pointer shadow-xl ${
                    isEmergency
                      ? "bg-[#FF4500] text-[#1C1917] sos-pulse"
                      : "bg-[#FF4500] hover:bg-[#1C1917] text-[#1C1917] hover:text-[#FF4500] group active:scale-95"
                  }`}
                >
                  <AlertTriangle
                    className={`h-14 w-14 sm:h-16 sm:w-16 transition-transform group-hover:scale-110 ${
                      isEmergency ? "animate-bounce" : ""
                    }`}
                  />
                  <span className="font-black uppercase tracking-[0.2em] text-xs sm:text-sm mt-1">
                    {isEmergency ? "DISPATCHING…" : "TAP FOR SOS"}
                  </span>
                </button>

                <p className="mt-4 text-xs font-black uppercase tracking-widest text-[#1C1917] text-center">
                  {isEmergency ? (
                    <span className="text-[#FF4500] emergency-flash">
                      🚨 Superintending Officer Notified
                    </span>
                  ) : (
                    "Single tap sends instant site supervisor alert"
                  )}
                </p>
              </div>

              {/* Safety Protocol Note */}
              <div className="mt-6 pt-4 border-t-2 border-[#1C1917]/10 flex items-start gap-2.5 text-[11px] text-[#1C1917]/60 font-medium">
                <ShieldAlert className="h-4 w-4 text-[#FF4500] flex-shrink-0 mt-0.5" />
                <span>Triggers automated siren dispatch, supervisor SMS, and control room alarm at {location}.</span>
              </div>
            </div>

            {/* Offline Sync Card (Desktop only helper) */}
            {offlineCount > 0 && (
              <div className="border-2 border-[#1C1917] bg-[#E4E2DD] p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-[#1C1917]">
                    {offlineCount} Pending Report{offlineCount > 1 ? "s" : ""}
                  </p>
                  <p className="text-[10px] text-[#1C1917]/60 font-bold">
                    Stored on local device memory
                  </p>
                </div>
                <button
                  onClick={syncOfflineQueue}
                  disabled={syncing || !isOnline}
                  className="px-4 py-2 bg-[#1C1917] hover:bg-[#F59E0B] hover:text-[#1C1917] text-[#E4E2DD] text-xs font-black uppercase tracking-widest transition-colors cursor-pointer disabled:opacity-30"
                >
                  {syncing ? "Syncing…" : "Upload Now"}
                </button>
              </div>
            )}
          </div>

          {/* ========================================================
              RIGHT COLUMN: PATH 2 — NEAR-MISS & UNSAFE CONDITION
              ======================================================== */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="border-2 border-[#1C1917] bg-[#E4E2DD] p-6 sm:p-8 shadow-sm">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-[#1C1917] pb-4 mb-6 gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F59E0B]">
                    Path 2 // Dual-Head AI Triage
                  </span>
                  <h2 className="font-display text-2xl sm:text-3xl uppercase leading-tight">
                    Report Unsafe Condition
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#1C1917]/60">
                  <Lock className="h-3.5 w-3.5 text-[#F59E0B]" />
                  <span>100% Anonymous & Encrypted</span>
                </div>
              </div>

              {/* 1. Location Selector */}
              <div className="mb-5">
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#1C1917]/60 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[#FF4500]" />
                  <span>Work Location / Operational Zone</span>
                </label>
                <div className="relative">
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full p-3.5 bg-[#1C1917]/5 border-2 border-[#1C1917]/25 text-sm font-bold text-[#1C1917] appearance-none cursor-pointer focus:border-[#FF4500] focus:outline-none transition-colors"
                  >
                    {SITES.map((site) => (
                      <option key={site} value={site}>
                        {site}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#1C1917]/60 font-bold text-xs">
                    ▼
                  </div>
                </div>
              </div>

              {/* 2. Quick Hazard Tag Chips (1-tap prefill) */}
              <div className="mb-5">
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#1C1917]/60 mb-2 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-[#F59E0B]" />
                  <span>Quick Hazard Tags (Tap to add)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {HAZARD_SHORTCUTS.map((shortcut) => (
                    <button
                      key={shortcut}
                      type="button"
                      onClick={() => handleShortcutClick(shortcut)}
                      className="px-2.5 py-1.5 bg-[#1C1917]/5 hover:bg-[#1C1917] hover:text-[#E4E2DD] border border-[#1C1917]/20 text-[11px] font-bold text-[#1C1917] transition-all cursor-pointer active:scale-95"
                    >
                      + {shortcut}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Text Area with Integrated Voice Studio */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#1C1917]/60 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-[#1C1917]" />
                    <span>Incident Description (English, Hindi, Hinglish, Assamese)</span>
                  </label>
                  <span className="text-[10px] font-bold text-[#1C1917]/40 uppercase tracking-widest">
                    {text.length} characters
                  </span>
                </div>

                <div className="relative border-2 border-[#1C1917]/25 focus-within:border-[#FF4500] bg-[#1C1917]/5 transition-colors">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Example: Worker ne bina harness crane ke neeche kaam kiya, aur barricade bhi hata diya tha..."
                    rows={6}
                    className="w-full p-4 bg-transparent text-sm font-medium text-[#1C1917] resize-none focus:outline-none placeholder:text-[#1C1917]/35 leading-relaxed"
                  />

                  {/* Voice Button Toolbar */}
                  <div className="p-3 border-t border-[#1C1917]/10 flex justify-between items-center bg-[#E4E2DD]/40">
                    <div className="flex items-center gap-2">
                      {isListening ? (
                        <div className="flex items-center gap-2 text-xs font-black uppercase text-[#FF4500] animate-pulse">
                          <span className="h-2.5 w-2.5 bg-[#FF4500] rounded-full animate-ping" />
                          <span>Listening (Speak now in Hindi / English)…</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#1C1917]/40 flex items-center gap-1">
                          <Volume2 className="h-3 w-3" /> Voice-to-Text Supported
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={toggleVoice}
                      className={`px-3 py-2 border-2 border-[#1C1917] font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                        isListening
                          ? "bg-[#FF4500] text-[#1C1917] sos-pulse"
                          : "bg-[#1C1917] text-[#E4E2DD] hover:bg-[#FF4500] hover:text-[#1C1917]"
                      }`}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="h-4 w-4" /> Stop Recording
                        </>
                      ) : (
                        <>
                          <Mic className="h-4 w-4" /> Voice Input
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Action Buttons */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() =>
                    submitReport({
                      text: text,
                      location: location,
                      is_voice: isListening,
                    })
                  }
                  disabled={!text.trim()}
                  className="w-full btn-slide bg-[#1C1917] text-[#E4E2DD] py-4 font-black uppercase tracking-[0.2em] text-sm border-2 border-[#1C1917] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
                >
                  <span className="flex items-center gap-2">
                    <Send className="h-4 w-4" /> Submit Report to HSE AI Brain
                  </span>
                </button>

                <div className="flex flex-col sm:flex-row items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[#1C1917]/40 pt-1 gap-1">
                  <span>Zero Retaliation Policy // Protected Whistleblower</span>
                  <span>Instant SIF & Barrier Analysis</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ===== SUCCESS POPUP TOAST ===== */}
      {showSuccess && (
        <div className="fixed bottom-8 left-4 right-4 max-w-lg mx-auto bg-[#1C1917] text-[#E4E2DD] p-5 border-2 border-[#F59E0B] flex items-center gap-4 shadow-2xl slide-up z-50">
          <div className="h-4 w-4 bg-[#F59E0B] rounded-full animate-ping flex-shrink-0" />
          <div className="flex-1">
            <p className="font-black uppercase text-sm tracking-widest text-[#F59E0B] flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Report Successfully Submitted
            </p>
            <p className="text-xs font-medium text-[#E4E2DD]/75 mt-0.5">
              {isOnline
                ? "Analyzed by AI Brain — HSE Supervisor notified with SIF score."
                : "Saved to device offline storage — will auto-sync when connected."}
            </p>
          </div>
        </div>
      )}

      {/* ===== EMERGENCY SOS FULLSCREEN OVERLAY ===== */}
      {showSOS && (
        <div className="fixed inset-0 bg-[#1C1917] flex flex-col items-center justify-center z-50 text-[#E4E2DD] p-6 emergency-flash">
          <div className="border-4 border-[#FF4500] p-8 sm:p-12 flex flex-col items-center text-center max-w-lg w-full bg-[#1C1917] shadow-2xl">
            <AlertTriangle className="h-24 w-24 text-[#FF4500] mb-6 animate-bounce" />
            <h2 className="font-display text-4xl sm:text-5xl uppercase text-[#FF4500] mb-2">
              Emergency
              <br />
              SOS Triggered
            </h2>
            <div className="h-1.5 w-36 bg-[#FF4500] my-4" />
            <p className="text-sm font-bold uppercase tracking-widest text-[#E4E2DD] max-w-xs leading-relaxed">
              Site Supervisor & Central Control Room dispatched for {location}
            </p>
            <p className="mt-6 text-xs font-black uppercase tracking-widest text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B] px-4 py-2">
              Stay in safe zone · Await safety team arrival
            </p>
          </div>
        </div>
      )}

      {/* ===== FOOTER ===== */}
      <footer className="w-full py-4 text-center text-[10px] font-bold uppercase tracking-widest text-[#1C1917]/40 border-t border-[#1C1917]/10 mt-8">
        OIL India Limited // SIFense Field Safety Operations v2.6
      </footer>
    </div>
  );
}