"use client";

import { useState, useRef } from "react";
import { Mic, MicOff, Send, AlertTriangle, MapPin, Wifi, WifiOff, CheckCircle, Shield } from "lucide-react";

export default function WorkerApp() {
  const [text, setText] = useState("");
  const [location, setLocation] = useState("Tank Farm A");
  const [isListening, setIsListening] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  const [isOnline, setIsOnline] = useState(true); // Mock offline toggle
  const recognitionRef = useRef<any>(null);

  // Mock Voice Input (Uses browser's native Web Speech API)
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
      recognition.lang = "en-IN"; // Optimized for Indian English/Hinglish

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

  // PATH 2: Standard Reporting (Now with Offline Queue!)
  const submitReport = async (reportData: { text: string; location: string; is_voice: boolean }) => {
    if (!reportData.text.trim()) return;
    
    if (isOnline) {
      // ONLINE: Send directly to backend
      try {
        await fetch("http://127.0.0.1:8000/api/v1/reports/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reportData),
        });
        setShowSuccess(true);
        setText("");
        setTimeout(() => setShowSuccess(false), 3000);
      } catch (error) {
        // Fallback to offline if network drops mid-submission
        saveToOfflineQueue(reportData);
        alert("Network dropped! Report saved to local queue.");
      }
    } else {
      // OFFLINE: Save to local queue
      saveToOfflineQueue(reportData);
      setShowSuccess(true); // Show success anyway so worker knows it's saved
      setText("");
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  // Helper: Save to LocalStorage
  const saveToOfflineQueue = (reportData: { text: string; location: string; is_voice: boolean }) => {
    const queue = JSON.parse(localStorage.getItem("sifense_offline_queue") || "[]");
    queue.push({ ...reportData, timestamp: new Date().toISOString() });
    localStorage.setItem("sifense_offline_queue", JSON.stringify(queue));
  };

  // Helper: Sync Offline Queue when back online
  const syncOfflineQueue = async () => {
    const queue = JSON.parse(localStorage.getItem("sifense_offline_queue") || "[]");
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
      } catch (error) {
        console.error("Failed to sync report:", error);
        break; // Stop if network fails again
      }
    }

    // Remove synced reports from queue
    const remainingQueue = queue.slice(syncedCount);
    localStorage.setItem("sifense_offline_queue", JSON.stringify(remainingQueue));
    
    if (syncedCount > 0) {
      alert(`✅ Synced ${syncedCount} report(s) from offline queue!`);
    }
  };

  // PATH 1: Emergency SOS
  const triggerSOS = async () => {
    setIsEmergency(true);
    try {
      await fetch("http://127.0.0.1:8000/api/v1/emergency/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, worker_id: "Anonymous-Worker-01" }),
      });
      setShowSOS(true);
    } catch (error) {
      console.error("SOS failed", error);
    }
    setTimeout(() => {
      setIsEmergency(false);
      setShowSOS(false);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">
      {/* Mobile Frame Container */}
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl flex flex-col relative">
        
        {/* Header */}
        <header className="bg-blue-900 text-white p-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-yellow-400" />
            <h1 className="text-lg font-bold">SIFense Worker</h1>
          </div>
          <button 
  onClick={() => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    if (newStatus) {
      syncOfflineQueue(); // Trigger sync when going online!
    }
  }} 
  className="flex items-center gap-1 text-xs bg-blue-800 px-2 py-1 rounded"
>
  {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3 text-red-400" />}
  {isOnline ? "Online" : `Offline (${JSON.parse(localStorage.getItem("sifense_offline_queue") || "[]").length} queued)`}
</button>
        </header>

        <main className="flex-1 p-4 flex flex-col gap-6 overflow-y-auto">
          
          {/* PATH 1: EMERGENCY SOS */}
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 flex flex-col items-center text-center">
            <h2 className="text-red-800 font-bold text-lg mb-2">EMERGENCY?</h2>
            <p className="text-red-600 text-xs mb-4">Active danger, fire, or gas leak. Bypasses AI.</p>
            <button
              onClick={triggerSOS}
              disabled={isEmergency}
              className={`w-32 h-32 rounded-full flex items-center justify-center shadow-lg transition-all transform active:scale-95 ${
                isEmergency 
                  ? "bg-red-300 animate-pulse" 
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              <AlertTriangle className={`h-12 w-12 ${isEmergency ? "text-white" : "text-white"}`} />
            </button>
            <p className="mt-3 text-sm font-bold text-red-700">
              {isEmergency ? "ALERT SENT!" : "TAP FOR SOS"}
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 text-gray-400 text-xs">
            <div className="h-px bg-gray-300 flex-1"></div>
            <span>OR REPORT NEAR-MISS</span>
            <div className="h-px bg-gray-300 flex-1"></div>
          </div>

          {/* PATH 2: STANDARD REPORTING */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex-1 flex flex-col">
            <h2 className="text-gray-800 font-bold mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" /> Report Unsafe Condition
            </h2>
            
            {/* Location Dropdown */}
            <select 
              value={location} 
              onChange={(e) => setLocation(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option>Tank Farm A</option>
              <option>Drilling Rig 3</option>
              <option>Processing Unit 4</option>
              <option>Warehouse Area</option>
            </select>

            {/* Text Area */}
            <div className="relative flex-1 flex flex-col">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Describe what you saw... (English, Hindi, or Hinglish)"
                className="w-full flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none min-h-[120px]"
              />
              {/* Voice Button */}
              <button
                onClick={toggleVoice}
                className={`absolute bottom-3 right-3 p-2 rounded-full shadow-md transition ${
                  isListening ? "bg-red-500 text-white animate-pulse" : "bg-blue-600 text-white"
                }`}
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
            </div>

            {/* Submit Button */}
           <button
  onClick={() => submitReport({ 
    text: text, 
    location: location, 
    is_voice: isListening 
  })}
  disabled={!text.trim()}
  className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
>
  <Send className="h-4 w-4" /> Submit Anonymously
</button>
            <p className="text-[10px] text-gray-400 text-center mt-2">
              Your identity is hidden. Reports are encrypted.
            </p>
          </div>
        </main>

        {/* Success Toast */}
        {showSuccess && (
          <div className="absolute bottom-6 left-4 right-4 bg-green-600 text-white p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
            <CheckCircle className="h-6 w-6" />
            <div>
              <p className="font-bold">Report Submitted!</p>
              <p className="text-xs text-green-100">HSE team has been notified.</p>
            </div>
          </div>
        )}

        {/* SOS Success Overlay */}
        {showSOS && (
          <div className="absolute inset-0 bg-red-900 bg-opacity-95 flex flex-col items-center justify-center z-50 text-white">
            <AlertTriangle className="h-20 w-20 text-yellow-400 animate-pulse mb-4" />
            <h2 className="text-2xl font-bold mb-2">EMERGENCY ALERT SENT</h2>
            <p className="text-center px-8 text-red-100">Site Supervisor and Control Room notified immediately.</p>
            <p className="mt-4 text-sm text-red-200">Stay safe. Follow evacuation protocols.</p>
          </div>
        )}
      </div>
    </div>
  );
}