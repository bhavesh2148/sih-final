import sqlite3
import json
import uuid
from datetime import datetime, timedelta
import random

# Realistic Oil & Gas Incident Reports (Mix of English, Hinglish, High/Low SIF)
MOCK_REPORTS = [
    # === HIGH SIF REPORTS (SIF Score: 0.67 - 1.0) ===
    {
        "text": "Worker entered confined space without completing atmospheric testing. No harness worn.",
        "location": "Tank Farm A",
        "is_emergency": False,
        "energy_type": "Chemical",
        "energy_level": 3,
        "barrier_status": "Absent",
        "barrier_level": 3,
        "causal_chain": {
            "hazard": "Toxic/oxygen-deficient atmosphere",
            "barrier_failure": "Atmospheric testing not performed",
            "consequence": "Poisoning/Asphyxiation"
        },
        "iogp_rules": ["Confined Space", "Energy Isolation"],
        "sif_score": 1.0,
        "explanation": "High energy (confined space) + Absent barrier (no testing) = Critical SIF potential"
    },
    {
        "text": "Technician worked at height (8 meters) on derrick without fall arrest system. No barricade below.",
        "location": "Drilling Rig 3",
        "is_emergency": False,
        "energy_type": "Gravity",
        "energy_level": 3,
        "barrier_status": "Absent",
        "barrier_level": 3,
        "causal_chain": {
            "hazard": "Elevated work platform",
            "barrier_failure": "Fall arrest not used",
            "consequence": "Fall from height"
        },
        "iogp_rules": ["Working at Height", "Line of Fire"],
        "sif_score": 1.0,
        "explanation": "High energy (gravity at 8m) + Absent barrier (no harness) = Fatal fall potential"
    },
    {
        "text": "Hot work performed near fuel storage without fire watch. Permits not verified.",
        "location": "Storage Zone B",
        "is_emergency": False,
        "energy_type": "Thermal",
        "energy_level": 3,
        "barrier_status": "Degraded",
        "barrier_level": 2,
        "causal_chain": {
            "hazard": "Ignition source near flammable material",
            "barrier_failure": "Fire watch absent, permits not checked",
            "consequence": "Fire/Explosion"
        },
        "iogp_rules": ["Hot Work", "Energy Isolation"],
        "sif_score": 0.67,
        "explanation": "High energy (thermal near fuel) + Degraded barrier (no fire watch) = Fire risk"
    },
    {
        "text": "Worker ne bina harness pehne crane ke neeche kaam kiya, aur barricade bhi hata diya tha.",
        "location": "Lifting Zone 2",
        "is_emergency": False,
        "energy_type": "Mechanical",
        "energy_level": 3,
        "barrier_status": "Absent",
        "barrier_level": 3,
        "causal_chain": {
            "hazard": "Suspended load",
            "barrier_failure": "No barricade, worker in line of fire",
            "consequence": "Struck by falling object"
        },
        "iogp_rules": ["Line of Fire", "Working at Height"],
        "sif_score": 1.0,
        "explanation": "High energy (crane load) + Absent barrier (no barricade) = Fatal strike potential"
    },
    {
        "text": "Pipeline isolation not confirmed before maintenance. Valve tagout missing.",
        "location": "Pipeline Section 7",
        "is_emergency": False,
        "energy_type": "Pressure",
        "energy_level": 3,
        "barrier_status": "Absent",
        "barrier_level": 3,
        "causal_chain": {
            "hazard": "Pressurized hydrocarbon line",
            "barrier_failure": "LOTO not applied, isolation unverified",
            "consequence": "Uncontrolled release/Explosion"
        },
        "iogp_rules": ["Energy Isolation"],
        "sif_score": 1.0,
        "explanation": "High energy (pressure) + Absent barrier (no LOTO) = Catastrophic release potential"
    },
    {
        "text": "Electrical panel opened while energized. No arc flash PPE worn by technician.",
        "location": "Substation C",
        "is_emergency": False,
        "energy_type": "Electrical",
        "energy_level": 3,
        "barrier_status": "Absent",
        "barrier_level": 3,
        "causal_chain": {
            "hazard": "High voltage electrical energy",
            "barrier_failure": "Panel opened live, no arc flash protection",
            "consequence": "Electrocution/Arc flash burn"
        },
        "iogp_rules": ["Energy Isolation"],
        "sif_score": 1.0,
        "explanation": "High energy (electrical) + Absent barrier (no PPE) = Fatal electrocution risk"
    },
    {
        "text": "Forklift operator driving at 25 km/h in pedestrian zone. No spotter assigned.",
        "location": "Warehouse Area",
        "is_emergency": False,
        "energy_type": "Mechanical",
        "energy_level": 2,
        "barrier_status": "Degraded",
        "barrier_level": 2,
        "causal_chain": {
            "hazard": "Moving vehicle in mixed traffic area",
            "barrier_failure": "Speed limit violated, no spotter",
            "consequence": "Pedestrian struck"
        },
        "iogp_rules": ["Line of Fire"],
        "sif_score": 0.44,
        "explanation": "Medium energy (forklift) + Degraded barrier (no spotter) = Strike potential"
    },
    {
        "text": "Gas leak detected in control room but ventilation system was bypassed for maintenance.",
        "location": "Control Room 1",
        "is_emergency": True,
        "energy_type": "Chemical",
        "energy_level": 3,
        "barrier_status": "Bypassed",
        "barrier_level": 3,
        "causal_chain": {
            "hazard": "Toxic gas accumulation",
            "barrier_failure": "Ventilation system bypassed",
            "consequence": "Mass poisoning/Asphyxiation"
        },
        "iogp_rules": ["Confined Space", "Energy Isolation"],
        "sif_score": 1.0,
        "explanation": "High energy (toxic gas) + Bypassed barrier (no ventilation) = Mass casualty potential"
    },
    {
        "text": "Worker removed guard from rotating machinery to clear jam. Machine not locked out.",
        "location": "Processing Unit 4",
        "is_emergency": False,
        "energy_type": "Mechanical",
        "energy_level": 3,
        "barrier_status": "Absent",
        "barrier_level": 3,
        "causal_chain": {
            "hazard": "Rotating equipment",
            "barrier_failure": "Guard removed, no LOTO",
            "consequence": "Entanglement/Amputation"
        },
        "iogp_rules": ["Energy Isolation", "Line of Fire"],
        "sif_score": 1.0,
        "explanation": "High energy (rotating machinery) + Absent barrier (guard removed) = Amputation risk"
    },
    {
        "text": "Chemical transfer hose ruptured during operation. No secondary containment in place.",
        "location": "Chemical Storage",
        "is_emergency": False,
        "energy_type": "Chemical",
        "energy_level": 3,
        "barrier_status": "Absent",
        "barrier_level": 3,
        "causal_chain": {
            "hazard": "Hazardous chemical release",
            "barrier_failure": "No secondary containment",
            "consequence": "Environmental contamination/Burns"
        },
        "iogp_rules": ["Energy Isolation"],
        "sif_score": 1.0,
        "explanation": "High energy (chemical) + Absent barrier (no containment) = Major spill risk"
    },
    
    # === MEDIUM SIF REPORTS (SIF Score: 0.33 - 0.56) ===
    {
        "text": "Worker slipped on wet floor near pump station. No warning signs posted.",
        "location": "Pump Station 2",
        "is_emergency": False,
        "energy_type": "Gravity",
        "energy_level": 1,
        "barrier_status": "Degraded",
        "barrier_level": 2,
        "causal_chain": {
            "hazard": "Slippery surface",
            "barrier_failure": "No warning signs, poor housekeeping",
            "consequence": "Slip and fall injury"
        },
        "iogp_rules": [],
        "sif_score": 0.22,
        "explanation": "Low energy (ground level) + Degraded barrier (no signs) = Minor injury potential"
    },
    {
        "text": "Hand tool dropped from 2-meter platform. No tool lanyard used. Missed worker below by 1 meter.",
        "location": "Platform 5",
        "is_emergency": False,
        "energy_type": "Gravity",
        "energy_level": 2,
        "barrier_status": "Absent",
        "barrier_level": 3,
        "causal_chain": {
            "hazard": "Dropped object from height",
            "barrier_failure": "No tool lanyard",
            "consequence": "Struck by object"
        },
        "iogp_rules": ["Working at Height", "Line of Fire"],
        "sif_score": 0.67,
        "explanation": "Medium energy (2m drop) + Absent barrier (no lanyard) = Head injury potential"
    },
    {
        "text": "Pressure gauge reading abnormal but operator ignored alarm. No follow-up inspection done.",
        "location": "Compressor Station",
        "is_emergency": False,
        "energy_type": "Pressure",
        "energy_level": 2,
        "barrier_status": "Degraded",
        "barrier_level": 2,
        "causal_chain": {
            "hazard": "Overpressure condition",
            "barrier_failure": "Alarm ignored, no inspection",
            "consequence": "Equipment failure/Rupture"
        },
        "iogp_rules": ["Energy Isolation"],
        "sif_score": 0.44,
        "explanation": "Medium energy (pressure) + Degraded barrier (alarm ignored) = Equipment failure risk"
    },
    {
        "text": "Worker ka helmet ka strap toot gaya tha. Safety inspection mein miss ho gaya.",
        "location": "Site D",
        "is_emergency": False,
        "energy_type": "Mechanical",
        "energy_level": 1,
        "barrier_status": "Degraded",
        "barrier_level": 2,
        "causal_chain": {
            "hazard": "Head injury risk",
            "barrier_failure": "PPE defective, inspection failed",
            "consequence": "Head trauma"
        },
        "iogp_rules": [],
        "sif_score": 0.22,
        "explanation": "Low energy + Degraded barrier (defective PPE) = Minor head injury potential"
    },
    {
        "text": "Welding cable insulation damaged. Exposed wire touching metal structure.",
        "location": "Fabrication Shop",
        "is_emergency": False,
        "energy_type": "Electrical",
        "energy_level": 2,
        "barrier_status": "Degraded",
        "barrier_level": 2,
        "causal_chain": {
            "hazard": "Exposed electrical conductor",
            "barrier_failure": "Cable insulation damaged",
            "consequence": "Electric shock/Burn"
        },
        "iogp_rules": ["Energy Isolation"],
        "sif_score": 0.44,
        "explanation": "Medium energy (electrical) + Degraded barrier (damaged cable) = Shock risk"
    },
    {
        "text": "Crane operator working in 60 km/h wind. Exceeded safe operating limits.",
        "location": "Lifting Zone 1",
        "is_emergency": False,
        "energy_type": "Mechanical",
        "energy_level": 3,
        "barrier_status": "Bypassed",
        "barrier_level": 3,
        "causal_chain": {
            "hazard": "Crane operation in high wind",
            "barrier_failure": "Wind limit exceeded",
            "consequence": "Crane collapse/Load drop"
        },
        "iogp_rules": ["Working at Height", "Line of Fire"],
        "sif_score": 1.0,
        "explanation": "High energy (crane) + Bypassed barrier (wind limit) = Catastrophic failure potential"
    },
    {
        "text": "Spill kit empty when needed for small chemical leak. Not restocked after last use.",
        "location": "Loading Bay",
        "is_emergency": False,
        "energy_type": "Chemical",
        "energy_level": 1,
        "barrier_status": "Absent",
        "barrier_level": 3,
        "causal_chain": {
            "hazard": "Chemical spill",
            "barrier_failure": "Spill kit unavailable",
            "consequence": "Environmental contamination"
        },
        "iogp_rules": [],
        "sif_score": 0.33,
        "explanation": "Low energy (small leak) + Absent barrier (no spill kit) = Minor environmental impact"
    },
    {
        "text": "Ladder not secured at top. Worker climbed 4 meters without fall protection.",
        "location": "Maintenance Bay",
        "is_emergency": False,
        "energy_type": "Gravity",
        "energy_level": 2,
        "barrier_status": "Absent",
        "barrier_level": 3,
        "causal_chain": {
            "hazard": "Unsecured ladder at height",
            "barrier_failure": "No fall protection",
            "consequence": "Fall from ladder"
        },
        "iogp_rules": ["Working at Height"],
        "sif_score": 0.67,
        "explanation": "Medium energy (4m height) + Absent barrier (no protection) = Serious fall risk"
    },
    {
        "text": "Emergency shower not tested for 6 months. Activation handle stuck.",
        "location": "Chemical Processing",
        "is_emergency": False,
        "energy_type": "Chemical",
        "energy_level": 2,
        "barrier_status": "Degraded",
        "barrier_level": 2,
        "causal_chain": {
            "hazard": "Chemical exposure",
            "barrier_failure": "Emergency equipment non-functional",
            "consequence": "Delayed decontamination"
        },
        "iogp_rules": [],
        "sif_score": 0.44,
        "explanation": "Medium energy (chemical) + Degraded barrier (shower broken) = Exposure risk"
    },
    {
        "text": "Vehicle reversing without spotter in congested area. Backup alarm not working.",
        "location": "Parking Zone",
        "is_emergency": False,
        "energy_type": "Mechanical",
        "energy_level": 2,
        "barrier_status": "Degraded",
        "barrier_level": 2,
        "causal_chain": {
            "hazard": "Moving vehicle in pedestrian area",
            "barrier_failure": "No spotter, alarm defective",
            "consequence": "Vehicle-pedestrian collision"
        },
        "iogp_rules": ["Line of Fire"],
        "sif_score": 0.44,
        "explanation": "Medium energy (vehicle) + Degraded barrier (no spotter) = Strike potential"
    },
    
    # === LOW SIF REPORTS (SIF Score: 0.0 - 0.22) ===
    {
        "text": "Office chair wheel stuck. Employee twisted ankle while moving chair.",
        "location": "Admin Building",
        "is_emergency": False,
        "energy_type": "Mechanical",
        "energy_level": 1,
        "barrier_status": "Intact",
        "barrier_level": 1,
        "causal_chain": {
            "hazard": "Defective office equipment",
            "barrier_failure": "None",
            "consequence": "Minor sprain"
        },
        "iogp_rules": [],
        "sif_score": 0.11,
        "explanation": "Low energy + Intact barrier = Minor injury only"
    },
    {
        "text": "Paper cut on finger while filing documents. First aid applied.",
        "location": "Office 3",
        "is_emergency": False,
        "energy_type": "Mechanical",
        "energy_level": 1,
        "barrier_status": "Intact",
        "barrier_level": 1,
        "causal_chain": {
            "hazard": "Sharp paper edge",
            "barrier_failure": "None",
            "consequence": "Minor laceration"
        },
        "iogp_rules": [],
        "sif_score": 0.11,
        "explanation": "Very low energy = First aid case only"
    },
    {
        "text": "Water cooler leaking small amount. Slip hazard created but cleaned immediately.",
        "location": "Break Room",
        "is_emergency": False,
        "energy_type": "Gravity",
        "energy_level": 1,
        "barrier_status": "Intact",
        "barrier_level": 1,
        "causal_chain": {
            "hazard": "Wet floor",
            "barrier_failure": "None - cleaned promptly",
            "consequence": "Potential slip (prevented)"
        },
        "iogp_rules": [],
        "sif_score": 0.11,
        "explanation": "Low energy + Barrier intact (quick cleanup) = Near miss prevented"
    },
    {
        "text": "Computer monitor fell from desk edge. No one injured. Cable caught it.",
        "location": "IT Department",
        "is_emergency": False,
        "energy_type": "Gravity",
        "energy_level": 1,
        "barrier_status": "Intact",
        "barrier_level": 1,
        "causal_chain": {
            "hazard": "Falling object",
            "barrier_failure": "None - cable prevented fall",
            "consequence": "Equipment damage (no injury)"
        },
        "iogp_rules": [],
        "sif_score": 0.11,
        "explanation": "Low energy + Barrier intact = Property damage only"
    },
    {
        "text": "Worker felt dizzy in afternoon heat. Rested in shade, recovered in 10 minutes.",
        "location": "Outdoor Site",
        "is_emergency": False,
        "energy_type": "Thermal",
        "energy_level": 1,
        "barrier_status": "Intact",
        "barrier_level": 1,
        "causal_chain": {
            "hazard": "Heat stress",
            "barrier_failure": "None - worker rested promptly",
            "consequence": "Heat exhaustion (prevented)"
        },
        "iogp_rules": [],
        "sif_score": 0.11,
        "explanation": "Low energy + Barrier intact = Minor heat stress prevented"
    },
    {
        "text": "Coffee spilled on floor. Cleaned within 2 minutes. No slip occurred.",
        "location": "Cafeteria",
        "is_emergency": False,
        "energy_type": "Gravity",
        "energy_level": 1,
        "barrier_status": "Intact",
        "barrier_level": 1,
        "causal_chain": {
            "hazard": "Slippery surface",
            "barrier_failure": "None - quick cleanup",
            "consequence": "Potential slip (prevented)"
        },
        "iogp_rules": [],
        "sif_score": 0.11,
        "explanation": "Very low energy + Quick response = No incident"
    },
    {
        "text": "First aid kit missing bandages. Reported for restocking.",
        "location": "Workshop",
        "is_emergency": False,
        "energy_type": "Mechanical",
        "energy_level": 1,
        "barrier_status": "Degraded",
        "barrier_level": 2,
        "causal_chain": {
            "hazard": "Inadequate first aid supplies",
            "barrier_failure": "Supplies depleted",
            "consequence": "Delayed treatment (potential)"
        },
        "iogp_rules": [],
        "sif_score": 0.22,
        "explanation": "Low energy + Degraded barrier = Administrative issue"
    },
    {
        "text": "Parking lot pothole reported. Maintenance ticket created.",
        "location": "Parking Area",
        "is_emergency": False,
        "energy_type": "Mechanical",
        "energy_level": 1,
        "barrier_status": "Intact",
        "barrier_level": 1,
        "causal_chain": {
            "hazard": "Uneven surface",
            "barrier_failure": "None",
            "consequence": "Vehicle damage (potential)"
        },
        "iogp_rules": [],
        "sif_score": 0.11,
        "explanation": "Low energy = Maintenance issue only"
    },
    {
        "text": "Light bulb flickering in corridor. Reported to electrical team.",
        "location": "Building A",
        "is_emergency": False,
        "energy_type": "Electrical",
        "energy_level": 1,
        "barrier_status": "Intact",
        "barrier_level": 1,
        "causal_chain": {
            "hazard": "Faulty lighting",
            "barrier_failure": "None",
            "consequence": "Poor visibility (potential)"
        },
        "iogp_rules": [],
        "sif_score": 0.11,
        "explanation": "Low energy = Maintenance request"
    },
    {
        "text": "Worker forgot ID badge at gate. Verified identity manually, allowed entry.",
        "location": "Main Gate",
        "is_emergency": False,
        "energy_type": "Mechanical",
        "energy_level": 1,
        "barrier_status": "Intact",
        "barrier_level": 1,
        "causal_chain": {
            "hazard": "Access control lapse",
            "barrier_failure": "None - manual verification done",
            "consequence": "Security breach (prevented)"
        },
        "iogp_rules": [],
        "sif_score": 0.11,
        "explanation": "Low risk + Barrier intact = Procedural issue"
    },
]

def seed_database():
    """Insert all mock reports into the database"""
    conn = sqlite3.connect("sif_database.db")
    c = conn.cursor()
    
    # Clear existing data (optional - comment out if you want to keep existing)
    c.execute("DELETE FROM reports")
    
    print(f"📊 Seeding database with {len(MOCK_REPORTS)} reports...")
    
    for i, report in enumerate(MOCK_REPORTS, 1):
        report_id = str(uuid.uuid4())
        # Stagger timestamps over the last 30 days
        days_ago = random.randint(0, 30)
        timestamp = (datetime.now() - timedelta(days=days_ago)).isoformat()
        
        c.execute("""INSERT INTO reports VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""", (
            report_id,
            timestamp,
            report["text"],
            1 if report["is_emergency"] else 0,
            report["sif_score"],
            report["energy_type"],
            report["energy_level"],
            report["barrier_status"],
            report["barrier_level"],
            json.dumps(report["causal_chain"]),
            json.dumps(report["iogp_rules"]),
            report["explanation"],
            "Pending Review" if report["sif_score"] >= 0.5 else "Reviewed"
        ))
        
        if i % 10 == 0:
            print(f"  ✓ Inserted {i}/{len(MOCK_REPORTS)} reports")
    
    conn.commit()
    
    # Print summary statistics
    c.execute("SELECT COUNT(*) FROM reports")
    total = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM reports WHERE sif_score >= 0.6")
    high_sif = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM reports WHERE is_emergency = 1")
    emergencies = c.fetchone()[0]
    
    c.execute("SELECT COUNT(DISTINCT energy_type) FROM reports")
    energy_types = c.fetchone()[0]
    
    conn.close()
    
    print("\n" + "="*60)
    print("✅ DATABASE SEEDED SUCCESSFULLY!")
    print("="*60)
    print(f" Total Reports: {total}")
    print(f"🔴 High SIF (≥0.6): {high_sif}")
    print(f"🚨 Emergencies: {emergencies}")
    print(f"⚡ Energy Types: {energy_types}")
    print("="*60)
    print("\n🎯 Your dashboard is now ready for demo!")
    print("📍 Visit: http://127.0.0.1:8000/docs")
    print("📊 Call: GET /api/v1/reports/dashboard")
    print("="*60)

if __name__ == "__main__":
    seed_database()