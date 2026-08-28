"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, ShieldCheck, Activity, MapPin, Clock, ChevronRight, X, Link as LinkIcon, AlertCircle } from "lucide-react";

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
    // Adding ?t= forces the browser to ignore cache and get fresh data
    const res = await fetch(`http://127.0.0.1:8000/api/v1/reports/dashboard?t=${Date.now()}`);
    const json = await res.json();
    console.log("✅ Dashboard data fetched:", json.total_reports, "reports"); // DEBUG LOG
    setData(json);
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
  } finally {
    setLoading(false);
  }
};

  const fetchTwins = async (reportId: string) => {
    setLoadingTwins(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/reports/${reportId}/twins`);
      const json = await res.json();
      // Filter out the exact same report (100% match to itself) for cleaner demo
      const filteredTwins = json.twins.filter((t: Twin) => t.twin_id !== reportId);
      setTwins(filteredTwins);
    } catch (error) {
      console.error("Failed to fetch twins:", error);
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Reports Analyzed</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{data?.total_reports || 0}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">High SIF Potential (≥0.6)</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{data?.high_sif_count || 0}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">System Status</p>
                <p className="text-lg font-bold text-green-600 mt-2 flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  Online & Processing
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Triage Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Priority Triage Queue</h2>
            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">Sorted by SIF Score (Highest First)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SIF Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Incident Report</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Energy / Barrier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IOGP Rules</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.reports.slice(0, 20).map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full border ${getSifColor(report.sif_score)}`}>
                        {(report.sif_score * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 font-medium line-clamp-2 max-w-md">{report.raw_text}</div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {report.timestamp.split("T")[0]}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{report.energy_type}</div>
                      <div className="text-xs text-gray-500">Barrier: {report.barrier_status}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {report.iogp_rules.map((rule, idx) => (
                          <span key={idx} className="px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-700 rounded border border-indigo-100">
                            {rule}
                          </span>
                        ))}
                        {report.iogp_rules.length === 0 && <span className="text-xs text-gray-400">None</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => setSelectedReport(report)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                      >
                        Review <ChevronRight className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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