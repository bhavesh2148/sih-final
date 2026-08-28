"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import {
  AlertTriangle, ShieldCheck, Activity, Clock,
  X, Link as LinkIcon, AlertCircle, TrendingUp,
  Building2, ArrowUpRight, HardHat, ChevronDown,
  LogOut, UserCheck
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

interface DashboardData {
  total_reports: number;
  high_sif_count: number;
  precursor_alert: boolean;
  precursor_message: string;
  reports: Report[];
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
      const res = await fetch(
        `http://127.0.0.1:8000/api/v1/reports/dashboard?t=${Date.now()}`
      );
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
        fetch(`http://127.0.0.1:8000/api/v1/reports/${reportId}/twins`),
        fetch(`http://127.0.0.1:8000/api/v1/reports/${reportId}/explanation`),
      ]);
      const twinsJson = await twinsRes.json();
      const explanationJson = await explanationRes.json();
      const filteredTwins = twinsJson.twins.filter(
        (t: Twin) => t.twin_id !== reportId
      );
      setTwins(filteredTwins);
      setExplanation(explanationJson);
    } catch (err) {
      console.error("Failed to fetch twins or explanation:", err);
      setTwins([]);
    } finally {
      setLoadingTwins(false);
    }
  };

  const handleFeedback = async (
    reportId: string,
    feedback: "Confirm" | "Reject"
  ) => {
    try {
      await fetch(
        `http://127.0.0.1:8000/api/v1/reports/${reportId}/feedback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(feedback),
        }
      );
      alert(
        `Report ${feedback.toLowerCase()}ed successfully! Added to training data.`
      );
      setSelectedReport(null);
      fetchData();
    } catch {
      alert("Failed to submit feedback. Please try again.");
    }
  };

  // --- LOADING STATE ---
  if (loading) {
    return (
      <div className="min-h-screen bg-[#E4E2DD]">
        {/* Nav skeleton */}
        <nav className="fixed top-0 left-0 w-full z-50 px-6 py-4 flex justify-between items-center bg-[#E4E2DD] border-b-2 border-[#1C1917]">
          <div className="h-5 w-24 skeleton-pulse" />
          <div className="h-5 w-16 skeleton-pulse" />
        </nav>
        <div className="max-w-7xl mx-auto px-6 pt-24 space-y-6">
          {/* Card skeletons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border-2 border-[#1C1917] p-6 h-36">
                <div className="h-3 w-32 skeleton-pulse mb-4" />
                <div className="h-12 w-20 skeleton-pulse mb-4" />
                <div className="h-1 w-full skeleton-pulse" />
              </div>
            ))}
          </div>
          {/* Table skeleton */}
          <div className="border-2 border-[#1C1917]">
            <div className="bg-[#1C1917] h-12" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="border-t-2 border-[#1C1917] p-5 flex gap-6"
              >
                <div className="h-6 w-12 skeleton-pulse" />
                <div className="h-4 flex-1 skeleton-pulse" />
                <div className="h-4 w-24 skeleton-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- ERROR STATE ---
  if (error) {
    return (
      <div className="min-h-screen bg-[#E4E2DD] flex items-center justify-center px-6">
        <div className="border-2 border-[#1C1917] bg-[#E4E2DD] max-w-lg w-full text-center">
          <div className="bg-[#FF4500] p-4 border-b-2 border-[#1C1917]">
            <AlertTriangle className="h-10 w-10 text-[#1C1917] mx-auto" />
          </div>
          <div className="p-8">
            <h2 className="font-display text-3xl uppercase text-[#1C1917] mb-4">
              Connection Failed
            </h2>
            <p className="text-sm font-medium text-[#1C1917]/70 mb-2">
              Could not reach the SIFense API server.
            </p>
            <p className="text-xs font-bold uppercase tracking-widest text-[#1C1917]/40 mb-6">
              {error}
            </p>
            <button
              onClick={() => {
                setLoading(true);
                setError(null);
                fetchData();
              }}
              className="btn-slide bg-[#1C1917] text-[#E4E2DD] px-8 py-3 text-sm font-bold uppercase tracking-widest border-2 border-[#1C1917] cursor-pointer"
            >
              <span>Retry Connection</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E4E2DD] text-[#1C1917] font-sans">
      {/* ===== NAVIGATION BAR ===== */}
      <nav className="fixed top-0 left-0 w-full z-50 px-6 py-4 flex justify-between items-center bg-[#E4E2DD]/80 backdrop-blur-md border-b-2 border-[#1C1917]/10">
        <div
          className="font-black text-xl uppercase tracking-tighter cursor-pointer"
          onClick={() => router.push("/")}
        >
          SIFense<span className="text-[#FF4500]">.</span>
        </div>
        <div className="hidden md:flex gap-8 text-xs font-bold uppercase tracking-[0.15em]">
          <span className="text-[#FF4500] border-b-2 border-[#FF4500] pb-1">
            Dashboard
          </span>
          <button
            onClick={() => router.push("/worker")}
            className="hover:text-[#FF4500] transition-colors cursor-pointer"
          >
            Worker App
          </button>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-[#1C1917]/5 border border-[#1C1917]/20 text-[11px] font-bold">
              <UserCheck className="h-3.5 w-3.5 text-[#FF4500]" />
              <span className="truncate max-w-[150px]">{user.email}</span>
            </div>
          )}
          <button
            onClick={fetchData}
            className="text-xs font-bold uppercase tracking-widest text-[#1C1917] hover:text-[#FF4500] transition-colors cursor-pointer hidden md:block"
          >
            Refresh
          </button>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-[#1C1917] text-[#E4E2DD] px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F59E0B] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F59E0B]" />
            </span>
            Live
          </div>
          <button
            onClick={async () => {
              await signOut();
              router.push("/login");
            }}
            title="Sign Out"
            className="p-1.5 border border-[#1C1917]/20 hover:bg-[#FF4500] hover:text-white transition-colors cursor-pointer text-[#1C1917]"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </nav>

      {/* ===== MAIN CONTENT ===== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="font-display text-4xl md:text-5xl uppercase text-[#1C1917]">
            HSE Priority<br />
            <span className="text-[#FF4500]">Dashboard</span>
          </h1>
          <p className="text-sm font-medium text-[#1C1917]/60 mt-3 uppercase tracking-widest">
            AI-Powered PSIF Precursor Detection & Triage // OIL India
          </p>
        </div>

        {/* Precursor Alert Banner */}
        {data?.precursor_alert && (
          <div className="mb-6 bg-[#FF4500] border-2 border-[#1C1917] p-4 flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-[#1C1917] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-[#1C1917] font-black uppercase text-sm tracking-widest">
                Precursor Escalation Alert
              </h3>
              <p className="text-[#1C1917]/80 text-xs font-bold mt-1">
                {data.precursor_message ||
                  "High-potential SIF incidents are trending upward. Immediate HSE review recommended."}
              </p>
            </div>
          </div>
        )}

        {/* ===== SUMMARY CARDS ===== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Card 1: Total Reports */}
          <div className="bg-[#1C1917] text-[#E4E2DD] p-6 border-2 border-[#1C1917] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <Activity className="h-24 w-24" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#E4E2DD]/60 mb-2">
              Total Reports Analyzed
            </h3>
            <div className="font-display text-6xl text-[#E4E2DD]">
              {data?.total_reports || 0}
            </div>
            <div className="mt-4 h-1 w-full bg-[#FF4500]" />
          </div>

          {/* Card 2: High SIF Potential */}
          <div className="bg-[#E4E2DD] p-6 border-2 border-[#1C1917] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
              <AlertTriangle className="h-24 w-24 text-[#FF4500]" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#1C1917]/60 mb-2">
              High SIF Potential (≥0.6)
            </h3>
            <div className="font-display text-6xl text-[#FF4500]">
              {data?.high_sif_count || 0}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-2 w-2 bg-[#FF4500] animate-pulse" />
              <span className="text-xs font-bold uppercase text-[#1C1917]">
                Requires Immediate Action
              </span>
            </div>
          </div>

          {/* Card 3: System Status */}
          <div className="bg-[#E4E2DD] p-6 border-2 border-[#1C1917] flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#1C1917]/60 mb-2">
                System Status
              </h3>
              <div className="font-display text-2xl text-[#1C1917] uppercase">
                Online & Processing
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-widest text-[#1C1917]/50">
              <div className="border border-[#1C1917]/20 p-1">SBERT: ACTIVE</div>
              <div className="border border-[#1C1917]/20 p-1">API: CONNECTED</div>
              <div className="border border-[#1C1917]/20 p-1">DB: SYNCED</div>
              <div className="border border-[#1C1917]/20 p-1">QUEUE: 0</div>
            </div>
          </div>
        </div>

        {/* ===== TREND CHARTS ===== */}
        {trendData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            {/* Week-over-Week Trend */}
            <div className="bg-[#E4E2DD] p-6 border-2 border-[#1C1917]">
              <div className="flex items-center justify-between mb-6 border-b-2 border-[#1C1917] pb-2">
                <h3 className="font-display text-xl uppercase tracking-tight text-[#1C1917]">
                  SIF Incident Trend
                </h3>
                <span
                  className={`px-3 py-1 text-xs font-black uppercase tracking-widest border-2 border-[#1C1917] ${
                    growthRate > 0
                      ? "bg-[#FF4500] text-[#1C1917]"
                      : "bg-[#F59E0B] text-[#1C1917]"
                  }`}
                >
                  {growthRate > 0 ? "▲" : "▼"}{" "}
                  {Math.abs(growthRate).toFixed(1)}%
                </span>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid
                    strokeDasharray="0"
                    stroke="#1C1917"
                    strokeOpacity={0.1}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="week"
                    stroke="#1C1917"
                    fontSize={10}
                    fontWeight="bold"
                    tickLine={false}
                    axisLine={{ stroke: "#1C1917", strokeWidth: 2 }}
                  />
                  <YAxis
                    stroke="#1C1917"
                    fontSize={10}
                    fontWeight="bold"
                    tickLine={false}
                    axisLine={{ stroke: "#1C1917", strokeWidth: 2 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1C1917",
                      border: "2px solid #FF4500",
                      borderRadius: "0",
                      color: "#E4E2DD",
                      fontWeight: "bold",
                    }}
                  />
                  <Legend
                    wrapperStyle={{
                      fontSize: "12px",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="high_sif_incidents"
                    stroke="#FF4500"
                    strokeWidth={3}
                    dot={{ fill: "#FF4500", r: 5, strokeWidth: 0 }}
                    name="High SIF"
                  />
                  <Line
                    type="monotone"
                    dataKey="total_incidents"
                    stroke="#1C1917"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Total Incidents"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Site Risk Ranking */}
            <div className="bg-[#E4E2DD] p-6 border-2 border-[#1C1917]">
              <div className="flex items-center justify-between mb-6 border-b-2 border-[#1C1917] pb-2">
                <h3 className="font-display text-xl uppercase tracking-tight text-[#1C1917]">
                  Site Risk Ranking
                </h3>
                <Building2 className="h-5 w-5 text-[#1C1917]" />
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={siteRiskData}
                  layout="vertical"
                  margin={{ left: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="0"
                    stroke="#1C1917"
                    strokeOpacity={0.1}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    stroke="#1C1917"
                    fontSize={10}
                    fontWeight="bold"
                    tickLine={false}
                    axisLine={{ stroke: "#1C1917", strokeWidth: 2 }}
                  />
                  <YAxis
                    dataKey="site"
                    type="category"
                    stroke="#1C1917"
                    fontSize={11}
                    fontWeight="bold"
                    tickLine={false}
                    axisLine={{ stroke: "#1C1917", strokeWidth: 2 }}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1C1917",
                      border: "2px solid #F59E0B",
                      borderRadius: "0",
                      color: "#E4E2DD",
                      fontWeight: "bold",
                    }}
                  />
                  <Bar dataKey="incidents" fill="#1C1917" radius={[0, 0, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {topRiskySite && (
                <div className="mt-4 p-3 bg-[#FF4500] border-2 border-[#1C1917] flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-[#1C1917] flex-shrink-0" />
                  <p className="text-xs font-black uppercase tracking-widest text-[#1C1917]">
                    CRITICAL: {topRiskySite} has the highest SIF-precursor density
                    ({siteRiskData[0]?.incidents} incidents)
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== THREAT MANIFEST TABLE ===== */}
        <div className="bg-[#E4E2DD] border-2 border-[#1C1917] overflow-hidden flex flex-col" style={{ height: '60vh', minHeight: '400px' }}>
          {/* Table Header + Sort Controls (fixed) */}
          <div className="bg-[#1C1917] text-[#E4E2DD] border-b-2 border-[#1C1917] flex-shrink-0">
            {/* Sort Controls Bar */}
            <div className="px-6 py-3 border-b border-[#E4E2DD]/10 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-[#E4E2DD]/40">
                {sortedReports.length} Reports
              </span>
              <div className="flex items-center gap-[2px]">
                <button
                  onClick={() => setSortBy("risk")}
                  className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer border border-[#E4E2DD]/20 ${
                    sortBy === "risk"
                      ? "bg-[#FF4500] text-[#1C1917] border-[#FF4500]"
                      : "bg-transparent text-[#E4E2DD]/60 hover:text-[#E4E2DD]"
                  }`}
                >
                  ▼ High Risk
                </button>
                <button
                  onClick={() => setSortBy("recent")}
                  className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer border border-[#E4E2DD]/20 ${
                    sortBy === "recent"
                      ? "bg-[#F59E0B] text-[#1C1917] border-[#F59E0B]"
                      : "bg-transparent text-[#E4E2DD]/60 hover:text-[#E4E2DD]"
                  }`}
                >
                  ▼ Recent
                </button>
              </div>
            </div>

            {/* Column Headers */}
            <div className="px-6 py-3">
              {/* Desktop header */}
              <div className="hidden md:grid grid-cols-12 gap-4">
                <div className="col-span-1 text-xs font-black uppercase tracking-widest">
                  SIF
                </div>
                <div className="col-span-4 text-xs font-black uppercase tracking-widest">
                  Incident Report
                </div>
                <div className="col-span-3 text-xs font-black uppercase tracking-widest">
                  Energy / Barrier
                </div>
                <div className="col-span-3 text-xs font-black uppercase tracking-widest">
                  IOGP Rules
                </div>
                <div className="col-span-1 text-xs font-black uppercase tracking-widest text-right">
                  Action
                </div>
              </div>
              {/* Mobile header */}
              <div className="md:hidden text-xs font-black uppercase tracking-widest">
                Threat Manifest
              </div>
            </div>
          </div>

          {/* Scrollable Table Body */}
          <div className="flex-1 overflow-y-auto divide-y-2 divide-[#1C1917]">
            {sortedReports.map((report) => (
              <div
                key={report.id}
                className="px-6 py-5 hover:bg-[#F59E0B] transition-colors duration-200 group cursor-pointer text-[#1C1917]"
                onClick={() => setSelectedReport(report)}
              >
                {/* Desktop row */}
                <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-1">
                    <div
                      className={`inline-block px-3 py-1 text-xs font-black uppercase border-2 border-[#1C1917] ${
                        report.sif_score >= 0.6
                          ? "bg-[#FF4500] text-[#1C1917]"
                          : report.sif_score >= 0.3
                          ? "bg-[#F59E0B] text-[#1C1917]"
                          : "bg-[#E4E2DD] text-[#1C1917]"
                      }`}
                    >
                      {Math.round(report.sif_score * 100)}%
                    </div>
                  </div>
                  <div className="col-span-4">
                    <div className="font-bold text-sm leading-tight mb-1 line-clamp-2">
                      {report.raw_text}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-60 flex items-center gap-1">
                      <Clock className="h-3 w-3" />{" "}
                      {report.timestamp?.split("T")[0]}
                    </div>
                  </div>
                  <div className="col-span-3">
                    <div className="font-bold text-sm mb-0.5">
                      {report.energy_type}
                    </div>
                    <div className="text-xs font-medium opacity-80">
                      Barrier: {report.barrier_status}
                    </div>
                  </div>
                  <div className="col-span-3 flex flex-wrap gap-1.5">
                    {report.iogp_rules?.map((rule, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border border-[#1C1917] bg-[#E4E2DD] group-hover:bg-[#1C1917] group-hover:text-[#E4E2DD] transition-colors"
                      >
                        {rule}
                      </span>
                    ))}
                    {(!report.iogp_rules || report.iogp_rules.length === 0) && (
                      <span className="text-[10px] font-bold uppercase opacity-50">
                        None
                      </span>
                    )}
                  </div>
                  <div className="col-span-1 text-right">
                    <button className="font-black uppercase tracking-widest text-xs flex items-center justify-end gap-1 ml-auto group-hover:gap-2 transition-all">
                      Review <span className="text-lg leading-none">›</span>
                    </button>
                  </div>
                </div>

                {/* Mobile row */}
                <div className="md:hidden space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`inline-block px-3 py-1 text-xs font-black uppercase border-2 border-[#1C1917] flex-shrink-0 ${
                        report.sif_score >= 0.6
                          ? "bg-[#FF4500] text-[#1C1917]"
                          : report.sif_score >= 0.3
                          ? "bg-[#F59E0B] text-[#1C1917]"
                          : "bg-[#E4E2DD] text-[#1C1917]"
                      }`}
                    >
                      {Math.round(report.sif_score * 100)}%
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm leading-tight line-clamp-2">
                        {report.raw_text}
                      </p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 flex-shrink-0 opacity-40 group-hover:opacity-100" />
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest opacity-60">
                    <span>{report.energy_type}</span>
                    <span>·</span>
                    <span>{report.barrier_status}</span>
                    <span>·</span>
                    <span>{report.timestamp?.split("T")[0]}</span>
                  </div>
                </div>
              </div>
            ))}

            {sortedReports.length === 0 && (
              <div className="p-12 text-center">
                <p className="font-display text-xl uppercase text-[#1C1917]/50">
                  No Active Threats Detected
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ===== DETAIL MODAL ===== */}
      {selectedReport && (
        <div className="fixed inset-0 bg-[#1C1917]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#E4E2DD] border-2 border-[#1C1917] max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="bg-[#1C1917] text-[#E4E2DD] p-6 flex justify-between items-start sticky top-0 z-10">
              <div>
                <h2 className="font-display text-2xl uppercase">
                  Incident Analysis
                </h2>
                <p className="text-xs font-bold uppercase tracking-widest text-[#E4E2DD]/40 mt-1">
                  ID: {selectedReport.id.slice(0, 8)}…
                </p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-[#E4E2DD]/60 hover:text-[#FF4500] transition-colors cursor-pointer"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Original Report */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-[#1C1917]/50 mb-2">
                  Original Report
                </h3>
                <p className="text-[#1C1917] bg-[#1C1917]/5 p-4 border-2 border-[#1C1917]/20 text-sm font-medium italic">
                  &ldquo;{selectedReport.raw_text}&rdquo;
                </p>
              </div>

              {/* AI Reasoning */}
              <div className="bg-[#1C1917] text-[#E4E2DD] p-4 border-2 border-[#1C1917]">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#F59E0B] mb-2 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> AI Reasoning
                </h3>
                <p className="text-sm font-medium text-[#E4E2DD]/90">
                  {selectedReport.explanation}
                </p>
              </div>

              {/* Causal Chain */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-[#1C1917]/50 mb-3">
                  Causal Chain (Bowtie Analysis)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-[2px] bg-[#1C1917]">
                  <div className="bg-[#FF4500] p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#1C1917]/60 mb-1">
                      Hazard
                    </div>
                    <div className="text-sm font-bold text-[#1C1917]">
                      {selectedReport.causal_chain.hazard}
                    </div>
                  </div>
                  <div className="bg-[#F59E0B] p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#1C1917]/60 mb-1">
                      Barrier Failure
                    </div>
                    <div className="text-sm font-bold text-[#1C1917]">
                      {selectedReport.causal_chain.barrier_failure}
                    </div>
                  </div>
                  <div className="bg-[#E4E2DD] p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#1C1917]/60 mb-1">
                      Consequence
                    </div>
                    <div className="text-sm font-bold text-[#1C1917]">
                      {selectedReport.causal_chain.consequence}
                    </div>
                  </div>
                </div>
              </div>

              {/* SHAP Explainability */}
              {explanation && (
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#1C1917]/50 mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[#FF4500]" /> AI
                    Explainability
                  </h3>

                  {/* Formula */}
                  <div className="bg-[#1C1917] text-[#E4E2DD] p-4 border-2 border-[#1C1917] mb-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#F59E0B] mb-2">
                      SIF Calculation
                    </div>
                    <div className="text-sm font-bold font-mono text-[#E4E2DD]/90">
                      {explanation.formula_breakdown}
                    </div>
                  </div>

                  {/* Feature Bars */}
                  <div className="space-y-3 mb-4">
                    {[
                      {
                        label: "Energy Level",
                        value: explanation.feature_importance.energy_level,
                        color: "#FF4500",
                      },
                      {
                        label: "Barrier Status",
                        value: explanation.feature_importance.barrier_level,
                        color: "#F59E0B",
                      },
                      {
                        label: "Barrier Absence Impact",
                        value:
                          explanation.feature_importance.barrier_status_impact,
                        color: "#1C1917",
                      },
                    ].map((feat) => (
                      <div key={feat.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-bold uppercase tracking-widest text-[#1C1917]/60">
                            {feat.label}
                          </span>
                          <span className="font-black text-[#1C1917]">
                            {(feat.value * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-[#1C1917]/10 h-2">
                          <div
                            className="h-2 transition-all duration-700"
                            style={{
                              width: `${feat.value * 100}%`,
                              backgroundColor: feat.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Key Risk Indicators */}
                  {explanation.key_risk_indicators &&
                    explanation.key_risk_indicators.length > 0 && (
                      <div className="bg-[#FF4500]/10 border-2 border-[#FF4500] p-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[#FF4500] mb-3 flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3" />
                          Key Risk Indicators Detected
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {explanation.key_risk_indicators.map(
                            (ind: any, idx: number) => (
                              <span
                                key={idx}
                                className={`px-3 py-1.5 text-xs font-black uppercase border-2 border-[#1C1917] ${
                                  ind.impact === "High"
                                    ? "bg-[#FF4500] text-[#1C1917]"
                                    : "bg-[#F59E0B] text-[#1C1917]"
                                }`}
                              >
                                {ind.keyword.toUpperCase()}
                                <span className="block text-[9px] font-bold mt-0.5 opacity-70">
                                  {ind.category}
                                </span>
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* Historical Twins */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-[#1C1917]/50 mb-3 flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-[#1C1917]" /> Historical
                  Twin Incidents
                </h3>

                {loadingTwins ? (
                  <div className="flex items-center justify-center p-6 border-2 border-[#1C1917]/20">
                    <div className="h-5 w-5 border-2 border-[#1C1917] border-t-[#FF4500] animate-spin mr-3" />
                    <span className="text-xs font-bold uppercase tracking-widest text-[#1C1917]/60">
                      Finding semantic matches…
                    </span>
                  </div>
                ) : twins.length > 0 ? (
                  <div className="space-y-[2px] bg-[#1C1917]">
                    {twins.map((twin, idx) => (
                      <div
                        key={twin.twin_id}
                        className="bg-[#E4E2DD] p-4 hover:bg-[#F59E0B]/30 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#1C1917]/50">
                            Past Incident #{idx + 1}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-black uppercase border border-[#1C1917] ${
                              twin.similarity_score >= 80
                                ? "bg-[#FF4500] text-[#1C1917]"
                                : twin.similarity_score >= 50
                                ? "bg-[#F59E0B] text-[#1C1917]"
                                : "bg-[#E4E2DD] text-[#1C1917]"
                            }`}
                          >
                            {twin.similarity_score}% Match
                          </span>
                        </div>
                        <p className="text-sm font-medium text-[#1C1917] italic mb-2">
                          &ldquo;{twin.raw_text}&rdquo;
                        </p>
                        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-[#1C1917]/50">
                          <span
                            className={`px-2 py-0.5 border border-[#1C1917] ${
                              twin.sif_score >= 0.6
                                ? "bg-[#FF4500]/20"
                                : "bg-[#1C1917]/5"
                            }`}
                          >
                            SIF: {(twin.sif_score * 100).toFixed(0)}%
                          </span>
                          <span>Status: {twin.status}</span>
                          {twin.iogp_rules.length > 0 && (
                            <span className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />{" "}
                              {twin.iogp_rules.join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 border-2 border-[#1C1917]/20 text-xs font-bold uppercase tracking-widest text-[#1C1917]/40 text-center">
                    No historical twins found for this incident pattern.
                  </div>
                )}
              </div>

              {/* Human in the Loop Actions */}
              <div className="flex gap-[2px] bg-[#1C1917] border-2 border-[#1C1917]">
                <button
                  onClick={() =>
                    handleFeedback(selectedReport.id, "Confirm")
                  }
                  className="flex-1 bg-[#F59E0B] text-[#1C1917] py-4 font-black uppercase tracking-widest text-sm hover:bg-[#FF4500] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="h-5 w-5" /> Confirm SIF
                </button>
                <button
                  onClick={() =>
                    handleFeedback(selectedReport.id, "Reject")
                  }
                  className="flex-1 bg-[#E4E2DD] text-[#1C1917] py-4 font-black uppercase tracking-widest text-sm hover:bg-[#1C1917] hover:text-[#E4E2DD] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <X className="h-5 w-5" /> Reject / False Positive
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}