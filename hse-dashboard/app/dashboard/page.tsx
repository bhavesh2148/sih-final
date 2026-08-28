"use client";

import { useState, useEffect } from "react";
import { 
  AlertTriangle, ShieldCheck, Activity, MapPin, Clock, 
  ChevronRight, X, Link as LinkIcon, AlertCircle, TrendingUp, 
  Building2, BarChart3 
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Legend 
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
  reports: Report[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [twins, setTwins] = useState<Twin[]>([]);
  const [loadingTwins, setLoadingTwins] = useState(false);
  const [trendData, setTrendData] = useState([]);
  const [siteRiskData, setSiteRiskData] = useState([]);
  const [growthRate, setGrowthRate] = useState(0);
  const [topRiskySite, setTopRiskySite] = useState("");
  const [explanation, setExplanation] = useState<any>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch twins whenever a report is selected
  useEffect(() => {
    if (selectedReport) {
      fetchTwins(selectedReport.id);
    }
  }, [selectedReport]);

const fetchData = async () => {
  try {
    const res = await fetch(`http://127.0.0.1:8000/api/v1/reports/dashboard?t=${Date.now()}`);
    const json = await res.json();
    setData(json);
    setTrendData(json.trend_data || []);
    setSiteRiskData(json.site_risk_data || []);
    setGrowthRate(json.growth_rate || 0);
    setTopRiskySite(json.top_risky_site || "");
    console.log("✅ Dashboard data fetched:", json.total_reports, "reports");
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
  } finally {
    setLoading(false);
  }
};
const fetchExplanation = async (reportId: string) => {
  setLoadingExplanation(true);
  try {
    const res = await fetch(`http://127.0.0.1:8000/api/v1/reports/${reportId}/explanation`);
    const json = await res.json();
    setExplanation(json);
  } catch (error) {
    console.error("Failed to fetch explanation:", error);
  } finally {
    setLoadingExplanation(false);
  }
};

const fetchTwins = async (reportId: string) => {
  setLoadingTwins(true);
  try {
    // Fetch twins and explanation in parallel
    const [twinsRes, explanationRes] = await Promise.all([
      fetch(`http://127.0.0.1:8000/api/v1/reports/${reportId}/twins`),
      fetch(`http://127.0.0.1:8000/api/v1/reports/${reportId}/explanation`)
    ]);
    
    const twinsJson = await twinsRes.json();
    const explanationJson = await explanationRes.json();
    
    const filteredTwins = twinsJson.twins.filter((t: Twin) => t.twin_id !== reportId);
    setTwins(filteredTwins);
    setExplanation(explanationJson);
  } catch (error) {
    console.error("Failed to fetch twins or explanation:", error);
    setTwins([]);
  } finally {
    setLoadingTwins(false);
  }
};

  const getSifColor = (score: number) => {
    if (score >= 0.6) return "bg-red-100 text-red-800 border-red-200";
    if (score >= 0.3) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-green-100 text-green-800 border-green-200";
  };

  const getSimilarityColor = (score: number) => {
    if (score >= 80) return "bg-red-100 text-red-700 border-red-200";
    if (score >= 50) return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };
  const handleFeedback = async (reportId: string, feedback: "Confirm" | "Reject") => {
  try {
    await fetch(`http://127.0.0.1:8000/api/v1/reports/${reportId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(feedback),
    });
    
    // Show success message
    alert(`Report ${feedback.toLowerCase()}ed successfully! Added to training data.`);
    
    // Close modal and refresh data
    setSelectedReport(null);
    fetchData();
  } catch (error) {
    alert("Failed to submit feedback. Please try again.");
  }
};

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="h-8 w-8 text-blue-600" />
              SIFense <span className="text-gray-400 font-normal">| OIL India HSE Dashboard</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">AI-Powered PSIF Precursor Detection & Triage</p>
          </div>
          <button 
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
          >
            Refresh Data
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Precursor Alert Banner */}
        {data?.precursor_alert && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-800 font-bold">Precursor Escalation Alert</h3>
              <p className="text-red-700 text-sm mt-1">
                High-potential SIF incidents are trending upward. Immediate HSE review recommended.
              </p>
            </div>
          </div>
        )}
                {/* BRUTALIST SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Card 1: Total Reports (Solid Black) */}
          <div className="bg-[#1C1917] text-[#E4E2DD] p-6 border-2 border-[#1C1917] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <Activity className="h-24 w-24" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#E4E2DD]/60 mb-2">Total Reports Analyzed</h3>
            <div className="font-display text-6xl text-[#E4E2DD]">{data?.total_reports || 0}</div>
            <div className="mt-4 h-1 w-full bg-[#FF4500]"></div>
          </div>

          {/* Card 2: High SIF Potential (High Contrast Warning) */}
          <div className="bg-[#E4E2DD] p-6 border-2 border-[#1C1917] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
              <AlertTriangle className="h-24 w-24 text-[#FF4500]" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#1C1917]/60 mb-2">High SIF Potential (≥0.6)</h3>
            <div className="font-display text-6xl text-[#FF4500]">{data?.high_sif_count || 0}</div>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-2 w-2 bg-[#FF4500] animate-pulse"></div>
              <span className="text-xs font-bold uppercase text-[#1C1917]">Requires Immediate Action</span>
            </div>
          </div>

          {/* Card 3: System Status (Raw Data Block) */}
          <div className="bg-[#E4E2DD] p-6 border-2 border-[#1C1917] flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#1C1917]/60 mb-2">System Status</h3>
              <div className="font-display text-2xl text-[#1C1917] uppercase">Online & Processing</div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-widest text-[#1C1917]/50">
              <div className="border border-[#1C1917]/20 p-1">SBERT: ACTIVE</div>
              <div className="border border-[#1C1917]/20 p-1">API: CONNECTED</div>
              <div className="border border-[#1C1917]/20 p-1">DB: SYNCED</div>
              <div className="border border-[#1C1917]/20 p-1">QUEUE: 0</div>
            </div>
          </div>
        </div>

        {/* BRUTALIST CHARTS SECTION */}
        {trendData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            {/* Week-over-Week Trend Chart */}
            <div className="bg-[#E4E2DD] p-6 border-2 border-[#1C1917]">
              <div className="flex items-center justify-between mb-6 border-b-2 border-[#1C1917] pb-2">
                <h3 className="font-display text-xl uppercase tracking-tight text-[#1C1917]">SIF Incident Trend</h3>
                <span className={`px-3 py-1 text-xs font-black uppercase tracking-widest border-2 border-[#1C1917] ${
                  growthRate > 0 ? "bg-[#FF4500] text-[#1C1917]" : "bg-[#F59E0B] text-[#1C1917]"
                }`}>
                  {growthRate > 0 ? "▲" : "▼"} {Math.abs(growthRate).toFixed(1)}%
                </span>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="0" stroke="#1C1917" strokeOpacity={0.1} vertical={false} />
                  <XAxis dataKey="week" stroke="#1C1917" fontSize={10} fontWeight="bold" tickLine={false} axisLine={{ stroke: '#1C1917', strokeWidth: 2 }} />
                  <YAxis stroke="#1C1917" fontSize={10} fontWeight="bold" tickLine={false} axisLine={{ stroke: '#1C1917', strokeWidth: 2 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1C1917', 
                      border: '2px solid #FF4500',
                      borderRadius: '0',
                      color: '#E4E2DD',
                      fontWeight: 'bold'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}/>
                  <Line type="monotone" dataKey="high_sif_incidents" stroke="#FF4500" strokeWidth={3} dot={{ fill: '#FF4500', r: 5, strokeWidth: 0 }} name="High SIF" />
                  <Line type="monotone" dataKey="total_incidents" stroke="#1C1917" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Total Incidents" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Site Risk Ranking */}
            <div className="bg-[#E4E2DD] p-6 border-2 border-[#1C1917]">
              <div className="flex items-center justify-between mb-6 border-b-2 border-[#1C1917] pb-2">
                <h3 className="font-display text-xl uppercase tracking-tight text-[#1C1917]">Site Risk Ranking</h3>
                <Building2 className="h-5 w-5 text-[#1C1917]" />
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={siteRiskData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="0" stroke="#1C1917" strokeOpacity={0.1} horizontal={false} />
                  <XAxis type="number" stroke="#1C1917" fontSize={10} fontWeight="bold" tickLine={false} axisLine={{ stroke: '#1C1917', strokeWidth: 2 }} />
                  <YAxis dataKey="site" type="category" stroke="#1C1917" fontSize={11} fontWeight="bold" tickLine={false} axisLine={{ stroke: '#1C1917', strokeWidth: 2 }} width={100} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1C1917', 
                      border: '2px solid #F59E0B',
                      borderRadius: '0',
                      color: '#E4E2DD',
                      fontWeight: 'bold'
                    }}
                  />
                  <Bar 
                    dataKey="incidents" 
                    fill="#1C1917"
                    radius={[0, 0, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              {topRiskySite && (
                <div className="mt-4 p-3 bg-[#FF4500] border-2 border-[#1C1917] flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-[#1C1917] flex-shrink-0" />
                  <p className="text-xs font-black uppercase tracking-widest text-[#1C1917]">
                    CRITICAL: {topRiskySite} has the highest SIF-precursor density ({siteRiskData[0]?.incidents} incidents)
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
                {/* BRUTALIST TRIAGE TABLE (THREAT MANIFEST) */}
        <div className="bg-[#E4E2DD] border-2 border-[#1C1917] overflow-hidden">
          
          {/* Table Header */}
          <div className="bg-[#1C1917] text-[#E4E2DD] grid grid-cols-12 gap-4 px-6 py-4 border-b-2 border-[#1C1917]">
            <div className="col-span-1 text-xs font-black uppercase tracking-widest">SIF</div>
            <div className="col-span-4 text-xs font-black uppercase tracking-widest">Incident Report</div>
            <div className="col-span-3 text-xs font-black uppercase tracking-widest">Energy / Barrier</div>
            <div className="col-span-3 text-xs font-black uppercase tracking-widest">IOGP Rules</div>
            <div className="col-span-1 text-xs font-black uppercase tracking-widest text-right">Action</div>
          </div>

          {/* Table Body */}
          <div className="divide-y-2 divide-[#1C1917]">
            {data?.reports.map((report) => (
              <div 
                key={report.id} 
                className="grid grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-[#F59E0B] transition-colors duration-200 group cursor-pointer text-[#1C1917]"
                onClick={() => setSelectedReport(report)}
              >
                {/* SIF Score Badge */}
                <div className="col-span-1">
                  <div className={`inline-block px-3 py-1 text-xs font-black uppercase border-2 border-[#1C1917] ${
                    report.sif_score >= 0.6 ? "bg-[#FF4500] text-[#1C1917]" : "bg-[#F59E0B] text-[#1C1917]"
                  }`}>
                    {Math.round(report.sif_score * 100)}%
                  </div>
                </div>

                {/* Incident Report Text */}
                <div className="col-span-4">
                  <div className="font-bold text-sm leading-tight mb-1 line-clamp-2 group-hover:text-[#1C1917]">
                    {report.raw_text}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest opacity-60 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {report.timestamp?.split('T')[0]}
                  </div>
                </div>

                {/* Energy / Barrier */}
                <div className="col-span-3">
                  <div className="font-bold text-sm mb-0.5">{report.energy_type}</div>
                  <div className="text-xs font-medium opacity-80">Barrier: {report.barrier_status}</div>
                </div>

                {/* IOGP Rules */}
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
                    <span className="text-[10px] font-bold uppercase opacity-50">None</span>
                  )}
                </div>

                {/* Action Button */}
                <div className="col-span-1 text-right">
                  <button className="font-black uppercase tracking-widest text-xs flex items-center justify-end gap-1 ml-auto group-hover:gap-2 transition-all">
                    Review <span className="text-lg leading-none">›</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Empty State (Optional) */}
          {(!data?.reports || data.reports.length === 0) && (
            <div className="p-12 text-center border-t-2 border-[#1C1917]">
              <p className="font-display text-xl uppercase text-[#1C1917]/50">No Active Threats Detected</p>
            </div>
          )}
        </div>
      </main>

      {/* Detail Modal with Historical Twins */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-start sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Incident Analysis Details</h2>
                <p className="text-sm text-gray-500 mt-1">ID: {selectedReport.id}</p>
              </div>
              <button onClick={() => setSelectedReport(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Raw Text */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Original Report</h3>
                <p className="text-gray-900 bg-gray-50 p-4 rounded-lg border border-gray-200 italic">"{selectedReport.raw_text}"</p>
              </div>

              {/* AI Explanation */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> AI Reasoning
                </h3>
                <p className="text-blue-900 text-sm">{selectedReport.explanation}</p>
              </div>

              {/* Causal Chain */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Causal Chain (Bowtie Analysis)</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                    <div className="text-xs font-bold text-red-600 mb-1">HAZARD</div>
                    <div className="text-sm text-gray-800">{selectedReport.causal_chain.hazard}</div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                    <div className="text-xs font-bold text-yellow-600 mb-1">BARRIER FAILURE</div>
                    <div className="text-sm text-gray-800">{selectedReport.causal_chain.barrier_failure}</div>
                  </div>
                  <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
                    <div className="text-xs font-bold text-orange-600 mb-1">CONSEQUENCE</div>
                    <div className="text-sm text-gray-800">{selectedReport.causal_chain.consequence}</div>
                  </div>
                </div>
              </div>
              {/* SHAP Explainability Section */}
{explanation && (
  <div className="mb-6">
    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
      <Activity className="h-4 w-4 text-purple-600" /> AI Explainability (SHAP)
    </h3>
    
    {/* Formula Breakdown */}
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
      <div className="text-xs font-bold text-purple-800 mb-2">SIF CALCULATION</div>
      <div className="text-sm text-purple-900 font-mono">{explanation.formula_breakdown}</div>
    </div>

    {/* Feature Importance Bars */}
    <div className="space-y-3 mb-4">
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="font-medium text-gray-700">Energy Level</span>
          <span className="font-bold text-gray-900">{(explanation.feature_importance.energy_level * 100).toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${explanation.feature_importance.energy_level * 100}%` }}
          ></div>
        </div>
      </div>
      
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="font-medium text-gray-700">Barrier Status</span>
          <span className="font-bold text-gray-900">{(explanation.feature_importance.barrier_level * 100).toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-yellow-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${explanation.feature_importance.barrier_level * 100}%` }}
          ></div>
        </div>
      </div>
      
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="font-medium text-gray-700">Barrier Absence Impact</span>
          <span className="font-bold text-gray-900">{(explanation.feature_importance.barrier_status_impact * 100).toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-red-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${explanation.feature_importance.barrier_status_impact * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
        {/* Key Risk Indicators */}
    {explanation.key_risk_indicators && explanation.key_risk_indicators.length > 0 && (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
        <div className="text-xs font-bold text-orange-800 mb-2 flex items-center gap-2">
          <AlertTriangle className="h-3 w-3" />
          KEY RISK INDICATORS DETECTED
        </div>
        <div className="flex flex-wrap gap-2">
          {explanation.key_risk_indicators.map((ind: any, idx: number) => (
            <span 
              key={idx}
              className={`px-3 py-1.5 text-xs font-bold rounded border ${
                ind.impact === "High" 
                  ? "bg-red-100 text-red-800 border-red-300 shadow-sm" 
                  : "bg-yellow-100 text-yellow-800 border-yellow-300"
              }`}
            >
              {ind.keyword.toUpperCase()}
              <span className="block text-[10px] font-normal mt-0.5 opacity-80">
                {ind.category}
              </span>
            </span>
          ))}
        </div>
      </div>
    )}

    {/* Key Risk Indicators */}
    {explanation.key_risk_indicators.length > 0 && (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="text-xs font-bold text-orange-800 mb-2">KEY RISK INDICATORS DETECTED</div>
        <div className="flex flex-wrap gap-2">
          {explanation.key_risk_indicators.map((ind: any, idx: number) => (
            <span 
              key={idx}
              className={`px-2 py-1 text-xs font-semibold rounded border ${
                ind.impact === "High" 
                  ? "bg-red-100 text-red-800 border-red-200" 
                  : "bg-yellow-100 text-yellow-800 border-yellow-200"
              }`}
            >
              {ind.keyword} ({ind.category})
            </span>
          ))}
        </div>
      </div>
    )}
  </div>
)}

              {/* ⭐ HISTORICAL TWINS SECTION (NEW!) */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-purple-600" /> Historical Twin Incidents
                </h3>
                
                {loadingTwins ? (
                  <div className="flex items-center justify-center p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Finding semantic matches...</span>
                  </div>
                ) : twins.length > 0 ? (
                  <div className="space-y-3">
                    {twins.map((twin, idx) => (
                      <div key={twin.twin_id} className="bg-purple-50 border border-purple-100 rounded-lg p-4 hover:bg-purple-100 transition">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold text-purple-700 uppercase">Past Incident #{idx + 1}</span>
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${getSimilarityColor(twin.similarity_score)}`}>
                            {twin.similarity_score}% Semantic Match
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 italic mb-2">"{twin.raw_text}"</p>
                        <div className="flex items-center gap-3 text-xs">
                          <span className={`px-2 py-0.5 rounded ${getSifColor(twin.sif_score)}`}>
                            SIF: {(twin.sif_score * 100).toFixed(0)}%
                          </span>
                          <span className="text-gray-600">Status: {twin.status}</span>
                          {twin.iogp_rules.length > 0 && (
                            <span className="text-gray-600 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> {twin.iogp_rules.join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-500 text-center">
                    No historical twins found for this incident pattern.
                  </div>
                )}
              </div>

              {/* Human in the Loop Actions */}
                            {/* Human in the Loop Actions */}
              <div className="flex gap-4 pt-4 border-t border-gray-200">
                <button 
                  onClick={() => handleFeedback(selectedReport.id, "Confirm")}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="h-5 w-5" /> Confirm SIF Potential
                </button>
                <button 
                  onClick={() => handleFeedback(selectedReport.id, "Reject")}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition flex items-center justify-center gap-2"
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