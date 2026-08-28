import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

import os
import json
import sqlite3
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer, util
import torch


load_dotenv()

app = FastAPI(title="OIL India SIF Precursor Detection API")

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq Client (Using Llama 3 for fast, multilingual NLP)
groq_api_key = os.getenv("GROQ_API_KEY")
if groq_api_key:
    client = Groq(api_key=groq_api_key)
else:
    client = None
    print("⚠️  GROQ_API_KEY not set — LLM analysis will use fallback mock data")

# --- Database Setup (SQLite for Hackathon Speed) ---
def init_db():
    conn = sqlite3.connect("sif_database.db")
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS reports
                 (id TEXT PRIMARY KEY, timestamp TEXT, raw_text TEXT, is_emergency INTEGER,
                  sif_score REAL, energy_type TEXT, energy_level INTEGER, 
                  barrier_status TEXT, barrier_level INTEGER, causal_chain TEXT, 
                  iogp_rules TEXT, explanation TEXT, status TEXT)''')
    conn.commit()
    conn.close()
# --- SBERT Model for Historical Twin Matching ---
print("🔄 Loading SBERT model for semantic similarity...")
sbert_model = SentenceTransformer('all-MiniLM-L6-v2')
print("✅ SBERT model loaded successfully!")

# Cache for report embeddings (to avoid re-computing)
report_embeddings_cache = {}

def get_or_compute_embeddings():
    """Generate or retrieve cached embeddings for all reports"""
    global report_embeddings_cache
    
    if report_embeddings_cache:
        return report_embeddings_cache
    
    # Fetch all reports from database
    conn = sqlite3.connect("sif_database.db")
    c = conn.cursor()
    c.execute("SELECT id, raw_text FROM reports")
    rows = c.fetchall()
    conn.close()
    
    if not rows:
        return {}
    
    # Extract texts and IDs
    report_ids = [row[0] for row in rows]
    report_texts = [row[1] for row in rows]
    
    # Generate embeddings in batch (fast!)
    print(f"📊 Generating embeddings for {len(report_texts)} reports...")
    embeddings = sbert_model.encode(report_texts, convert_to_tensor=True, batch_size=32)
    
    # Cache them
    for i, report_id in enumerate(report_ids):
        report_embeddings_cache[report_id] = embeddings[i]
    
    print(f"✅ Cached {len(report_embeddings_cache)} report embeddings")
    return report_embeddings_cache

def find_historical_twins(report_text: str, top_k: int = 3) -> list:
    """
    Find semantically similar past reports using SBERT cosine similarity
    Returns list of twins with similarity scores
    """
    embeddings = get_or_compute_embeddings()
    
    if not embeddings:
        return []
    
    # Generate embedding for new report
    report_embedding = sbert_model.encode(report_text, convert_to_tensor=True)
    
    # Calculate cosine similarity with all cached reports
    similarity_scores = []
    for report_id, cached_embedding in embeddings.items():
        cos_score = util.cos_sim(report_embedding, cached_embedding)[0][0].item()
        similarity_scores.append((report_id, cos_score))
    
    # Sort by similarity (highest first) and get top_k
    similarity_scores.sort(key=lambda x: x[1], reverse=True)
    top_twins = similarity_scores[:top_k]
    
    # Fetch full details for top twins
    conn = sqlite3.connect("sif_database.db")
    c = conn.cursor()
    
    twins_data = []
    for report_id, score in top_twins:
        c.execute("""SELECT id, raw_text, sif_score, iogp_rules, status 
                     FROM reports WHERE id = ?""", (report_id,))
        row = c.fetchone()
        if row:
            twins_data.append({
                "twin_id": row[0],
                "raw_text": row[1],
                "sif_score": row[2],
                "iogp_rules": json.loads(row[3]) if row[3] else [],
                "status": row[4],
                "similarity_score": round(score * 100, 1)  # Convert to percentage
            })
    
    conn.close()
    return twins_data
init_db()

# --- Pydantic Models ---
class ReportSubmission(BaseModel):
    text: str
    is_voice: bool = False
    location: str = "Site A"

class SOSRequest(BaseModel):
    location: str
    worker_id: str

# --- The "Mock AI" Brain (Groq Llama-3 Prompt) ---
def analyze_report_with_llm(report_text: str) -> dict:
    prompt = f"""
    You are an expert HSE (Health, Safety, and Environment) AI for OIL India.
    Analyze the following incident report. The report might be in English, Hindi, Assamese, or a mix (Hinglish).
    
    Report: "{report_text}"
    
    Extract the following in strict JSON format:
    1. "is_emergency": boolean (True if immediate danger to life/active fire/gas leak, False otherwise)
    2. "energy_type": string (e.g., Gravity, Mechanical, Electrical, Chemical, Thermal, Pressure)
    3. "energy_level": integer (1=Low, 2=Medium, 3=High)
    4. "barrier_status": string (e.g., Intact, Degraded, Absent, Bypassed)
    5. "barrier_level": integer (1=Intact, 2=Degraded, 3=Absent/Bypassed)
    6. "causal_chain": object with "hazard", "barrier_failure", "consequence"
    7. "iogp_rules": list of strings (from: Energy Isolation, Confined Space, Hot Work, Line of Fire, Working at Height, etc.)
    8. "sif_score": float (Calculated strictly as: (energy_level * barrier_level) / 9.0. Must be between 0.0 and 1.0)
    9. "explanation": string (Short human-readable reason for the score)
    
    Return ONLY valid JSON. No markdown, no extra text.
    """
    
    if not client:
        # No API key — return fallback
        return {
            "is_emergency": False, "energy_type": "Mechanical", "energy_level": 2,
            "barrier_status": "Degraded", "barrier_level": 2,
            "causal_chain": {"hazard": "Moving parts", "barrier_failure": "Guard missing", "consequence": "Entanglement"},
            "iogp_rules": ["Line of Fire"], "sif_score": 0.44, "explanation": "Fallback: No GROQ_API_KEY configured."
        }

    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="qwen/qwen3.8-27b",
            response_format={"type": "json_object"},
            temperature=0.1
        )
        return json.loads(chat_completion.choices[0].message.content)
    except Exception as e:
        print(f"LLM Error: {e}")
        # Fallback mock data if API fails during demo
        return {
            "is_emergency": False, "energy_type": "Mechanical", "energy_level": 2,
            "barrier_status": "Degraded", "barrier_level": 2,
            "causal_chain": {"hazard": "Moving parts", "barrier_failure": "Guard missing", "consequence": "Entanglement"},
            "iogp_rules": ["Line of Fire"], "sif_score": 0.44, "explanation": "Medium energy with degraded barrier."
        }

# --- API ENDPOINTS ---

@app.post("/api/v1/emergency/sos")
def trigger_sos(request: SOSRequest):
    """
    PATH 1: EMERGENCY SOS. 
    Bypasses all AI. Immediately alerts humans.
    """
    # In production, this triggers Twilio SMS / Webhooks to Site Supervisor
    print(f"🚨 🚨 🚨 EMERGENCY SOS TRIGGERED AT {request.location} BY {request.worker_id} 🚨 🚨 🚨")
    return {"status": "success", "message": "Emergency services and site supervisor alerted immediately."}

@app.post("/api/v1/reports/submit")
def submit_report(report: ReportSubmission):
    """
    PATH 2: STANDARD REPORTING. 
    Goes through the Dual-Head AI pipeline.
    """
    report_id = str(uuid.uuid4())
    
    # 1. Run through AI Brain
    ai_analysis = analyze_report_with_llm(report.text)
    
    # 2. Check if it's actually an emergency disguised as a report
    if ai_analysis.get("is_emergency"):
        trigger_sos(SOSRequest(location=report.location, worker_id="Anonymous"))
        return {"status": "escalated", "message": "Report detected as active emergency. SOS triggered."}

    # 3. Save to Database
    conn = sqlite3.connect("sif_database.db")
    c = conn.cursor()
    c.execute("""INSERT INTO reports VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""", (
        report_id, datetime.now().isoformat(), report.text,
        ai_analysis["is_emergency"], ai_analysis["sif_score"],
        ai_analysis["energy_type"], ai_analysis["energy_level"],
        ai_analysis["barrier_status"], ai_analysis["barrier_level"],
        json.dumps(ai_analysis["causal_chain"]),
        json.dumps(ai_analysis["iogp_rules"]),
        ai_analysis["explanation"], "Pending Review"
    ))
    conn.commit()
    conn.close()

    return {
        "report_id": report_id,
        "status": "analyzed",
        "sif_score": ai_analysis["sif_score"],
        "explanation": ai_analysis["explanation"]
    }

@app.get("/api/v1/reports/dashboard")
def get_dashboard_data():
    """
    Fetches all reports for the HSE Priority Dashboard with advanced precursor trend analysis.
    """
    conn = sqlite3.connect("sif_database.db")
    c = conn.cursor()
    c.execute("SELECT * FROM reports ORDER BY sif_score DESC")
    rows = c.fetchall()
    conn.close()

    reports = []
    for row in rows:
        reports.append({
            "id": row[0], "timestamp": row[1], "raw_text": row[2],
            "is_emergency": bool(row[3]), "sif_score": row[4], 
            "energy_type": row[5], "energy_level": row[6],
            "barrier_status": row[7], "barrier_level": row[8],
            "causal_chain": json.loads(row[9]), 
            "iogp_rules": json.loads(row[10]), 
            "explanation": row[11], "status": row[12]
        })
    
    # --- ADVANCED PRECURSOR TREND ANALYSIS ---
    high_sif_count = sum(1 for r in reports if r["sif_score"] >= 0.6)
    precursor_alert = high_sif_count > 2
    
    # Calculate week-over-week trends
    from collections import defaultdict
    from datetime import datetime, timedelta
    
    weekly_data = defaultdict(lambda: {"total": 0, "high_sif": 0, "sites": defaultdict(int)})
    site_totals = defaultdict(int)
    
    for r in reports:
        if r["sif_score"] >= 0.6:  # Only count high-SIF incidents
            try:
                dt = datetime.fromisoformat(r["timestamp"])
                # Get week number (ISO format)
                week_num = dt.isocalendar()[1]
                year_week = f"{dt.year}-W{week_num:02d}"
                
                weekly_data[year_week]["total"] += 1
                weekly_data[year_week]["high_sif"] += 1
                
                # Extract site from location (mock extraction from raw_text)
                # In production, this would be a proper location field
                if "tank farm" in r["raw_text"].lower():
                    site = "Tank Farm"
                    weekly_data[year_week]["sites"]["Tank Farm"] += 1
                    site_totals["Tank Farm"] += 1
                elif "drilling" in r["raw_text"].lower() or "derrick" in r["raw_text"].lower():
                    site = "Drilling Rig"
                    weekly_data[year_week]["sites"]["Drilling Rig"] += 1
                    site_totals["Drilling Rig"] += 1
                elif "pipeline" in r["raw_text"].lower() or "pump" in r["raw_text"].lower():
                    site = "Pipeline/Pump"
                    weekly_data[year_week]["sites"]["Pipeline/Pump"] += 1
                    site_totals["Pipeline/Pump"] += 1
                elif "electrical" in r["raw_text"].lower() or "panel" in r["raw_text"].lower():
                    site = "Electrical"
                    weekly_data[year_week]["sites"]["Electrical"] += 1
                    site_totals["Electrical"] += 1
                else:
                    site = "General"
                    weekly_data[year_week]["sites"]["General"] += 1
                    site_totals["General"] += 1
                    
            except Exception as e:
                print(f"Error parsing date: {e}")
    
    # Sort weeks chronologically
    sorted_weeks = sorted(weekly_data.keys())
    
    # Calculate growth rate
    if len(sorted_weeks) >= 2:
        last_week = sorted_weeks[-1]
        prev_week = sorted_weeks[-2]
        last_count = weekly_data[last_week]["high_sif"]
        prev_count = weekly_data[prev_week]["high_sif"]
        
        if prev_count > 0:
            growth_rate = ((last_count - prev_count) / prev_count) * 100
        else:
            growth_rate = 100 if last_count > 0 else 0
    else:
        growth_rate = 0
    
    # Find top risky site
    top_site = max(site_totals, key=site_totals.get) if site_totals else "Unknown"
    top_site_count = site_totals.get(top_site, 0)
    
    # Generate specific alert message
    precursor_message = ""
    if precursor_alert:
        precursor_message = f"CRITICAL: {top_site} shows {top_site_count} high-SIF incidents. Week-over-week trend: {growth_rate:+.1f}%"
    
    # Prepare chart data
    trend_data = [
        {
            "week": week,
            "high_sif_incidents": weekly_data[week]["high_sif"],
            "total_incidents": weekly_data[week]["total"]
        }
        for week in sorted_weeks
    ]
    
    # Prepare site risk data
    site_risk_data = [
        {"site": site, "incidents": count}
        for site, count in sorted(site_totals.items(), key=lambda x: x[1], reverse=True)
    ]

    return {
        "total_reports": len(reports),
        "high_sif_count": high_sif_count,
        "precursor_alert": precursor_alert,
        "precursor_message": precursor_message,
        "trend_data": trend_data,  # NEW: For line chart
        "site_risk_data": site_risk_data,  # NEW: For site ranking
        "growth_rate": growth_rate,  # NEW: Week-over-week growth
        "top_risky_site": top_site,  # NEW: Most dangerous site
        "reports": reports
    }
@app.post("/api/v1/reports/{report_id}/feedback")
def submit_feedback(report_id: str, feedback: str): # "Confirm" or "Reject"
    """
    Human-in-the-loop feedback. Updates status and generates real training data.
    """
    conn = sqlite3.connect("sif_database.db")
    c = conn.cursor()
    c.execute("UPDATE reports SET status = ? WHERE id = ?", (feedback, report_id))
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"Report {report_id} marked as {feedback}. Added to training queue."}

# --- Historical Twin Matching Endpoints ---

@app.get("/api/v1/reports/{report_id}/twins")
def get_report_twins(report_id: str):
    """
    Get historical twin incidents for a specific report in the database.
    """
    # Fetch the report text
    conn = sqlite3.connect("sif_database.db")
    c = conn.cursor()
    c.execute("SELECT raw_text FROM reports WHERE id = ?", (report_id,))
    row = c.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Report not found")
    
    report_text = row[0]
    
    # Find twins
    twins = find_historical_twins(report_text, top_k=3)
    
    return {
        "report_id": report_id,
        "total_twins_found": len(twins),
        "twins": twins
    }

@app.post("/api/v1/reports/find-twins")
def find_twins_for_new_report(report_text: str):
    """
    Find historical twins for a NEW report (not yet in database).
    """
    twins = find_historical_twins(report_text, top_k=3)
    
    return {
        "total_twins_found": len(twins),
        "twins": twins
    }
@app.get("/api/v1/reports/{report_id}/explanation")
def get_shap_explanation(report_id: str):
    """
    Generate SHAP-based explainability for a specific report.
    Shows which words and features contributed to the SIF score.
    """
    conn = sqlite3.connect("sif_database.db")
    c = conn.cursor()
    c.execute("SELECT * FROM reports WHERE id = ?", (report_id,))
    row = c.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Report not found")
    
    report = {
        "id": row[0], "raw_text": row[2], "sif_score": row[4],
        "energy_type": row[5], "energy_level": row[6],
        "barrier_status": row[7], "barrier_level": row[8],
        "iogp_rules": json.loads(row[10])
    }
    
    # Create a simple explanation based on the Energy-Barrier formula
    # In production, this would be a trained ML model
    explanation = {
        "report_id": report_id,
        "sif_score": report["sif_score"],
        "feature_importance": {
            "energy_level": report["energy_level"] / 3.0,  # Normalize to 0-1
            "barrier_level": report["barrier_level"] / 3.0,
            "barrier_status_impact": 0.3 if report["barrier_status"] == "Absent" else 0.1 if report["barrier_status"] == "Degraded" else 0.0
        },
        "key_risk_indicators": [],
        "text_analysis": {
            "high_risk_words": [],
            "risk_categories": report["iogp_rules"]
        },
        "formula_breakdown": f"SIF Score = (Energy Level {report['energy_level']} × Barrier Level {report['barrier_level']}) / 9.0 = {report['sif_score']:.2f}"
    }
    
    # Extract key risk indicators from text
        # Enhanced keyword detection for Hinglish + English
    text_lower = report["raw_text"].lower()
    
    # Broader keyword matching including Hinglish
    risk_keywords = {
        # English phrases
        "no harness": "Missing PPE",
        "without harness": "Missing PPE",
        "no barricade": "Missing Physical Barrier",
        "no testing": "Missing Safety Check",
        "energized": "Electrical Hazard",
        "confined space": "Confined Space Risk",
        "height": "Fall Risk",
        "leak": "Containment Failure",
        "bypassed": "Safety System Bypass",
        "without": "Procedure Violation",
        "missing": "Safety System Missing",
        
        # Hinglish phrases
        "bina harness": "Missing PPE",
        "bina helmet": "Missing PPE",
        "bina ppe": "Missing PPE",
        "barricade hata": "Missing Physical Barrier",
        "barricade nahi": "Missing Physical Barrier",
        "testing nahi": "Missing Safety Check",
        "check nahi": "Missing Safety Check",
        "neeche": "Fall Risk / Suspended Load",  # "under/below"
        "upar": "Working at Height",  # "above/over"
        "gir": "Fall Risk",  # "fall"
        "jala": "Fire Hazard",  # "burn/fire"
        "leak": "Containment Failure",
        "bypass": "Safety System Bypass",
        "chhod": "Procedure Violation",  # "left/ignored"
        "nahi kiya": "Procedure Violation",  # "did not do"
    }
    
    # More intelligent keyword matching
    for keyword, category in risk_keywords.items():
        if keyword in text_lower:
            # Determine impact level
            high_impact_keywords = ["bina harness", "no harness", "barricade hata", "no barricade", "bypass", "energized"]
            impact = "High" if keyword in high_impact_keywords else "Medium"
            
            explanation["key_risk_indicators"].append({
                "keyword": keyword,
                "category": category,
                "impact": impact
            })
    

    
    # Identify high-risk words for visualization
    explanation["text_analysis"]["high_risk_words"] = [
        {"word": ind["keyword"], "importance": 0.8 if ind["impact"] == "High" else 0.5}
        for ind in explanation["key_risk_indicators"]
    ]
    
    return explanation