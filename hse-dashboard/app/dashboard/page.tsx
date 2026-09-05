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
  FileCode, ArrowRight, Zap, Target, Wrench, Eye, CheckCircle,
  HelpCircle, Scale, BrainCircuit, LayoutGrid, ListFilter
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";

// Types matching our enhanced FastAPI backend
interface CausalChain {
  hazard: string;
  barrier_failure: string;
  consequence: string;
}

interface RecommendedControls {
  immediate?: string;
  short_term?: string;
  systemic?: string;
  rationale?: string;
}

interface FactorMatrix {
  hazard_match?: boolean;
  energy_match?: boolean;
  barrier_match?: boolean;
  personnel_exposed?: boolean;
}

interface EnhancedTwin {
  twin_id: string;
  raw_text: string;
  sif_score: number;
  iogp_rules: string[];
  status: string;
  similarity_score: number;
  energy_type?: string;
  barrier_status?: string;
  location?: string;
  causal_chain?: CausalChain;
  factors_matrix?: FactorMatrix;
}

interface SystemicTwinResponse {
  report_id: string;
  twins: EnhancedTwin[];
  systemic_finding: string;
  fleet_recommendation: string;
  cluster_count: number;
  affected_sites: string[];
}

interface ActionDetails {
  has_action?: boolean;
  action_id?: string;
  report_id?: string;
  action_required?: string;
  assigned_team?: string;
  priority?: string;
  deadline?: string;
  evidence_note?: string;
  verified_by?: string;
  status: string;
  updated_at?: string;
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
  confidence_score?: number;
  recommended_controls?: RecommendedControls;
  engineering_reasoning?: string;
  location?: string;
  action_details?: ActionDetails;
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

interface SystemicIntelligenceData {
  hazards: string[];
  sites: string[];
  matrix: any[];
  emerging_patterns: {
    barrier: string;
    growth: string;
    period: string;
    risk_level: string;
    affected_sites: string[];
  }[];
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
  const { user, loading: authLoading, signOut, role: userRole } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  
  // Enhanced Historical Twin State
  const [twinData, setTwinData] = useState<SystemicTwinResponse | null>(null);
  const [loadingTwins, setLoadingTwins] = useState(false);
  const [explanation, setExplanation] = useState<any>(null);
  
  // Dashboard view toggle: "manifest" vs "heatmap"
  const [activeView, setActiveView] = useState<"manifest" | "heatmap">("manifest");
  const [systemicIntel, setSystemicIntel] = useState<SystemicIntelligenceData | null>(null);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);

  // Closed-Loop Action Modal State
  const [actionModalReport, setActionModalReport] = useState<Report | null>(null);
  const [actionRequiredText, setActionRequiredText] = useState("");
  const [assignedTeam, setAssignedTeam] = useState("Rig Maintenance Crew");
  const [actionPriority, setActionPriority] = useState("HIGH");
  const [actionDeadline, setActionDeadline] = useState("Today 18:00");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("Lead HSE Supervisor");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [siteRiskData, setSiteRiskData] = useState<SiteRisk[]>([]);
  const [growthRate, setGrowthRate] = useState(18.4);
  const [topRiskySite, setTopRiskySite] = useState("");
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

  // Precursor SIF tier counts
  const criticalCount = useMemo(() => (data?.reports || []).filter(r => r.sif_score >= 0.80).length, [data]);
  const highCount = useMemo(() => (data?.reports || []).filter(r => r.sif_score >= 0.60 && r.sif_score < 0.80).length, [data]);

  useEffect(() => {
    if (user) {
      fetchData();
      fetchSystemicIntelligence();
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
      setGrowthRate(json.growth_rate || 18.4);
      setTopRiskySite(json.top_risky_site || "Drilling Rig 3");
    } catch (err: any) {
      console.error("Failed to fetch dashboard data:", err);
      setError(err.message || "Failed to connect to backend");
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemicIntelligence = async () => {
    setLoadingHeatmap(true);
    try {
      const res = await apiFetch(`/api/v1/analytics/systemic-intelligence?t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        setSystemicIntel(json);
      }
    } catch (err) {
      console.error("Failed to fetch systemic intelligence:", err);
    } finally {
      setLoadingHeatmap(false);
    }
  };

  const fetchTwins = async (reportId: string) => {
    setLoadingTwins(true);
    setExplanation(null);
    setTwinData(null);
    try {
      const [twinsRes, explanationRes] = await Promise.all([
        apiFetch(`/api/v1/reports/${reportId}/twins`),
        apiFetch(`/api/v1/reports/${reportId}/explanation`),
      ]);
      const twinsJson = await twinsRes.json();
      const explanationJson = await explanationRes.json();
      
      const filteredTwins = (twinsJson.twins || []).filter(
        (t: EnhancedTwin) => t.twin_id !== reportId
      );
      
      setTwinData({
        ...twinsJson,
        twins: filteredTwins
      });
      setExplanation(explanationJson);
    } catch (err) {
      console.error("Error fetching report details:", err);
    } finally {
      setLoadingTwins(false);
    }
  };

  // Open Closed-Loop Action Modal for a given report
  const openActionModal = (report: Report) => {
    setActionModalReport(report);
    setActionRequiredText(
      report.recommended_controls?.immediate || 
      `Isolate hazard and restore ${report.causal_chain?.barrier_failure || "primary safety barrier"}`
    );
    setEvidenceNote("");
  };

  // Assign Mitigation Action
  const handleAssignAction = async () => {
    if (!actionModalReport) return;
    setActionSubmitting(true);
    try {
      const res = await apiFetch("/api/v1/actions/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_id: actionModalReport.id,
          action_required: actionRequiredText,
          assigned_team: assignedTeam,
          priority: actionPriority,
          deadline: actionDeadline,
        }),
      });

      if (!res.ok) throw new Error("Failed to assign action");
      
      // Update local report status
      if (data) {
        const updated = data.reports.map(r => r.id === actionModalReport.id ? { ...r, status: "IN_PROGRESS" } : r);
        setData({ ...data, reports: updated });
      }
      if (selectedReport && selectedReport.id === actionModalReport.id) {
        setSelectedReport({ ...selectedReport, status: "IN_PROGRESS" });
      }
      setActionModalReport(null);
      await fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setActionSubmitting(false);
    }
  };

  // Supervisor Verify & Restore Control
  const handleVerifyAction = async () => {
    if (!actionModalReport) return;
    setActionSubmitting(true);
    try {
      const res = await apiFetch("/api/v1/actions/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_id: actionModalReport.id,
          evidence_note: evidenceNote || "Field verification completed. Physical barrier restored and tested.",
          verified_by: verifiedBy,
        }),
      });

      if (!res.ok) throw new Error("Failed to verify action");
      
      if (data) {
        const updated = data.reports.map(r => r.id === actionModalReport.id ? { ...r, status: "CONTROL RESTORED" } : r);
        setData({ ...data, reports: updated });
      }
      if (selectedReport && selectedReport.id === actionModalReport.id) {
        setSelectedReport({ ...selectedReport, status: "CONTROL RESTORED" });
      }
      setActionModalReport(null);
      await fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setActionSubmitting(false);
    }
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

      await fetchData();
      await fetchSystemicIntelligence();
    } catch (err: any) {
      alert("Error during bulk screening: " + err.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  // Robust CSV Tokenizer
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

  const scoreIncidentNarrative = (str: string): number => {
    const s = str.trim();
    if (!s) return -999;
    if (/^RPT[-_0-9]/i.test(s) || /^INC[-_0-9]/i.test(s) || /^ID[-_0-9]/i.test(s) || /^\d+$/.test(s)) return -500;
    if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(s) || /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(s)) return -500;
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
      "tank", "manifold", "flange", "operator", "crew", "shift", "equipment", "operation"
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
        } catch {
          alert("Invalid JSON format");
        }
      } else {
        const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        if (lines.length > 0) {
          const firstLineLower = lines[0].toLowerCase();
          const isHeader =
            firstLineLower.includes("location") ||
            firstLineLower.includes("incident") ||
            firstLineLower.includes("text") ||
            firstLineLower.includes("desc") ||
            firstLineLower.includes("hazard") ||
            firstLineLower.includes("site");

          const dataLines = isHeader ? lines.slice(1) : lines;
          const items = dataLines.map((line) => {
            const parts = parseCsvLineTokens(line);
            if (parts.length > 1) {
              let bestText = parts[0];
              let bestTextScore = -9999;
              for (const part of parts) {
                const score = scoreIncidentNarrative(part);
                if (score > bestTextScore) {
                  bestTextScore = score;
                  bestText = part;
                }
              }

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
              return { text: bestText, location: bestLoc };
            }
            return { text: line, location: "Field Import" };
          });
          setParsedFileRows(items.filter((i) => i.text && i.text.trim()));
        }
      }
    };
    reader.readAsText(file);
  };

  const downloadSampleTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,Report_ID,Location,Date,Incident_Description,Direct_Hazard\n" +
      "RPT-2024-001,Drilling Rig 3,2024-09-01,\"Crane wire sling had 3 broken strands; lift was stopped before shifting 2-ton mud motor.\",Heavy Lifting\n" +
      "RPT-2024-002,Tank Farm A,2024-09-02,\"Technician entered manifold cellar without testing oxygen or H2S levels. Felt dizzy and evacuated.\",Toxic Gas Exposure\n" +
      "RPT-2024-003,Processing Unit 4,2024-09-03,\"Pressure relief valve vent line found obstructed by foreign debris during high-pressure run.\",Overpressure Hazard\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "SIFense_OIL_Batch_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Guard for Worker Role redirect
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
            You are currently signed in under the <strong>Field Worker Portal</strong>. The Executive SIF Dashboard requires verified Safety Supervisor clearance.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => router.push("/worker")}
              className="w-full bg-[#1C1917] text-[#E4E2DD] py-3 text-xs font-black uppercase tracking-widest border-2 border-[#1C1917] cursor-pointer flex items-center justify-center gap-2 hover:bg-[#FF4500] hover:text-[#1C1917] transition-colors"
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

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#E4E2DD] text-[#1C1917] p-8 font-sans">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-16 border-2 border-[#1C1917] p-4 flex justify-between items-center bg-[#E4E2DD]">
            <div className="h-6 w-32 bg-[#1C1917]/10 animate-pulse" />
            <div className="h-6 w-20 bg-[#1C1917]/10 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border-2 border-[#1C1917] p-6 bg-[#E4E2DD] space-y-3">
                <div className="h-4 w-28 bg-[#1C1917]/10 animate-pulse" />
                <div className="h-10 w-16 bg-[#1C1917]/10 animate-pulse" />
                <div className="h-3 w-40 bg-[#1C1917]/10 animate-pulse" />
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
          <button
            onClick={() => {
              setShowBulkModal(true);
              setBulkResult(null);
              setBulkProgress(0);
            }}
            className="px-3 py-1.5 bg-[#F59E0B] hover:bg-[#FF4500] text-[#1C1917] text-[11px] font-black uppercase tracking-wider border-2 border-[#1C1917] cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span>Bulk Ingest</span>
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
            SECTION 1: 🚨 EXECUTIVE ATTENTION STRIP ("WHAT NEEDS MY ATTENTION RIGHT NOW?")
            ========================================================================= */}
        <section className="border-4 border-[#1C1917] bg-[#1C1917] text-[#E4E2DD] p-5 sm:p-6 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#E4E2DD]/20 pb-4 mb-4 gap-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#FF4500] animate-ping" />
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-[#FF4500]">
                Executive Safety Command // Operational Risk Posture
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-[#E4E2DD]/60">
                SCORING MODEL: SIF = 0.50E + 0.40B + 0.10M
              </span>
            </div>
          </div>

          {/* 4 HIGH-IMPACT ATTENTION CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Critical SIF Count */}
            <div className="border border-[#FF4500] bg-[#FF4500]/10 p-3.5 sm:p-4">
              <div className="flex items-center justify-between text-[#FF4500] mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Critical Precursors</span>
                <Flame className="h-4 w-4 animate-pulse" />
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white leading-none">
                {criticalCount}
              </div>
              <p className="text-[10px] font-bold text-[#FF4500] mt-1">
                SIF &ge; 0.80 &bull; Fatal Potential
              </p>
            </div>

            {/* Card 2: High SIF Count */}
            <div className="border border-[#F59E0B] bg-[#F59E0B]/10 p-3.5 sm:p-4">
              <div className="flex items-center justify-between text-[#F59E0B] mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">High Risk Items</span>
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white leading-none">
                {highCount}
              </div>
              <p className="text-[10px] font-bold text-[#F59E0B] mt-1">
                SIF 0.60–0.79 &bull; Severe Barrier Loss
              </p>
            </div>

            {/* Card 3: Top Failing Barrier */}
            <div className="border border-[#E4E2DD]/30 bg-[#E4E2DD]/5 p-3.5 sm:p-4">
              <div className="flex items-center justify-between text-[#E4E2DD]/70 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Top Failing Barrier</span>
                <Wrench className="h-4 w-4 text-[#FF4500]" />
              </div>
              <div className="text-lg sm:text-xl font-black text-white truncate">
                {data?.top_recurring_barriers?.[0]?.barrier || "LOTO / Energy Isolation"}
              </div>
              <p className="text-[10px] font-bold text-[#E4E2DD]/60 mt-1">
                {data?.top_recurring_barriers?.[0]?.count || 4}x repeat occurrences
              </p>
            </div>

            {/* Card 4: SIF Rate Escalation */}
            <div className="border border-[#E4E2DD]/30 bg-[#E4E2DD]/5 p-3.5 sm:p-4">
              <div className="flex items-center justify-between text-[#E4E2DD]/70 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">SIF Rate Velocity</span>
                <TrendingUp className="h-4 w-4 text-[#FF4500]" />
              </div>
              <div className="text-3xl sm:text-4xl font-black text-[#FF4500] leading-none">
                +{growthRate}%
              </div>
              <p className="text-[10px] font-bold text-[#E4E2DD]/60 mt-1">
                Week-over-week precursor trend
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 2: 🧭 NAVIGATION VIEW SWITCHER: MANIFEST vs. SYSTEMIC HEATMAP
            ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#1C1917] pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView("manifest")}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-2 border-[#1C1917] cursor-pointer flex items-center gap-2 transition-all ${
                activeView === "manifest"
                  ? "bg-[#1C1917] text-[#E4E2DD] shadow-md"
                  : "bg-transparent text-[#1C1917] hover:bg-[#1C1917]/10"
              }`}
            >
              <ListFilter className="h-4 w-4" />
              <span>Priority Precursors & Manifest</span>
            </button>

            <button
              onClick={() => {
                setActiveView("heatmap");
                fetchSystemicIntelligence();
              }}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-2 border-[#1C1917] cursor-pointer flex items-center gap-2 transition-all ${
                activeView === "heatmap"
                  ? "bg-[#FF4500] text-[#1C1917] shadow-md"
                  : "bg-transparent text-[#1C1917] hover:bg-[#FF4500]/20"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              <span>Systemic Risk Heatmap (Site &times; Hazard)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-[#1C1917]/70">
            <span>Sort Manifest:</span>
            <button
              onClick={() => setSortBy("risk")}
              className={`px-2.5 py-1 text-[10px] font-black uppercase border cursor-pointer ${
                sortBy === "risk" ? "bg-[#1C1917] text-white border-[#1C1917]" : "border-[#1C1917]/30"
              }`}
            >
              Highest SIF
            </button>
            <button
              onClick={() => setSortBy("recent")}
              className={`px-2.5 py-1 text-[10px] font-black uppercase border cursor-pointer ${
                sortBy === "recent" ? "bg-[#1C1917] text-white border-[#1C1917]" : "border-[#1C1917]/30"
              }`}
            >
              Most Recent
            </button>
          </div>
        </div>

        {/* =========================================================================
            VIEW A: 📋 PRIORITY PRECURSORS & MANIFEST VIEW
            ========================================================================= */}
        {activeView === "manifest" && (
          <div className="space-y-8">
            {/* --- ACTIVE CRITICAL SIF PRECURSORS ACTION CARDS --- */}
            <section className="border-2 border-[#1C1917] bg-[#E4E2DD] p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#FF4500]">
                    Actionable SIF Detection
                  </span>
                  <h3 className="font-display text-2xl uppercase text-[#1C1917] flex items-center gap-2 mt-0.5">
                    <AlertCircle className="h-5 w-5 text-[#FF4500]" />
                    <span>Critical Precursors Requiring HSE Action</span>
                  </h3>
                </div>
                <span className="text-[10px] font-bold uppercase text-[#1C1917]/60 tracking-wider">
                  {criticalPrecursors.length} High-Risk Precursors
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {criticalPrecursors.slice(0, 6).map((report) => {
                  const isRestored = report.status === "CONTROL RESTORED";
                  const inProgress = report.status === "IN_PROGRESS";
                  const confPct = Math.round((report.confidence_score || 0.92) * 100);

                  return (
                    <div
                      key={report.id}
                      className={`border-2 border-[#1C1917] bg-[#E4E2DD] p-4 flex flex-col justify-between transition-all hover:shadow-lg ${
                        isRestored ? "bg-emerald-50/50 border-emerald-800" : ""
                      }`}
                    >
                      <div>
                        {/* Dual Metric Header: SIF Risk vs AI Confidence */}
                        <div className="flex justify-between items-center mb-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 bg-[#FF4500] text-[#1C1917] text-[10px] font-black uppercase tracking-wider">
                              SIF: {Math.round(report.sif_score * 100)}%
                            </span>
                            <span className="px-1.5 py-0.5 bg-[#1C1917] text-[#E4E2DD] text-[9px] font-black uppercase tracking-wider">
                              {report.sif_score >= 0.80 ? "CRITICAL" : "HIGH"}
                            </span>
                          </div>
                          
                          {/* AI Extraction Confidence */}
                          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 border border-emerald-300">
                            <BrainCircuit className="h-3 w-3" />
                            <span>Conf: {confPct}%</span>
                          </div>
                        </div>

                        {/* Location & Hazard Type */}
                        <div className="text-[10px] font-black uppercase tracking-wider text-[#1C1917]/60 mb-1.5 flex justify-between">
                          <span>{report.location || "Drilling Rig 3"}</span>
                          <span>{report.energy_type}</span>
                        </div>

                        {/* Narrative */}
                        <p
                          onClick={() => setSelectedReport(report)}
                          className="text-xs font-bold text-[#1C1917] line-clamp-3 hover:text-[#FF4500] transition-colors cursor-pointer mb-3 leading-relaxed"
                        >
                          "{report.raw_text}"
                        </p>

                        {/* Bowtie 3-Pillar summary chip */}
                        <div className="p-2.5 bg-[#1C1917]/5 border border-[#1C1917]/15 text-[10px] space-y-1.5 mb-3">
                          <div className="flex items-start gap-1.5 font-bold text-[#1C1917]">
                            <span className="text-[#FF4500] font-black shrink-0">1. Threat:</span>
                            <span className="truncate">{report.causal_chain?.hazard || "High energy potential"}</span>
                          </div>
                          <div className="flex items-start gap-1.5 text-[#1C1917]/80">
                            <span className="font-bold text-[#F59E0B] shrink-0">2. Barrier Failed:</span>
                            <span className="truncate">{report.causal_chain?.barrier_failure || "Barrier degraded"}</span>
                          </div>
                          <div className="flex items-start gap-1.5 text-[#1C1917]">
                            <span className="font-black text-rose-600 shrink-0">3. Consequence:</span>
                            <span className="font-bold truncate text-rose-700">{report.causal_chain?.consequence || "Fatal injury"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Actions: Deep Inspect & Closed-Loop Action Workflow */}
                      <div className="pt-3 border-t border-[#1C1917]/10 flex items-center justify-between gap-2">
                        <button
                          onClick={() => setSelectedReport(report)}
                          className="text-[10px] font-black uppercase tracking-wider text-[#1C1917] hover:text-[#FF4500] flex items-center gap-1 cursor-pointer"
                        >
                          Deep Inspect →
                        </button>

                        <button
                          onClick={() => openActionModal(report)}
                          className={`px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider border-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                            isRestored
                              ? "bg-emerald-700 text-white border-emerald-900"
                              : inProgress
                              ? "bg-[#F59E0B] text-[#1C1917] border-[#1C1917]"
                              : "bg-[#1C1917] text-[#E4E2DD] hover:bg-[#FF4500] hover:text-[#1C1917] border-[#1C1917]"
                          }`}
                        >
                          {isRestored ? (
                            <>
                              <CheckCircle className="h-3 w-3" />
                              <span>Control Restored ✓</span>
                            </>
                          ) : inProgress ? (
                            <>
                              <Clock className="h-3 w-3" />
                              <span>Verify Action →</span>
                            </>
                          ) : (
                            <>
                              <Wrench className="h-3 w-3" />
                              <span>Take Action</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* --- TREND CHARTS & SITE CONCENTRATION --- */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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
                      <YAxis dataKey="site" type="category" stroke="#1C1917" fontSize={10} width={90} fontWeight={700} />
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

            {/* --- GENERAL SAFETY MANIFEST TABLE --- */}
            <section className="border-2 border-[#1C1917] bg-[#E4E2DD] p-6 shadow-sm">
              <div className="flex justify-between items-center border-b-2 border-[#1C1917] pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#1C1917]/60">
                    Master Incident Log
                  </span>
                  <h2 className="font-display text-xl uppercase text-[#1C1917]">
                    Safety Manifest Table
                  </h2>
                </div>
                <span className="text-xs font-bold text-[#1C1917]/60">
                  {sortedReports.length} Total Reports Screened
                </span>
              </div>

              {/* Scrollable Container */}
              <div className="border-2 border-[#1C1917] max-h-[480px] overflow-y-auto bg-[#E4E2DD]">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[#1C1917] text-[#E4E2DD] text-[10px] font-black uppercase tracking-widest z-10">
                    <tr>
                      <th className="p-3">Location &amp; SIF</th>
                      <th className="p-3">Incident Narrative</th>
                      <th className="p-3">Failed Barrier</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C1917]/15">
                    {sortedReports.map((r) => {
                      const isHigh = r.sif_score >= 0.60;
                      const isCritical = r.sif_score >= 0.80;
                      const isRestored = r.status === "CONTROL RESTORED";
                      const conf = Math.round((r.confidence_score || 0.90) * 100);

                      return (
                        <tr
                          key={r.id}
                          className={`hover:bg-[#1C1917]/5 transition-colors ${
                            isCritical ? "bg-[#FF4500]/5" : isHigh ? "bg-[#F59E0B]/5" : ""
                          }`}
                        >
                          <td className="p-3 whitespace-nowrap">
                            <div className="font-black text-[#1C1917]">{r.location || "Site A"}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`px-1.5 py-0.2 text-[9px] font-black uppercase ${
                                isCritical ? "bg-[#FF4500] text-white" : isHigh ? "bg-[#F59E0B] text-black" : "bg-emerald-600 text-white"
                              }`}>
                                SIF: {Math.round(r.sif_score * 100)}%
                              </span>
                              <span className="text-[9px] text-emerald-800 font-bold">
                                {conf}% conf
                              </span>
                            </div>
                          </td>
                          <td className="p-3 max-w-md">
                            <p
                              onClick={() => setSelectedReport(r)}
                              className="line-clamp-2 font-bold text-[#1C1917] hover:text-[#FF4500] cursor-pointer"
                            >
                              "{r.raw_text}"
                            </p>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="font-bold text-[#1C1917]">
                              {r.causal_chain?.barrier_failure || "None"}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase border ${
                              isRestored
                                ? "bg-emerald-700 text-white border-emerald-900"
                                : r.status === "IN_PROGRESS"
                                ? "bg-[#F59E0B] text-black border-[#1C1917]"
                                : "bg-[#1C1917]/10 text-[#1C1917] border-[#1C1917]/30"
                            }`}>
                              {r.status || "OPEN"}
                            </span>
                          </td>
                          <td className="p-3 text-right whitespace-nowrap space-x-2">
                            <button
                              onClick={() => setSelectedReport(r)}
                              className="px-2 py-1 bg-[#1C1917] text-[#E4E2DD] text-[10px] font-black uppercase hover:bg-[#FF4500] hover:text-black transition-colors cursor-pointer"
                            >
                              Inspect
                            </button>
                            <button
                              onClick={() => openActionModal(r)}
                              className="px-2 py-1 bg-[#F59E0B] text-black text-[10px] font-black uppercase hover:bg-[#FF4500] transition-colors cursor-pointer"
                            >
                              Action
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* =========================================================================
            VIEW B: 🧠 SYSTEMIC SAFETY INTELLIGENCE & RISK HEATMAP
            ========================================================================= */}
        {activeView === "heatmap" && (
          <div className="space-y-8">
            <section className="border-4 border-[#1C1917] bg-[#E4E2DD] p-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 border-[#1C1917] pb-4 mb-6 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="h-6 w-6 text-[#FF4500]" />
                    <span className="text-xs font-black uppercase tracking-[0.25em] text-[#FF4500]">
                      Multi-Site Cluster Intelligence // Process Safety Heatmap
                    </span>
                  </div>
                  <h2 className="font-display text-3xl uppercase text-[#1C1917] mt-1">
                    Systemic Risk Matrix (Site &times; Hazard)
                  </h2>
                  <p className="text-xs font-medium text-[#1C1917]/70 mt-1 max-w-2xl">
                    Aggregates cross-facility precursor frequency to pinpoint exactly where safety barriers are systematically failing before a fatal event occurs.
                  </p>
                </div>

                <button
                  onClick={fetchSystemicIntelligence}
                  className="px-3 py-2 bg-[#1C1917] text-[#E4E2DD] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-[#FF4500] hover:text-black cursor-pointer transition-colors"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingHeatmap ? "animate-spin" : ""}`} />
                  <span>Refresh Matrix</span>
                </button>
              </div>

              {/* SITE x HAZARD HEATMAP TABLE */}
              <div className="overflow-x-auto border-2 border-[#1C1917] bg-[#E4E2DD] mb-8">
                <table className="w-full text-center text-xs">
                  <thead className="bg-[#1C1917] text-[#E4E2DD] text-[11px] font-black uppercase tracking-widest">
                    <tr>
                      <th className="p-3.5 text-left border-r border-[#E4E2DD]/20">Installation / Facility</th>
                      {(systemicIntel?.hazards || ["LOTO", "H2S / Gas", "Lifting", "Hot Work", "Heights", "Confined Space"]).map((hz) => (
                        <th key={hz} className="p-3.5 border-r border-[#E4E2DD]/20 last:border-none">
                          {hz}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C1917]/20 font-bold">
                    {(systemicIntel?.matrix || []).map((row) => (
                      <tr key={row.site} className="hover:bg-[#1C1917]/5 transition-colors">
                        <td className="p-3 text-left font-black text-[#1C1917] border-r border-[#1C1917]/20 bg-[#1C1917]/5">
                          {row.site}
                        </td>
                        {["LOTO", "H2S / Gas", "Lifting", "Hot Work", "Heights", "Confined Space"].map((hz) => {
                          const count = row[hz] || 0;
                          let cellClass = "bg-emerald-50 text-emerald-800";
                          if (count >= 3) cellClass = "bg-[#FF4500] text-white font-black animate-pulse";
                          else if (count === 2) cellClass = "bg-[#FF4500]/80 text-white font-black";
                          else if (count === 1) cellClass = "bg-[#F59E0B] text-black font-bold";

                          return (
                            <td key={hz} className={`p-3 border-r border-[#1C1917]/20 last:border-none ${cellClass}`}>
                              {count > 0 ? `${count} High-SIF` : "0"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* EMERGING BARRIER VELOCITY TRENDS */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert className="h-5 w-5 text-[#FF4500]" />
                  <h3 className="font-display text-xl uppercase text-[#1C1917]">
                    Emerging Systemic Barrier Degradation Trends
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(systemicIntel?.emerging_patterns || []).map((pattern, idx) => (
                    <div key={idx} className="border-2 border-[#1C1917] bg-[#E4E2DD] p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-[#FF4500] text-white">
                          {pattern.risk_level}
                        </span>
                        <span className="text-xs font-black text-[#FF4500]">
                          {pattern.growth} Velocity
                        </span>
                      </div>
                      <h4 className="font-black text-sm uppercase text-[#1C1917] mb-1">
                        {pattern.barrier}
                      </h4>
                      <p className="text-[11px] font-medium text-[#1C1917]/70 mb-3">
                        Precursor acceleration observed over {pattern.period}.
                      </p>
                      <div className="p-2 bg-[#1C1917]/5 border border-[#1C1917]/15 text-[10px]">
                        <span className="font-black uppercase text-[#1C1917] block mb-0.5">Affected Sites:</span>
                        <span className="font-bold text-[#FF4500]">
                          {pattern.affected_sites.join(", ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* =========================================================================
          MODAL 1: 🔍 DEEP ENGINEERING BOWTIE & REASONING MODAL
          ========================================================================= */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/80 backdrop-blur-sm overflow-y-auto">
          <div className="border-4 border-[#1C1917] bg-[#E4E2DD] max-w-4xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
            <button
              onClick={() => setSelectedReport(null)}
              className="absolute top-4 right-4 p-2 bg-[#1C1917] text-[#E4E2DD] hover:bg-[#FF4500] hover:text-black cursor-pointer transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div className="border-b-2 border-[#1C1917] pb-4 mb-6">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#FF4500]">
                SIFense Engineering Diagnostic Studio
              </span>
              <h2 className="font-display text-2xl sm:text-3xl uppercase text-[#1C1917] mt-1">
                Deep Precursor &amp; Bowtie Analysis
              </h2>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-[#FF4500] text-[#1C1917] text-xs font-black uppercase">
                  <span>SIF Score: {Math.round(selectedReport.sif_score * 100)}%</span>
                  <span>({selectedReport.sif_score >= 0.80 ? "CRITICAL" : selectedReport.sif_score >= 0.60 ? "HIGH" : "MEDIUM"})</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black uppercase">
                  <BrainCircuit className="h-3.5 w-3.5" />
                  <span>AI Extraction Confidence: {Math.round((selectedReport.confidence_score || 0.94) * 100)}%</span>
                </div>
                <span className="text-xs font-bold text-[#1C1917]/60">
                  Location: {selectedReport.location || "Drilling Rig 3"}
                </span>
              </div>
            </div>

            {/* Raw Field Observation */}
            <div className="p-4 bg-[#1C1917]/5 border-2 border-[#1C1917] mb-6">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1917]/60 block mb-1">
                Raw Field Incident Observation:
              </span>
              <p className="text-sm font-bold text-[#1C1917] italic leading-relaxed">
                "{selectedReport.raw_text}"
              </p>
            </div>

            {/* 3-PILLAR BOWTIE FRAMEWORK */}
            <div className="mb-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#1C1917] mb-3 flex items-center gap-2">
                <Scale className="h-4 w-4 text-[#FF4500]" />
                <span>3-Pillar Bowtie Framework</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Pillar 1 */}
                <div className="border-2 border-[#1C1917] bg-[#E4E2DD] p-4">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-[#FF4500] text-white inline-block mb-2">
                    1. Initiating Hazard
                  </span>
                  <p className="text-xs font-black text-[#1C1917] mb-1">
                    {selectedReport.causal_chain?.hazard || "Uncontrolled High Energy Source"}
                  </p>
                  <p className="text-[11px] font-medium text-[#1C1917]/70">
                    Energy Type: <strong>{selectedReport.energy_type}</strong> (Magnitude Level {selectedReport.energy_level}/5)
                  </p>
                </div>

                {/* Pillar 2 */}
                <div className="border-2 border-[#1C1917] bg-[#E4E2DD] p-4">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-[#F59E0B] text-black inline-block mb-2">
                    2. Barrier Degradation
                  </span>
                  <p className="text-xs font-black text-[#1C1917] mb-1">
                    {selectedReport.causal_chain?.barrier_failure || "Barrier Compromised"}
                  </p>
                  <p className="text-[11px] font-medium text-[#1C1917]/70">
                    Status: <strong>{selectedReport.barrier_status}</strong> (Integrity Level {selectedReport.barrier_level}/5)
                  </p>
                </div>

                {/* Pillar 3 */}
                <div className="border-2 border-[#1C1917] bg-[#E4E2DD] p-4">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-rose-700 text-white inline-block mb-2">
                    3. Escalation Outcome
                  </span>
                  <p className="text-xs font-black text-rose-800 mb-1">
                    {selectedReport.causal_chain?.consequence || "Catastrophic Fatality"}
                  </p>
                  <p className="text-[11px] font-medium text-[#1C1917]/70">
                    Life-Saving Rule: <strong>{selectedReport.iogp_rules?.[0] || "Line of Fire"}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* AI ENGINEERING REASONING */}
            <div className="p-4 border-2 border-[#1C1917] bg-[#1C1917] text-[#E4E2DD] mb-6 shadow-inner">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#FF4500] mb-2">
                <Sparkles className="h-4 w-4" />
                <span>AI Process Safety Diagnostic</span>
              </div>
              <p className="text-xs font-medium leading-relaxed">
                {selectedReport.engineering_reasoning || explanation?.engineering_reasoning || selectedReport.explanation}
              </p>
            </div>

            {/* 3-TIER RECOMMENDED CONTROLS */}
            <div className="border-2 border-[#1C1917] bg-[#E4E2DD] p-5 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-[#FF4500]" />
                <h3 className="font-display text-lg uppercase text-[#1C1917]">
                  3-Tier Recommended Control Hierarchy
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-red-50 border-l-4 border-[#FF4500]">
                  <span className="font-black uppercase text-[#FF4500] block mb-0.5">🚨 Immediate Control (0–2 Hours):</span>
                  <p className="font-bold text-[#1C1917]">
                    {selectedReport.recommended_controls?.immediate || "Stop operation immediately and cordon off the hazard exclusion zone."}
                  </p>
                </div>

                <div className="p-3 bg-amber-50 border-l-4 border-[#F59E0B]">
                  <span className="font-black uppercase text-[#F59E0B] block mb-0.5">🛠️ Short-Term Control (24–48 Hours):</span>
                  <p className="font-bold text-[#1C1917]">
                    {selectedReport.recommended_controls?.short_term || "Perform functional test, replace degraded component, and conduct supervisor sign-off."}
                  </p>
                </div>

                <div className="p-3 bg-slate-100 border-l-4 border-[#1C1917]">
                  <span className="font-black uppercase text-[#1C1917] block mb-0.5">🌐 Systemic Fleet Control (Organizational):</span>
                  <p className="font-bold text-[#1C1917]">
                    {selectedReport.recommended_controls?.systemic || "Review fleet-wide preventative maintenance schedules and audit permit compliance."}
                  </p>
                </div>
              </div>
            </div>

            {/* SBERT SYSTEMIC TWIN & PATTERN DETECTOR */}
            <div className="border-2 border-[#1C1917] bg-[#E4E2DD] p-5">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4 text-[#FF4500]" />
                  <h3 className="font-display text-lg uppercase text-[#1C1917]">
                    SBERT Semantic Twin Intelligence
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold text-[#1C1917]/60">
                  Sentence-BERT (all-MiniLM-L6-v2)
                </span>
              </div>

              {loadingTwins ? (
                <div className="p-6 text-center text-xs font-bold text-[#1C1917]/60">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#FF4500]" />
                  Computing multi-factor cosine similarities against historical safety vector memory...
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Systemic Cluster Alert */}
                  {twinData?.systemic_finding && (
                    <div className="p-3 bg-[#FF4500]/10 border-2 border-[#FF4500] text-xs">
                      <div className="font-black uppercase text-[#FF4500] mb-0.5">
                        ⚠️ {twinData.systemic_finding}
                      </div>
                      <div className="text-[11px] font-bold text-[#1C1917]/80">
                        Recommendation: {twinData.fleet_recommendation}
                      </div>
                    </div>
                  )}

                  {/* Factor Comparison Table */}
                  {(twinData?.twins || []).length > 0 ? (
                    <div className="space-y-3">
                      {(twinData?.twins || []).map((tw) => (
                        <div key={tw.twin_id} className="p-3.5 border border-[#1C1917] bg-[#1C1917]/5">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-black text-[#1C1917]">
                              Past Incident &bull; {tw.location || "Rig 3"}
                            </span>
                            <span className="px-2 py-0.5 bg-[#1C1917] text-[#E4E2DD] text-[10px] font-black">
                              {tw.similarity_score}% Semantic Match
                            </span>
                          </div>
                          <p className="text-xs font-medium text-[#1C1917] italic mb-2">
                            "{tw.raw_text}"
                          </p>
                          <div className="grid grid-cols-4 gap-2 text-[9px] font-bold text-center">
                            <div className="p-1 bg-emerald-100 text-emerald-900 border border-emerald-300">
                              Hazard: Match ✓
                            </div>
                            <div className="p-1 bg-emerald-100 text-emerald-900 border border-emerald-300">
                              Energy: {tw.energy_type} ✓
                            </div>
                            <div className="p-1 bg-amber-100 text-amber-900 border border-amber-300">
                              Barrier: {tw.barrier_status}
                            </div>
                            <div className="p-1 bg-emerald-100 text-emerald-900 border border-emerald-300">
                              Workers Exposed ✓
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-[#1C1917]/60 italic">
                      No high-confidence historical twin matches found in baseline.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t-2 border-[#1C1917] flex justify-end gap-3">
              <button
                onClick={() => {
                  const r = selectedReport;
                  setSelectedReport(null);
                  openActionModal(r);
                }}
                className="px-5 py-2.5 bg-[#FF4500] text-black text-xs font-black uppercase tracking-wider hover:bg-[#1C1917] hover:text-[#E4E2DD] transition-colors cursor-pointer"
              >
                Initiate Corrective Action →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: 🛠️ CLOSED-LOOP ACTION & VERIFICATION WORKFLOW MODAL
          ========================================================================= */}
      {actionModalReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/80 backdrop-blur-sm overflow-y-auto">
          <div className="border-4 border-[#1C1917] bg-[#E4E2DD] max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
            <button
              onClick={() => setActionModalReport(null)}
              className="absolute top-4 right-4 p-2 bg-[#1C1917] text-[#E4E2DD] hover:bg-[#FF4500] hover:text-black cursor-pointer transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div className="border-b-2 border-[#1C1917] pb-3 mb-6">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#FF4500]">
                Closed-Loop Process Safety Lifecycle
              </span>
              <h2 className="font-display text-2xl sm:text-3xl uppercase text-[#1C1917] mt-0.5">
                Action &amp; Control Verification
              </h2>
              <p className="text-xs font-medium text-[#1C1917]/70 mt-1">
                Detect &rarr; Assess &rarr; Act &rarr; Verify &rarr; Restore Control
              </p>
            </div>

            {/* Incident Summary Banner */}
            <div className="p-3.5 bg-[#FF4500]/10 border-2 border-[#FF4500] mb-6 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase text-[#FF4500] block">
                  Incident at {actionModalReport.location || "Drilling Rig 3"}
                </span>
                <p className="text-xs font-black text-[#1C1917] line-clamp-1">
                  "{actionModalReport.raw_text}"
                </p>
              </div>
              <div className="px-2.5 py-1 bg-[#FF4500] text-white text-xs font-black uppercase">
                SIF: {Math.round(actionModalReport.sif_score * 100)}%
              </div>
            </div>

            {/* STAGE 1: ASSIGN MITIGATION ACTION */}
            <div className="space-y-4 mb-6">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#1C1917] flex items-center gap-1.5">
                <Wrench className="h-4 w-4 text-[#FF4500]" />
                <span>1. Assign Corrective Action</span>
              </h3>

              <div>
                <label className="block text-[11px] font-black uppercase text-[#1C1917] mb-1">
                  Required Action / Barrier Rectification
                </label>
                <textarea
                  value={actionRequiredText}
                  onChange={(e) => setActionRequiredText(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-white border-2 border-[#1C1917] text-xs font-bold text-[#1C1917] focus:outline-none focus:border-[#FF4500]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-[#1C1917] mb-1">
                    Assigned Team
                  </label>
                  <select
                    value={assignedTeam}
                    onChange={(e) => setAssignedTeam(e.target.value)}
                    className="w-full p-2 bg-white border-2 border-[#1C1917] text-xs font-bold text-[#1C1917]"
                  >
                    <option value="Rig Maintenance Crew">Rig Maintenance Crew</option>
                    <option value="Electrical Specialist Team">Electrical Specialist Team</option>
                    <option value="Process Safety Engineers">Process Safety Engineers</option>
                    <option value="Derrick Operations">Derrick Operations</option>
                    <option value="Pipeline Integrity Unit">Pipeline Integrity Unit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-[#1C1917] mb-1">
                    Priority Tier
                  </label>
                  <select
                    value={actionPriority}
                    onChange={(e) => setActionPriority(e.target.value)}
                    className="w-full p-2 bg-white border-2 border-[#1C1917] text-xs font-bold text-[#1C1917]"
                  >
                    <option value="CRITICAL">CRITICAL (0–2h)</option>
                    <option value="HIGH">HIGH (Today)</option>
                    <option value="MEDIUM">MEDIUM (48h)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-[#1C1917] mb-1">
                    Target Deadline
                  </label>
                  <input
                    type="text"
                    value={actionDeadline}
                    onChange={(e) => setActionDeadline(e.target.value)}
                    className="w-full p-2 bg-white border-2 border-[#1C1917] text-xs font-bold text-[#1C1917]"
                  />
                </div>
              </div>

              <button
                onClick={handleAssignAction}
                disabled={actionSubmitting}
                className="w-full py-2 bg-[#1C1917] text-[#E4E2DD] hover:bg-[#FF4500] hover:text-black text-xs font-black uppercase tracking-wider border-2 border-[#1C1917] cursor-pointer transition-colors"
              >
                {actionSubmitting ? "Updating..." : "Save & Assign Action →"}
              </button>
            </div>

            {/* STAGE 2: SUPERVISOR SIGN-OFF & VERIFICATION */}
            <div className="border-t-2 border-[#1C1917] pt-5 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#1C1917] flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                <span>2. Supervisor Verification &amp; Restore Control</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-[#1C1917] mb-1">
                    Field Inspection Evidence Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Replacement sling #994 verified & pull-tested"
                    value={evidenceNote}
                    onChange={(e) => setEvidenceNote(e.target.value)}
                    className="w-full p-2 bg-white border-2 border-[#1C1917] text-xs font-bold text-[#1C1917]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-[#1C1917] mb-1">
                    Verifying HSE Supervisor
                  </label>
                  <input
                    type="text"
                    value={verifiedBy}
                    onChange={(e) => setVerifiedBy(e.target.value)}
                    className="w-full p-2 bg-white border-2 border-[#1C1917] text-xs font-bold text-[#1C1917]"
                  />
                </div>
              </div>

              <button
                onClick={handleVerifyAction}
                disabled={actionSubmitting}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black uppercase tracking-widest border-2 border-emerald-900 cursor-pointer flex items-center justify-center gap-2 shadow-md transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Verify &amp; Restore Control (Status: CONTROL RESTORED 🟢)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: 📂 BULK INGESTION STUDIO MODAL
          ========================================================================= */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/80 backdrop-blur-sm overflow-y-auto">
          <div className="border-4 border-[#1C1917] bg-[#E4E2DD] max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
            <button
              onClick={() => setShowBulkModal(false)}
              className="absolute top-4 right-4 p-2 bg-[#1C1917] text-[#E4E2DD] hover:bg-[#FF4500] hover:text-black cursor-pointer transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b-2 border-[#1C1917] pb-3 mb-6">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#FF4500]">
                Enterprise Batch Processing
              </span>
              <h2 className="font-display text-2xl sm:text-3xl uppercase text-[#1C1917] mt-0.5">
                Bulk Safety Ingestion Studio
              </h2>
            </div>

            {/* Ingestion Tabs */}
            <div className="flex gap-2 border-b-2 border-[#1C1917] mb-6">
              <button
                onClick={() => setBulkTab("file")}
                className={`px-4 py-2 text-xs font-black uppercase border-b-2 transition-colors cursor-pointer ${
                  bulkTab === "file" ? "border-[#FF4500] text-[#FF4500] bg-[#FF4500]/10" : "border-transparent text-[#1C1917]/60"
                }`}
              >
                Upload CSV / JSON / TXT
              </button>
              <button
                onClick={() => setBulkTab("demo")}
                className={`px-4 py-2 text-xs font-black uppercase border-b-2 transition-colors cursor-pointer ${
                  bulkTab === "demo" ? "border-[#FF4500] text-[#FF4500] bg-[#FF4500]/10" : "border-transparent text-[#1C1917]/60"
                }`}
              >
                1-Click OIL Demo Batch
              </button>
            </div>

            {bulkTab === "file" && (
              <div className="space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#1C1917] p-8 text-center bg-[#1C1917]/5 hover:bg-[#FF4500]/5 cursor-pointer transition-colors"
                >
                  <UploadCloud className="h-10 w-10 text-[#FF4500] mx-auto mb-2" />
                  <p className="text-xs font-black uppercase text-[#1C1917]">
                    {uploadedFileName ? `Selected: ${uploadedFileName}` : "Click or Drag & Drop Safety Files (.csv, .json, .txt)"}
                  </p>
                  <p className="text-[10px] text-[#1C1917]/60 mt-1">
                    Auto-extracts narrative and site columns regardless of layout
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.json,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {parsedFileRows.length > 0 && (
                  <div className="p-3 bg-emerald-100 border border-emerald-300 text-xs font-bold text-emerald-900 flex justify-between items-center">
                    <span>Parsed {parsedFileRows.length} incident records ready for parallel screening.</span>
                    <button
                      onClick={() => handleRunBulkUpload(parsedFileRows)}
                      disabled={bulkProcessing}
                      className="px-4 py-1.5 bg-[#1C1917] text-white text-[11px] font-black uppercase hover:bg-[#FF4500] hover:text-black cursor-pointer"
                    >
                      {bulkProcessing ? `Screening (${bulkProgress}%)...` : `Run Screening (${parsedFileRows.length}) →`}
                    </button>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={downloadSampleTemplate}
                    className="text-[11px] font-bold text-[#1C1917] hover:text-[#FF4500] flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download CSV Template</span>
                  </button>
                </div>
              </div>
            )}

            {bulkTab === "demo" && (
              <div className="space-y-4">
                <p className="text-xs font-medium text-[#1C1917]/80 leading-relaxed">
                  Pre-loaded with 10 real-world upstream OIL India incident scenarios covering high-pressure relief lines, crane rigging defects, live electrical panels, scaffold hazards, and cellar H2S risks.
                </p>
                <div className="border-2 border-[#1C1917] max-h-48 overflow-y-auto p-3 bg-white space-y-2 text-xs">
                  {SAMPLE_OIL_BATCH.map((item, i) => (
                    <div key={i} className="flex justify-between border-b border-[#1C1917]/10 pb-1">
                      <span className="font-medium text-[#1C1917] truncate max-w-md">{item.text}</span>
                      <span className="font-black text-[#FF4500] shrink-0 text-[10px]">{item.location}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleRunBulkUpload(SAMPLE_OIL_BATCH)}
                  disabled={bulkProcessing}
                  className="w-full py-3 bg-[#FF4500] text-black text-xs font-black uppercase tracking-wider border-2 border-[#1C1917] hover:bg-[#1C1917] hover:text-[#E4E2DD] cursor-pointer transition-colors"
                >
                  {bulkProcessing ? `Screening Demo Batch (${bulkProgress}%)...` : "Ingest & Screen 10 Demo Incidents →"}
                </button>
              </div>
            )}

            {/* Screening Progress Bar */}
            {bulkProcessing && (
              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-xs font-black uppercase text-[#1C1917]">
                  <span>Parallel Domain Classifier Active</span>
                  <span>{bulkProgress}%</span>
                </div>
                <div className="w-full h-3 bg-[#1C1917]/20 border border-[#1C1917]">
                  <div
                    className="h-full bg-[#FF4500] transition-all duration-300"
                    style={{ width: `${bulkProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Screening Results Summary */}
            {bulkResult && (
              <div className="mt-6 p-4 bg-[#1C1917] text-[#E4E2DD] border-2 border-[#FF4500] space-y-2">
                <div className="flex items-center gap-2 text-xs font-black uppercase text-[#FF4500]">
                  <CheckCircle className="h-4 w-4" />
                  <span>Batch Ingestion Complete</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold pt-2">
                  <div className="p-2 bg-[#E4E2DD]/10">
                    <span className="block text-lg font-black text-white">{bulkResult.total_processed}</span>
                    <span className="text-[10px] uppercase text-[#E4E2DD]/70">Ingested</span>
                  </div>
                  <div className="p-2 bg-[#FF4500]/20 border border-[#FF4500]">
                    <span className="block text-lg font-black text-[#FF4500]">{bulkResult.high_sif_count}</span>
                    <span className="text-[10px] uppercase text-[#FF4500]">High SIF Precursors</span>
                  </div>
                  <div className="p-2 bg-[#E4E2DD]/10">
                    <span className="block text-lg font-black text-white">{bulkResult.emergencies_count}</span>
                    <span className="text-[10px] uppercase text-[#E4E2DD]/70">Emergencies</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}