"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { apiFetch } from "../../lib/api-config";
import {
  AlertTriangle, ShieldCheck, Activity, Clock,
  X, Link as LinkIcon, AlertCircle, TrendingUp,
  Building2, ArrowUpRight, HardHat, ChevronDown,
  LogOut, UserCheck, UploadCloud, FileText, CheckCircle2,
  Sparkles, Flame, ShieldAlert, Layers, RefreshCw,
  ExternalLink, Filter, CheckSquare, Download, FileSpreadsheet,
  FileCode, ArrowRight, Zap
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";

// Types matching our FastAPI backend
interface CausalChain {
  hazard: string;
  barrier_failure: string;
  consequence: string;
}

interface Twin {
  twin_id: string;
  raw_text: string;
  sif_score: number;
  iogp_rules: string[];
  status: string;
  similarity_score: number;
}

interface Report {
  id: string;
  timestamp: string;
  raw_text: string;
  is_emergency: boolean;
  sif_score: number;
  energy_type: string;
  energy_level: number;
  barrier_status: string;
  barrier_level: number;
  causal_chain: CausalChain;
  iogp_rules: string[];
  explanation: string;
  status: string;
}

interface StatItem {
  barrier?: string;
  rule?: string;
  hazard?: string;
  count: number;
}

interface DashboardData {
  total_reports: number;
  high_sif_count: number;
  precursor_alert: boolean;
  precursor_message: string;
  reports: Report[];
  critical_precursors?: Report[];
  top_recurring_barriers?: StatItem[];
  top_violated_rules?: StatItem[];
  top_recurring_hazards?: StatItem[];
  trend_data?: any[];
  site_risk_data?: any[];
  growth_rate?: number;
  top_risky_site?: string;
}

interface SiteRisk {
  site: string;
  incidents: number;
}

interface TrendPoint {
  week: string;
  high_sif_incidents: number;
  total_incidents: number;
}

// 10 Sample Real-world Historical OIL India logs for 1-click demonstration
const SAMPLE_OIL_BATCH = [
  { text: "Rig floor worker bypassed hydraulic tongs interlock to speed up casing operation. Hand caught momentarily in pinch zone.", location: "Drilling Rig 3" },
  { text: "Technician entered enclosed manifold cellar without testing oxygen or H2S levels. Felt dizzy and evacuated immediately.", location: "Tank Farm A" },
  { text: "Scaffold planks on derrick mast at 14m height were untied and shifted during heavy wind. Worker was clipped to auxiliary line.", location: "Drilling Rig 3" },
  { text: "High pressure fuel gas regulator showing 120 PSI above set point. Relief valve vent line found obstructed with wasp nest.", location: "Processing Unit 4" },
  { text: "Welder performed hot work torch cutting on abandoned line within 8 meters of open hydrocarbon drain sump without gas test.", location: "Pipeline Section 7" },
  { text: "Electrical technician opened 415V distribution panel with live busbars while standing on wet metallic grating.", location: "Substation C" },
  { text: "Forklift driver in warehouse knocked over stacked oil drums. No chemical spill occurred.", location: "Warehouse Area" },
  { text: "Crane sling had 3 broken wire strands; lift was stopped before lifting 2-ton mud motor.", location: "Drilling Rig 3" },
  { text: "Routine office ergonomic inspection completed in administration building.", location: "Warehouse Area" },
  { text: "Contractor cleaner slipped on wet tiled corridor near pantry. First aid applied to minor wrist sprain.", location: "Warehouse Area" }
];

export default function Dashboard() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [twins, setTwins] = useState<Twin[]>([]);
  const [loadingTwins, setLoadingTwins] = useState(false);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [siteRiskData, setSiteRiskData] = useState<SiteRisk[]>([]);
  const [growthRate, setGrowthRate] = useState(0);
  const [topRiskySite, setTopRiskySite] = useState("");
  const [explanation, setExplanation] = useState<any>(null);
  const [sortBy, setSortBy] = useState<"risk" | "recent">("risk");

  // Bulk Ingestion Studio Modal state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkTab, setBulkTab] = useState<"file" | "demo" | "paste">("file");
  const [bulkText, setBulkText] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [parsedFileRows, setParsedFileRows] = useState<{ text: string; location?: string }[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkResult, setBulkResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Addressed items tracking in local state
  const [addressedMap, setAddressedMap] = useState<Record<string, boolean>>({});

  // Auth Protection Guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Sorted reports — by SIF score (default) or by timestamp (recent first)
  const sortedReports = useMemo(() => {
    if (!data?.reports) return [];
    const reports = [...data.reports];
    if (sortBy === "risk") {
      return reports.sort((a, b) => b.sif_score - a.sif_score);
    } else {
      return reports.sort((a, b) => {
        const ta = new Date(a.timestamp).getTime();
        const tb = new Date(b.timestamp).getTime();
        return tb - ta;
      });
    }
  }, [data?.reports, sortBy]);

  // Critical precursors list (Score >= 0.60)
  const criticalPrecursors = useMemo(() => {
    if (data?.critical_precursors && data.critical_precursors.length > 0) {
      return data.critical_precursors;
    }
    return (data?.reports || []).filter((r) => r.sif_score >= 0.6);
  }, [data]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (selectedReport) {
      fetchTwins(selectedReport.id);
    }
  }, [selectedReport]);

  const fetchData = async () => {
    setError(null);
    try {
      const res = await apiFetch(`/api/v1/reports/dashboard?t=${Date.now()}`);
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const json = await res.json();
      setData(json);
      setTrendData(json.trend_data || []);
      setSiteRiskData(json.site_risk_data || []);
      setGrowthRate(json.growth_rate || 0);
      setTopRiskySite(json.top_risky_site || "");
    } catch (err: any) {
      console.error("Failed to fetch dashboard data:", err);
      setError(err.message || "Failed to connect to backend");
    } finally {
      setLoading(false);
    }
  };

  const fetchTwins = async (reportId: string) => {
    setLoadingTwins(true);
    setExplanation(null);
    try {
      const [twinsRes, explanationRes] = await Promise.all([
        apiFetch(`/api/v1/reports/${reportId}/twins`),
        apiFetch(`/api/v1/reports/${reportId}/explanation`),
      ]);
      const twinsJson = await twinsRes.json();
      const explanationJson = await explanationRes.json();
      const filteredTwins = twinsJson.twins.filter(
        (t: Twin) => t.twin_id !== reportId
      );
      setTwins(filteredTwins);
      setExplanation(explanationJson);
    } catch (err) {
      console.error("Error fetching report details:", err);
    } finally {
      setLoadingTwins(false);
    }
  };

  const submitFeedback = async (reportId: string, feedback: string) => {
    try {
      await apiFetch(
        `/api/v1/reports/${reportId}/feedback?feedback=${feedback}`,
        { method: "POST" }
      );
      if (data) {
        const updatedReports = data.reports.map((r) =>
          r.id === reportId ? { ...r, status: feedback } : r
        );
        setData({ ...data, reports: updatedReports });
      }
      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport({ ...selectedReport, status: feedback });
      }
    } catch (err) {
      console.error("Feedback error:", err);
    }
  };

  const toggleAddressed = (reportId: string) => {
    setAddressedMap((prev) => ({
      ...prev,
      [reportId]: !prev[reportId],
    }));
  };

  // ⚡ HIGH-SPEED PARALLEL BULK SCREENING (Supports 500+ Reports with Chunked Streaming Progress)
  const handleRunBulkUpload = async (reportsToIngest: { text: string; location?: string }[]) => {
    if (reportsToIngest.length === 0) return;
    setBulkProcessing(true);
    setBulkProgress(5);
    setBulkResult(null);

    const CHUNK_SIZE = 100;
    const totalReports = reportsToIngest.length;
    let processedSoFar = 0;
    let totalHighSif = 0;
    let totalEmergencies = 0;
    let allResults: any[] = [];

    try {
      for (let i = 0; i < totalReports; i += CHUNK_SIZE) {
        const chunk = reportsToIngest.slice(i, i + CHUNK_SIZE);
        const res = await apiFetch("/api/v1/reports/bulk-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reports: chunk }),
        });

        if (!res.ok) throw new Error(`Bulk upload failed on batch ${Math.floor(i / CHUNK_SIZE) + 1}`);
        const result = await res.json();
        
        processedSoFar += chunk.length;
        totalHighSif += result.high_sif_count || 0;
        totalEmergencies += result.emergencies_count || 0;
        if (result.results) {
          allResults = [...allResults, ...result.results];
        }

        const pct = Math.min(95, Math.round((processedSoFar / totalReports) * 100));
        setBulkProgress(pct);
      }

      setBulkProgress(100);
      setBulkResult({
        status: "success",
        total_processed: processedSoFar,
        high_sif_count: totalHighSif,
        emergencies_count: totalEmergencies,
        results: allResults.slice(0, 50),
      });

      // Refresh dashboard with newly ingested batch
      await fetchData();
    } catch (err: any) {
      alert("Error during bulk screening: " + err.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  // Robust CSV Quotation Tokenizer
  const parseCsvLineTokens = (line: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if ((char === "," || char === "\t" || char === ";") && !inQuotes) {
        result.push(cur.trim().replace(/^"|"$/g, ""));
        cur = "";
      } else {
        cur += char;
      }
    }
    result.push(cur.trim().replace(/^"|"$/g, ""));
    return result;
  };

  // Narrative Text Scorer: Identifies true incident descriptions vs IDs/Dates/Severity
  const scoreIncidentNarrative = (str: string): number => {
    const s = str.trim();
    if (!s) return -999;
    
    // Disqualify IDs, codes, pure numbers, dates, and severity tags
    if (/^RPT[-_0-9]/i.test(s)) return -500;
    if (/^INC[-_0-9]/i.test(s)) return -500;
    if (/^ID[-_0-9]/i.test(s)) return -500;
    if (/^\d+$/.test(s)) return -500;
    if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(s)) return -500;
    if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(s)) return -500;
    if (/^(high|medium|low|critical|minor|pending|closed|open|yes|no|true|false)$/i.test(s)) return -300;
    
    const wordCount = s.split(/\s+/).length;
    if (wordCount === 1 && s.length < 25) return -100;
    
    let score = s.length + (wordCount * 25);
    const lower = s.toLowerCase();
    const keywords = [
      "hazard", "worker", "valve", "gas", "fall", "rig", "scaffold", "harness", "pipe", 
      "safety", "pressure", "leak", "panel", "electric", "crane", "bypassed", "untested", 
      "floor", "lanyard", "hot work", "weld", "interlock", "damage", "broken", "unlocked", 
      "cellar", "pit", "sump", "blowout", "line", "flare", "tongs", "derrick", "mast", 
      "tank", "manifold", "flange", "operator", "crew", "shift", "equipment", "operation", 
      "found", "reported", "observed", "during", "without", "failed"
    ];
    
    for (const kw of keywords) {
      if (lower.includes(kw)) score += 40;
    }
    
    return score;
  };

  const scoreLocationCandidate = (str: string, chosenNarrative: string): number => {
    const s = str.trim();
    if (!s || s === chosenNarrative) return -999;
    if (/^RPT[-_0-9]/i.test(s) || /^\d{4}[-/.]\d{1,2}/.test(s) || /^\d+$/.test(s)) return -500;
    if (/^(high|medium|low|critical|minor|pending|closed|open)$/i.test(s)) return -300;
    
    let score = 10;
    const lower = s.toLowerCase();
    const locKeywords = [
      "rig", "station", "plant", "wellhead", "drilling", "digboi", "dibrugarh", 
      "sibsagar", "duliajan", "farm", "pipeline", "substation", "unit", "site", 
      "bay", "workshop", "terminal", "warehouse", "refinery", "field", "section", "area"
    ];
    
    for (const lk of locKeywords) {
      if (lower.includes(lk)) score += 80;
    }
    
    return score;
  };

  // Handle File Parsing (CSV, JSON, TXT with Intelligent Column Scoring)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = (event.target?.result as string) || "";
      if (file.name.endsWith(".json")) {
        try {
          const parsed = JSON.parse(content);
          let items: { text: string; location?: string }[] = [];
          if (Array.isArray(parsed)) {
            items = parsed.map((it: any) =>
              typeof it === "string"
                ? { text: it, location: "JSON Upload" }
                : {
                    text: it.text || it.incident || it.description || it.raw_text || JSON.stringify(it),
                    location: it.location || it.site || "JSON Upload",
                  }
            );
          } else if (parsed.reports && Array.isArray(parsed.reports)) {
            items = parsed.reports.map((it: any) =>
              typeof it === "string"
                ? { text: it, location: "JSON Upload" }
                : {
                    text: it.text || it.incident || it.description,
                    location: it.location || "JSON Upload",
                  }
            );
          }
          setParsedFileRows(items.filter((i) => i.text && i.text.trim()));
        } catch (err) {
          alert("Invalid JSON format");
        }
      } else {
        // CSV or TXT
        const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        if (lines.length > 0) {
          const firstLineTokens = parseCsvLineTokens(lines[0]);
          const firstLineLower = lines[0].toLowerCase();
          const isHeader =
            firstLineLower.includes("location") ||
            firstLineLower.includes("incident") ||
            firstLineLower.includes("text") ||
            firstLineLower.includes("desc") ||
            firstLineLower.includes("hazard") ||
            firstLineLower.includes("report_id") ||
            firstLineLower.includes("date") ||
            firstLineLower.includes("site");

          const dataLines = isHeader ? lines.slice(1) : lines;

          const items = dataLines.map((line) => {
            const parts = parseCsvLineTokens(line);
            if (parts.length > 1) {
              // Score all columns to find the true incident narrative
              let bestText = parts[0];
              let bestTextScore = -9999;
              for (const part of parts) {
                const score = scoreIncidentNarrative(part);
                if (score > bestTextScore) {
                  bestTextScore = score;
                  bestText = part;
                }
              }

              // Score remaining columns to find the location name
              let bestLoc = "OIL Site";
              let bestLocScore = -9999;
              for (const part of parts) {
                if (part === bestText) continue;
                const score = scoreLocationCandidate(part, bestText);
                if (score > bestLocScore) {
                  bestLocScore = score;
                  bestLoc = part;
                }
              }

              return { location: bestLoc || "OIL Site", text: bestText };
            }
            return { text: line, location: "Uploaded File" };
          });

          setParsedFileRows(items.filter((i) => i.text && i.text.trim()));
        }
      }
    };
    reader.readAsText(file);
  };

  // Download Sample CSV Template
  const downloadSampleCSV = () => {
    const csvContent =
      "location,incident_description\n" +
      "Drilling Rig 3,\"Worker bypassed hydraulic tongs safety interlock during casing operation.\"\n" +
      "Tank Farm A,\"Technician entered confined manifold cellar without testing oxygen or H2S levels.\"\n" +
      "Pipeline Section 7,\"Scaffold planks untied at 14 meters height shifted during high wind.\"\n" +
      "Processing Unit 4,\"High pressure gas regulator 120 PSI above set point with obstructed relief vent.\"\n" +
      "Substation C,\"Opened 415V distribution panel with live busbars while standing on wet grating.\"\n" +
      "Warehouse Area,\"Routine quarterly office ergonomic evaluation completed.\"\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "sample_oil_safety_logs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleParseAndUploadText = () => {
    const lines = bulkText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      alert("Please paste one or more incident reports.");
      return;
    }
    const items = lines.map((line) => ({ text: line, location: "Historical Ingestion" }));
    handleRunBulkUpload(items);
  };

  const handleLoadSampleBatch = () => {
    handleRunBulkUpload(SAMPLE_OIL_BATCH);
  };

  // --- WORKER ROLE CLEARANCE CHECK ---
  const userRole = (user as any)?.role || (user as any)?.user_metadata?.role;
  if (user && userRole === "worker") {
    return (
      <div className="min-h-screen bg-[#E4E2DD] flex items-center justify-center px-6 font-sans">
        <div className="border-2 border-[#1C1917] bg-[#E4E2DD] max-w-md w-full shadow-2xl p-6 sm:p-8 text-center">
          <div className="p-3 bg-[#F59E0B] border-2 border-[#1C1917] inline-block mb-4">
            <ShieldCheck className="h-8 w-8 text-[#1C1917]" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF4500] block mb-1">
            Access Restricted
          </span>
          <h2 className="font-display text-2xl sm:text-3xl uppercase text-[#1C1917] mb-2">
            HSE Officer Clearance Required
          </h2>
          <p className="text-xs font-medium text-[#1C1917]/70 leading-relaxed mb-6">
            You are currently signed in under the <strong>Field Worker Portal</strong> ({user.user_metadata?.full_name || user.email || "Worker Account"}). The Executive SIF Dashboard requires verified Safety Supervisor clearance.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => router.push("/worker")}
              className="w-full btn-slide bg-[#1C1917] text-[#E4E2DD] py-3 text-xs font-black uppercase tracking-widest border-2 border-[#1C1917] cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Return to Worker Safety App →</span>
            </button>
            <button
              onClick={async () => {
                await signOut();
                router.push("/login?portal=officer");
              }}
              className="w-full py-2.5 bg-transparent hover:bg-[#FF4500] hover:text-[#1C1917] text-[#1C1917] text-[11px] font-black uppercase tracking-wider border border-[#1C1917]/30 cursor-pointer transition-colors"
            >
              Switch to HSE Officer Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- SKELETON LOADING STATE ---
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#E4E2DD] text-[#1C1917] p-8 font-sans">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-16 border-2 border-[#1C1917] p-4 flex justify-between items-center bg-[#E4E2DD]">
            <div className="h-6 w-32 skeleton-pulse" />
            <div className="h-6 w-20 skeleton-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border-2 border-[#1C1917] p-6 bg-[#E4E2DD] space-y-3">
                <div className="h-4 w-28 skeleton-pulse" />
                <div className="h-10 w-16 skeleton-pulse" />
                <div className="h-3 w-40 skeleton-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E4E2DD] text-[#1C1917] font-sans selection:bg-[#FF4500] selection:text-white">
      {/* ===== NAVIGATION BAR ===== */}
      <nav className="fixed top-0 left-0 w-full z-40 px-4 sm:px-8 py-3.5 flex justify-between items-center bg-[#E4E2DD]/90 backdrop-blur-md border-b-2 border-[#1C1917]/15">
        <div
          className="font-black text-xl uppercase tracking-tighter cursor-pointer flex items-center gap-1"
          onClick={() => router.push("/")}
        >
          SIFense<span className="text-[#FF4500]">.</span>
          <span className="text-[9px] font-black uppercase tracking-wider bg-[#1C1917] text-[#E4E2DD] px-1.5 py-0.5 ml-1.5">
            HSE HQ
          </span>
        </div>

        <div className="hidden md:flex gap-6 text-xs font-bold uppercase tracking-[0.15em] items-center">
          <span className="text-[#FF4500] border-b-2 border-[#FF4500] pb-1">
            HSE Command
          </span>
          <button
            onClick={() => router.push("/worker")}
            className="hover:text-[#FF4500] transition-colors cursor-pointer flex items-center gap-1"
          >
            <HardHat className="h-3.5 w-3.5" /> Worker App
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Bulk Ingest Action Button */}
          <button
            onClick={() => {
              setShowBulkModal(true);
              setBulkResult(null);
              setBulkProgress(0);
            }}
            className="px-3 py-1.5 bg-[#F59E0B] hover:bg-[#FF4500] text-[#1C1917] text-[11px] font-black uppercase tracking-wider border-2 border-[#1C1917] cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span>Bulk Ingest Logs</span>
          </button>

          {user && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-[#1C1917]/5 border border-[#1C1917]/20 text-[11px] font-bold">
              <UserCheck className="h-3.5 w-3.5 text-[#FF4500]" />
              <span className="truncate max-w-[140px]">{user.email || "HSE Lead"}</span>
            </div>
          )}

          <button
            onClick={fetchData}
            title="Refresh Data"
            className="p-1.5 border-2 border-[#1C1917]/25 hover:border-[#1C1917] hover:bg-[#1C1917] hover:text-[#E4E2DD] transition-all cursor-pointer hidden sm:block"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-[#1C1917] text-[#E4E2DD] px-2.5 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F59E0B] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F59E0B]" />
            </span>
            Live
          </div>

          <button
            onClick={async () => {
              await signOut();
              router.push("/login?portal=officer");
            }}
            title="Sign Out"
            className="p-1.5 border-2 border-[#1C1917]/20 hover:bg-[#FF4500] hover:text-white transition-colors cursor-pointer text-[#1C1917]"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </nav>

      {/* ===== MAIN DASHBOARD CONTENT ===== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 space-y-8">
        
        {/* =========================================================================
            SECTION 1: 🚨 CRITICAL SIF PRECURSOR PRIORITY TRIAGE (TOP RISKS SEPARATELY)
            ========================================================================= */}
        <section className="border-4 border-[#FF4500] bg-[#FF4500]/5 p-6 sm:p-8 shadow-xl relative overflow-hidden">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 border-[#FF4500]/30 pb-4 mb-6 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Flame className="h-6 w-6 text-[#FF4500] animate-pulse" />
                <span className="text-xs font-black uppercase tracking-[0.25em] text-[#FF4500]">
                  High Priority Screening Layer // SIF Precursor Detection
                </span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl uppercase text-[#1C1917] mt-1 leading-tight">
                Critical SIF Precursor Triage
              </h1>
              <p className="text-xs font-medium text-[#1C1917]/70 mt-1 max-w-2xl">
                These incidents had <strong>fatal potential</strong> due to critical energy releases and degraded safety barriers. Immediate HSE intervention is required to prevent catastrophic recurrence.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="bg-[#FF4500] text-[#1C1917] p-3 border-2 border-[#1C1917] text-center min-w-[120px]">
                <span className="block text-2xl sm:text-3xl font-black leading-none">
                  {criticalPrecursors.length}
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider">
                  Critical Precursors
                </span>
              </div>
            </div>
          </div>

          {/* THE 4 CORE SIF QUESTIONS METRICS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* 1. Site Concentration */}
            <div className="border-2 border-[#1C1917] bg-[#E4E2DD] p-4 shadow-sm">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#FF4500] mb-1">
                <Building2 className="h-3.5 w-3.5" />
                <span>Top Risky Site</span>
              </div>
              <p className="text-xl font-black text-[#1C1917] uppercase truncate">
                {topRiskySite || "Tank Farm A"}
              </p>
              <p className="text-[11px] font-bold text-[#1C1917]/60 mt-1">
                Highest concentration of precursor hazards
              </p>
            </div>

            {/* 2. Recurring Barrier Failures */}
            <div className="border-2 border-[#1C1917] bg-[#E4E2DD] p-4 shadow-sm">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#F59E0B] mb-1">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Recurring Barrier Failures</span>
              </div>
              <div className="space-y-1 mt-1.5">
                {(data?.top_recurring_barriers || []).slice(0, 2).map((bf, idx) => (
                  <div key={idx} className="flex justify-between text-xs font-bold text-[#1C1917]">
                    <span className="truncate max-w-[180px]">{bf.barrier}</span>
                    <span className="bg-[#FF4500]/20 px-1.5 text-[10px] font-black">{bf.count}x</span>
                  </div>
                ))}
                {(!data?.top_recurring_barriers || data.top_recurring_barriers.length === 0) && (
                  <p className="text-xs font-bold text-[#1C1917]">Atmospheric Testing Omitted (4x)</p>
                )}
              </div>
            </div>

            {/* 3. Most Violated Life-Saving Rules */}
            <div className="border-2 border-[#1C1917] bg-[#E4E2DD] p-4 shadow-sm">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#1C1917] mb-1">
                <AlertTriangle className="h-3.5 w-3.5 text-[#FF4500]" />
                <span>Top Violated IOGP Rules</span>
              </div>
              <div className="space-y-1 mt-1.5">
                {(data?.top_violated_rules || []).slice(0, 2).map((r, idx) => (
                  <div key={idx} className="flex justify-between text-xs font-bold text-[#1C1917]">
                    <span className="truncate max-w-[180px]">{r.rule}</span>
                    <span className="bg-[#F59E0B]/30 px-1.5 text-[10px] font-black">{r.count}x</span>
                  </div>
                ))}
                {(!data?.top_violated_rules || data.top_violated_rules.length === 0) && (
                  <p className="text-xs font-bold text-[#1C1917]">Working at Height (6x)</p>
                )}
              </div>
            </div>

            {/* 4. Precursor Escalation Rate */}
            <div className="border-2 border-[#1C1917] bg-[#E4E2DD] p-4 shadow-sm">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#1C1917] mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-[#FF4500]" />
                <span>Week-over-Week SIF Rate</span>
              </div>
              <p className={`text-xl font-black uppercase ${growthRate >= 0 ? "text-[#FF4500]" : "text-emerald-700"}`}>
                {growthRate > 0 ? `+${growthRate.toFixed(1)}%` : `${growthRate.toFixed(1)}%`}
              </p>
              <p className="text-[11px] font-bold text-[#1C1917]/60 mt-1">
                {growthRate >= 0 ? "Escalating danger trend" : "Precursor frequency stabilizing"}
              </p>
            </div>
          </div>

          {/* ACTIVE CRITICAL SIF PRECURSORS ACTION CARDS */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#1C1917] flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[#FF4500]" />
                <span>Active SIF Precursors Requiring HSE Action</span>
              </h3>
              <span className="text-[10px] font-bold uppercase text-[#1C1917]/50 tracking-wider">
                Click report to inspect Bowtie Causal Chain
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {criticalPrecursors.slice(0, 6).map((report) => {
                const isAddressed = addressedMap[report.id];
                return (
                  <div
                    key={report.id}
                    className={`border-2 border-[#1C1917] bg-[#E4E2DD] p-4 flex flex-col justify-between transition-all hover:shadow-md ${
                      isAddressed ? "opacity-60 bg-[#E4E2DD]/60" : ""
                    }`}
                  >
                    <div>
                      {/* Card Top Badges */}
                      <div className="flex justify-between items-start mb-2.5">
                        <span className="px-2 py-0.5 bg-[#FF4500] text-[#1C1917] text-[10px] font-black uppercase tracking-wider">
                          SIF: {Math.round(report.sif_score * 100)}%
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#1C1917]/50">
                            {report.energy_type}
                          </span>
                        </div>
                      </div>

                      {/* Incident Narrative */}
                      <p
                        onClick={() => setSelectedReport(report)}
                        className="text-xs font-bold text-[#1C1917] line-clamp-3 hover:text-[#FF4500] transition-colors cursor-pointer mb-3 leading-relaxed"
                      >
                        "{report.raw_text}"
                      </p>

                      {/* Bowtie Hazard summary chip */}
                      <div className="p-2 bg-[#1C1917]/5 border border-[#1C1917]/15 text-[10px] space-y-1 mb-3">
                        <div className="flex items-center gap-1 font-bold text-[#1C1917]">
                          <span className="text-[#FF4500] font-black">Hazard:</span>
                          <span className="truncate">{report.causal_chain?.hazard || "Unsafe condition"}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[#1C1917]/70">
                          <span className="font-bold text-[#F59E0B]">Barrier Failed:</span>
                          <span className="truncate">{report.causal_chain?.barrier_failure || "Barrier degraded"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-3 border-t border-[#1C1917]/10 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedReport(report)}
                        className="text-[10px] font-black uppercase tracking-wider text-[#1C1917] hover:text-[#FF4500] flex items-center gap-1 cursor-pointer"
                      >
                        Deep Inspect →
                      </button>

                      <button
                        onClick={() => toggleAddressed(report.id)}
                        className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border transition-colors cursor-pointer flex items-center gap-1 ${
                          isAddressed
                            ? "bg-emerald-700 text-white border-emerald-800"
                            : "bg-[#1C1917] text-[#E4E2DD] hover:bg-[#FF4500] hover:text-[#1C1917] border-[#1C1917]"
                        }`}
                      >
                        <CheckSquare className="h-3 w-3" />
                        <span>{isAddressed ? "Addressed ✓" : "Take Action"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 2: 📈 PRECURSOR TREND ANALYTICS & SITE CONCENTRATION
            ========================================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* SIF Trend Chart */}
          <div className="lg:col-span-7 border-2 border-[#1C1917] bg-[#E4E2DD] p-6 shadow-sm">
            <div className="flex justify-between items-center border-b-2 border-[#1C1917] pb-3 mb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#FF4500]">
                  Timeline Analytics
                </span>
                <h2 className="font-display text-xl uppercase text-[#1C1917]">
                  SIF Precursor Trend
                </h2>
              </div>
              <span className="text-xs font-bold text-[#1C1917]/60">
                Week-over-Week Frequency
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1C1917" opacity={0.15} />
                  <XAxis dataKey="week" stroke="#1C1917" fontSize={11} fontWeight={700} />
                  <YAxis stroke="#1C1917" fontSize={11} fontWeight={700} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1C1917",
                      border: "2px solid #FF4500",
                      color: "#E4E2DD",
                      fontWeight: "bold",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="high_sif_incidents"
                    name="High-SIF Precursors"
                    stroke="#FF4500"
                    strokeWidth={3}
                    dot={{ fill: "#FF4500", r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total_incidents"
                    name="Total Screened"
                    stroke="#1C1917"
                    strokeWidth={2}
                    dot={{ fill: "#1C1917", r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Site Concentration Bar Chart */}
          <div className="lg:col-span-5 border-2 border-[#1C1917] bg-[#E4E2DD] p-6 shadow-sm">
            <div className="flex justify-between items-center border-b-2 border-[#1C1917] pb-3 mb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#F59E0B]">
                  Hazard Geography
                </span>
                <h2 className="font-display text-xl uppercase text-[#1C1917]">
                  Site Risk Ranking
                </h2>
              </div>
              <span className="text-xs font-bold text-[#1C1917]/60">
                Precursor Density
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={siteRiskData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1C1917" opacity={0.15} />
                  <XAxis type="number" stroke="#1C1917" fontSize={11} fontWeight={700} />
                  <YAxis dataKey="site" type="category" stroke="#1C1917" fontSize={10} fontWeight={700} width={90} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1C1917",
                      border: "2px solid #F59E0B",
                      color: "#E4E2DD",
                      fontWeight: "bold",
                    }}
                  />
                  <Bar dataKey="incidents" name="High-SIF Count" fill="#FF4500" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 3: 📋 GENERAL INCIDENT MANIFEST & AUDIT LOG
            ========================================================================= */}
        <section className="border-2 border-[#1C1917] bg-[#E4E2DD] shadow-sm">
          {/* Header Bar */}
          <div className="p-6 border-b-2 border-[#1C1917] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1C1917]/60">
                Audit Trail & Historical Screened Database
              </span>
              <h2 className="font-display text-2xl uppercase text-[#1C1917]">
                Total Safety Manifest ({data?.total_reports || 0} Reports)
              </h2>
            </div>

            {/* Sort Filter Buttons */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1917]/60 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Sort:
              </span>
              <button
                onClick={() => setSortBy("risk")}
                className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-[#1C1917] cursor-pointer transition-colors ${
                  sortBy === "risk"
                    ? "bg-[#1C1917] text-[#E4E2DD]"
                    : "bg-[#E4E2DD] text-[#1C1917] hover:bg-[#1C1917]/10"
                }`}
              >
                Risk (High SIF)
              </button>
              <button
                onClick={() => setSortBy("recent")}
                className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-[#1C1917] cursor-pointer transition-colors ${
                  sortBy === "recent"
                    ? "bg-[#1C1917] text-[#E4E2DD]"
                    : "bg-[#E4E2DD] text-[#1C1917] hover:bg-[#1C1917]/10"
                }`}
              >
                Most Recent
              </button>
            </div>
          </div>

          {/* Table with Terms & Conditions style scroll container */}
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto border-t-2 border-[#1C1917]/20">
            <table className="w-full text-left border-collapse relative">
              <thead className="sticky top-0 z-10 bg-[#E4E2DD] border-b-2 border-[#1C1917] shadow-sm">
                <tr className="bg-[#1C1917]/10 text-[10px] font-black uppercase tracking-wider text-[#1C1917]">
                  <th className="p-4">SIF Potential</th>
                  <th className="p-4">Incident Log / Verbatim</th>
                  <th className="p-4 hidden md:table-cell">Energy Class</th>
                  <th className="p-4 hidden lg:table-cell">Barrier State</th>
                  <th className="p-4 hidden sm:table-cell">Review Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C1917]/10 text-xs">
                {sortedReports.map((report) => (
                  <tr
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className="hover:bg-[#1C1917]/5 cursor-pointer transition-colors"
                  >
                    <td className="p-4">
                      <span
                        className={`inline-block px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border ${
                          report.sif_score >= 0.6
                            ? "bg-[#FF4500] text-[#1C1917] border-[#1C1917]"
                            : report.sif_score >= 0.3
                            ? "bg-[#F59E0B] text-[#1C1917] border-[#1C1917]"
                            : "bg-[#1C1917]/10 text-[#1C1917] border-[#1C1917]/20"
                        }`}
                      >
                        {Math.round(report.sif_score * 100)}% SIF
                      </span>
                    </td>
                    <td className="p-4 font-bold text-[#1C1917] max-w-md">
                      <p className="line-clamp-2">"{report.raw_text}"</p>
                      <p className="text-[10px] font-medium text-[#1C1917]/40 mt-1">
                        {new Date(report.timestamp).toLocaleString()}
                      </p>
                    </td>
                    <td className="p-4 hidden md:table-cell font-bold text-[#1C1917]/70">
                      {report.energy_type} (Lvl {report.energy_level})
                    </td>
                    <td className="p-4 hidden lg:table-cell font-bold text-[#1C1917]/70">
                      {report.barrier_status}
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          report.status === "Confirm"
                            ? "bg-emerald-700 text-white"
                            : report.status === "Reject"
                            ? "bg-red-700 text-white"
                            : "bg-[#1C1917]/10 text-[#1C1917]"
                        }`}
                      >
                        {report.status || "Pending"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedReport(report);
                        }}
                        className="text-[10px] font-black uppercase tracking-wider text-[#FF4500] hover:underline"
                      >
                        Inspect →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* =========================================================================
          MODAL 1: 📂 BULK INGESTION STUDIO MODAL (CSV, JSON, TXT & 1-CLICK DEMO)
          ========================================================================= */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-[#1C1917]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="border-4 border-[#1C1917] bg-[#E4E2DD] max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowBulkModal(false)}
              className="absolute top-4 right-4 p-1 text-[#1C1917]/50 hover:text-[#FF4500] transition-colors cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2 border-b-2 border-[#1C1917] pb-3 mb-6">
              <UploadCloud className="h-6 w-6 text-[#FF4500]" />
              <div>
                <h2 className="font-display text-2xl uppercase text-[#1C1917]">
                  Bulk Report Ingestion Studio
                </h2>
                <p className="text-xs font-medium text-[#1C1917]/60">
                  Fast parallel AI screening for historical logs (CSV, JSON, multi-line logs).
                </p>
              </div>
            </div>

            {/* Ingestion Mode Tabs */}
            <div className="flex border-2 border-[#1C1917] mb-6 bg-[#1C1917]/5">
              <button
                onClick={() => setBulkTab("file")}
                className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${
                  bulkTab === "file"
                    ? "bg-[#1C1917] text-[#E4E2DD]"
                    : "text-[#1C1917] hover:bg-[#1C1917]/10"
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Upload File (CSV / JSON)
              </button>
              <button
                onClick={() => setBulkTab("demo")}
                className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${
                  bulkTab === "demo"
                    ? "bg-[#1C1917] text-[#E4E2DD]"
                    : "text-[#1C1917] hover:bg-[#1C1917]/10"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-[#F59E0B]" /> 1-Click OIL Batch
              </button>
              <button
                onClick={() => setBulkTab("paste")}
                className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${
                  bulkTab === "paste"
                    ? "bg-[#1C1917] text-[#E4E2DD]"
                    : "text-[#1C1917] hover:bg-[#1C1917]/10"
                }`}
              >
                <FileText className="h-3.5 w-3.5" /> Paste Text
              </button>
            </div>

            {/* TAB 1: CSV / JSON FILE DROPZONE */}
            {bulkTab === "file" && (
              <div className="space-y-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,.json,.txt"
                  className="hidden"
                />

                {/* Dropzone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#1C1917]/40 hover:border-[#FF4500] bg-[#1C1917]/5 p-8 text-center cursor-pointer transition-colors"
                >
                  <UploadCloud className="h-10 w-10 text-[#FF4500] mx-auto mb-2" />
                  <p className="text-xs font-black uppercase tracking-wider text-[#1C1917]">
                    Click to browse or Drag & Drop CSV / JSON / TXT
                  </p>
                  <p className="text-[11px] text-[#1C1917]/60 mt-1">
                    Supports spreadsheets with columns: <code>location, incident_description</code>
                  </p>
                </div>

                {/* Template Download Utility */}
                <div className="flex justify-between items-center bg-[#E4E2DD] border border-[#1C1917]/20 p-3 text-xs">
                  <span className="font-bold text-[#1C1917]/70">Need a format template?</span>
                  <button
                    onClick={downloadSampleCSV}
                    className="text-[11px] font-black uppercase tracking-wider text-[#FF4500] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> Download Sample CSV
                  </button>
                </div>

                {/* Parsed File Preview */}
                {parsedFileRows.length > 0 && (
                  <div className="p-4 bg-[#1C1917] text-[#E4E2DD] border-2 border-[#1C1917] text-xs space-y-2">
                    <div className="flex justify-between items-center text-[#F59E0B] font-black uppercase">
                      <span>File: {uploadedFileName}</span>
                      <span>{parsedFileRows.length} Reports Found</span>
                    </div>
                    <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] text-[#E4E2DD]/80 font-mono bg-[#1C1917]/50 p-2 border border-[#E4E2DD]/20">
                      {parsedFileRows.slice(0, 3).map((r, i) => (
                        <div key={i} className="truncate">
                          • [{r.location || "Site A"}] "{r.text}"
                        </div>
                      ))}
                      {parsedFileRows.length > 3 && (
                        <div className="text-[10px] text-[#F59E0B]">
                          ... and {parsedFileRows.length - 3} more reports ready for screening
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRunBulkUpload(parsedFileRows)}
                      disabled={bulkProcessing}
                      className="w-full btn-slide bg-[#FF4500] text-[#1C1917] py-2.5 text-xs font-black uppercase tracking-widest border-2 border-[#1C1917] cursor-pointer mt-2 disabled:opacity-40"
                    >
                      <span>⚡ Run Parallel AI Screening ({parsedFileRows.length} Reports)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: 1-CLICK DEMO BATCH */}
            {bulkTab === "demo" && (
              <div className="p-5 bg-[#F59E0B]/15 border-2 border-[#F59E0B] space-y-4">
                <div>
                  <h3 className="text-sm font-black uppercase text-[#1C1917] flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#F59E0B]" />
                    1-Click OIL India Historical Incident Batch
                  </h3>
                  <p className="text-xs text-[#1C1917]/80 mt-1 leading-relaxed">
                    Instantly load 10 realistic past incident scenarios across drilling rigs, tank farms, high-pressure lines, and electrical substations (in English & Hinglish) to demonstrate sub-2-second parallel AI screening.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-[#1C1917]/70 bg-[#E4E2DD] p-3 border border-[#1C1917]/20">
                  <div>• 3x High-SIF Fall & Confined Hazards</div>
                  <div>• 2x Gas Line Pressure Precursors</div>
                  <div>• 2x Electrical Arc-Flash Scenarios</div>
                  <div>• 3x Low-SIF Administrative Logs</div>
                </div>

                <button
                  onClick={handleLoadSampleBatch}
                  disabled={bulkProcessing}
                  className="w-full py-3 bg-[#1C1917] hover:bg-[#FF4500] hover:text-[#1C1917] text-[#E4E2DD] text-xs font-black uppercase tracking-widest border-2 border-[#1C1917] cursor-pointer transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <Zap className="h-4 w-4 text-[#F59E0B]" />
                  <span>{bulkProcessing ? "Screening Parallel Batch…" : "Run Batch Screening (10 Reports in ~2s) ⚡"}</span>
                </button>
              </div>
            )}

            {/* TAB 3: MULTI-LINE PASTE */}
            {bulkTab === "paste" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#1C1917]/60 mb-1">
                    Paste Safety Logs (1 report per line):
                  </label>
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={`Worker ne bina harness crane ke neeche kaam kiya...\nGas valve pressure gauge showing 150 PSI over limit in pump cellar...\nOffice ergonomic chair wheel broken near desk...`}
                    rows={6}
                    className="w-full p-3 bg-[#1C1917]/5 border-2 border-[#1C1917]/25 text-xs font-medium text-[#1C1917] resize-none focus:border-[#FF4500] focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleParseAndUploadText}
                  disabled={bulkProcessing || !bulkText.trim()}
                  className="w-full btn-slide bg-[#1C1917] text-[#E4E2DD] py-3 text-xs font-black uppercase tracking-widest border-2 border-[#1C1917] cursor-pointer disabled:opacity-40"
                >
                  <span>Start Parallel Batch AI Triage →</span>
                </button>
              </div>
            )}

            {/* Progress Indicator */}
            {bulkProcessing && (
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-[11px] font-black uppercase text-[#1C1917]">
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#FF4500]" />
                    Processing Parallel Groq AI Threads…
                  </span>
                  <span>{bulkProgress}%</span>
                </div>
                <div className="w-full bg-[#1C1917]/10 h-3 border border-[#1C1917]/30 overflow-hidden">
                  <div
                    className="bg-[#FF4500] h-full transition-all duration-300"
                    style={{ width: `${bulkProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Results Summary Box */}
            {bulkResult && (
              <div className="mt-4 p-4 bg-[#1C1917] text-[#E4E2DD] border-2 border-[#F59E0B] text-xs space-y-2 animate-in fade-in">
                <p className="font-black uppercase text-[#F59E0B] flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Batch Screening Complete!
                </p>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="p-2 bg-[#E4E2DD]/10 border border-[#E4E2DD]/20">
                    <span className="block text-lg font-black">{bulkResult.total_processed}</span>
                    <span className="text-[9px] uppercase tracking-wider text-[#E4E2DD]/60">Screened</span>
                  </div>
                  <div className="p-2 bg-[#FF4500]/20 border border-[#FF4500]">
                    <span className="block text-lg font-black text-[#FF4500]">{bulkResult.high_sif_count}</span>
                    <span className="text-[9px] uppercase tracking-wider text-[#FF4500]">High SIF Precursors</span>
                  </div>
                  <div className="p-2 bg-[#E4E2DD]/10 border border-[#E4E2DD]/20">
                    <span className="block text-lg font-black text-[#F59E0B]">{bulkResult.emergencies_count}</span>
                    <span className="text-[9px] uppercase tracking-wider text-[#F59E0B]">Auto-Escalated</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-5 py-2.5 bg-transparent border-2 border-[#1C1917]/30 text-[#1C1917] text-xs font-black uppercase tracking-widest hover:bg-[#1C1917]/10 cursor-pointer"
              >
                Close Studio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: 🔍 DEEP-DIVE BOWTIE & SIF EXPLAINABILITY MODAL
          ========================================================================= */}
      {selectedReport && (
        <div className="fixed inset-0 bg-[#1C1917]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="border-4 border-[#1C1917] bg-[#E4E2DD] max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedReport(null)}
              className="absolute top-4 right-4 p-1 text-[#1C1917]/50 hover:text-[#FF4500] transition-colors cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-[#1C1917] pb-4 mb-6 gap-2">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF4500]">
                  Deep-Dive Investigation // ID #{selectedReport.id.slice(0, 8)}
                </span>
                <h2 className="font-display text-2xl sm:text-3xl uppercase text-[#1C1917]">
                  Incident Risk Decomposition
                </h2>
              </div>
              <span
                className={`px-3 py-1 text-xs font-black uppercase tracking-wider border-2 border-[#1C1917] inline-block ${
                  selectedReport.sif_score >= 0.6
                    ? "bg-[#FF4500] text-[#1C1917]"
                    : "bg-[#F59E0B] text-[#1C1917]"
                }`}
              >
                SIF Potential: {Math.round(selectedReport.sif_score * 100)}%
              </span>
            </div>

            <div className="space-y-6">
              {/* 1. Verbatim Quote */}
              <div className="p-4 bg-[#1C1917]/5 border-2 border-[#1C1917]/20">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#1C1917]/50 block mb-1">
                  Original Log / Field Narrative
                </span>
                <p className="text-sm font-bold text-[#1C1917] leading-relaxed">
                  "{selectedReport.raw_text}"
                </p>
              </div>

              {/* 2. Bowtie Causal Chain */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#1C1917] mb-2 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-[#FF4500]" />
                  <span>Bowtie Causal Chain Decomposition</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="p-3 bg-[#FF4500]/10 border-2 border-[#FF4500] text-xs">
                    <span className="block text-[9px] font-black uppercase tracking-widest text-[#FF4500]">
                      1. Initiating Hazard
                    </span>
                    <p className="font-bold text-[#1C1917] mt-1">
                      {selectedReport.causal_chain?.hazard || "Unspecified"}
                    </p>
                  </div>
                  <div className="p-3 bg-[#F59E0B]/15 border-2 border-[#F59E0B] text-xs">
                    <span className="block text-[9px] font-black uppercase tracking-widest text-[#F59E0B]">
                      2. Barrier Failure
                    </span>
                    <p className="font-bold text-[#1C1917] mt-1">
                      {selectedReport.causal_chain?.barrier_failure || "Barrier bypassed"}
                    </p>
                  </div>
                  <div className="p-3 bg-[#1C1917] text-[#E4E2DD] border-2 border-[#1C1917] text-xs">
                    <span className="block text-[9px] font-black uppercase tracking-widest text-[#FF4500]">
                      3. Potential SIF Outcome
                    </span>
                    <p className="font-bold text-[#E4E2DD] mt-1">
                      {selectedReport.causal_chain?.consequence || "Fatal injury / major blowout"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. AI Reasoning Explanation */}
              <div className="p-4 bg-[#1C1917] text-[#E4E2DD] border-2 border-[#1C1917] text-xs space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#F59E0B] flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> AI Engineering Reasoning
                </span>
                <p className="font-medium text-[#E4E2DD]/85 leading-relaxed">
                  {selectedReport.explanation || "Energy release combined with missing physical defense mechanism creates elevated SIF precursor potential."}
                </p>
              </div>

              {/* 4. Historical Twins Matching */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#1C1917] mb-2 flex items-center gap-1.5">
                  <LinkIcon className="h-3.5 w-3.5 text-[#F59E0B]" />
                  <span>SBERT Semantic Historical Twins (Repeat Barrier Failures)</span>
                </h3>

                {loadingTwins ? (
                  <p className="text-xs font-bold text-[#1C1917]/50 animate-pulse">
                    Computing vector similarity across historical incident database…
                  </p>
                ) : twins.length > 0 ? (
                  <div className="space-y-2">
                    {twins.slice(0, 3).map((twin, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-[#E4E2DD] border border-[#1C1917]/20 flex justify-between items-center text-xs"
                      >
                        <div className="max-w-lg">
                          <p className="font-bold text-[#1C1917] line-clamp-1">
                            "{twin.raw_text}"
                          </p>
                          <span className="text-[10px] font-bold text-[#FF4500] uppercase tracking-wider">
                            {twin.similarity_score}% Semantic Match · SIF {Math.round(twin.sif_score * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-bold text-[#1C1917]/40">
                    No close historical twin matches found.
                  </p>
                )}
              </div>

              {/* 5. Human-in-the-Loop Feedback Training */}
              <div className="pt-4 border-t-2 border-[#1C1917]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#1C1917]/60">
                  Human Supervisor Audit Feedback:
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => submitFeedback(selectedReport.id, "Confirm")}
                    className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-2 border-[#1C1917] cursor-pointer transition-colors ${
                      selectedReport.status === "Confirm"
                        ? "bg-emerald-700 text-white"
                        : "bg-[#E4E2DD] hover:bg-emerald-700 hover:text-white text-[#1C1917]"
                    }`}
                  >
                    Confirm SIF Precursor ✓
                  </button>
                  <button
                    onClick={() => submitFeedback(selectedReport.id, "Reject")}
                    className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-2 border-[#1C1917] cursor-pointer transition-colors ${
                      selectedReport.status === "Reject"
                        ? "bg-red-700 text-white"
                        : "bg-[#E4E2DD] hover:bg-red-700 hover:text-white text-[#1C1917]"
                    }`}
                  >
                    Reject / False Positive ✗
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full py-4 text-center text-[10px] font-bold uppercase tracking-widest text-[#1C1917]/40 border-t border-[#1C1917]/10">
        SIFense Predictive Safety Suite // OIL India Limited · SIF Screening Engine
      </footer>
    </div>
  );
}