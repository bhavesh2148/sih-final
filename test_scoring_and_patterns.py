import sys
import sqlite3
import json
from main import calculate_sif_score, calculate_confidence_score, fast_domain_sif_classifier, init_db

def test_scoring_formula():
    print("🧪 1. Testing Deterministic SIF Scoring Formula...")
    # Low energy, intact barrier: E=1, B=5, M=0 -> 0.50*(0) + 0.40*(0) + 0.10*(1) = 0.10 (LOW)
    s1, t1, _ = calculate_sif_score(energy_level=1, barrier_integrity=5, mitigation_effectiveness=0.0)
    assert s1 == 0.10, f"Expected 0.10, got {s1}"
    assert t1 == "LOW", f"Expected LOW, got {t1}"
    
    # Critical energy, absent barrier: E=5, B=0, M=0 -> 0.50*(1.0) + 0.40*(1.0) + 0.10*(1.0) = 1.00 (CRITICAL)
    s2, t2, _ = calculate_sif_score(energy_level=5, barrier_integrity=0, mitigation_effectiveness=0.0)
    assert s2 == 1.00, f"Expected 1.00, got {s2}"
    assert t2 == "CRITICAL", f"Expected CRITICAL, got {t2}"
    
    # High energy (4), degraded barrier (2): E=(4-1)/4=0.75, B=1-(2/5)=0.60 -> 0.50*(0.75) + 0.40*(0.60) + 0.10*(1.0) = 0.375 + 0.24 + 0.10 = 0.715 -> 0.71 or 0.72 (HIGH)
    s3, t3, _ = calculate_sif_score(energy_level=4, barrier_integrity=2, mitigation_effectiveness=0.0)
    assert s3 in [0.71, 0.72], f"Expected 0.71 or 0.72, got {s3}"
    assert t3 == "HIGH", f"Expected HIGH, got {t3}"
    print("✅ SIF Scoring Formula tests passed 100%!")

def test_classifier_and_controls():
    print("🧪 2. Testing Fast Domain Classifier & 3-Tier Controls...")
    res = fast_domain_sif_classifier("While shifting the 3 ton valve spool, chain slipped and load swung near two guys. Sling was worn.")
    assert res["energy_type"] == "Mechanical"
    assert res["energy_level"] >= 4
    assert res["barrier_status"] == "Degraded"
    assert "recommended_controls" in res
    assert "immediate" in res["recommended_controls"]
    assert "short_term" in res["recommended_controls"]
    assert "systemic" in res["recommended_controls"]
    assert res["sif_score"] >= 0.60
    assert res["confidence_score"] >= 0.70
    print(f"✅ Fast Classifier Output: SIF={res['sif_score']}, Conf={res['confidence_score']}, Controls={res['recommended_controls']['immediate'][:40]}...")

def test_database_and_actions():
    print("🧪 3. Testing DB Init and Action Tables...")
    init_db()
    conn = sqlite3.connect("sif_database.db")
    c = conn.cursor()
    c.execute("PRAGMA table_info(mitigation_actions)")
    cols = [r[1] for r in c.fetchall()]
    assert "action_required" in cols
    assert "assigned_team" in cols
    assert "verified_by" in cols
    assert "status" in cols
    conn.close()
    print("✅ Database schema migration verified!")

if __name__ == "__main__":
    test_scoring_formula()
    test_classifier_and_controls()
    test_database_and_actions()
    print("\n🎉 ALL BACKEND UNIT TESTS PASSED!")
