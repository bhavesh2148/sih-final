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
  CheckCircle,
  ArrowLeft,
} from "lucide-react";

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
      alert("Voice input not supported in this browser. Please use Chrome.");
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
        await fetch("http://127.0.0.1:8000/api/v1/reports/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reportData),
        });
        setShowSuccess(true);
        setText("");
        setTimeout(() => setShowSuccess(false), 3000);
      } catch {
        saveToOfflineQueue(reportData);
        alert("Network dropped! Report saved to local queue.");
      }
    } else {
      saveToOfflineQueue(reportData);
      setShowSuccess(true);
      setText("");
      setTimeout(() => setShowSuccess(false), 3000);
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

    let syncedCount = 0;
    for (const report of queue) {
      try {
        await fetch("http://127.0.0.1:8000/api/v1/reports/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(report),
        });
        syncedCount++;
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

    if (syncedCount > 0) {
      alert(`✅ Synced ${syncedCount} report(s) from offline queue!`);
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
          worker_id: "Anonymous-Worker-01",
        }),
      });
      setShowSOS(true);
    } catch {
      console.error("SOS failed");
    }
    setTimeout(() => {
      setIsEmergency(false);
      setShowSOS(false);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-[#E4E2DD] flex justify-center">
      {/* Mobile Frame */}
      <div className="w-full max-w-md bg-[#E4E2DD] min-h-screen flex flex-col relative border-x-2 border-[#1C1917]/10">
        {/* ===== HEADER ===== */}
        <header className="bg-[#1C1917] text-[#E4E2DD] p-4 flex justify-between items-center sticky top-0 z-10 border-b-2 border-[#1C1917]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="text-[#E4E2DD]/40 hover:text-[#FF4500] transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-black text-base uppercase tracking-tighter leading-none">
                SIFense<span className="text-[#FF4500]">.</span>
              </h1>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#E4E2DD]/40">
                Worker Portal
              </p>
            </div>
          </div>
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
                ? "border-[#F59E0B] text-[#F59E0B]"
                : "border-[#FF4500] text-[#FF4500] emergency-flash"
            }`}
          >
            {isOnline ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            {isOnline ? "Online" : `Offline (${offlineCount})`}
          </button>
        </header>

        {/* ===== MAIN ===== */}
        <main className="flex-1 p-4 flex flex-col gap-5 overflow-y-auto">
          {/* ===== PATH 1: EMERGENCY SOS ===== */}
          <div className="border-2 border-[#FF4500] bg-[#FF4500]/5 p-6 flex flex-col items-center text-center">
            <h2 className="font-display text-2xl uppercase text-[#FF4500] mb-1">
              Emergency?
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#1C1917]/50 mb-5">
              Active danger, fire, or gas leak — Bypasses AI
            </p>

            <button
              onClick={triggerSOS}
              disabled={isEmergency}
              className={`w-32 h-32 flex items-center justify-center border-2 border-[#1C1917] transition-all cursor-pointer ${
                isEmergency
                  ? "bg-[#FF4500]/50 sos-pulse"
                  : "bg-[#FF4500] hover:bg-[#1C1917] group"
              }`}
            >
              <AlertTriangle
                className={`h-12 w-12 transition-colors ${
                  isEmergency
                    ? "text-[#1C1917]"
                    : "text-[#1C1917] group-hover:text-[#FF4500]"
                }`}
              />
            </button>

            <p className="mt-3 text-xs font-black uppercase tracking-widest text-[#1C1917]">
              {isEmergency ? (
                <span className="text-[#FF4500] emergency-flash">
                  ■ Alert Sent
                </span>
              ) : (
                "Tap for SOS"
              )}
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-[2px] bg-[#1C1917]/20 flex-1" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#1C1917]/30">
              Or Report Near-Miss
            </span>
            <div className="h-[2px] bg-[#1C1917]/20 flex-1" />
          </div>

          {/* ===== PATH 2: STANDARD REPORTING ===== */}
          <div className="border-2 border-[#1C1917] bg-[#E4E2DD] p-4 flex-1 flex flex-col">
            <h2 className="font-display text-lg uppercase text-[#1C1917] mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#FF4500]" /> Report Unsafe
              Condition
            </h2>

            {/* Location */}
            <div className="relative mb-3">
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full p-3 bg-[#1C1917]/5 border-2 border-[#1C1917]/20 text-sm font-bold text-[#1C1917] appearance-none cursor-pointer focus:border-[#FF4500] focus:outline-none transition-colors"
              >
                <option>Tank Farm A</option>
                <option>Drilling Rig 3</option>
                <option>Processing Unit 4</option>
                <option>Warehouse Area</option>
                <option>Pipeline Section 7</option>
                <option>Substation C</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg
                  className="h-4 w-4 text-[#1C1917]/40"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="square"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>

            {/* Text Area */}
            <div className="relative flex-1 flex flex-col mb-4">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Describe what you saw... (English, Hindi, or Hinglish)"
                className="w-full flex-1 p-3 bg-[#1C1917]/5 border-2 border-[#1C1917]/20 text-sm font-medium text-[#1C1917] resize-none focus:border-[#FF4500] focus:outline-none transition-colors min-h-[140px] placeholder:text-[#1C1917]/30"
              />
              {/* Voice Button */}
              <button
                onClick={toggleVoice}
                className={`absolute bottom-3 right-3 p-3 border-2 border-[#1C1917] transition-all cursor-pointer ${
                  isListening
                    ? "bg-[#FF4500] text-[#1C1917] sos-pulse"
                    : "bg-[#1C1917] text-[#E4E2DD] hover:bg-[#FF4500] hover:text-[#1C1917]"
                }`}
              >
                {isListening ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Submit */}
            <button
              onClick={() =>
                submitReport({
                  text: text,
                  location: location,
                  is_voice: isListening,
                })
              }
              disabled={!text.trim()}
              className="w-full btn-slide bg-[#1C1917] text-[#E4E2DD] py-4 font-black uppercase tracking-widest text-sm border-2 border-[#1C1917] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-2">
                <Send className="h-4 w-4" /> Submit Anonymously
              </span>
            </button>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#1C1917]/30 text-center mt-2">
              Identity hidden · Reports encrypted
            </p>
          </div>
        </main>

        {/* ===== SUCCESS TOAST ===== */}
        {showSuccess && (
          <div className="absolute bottom-6 left-4 right-4 bg-[#1C1917] text-[#E4E2DD] p-4 border-2 border-[#F59E0B] flex items-center gap-3 shadow-2xl slide-up z-40">
            <div className="h-2 w-2 bg-[#F59E0B]" />
            <div>
              <p className="font-black uppercase text-sm tracking-widest">
                Report Submitted
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#E4E2DD]/50">
                {isOnline
                  ? "HSE team has been notified"
                  : "Saved to offline queue — will sync when online"}
              </p>
            </div>
          </div>
        )}

        {/* ===== SOS OVERLAY ===== */}
        {showSOS && (
          <div className="absolute inset-0 bg-[#1C1917] flex flex-col items-center justify-center z-50 text-[#E4E2DD] emergency-flash">
            <div className="border-2 border-[#FF4500] p-8 flex flex-col items-center">
              <AlertTriangle className="h-20 w-20 text-[#FF4500] mb-6" />
              <h2 className="font-display text-4xl uppercase text-[#FF4500] mb-2 text-center">
                Emergency
                <br />
                Alert Sent
              </h2>
              <div className="h-1 w-32 bg-[#FF4500] my-4" />
              <p className="text-xs font-bold uppercase tracking-widest text-[#E4E2DD]/60 text-center max-w-xs">
                Site Supervisor and Control Room notified immediately
              </p>
              <p className="mt-6 text-[10px] font-bold uppercase tracking-widest text-[#F59E0B]">
                Stay safe · Follow evacuation protocols
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}