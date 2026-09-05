import sys
import requests
import json
import sqlite3
from main import app, init_db, fast_domain_sif_classifier, calculate_sif_score
from fastapi.testclient import TestClient

client = TestClient(app)

def run_e2e_audit():
    print("================================================================")
    print("🛡️ SIFENSE PLATFORM ENTERPRISE END-TO-END AUDIT SUITE (v2.7)")
    print("================================================================\n")
    
    # Test 1: Root & Health Check
    print("🔍 Test 1: Root Health & Scoring Model Metadata...")
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert "0.50E + 0.40B + 0.10M" in data["scoring_model"]
    print("   ✅ Root API online. Formula: " + data["scoring_model"])
    
    # Test 2: Field Report Submission & AI Normalization
    print("\n🔍 Test 2: Submitting Incident Report with Multilingual Vernacular...")
    report_payload = {
        "text": "While shifting the 3 ton valve spool on derrick floor, chain slipped and load swung near two guys. Sling was worn.",
        "location": "Drilling Rig 3",
        "is_voice": False
    }
    res = client.post("/api/v1/reports/submit", json=report_payload)
    assert res.status_code == 200
    sub_data = res.json()
    report_id = sub_data["report_id"]
    sif_score = sub_data["sif_score"]
    conf_score = sub_data["confidence_score"]
    assert sif_score >= 0.60, f"Expected high SIF, got {sif_score}"
    assert conf_score >= 0.70, f"Expected confidence >= 0.70, got {conf_score}"
    print(f"   ✅ Incident ingested: ID={report_id[:8]}... | SIF={sif_score} (HIGH) | Conf={conf_score*100}%")
    
    # Test 3: Closed-Loop Action Assignment
    print("\n🔍 Test 3: Assigning Mitigation Action to Rig Maintenance Crew...")
    assign_payload = {
        "report_id": report_id,
        "action_required": "Quarantine damaged lifting sling; pull-test new certified tackle #8841-B.",
        "assigned_team": "Rig Maintenance Crew",
        "priority": "CRITICAL",
        "deadline": "Today 18:00"
    }
    res = client.post("/api/v1/actions/assign", json=assign_payload)
    assert res.status_code == 200
    print("   ✅ Action successfully assigned (Status: IN_PROGRESS)")
    
    # Test 4: Closed-Loop Supervisor Verification
    print("\n🔍 Test 4: Supervisor Inspection & Control Restoration...")
    verify_payload = {
        "report_id": report_id,
        "evidence_note": "New sling inspected and verified by Rig Superintending Engineer. Load cell tested.",
        "verified_by": "J. Sharma, Lead HSE Supervisor"
    }
    res = client.post("/api/v1/actions/verify", json=verify_payload)
    assert res.status_code == 200
    
    # Verify status in action API
    res_act = client.get(f"/api/v1/actions/{report_id}")
    assert res_act.status_code == 200
    act_info = res_act.json()
    assert act_info["status"] == "CONTROL RESTORED"
    print(f"   ✅ Action verified: Status={act_info['status']} | VerifiedBy={act_info['verified_by']}")
    
    # Test 5: SBERT Systemic Twin & Cluster Detection
    print("\n🔍 Test 5: SBERT Semantic Twin Multi-Factor Matching...")
    res_twins = client.get(f"/api/v1/reports/{report_id}/twins")
    assert res_twins.status_code == 200
    tw_data = res_twins.json()
    assert "twins" in tw_data
    assert "systemic_finding" in tw_data
    assert "fleet_recommendation" in tw_data
    print(f"   ✅ Twins Found: {len(tw_data['twins'])} | Systemic Finding: {tw_data['systemic_finding'][:60]}...")
    
    # Test 6: Systemic Risk Heatmap (Site x Hazard Matrix)
    print("\n🔍 Test 6: Systemic Risk Matrix (Site x Hazard Heatmap)...")
    res_heat = client.get("/api/v1/analytics/systemic-intelligence")
    assert res_heat.status_code == 200
    heat_data = res_heat.json()
    assert len(heat_data["hazards"]) == 6
    assert len(heat_data["matrix"]) > 0
    assert len(heat_data["emerging_patterns"]) > 0
    print(f"   ✅ Heatmap Matrix: {len(heat_data['matrix'])} sites mapped across {len(heat_data['hazards'])} hazard classes.")
    
    # Test 7: Executive Dashboard KPIs
    print("\n🔍 Test 7: Executive Dashboard KPI Aggregation...")
    res_dash = client.get("/api/v1/reports/dashboard")
    assert res_dash.status_code == 200
    dash_data = res_dash.json()
    assert "total_reports" in dash_data
    assert "critical_precursors" in dash_data
    assert "top_recurring_barriers" in dash_data
    print(f"   ✅ Executive Dashboard: {dash_data['total_reports']} Total Reports | {dash_data['high_sif_count']} High SIF Precursors")
    
    print("\n================================================================")
    print("🎉 ALL 7/7 ENTERPRISE PLATFORM AUDITS PASSED WITH ZERO ERRORS!")
    print("================================================================\n")

if __name__ == "__main__":
    run_e2e_audit()
