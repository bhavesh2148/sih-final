import requests
import time

API_URL = "http://127.0.0.1:8000/api/v1/reports/bulk-upload"

# Generate 500 realistic oilfield reports
hazards = [
    ("Drilling Rig 3", "Worker bypassed hydraulic tongs safety interlock during casing operation."),
    ("Tank Farm A", "Technician entered confined manifold cellar without testing oxygen or H2S levels."),
    ("Pipeline Section 7", "Scaffold planks untied at 14 meters height shifted during high wind."),
    ("Processing Unit 4", "High pressure gas regulator 120 PSI above set point with obstructed relief vent."),
    ("Substation C", "Opened 415V distribution panel with live busbars while standing on wet grating."),
    ("Warehouse Area", "Routine quarterly office ergonomic evaluation completed."),
    ("Compressor Bay", "Corroded flange bolt detected on secondary low pressure water cooling line."),
    ("Flare Stack 2", "Worker unclipped harness lanyard while climbing derrick ladder at 10m height."),
    ("Wellhead Site B", "Hydrocarbon gas detector battery dead during hot work welding operation."),
    ("Workshop", "Minor scratch on glove while handling unmachined steel casing."),
]

batch_500 = []
for i in range(500):
    loc, text = hazards[i % len(hazards)]
    batch_500.append({"location": f"{loc} - Batch {i+1}", "text": f"{text} (Record #{i+1})"})

print(f"Submitting {len(batch_500)} reports in bulk...")
start_time = time.time()
res = requests.post(API_URL, json={"reports": batch_500})
elapsed = time.time() - start_time

if res.status_code == 200:
    data = res.json()
    print(f"✅ SUCCESS! Processed {data['total_processed']} reports in {elapsed:.2f} seconds.")
    print(f"📊 High-SIF Precursors Detected: {data['high_sif_count']}")
    print(f"🚨 Emergencies Auto-Escalated: {data['emergencies_count']}")
else:
    print(f"❌ FAILED with status {res.status_code}: {res.text}")
