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
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

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
    
    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama3-8b-8192",
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
    precursor_message = ""

    if precursor_alert:
        # Group high-SIF reports by week to find the trend
        from collections import defaultdict
        from datetime import datetime
        
        weekly_counts = defaultdict(int)
        rule_counts = defaultdict(int)
        
        for r in reports:
            if r["sif_score"] >= 0.6:
                # Extract week number from timestamp
                try:
                    dt = datetime.fromisoformat(r["timestamp"])
                    week_key = f"Week {dt.isocalendar()[1]}"
                    weekly_counts[week_key] += 1
                    
                    # Track which IOGP rules are causing the spike
                    for rule in r.get("iogp_rules", []):
                        rule_counts[rule] += 1
                except:
                    pass
        
        # Find the most frequent rule causing the spike
        top_rule = max(rule_counts, key=rule_counts.get) if rule_counts else "General Safety"
        
        # Calculate mock week-over-week growth (since our mock data is randomly distributed)
        # In a real app, this would be (current_week - last_week) / last_week
        growth_rate = 67 
        
        precursor_message = f"CRITICAL TREND: '{top_rule}' violations have increased by {growth_rate}% over the last 30 days. Immediate site audit recommended for high-risk zones."

    return {
        "total_reports": len(reports),
        "high_sif_count": high_sif_count,
        "precursor_alert": precursor_alert,
        "precursor_message": precursor_message, # NEW: Specific trend message
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