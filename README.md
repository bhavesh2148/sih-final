# SIFense — AI-Powered SIF Precursor Detection & Triage System

> **SIFense** is an AI-powered **Serious Injury and Fatality (SIF) Precursor Screening & Triage Platform** built for **OIL India Limited**'s HSE (Health, Safety, and Environment) department.
> 
> It shifts industrial safety management from *reactive incident counting* to *proactive predictive precursor screening*, analyzing safety logs to identify hidden fatal-potential risks before catastrophic accidents occur.

---

## 🎯 The Core Problem & Solution

* **The Problem:** In high-risk oil and gas operations, thousands of minor near-misses and safety logs are submitted. Traditional systems treat all near-misses equally, causing critical **SIF precursors** (scenarios with fatal energy releases and failed barriers) to be buried under trivial administrative reports.
* **The Solution:** SIFense acts as an **intelligent AI screening and triage layer** on top of existing safety logs. It decomposes incident narratives into **Energy Types**, evaluates **Barrier Integrity**, calculates mathematical **SIF Potential**, identifies **Recurring Barrier Failures across sites**, and enables **Bulk Batch Screening** of historical safety logs.

---

## 🏗️ Architecture & Dual-Head Triage

```
                                 [ SAFETY REPORTING / INGESTION ]
                                                │
                     ┌──────────────────────────┴──────────────────────────┐
                     ▼                                                     ▼
        [ Path 1: Emergency SOS ]                             [ Path 2: AI Screening & Triage ]
        • Instant sub-millisecond dispatch                     • Groq LLM (qwen/qwen3.8-27b)
        • Bypasses all AI latency                              • SBERT Semantic Twin Matching
        • Triggers siren / supervisor alerts                   • Energy-Barrier SIF Scoring
                     │                                                     │
                     ▼                                                     ▼
        [ Immediate Site Alert ]                              [ SQLite SIF Database ]
                                                                           │
                                                                           ▼
                                                      [ HSE Executive Command Dashboard ]
                                                      • Critical Precursor Triage Panel
                                                      • Bulk Batch Ingestion Studio
                                                      • Precursor Trend & Site Risk Charts
                                                      • Bowtie Causal Chain Decomposition
```

---

## ✨ Key Features

### 🧠 1. AI Screening & Predictive Intelligence
* **Live Groq LLM Inference (`qwen/qwen3.8-27b`):** Multilingual extraction in **English, Hindi, Hinglish, and Assamese**. Extracts energy types, barrier states, and causal chains into strict JSON.
* **DEKRA Energy-Barrier Scoring:**
  $$\text{SIF Score} = \frac{\text{Energy Level (1--3)} \times \text{Barrier Level (1--3)}}{9.0}$$
* **SBERT Historical Twin Matching:** Vectorizes reports with `all-MiniLM-L6-v2` into 384-d embeddings to calculate cosine similarity and find repeat barrier failures across historical logs.
* **Bowtie Causal Chain:** Decomposes narratives into **Initiating Hazard** $\rightarrow$ **Barrier Failure** $\rightarrow$ **Potential Consequence**.
* **IOGP Life-Saving Rules:** Maps reports to international standards (*Working at Height*, *Confined Space*, *Energy Isolation*, *Hot Work*, *Line of Fire*).

### 🚨 2. Critical SIF Precursor Priority Triage
* High-visibility top panel on `/dashboard` dedicated exclusively to **Active Critical Precursors ($\text{SIF} \ge 60\%$)**.
* Answers the 4 core safety questions:
  1. 🏢 **Site Concentration:** Identifies sites with the highest precursor density (e.g. *Tank Farm A*).
  2. 🛡️ **Recurring Barrier Failures:** Pinpoints recurring barrier breakdowns (e.g. *No Atmospheric Testing (4x)*, *Fall Arrest Omitted (3x)*).
  3. ⚠️ **Most Violated Life-Saving Rules:** Highlights frequent rule violations.
  4. 📈 **Precursor Trend Rate:** Real-time week-over-week SIF escalation metric.
* **Action Cards Grid:** Includes Bowtie hazard summary chips and an interactive **"Take Action / Addressed ✓"** toggle.

### 📂 3. Bulk Report Ingestion & Batch AI Screening Studio
* Accessible directly from the dashboard header.
* **⚡ 1-Click OIL India Historical Batch:** Batch-screens 10 realistic past reports in 2 seconds.
* **📋 Multi-line Paste & CSV Drag-and-Drop:** Upload batches of historical safety logs.
* **📊 Live Progress Bar:** Real-time batch triage tracking with instant summary breakdown.
* **🔄 Auto-Refreshes SBERT Twins:** Newly ingested logs are immediately vectorized and searchable.

### 👷 4. Field Worker Safety Portal (`/worker`)
* **Spacious Multi-Column Design:** Desktop dual-column layout + touch-friendly mobile layout.
* **Voice-to-Text Studio:** Hands-free speech recognition supporting Indian English & Hindi with live audio pulse animation.
* **1-Tap Quick Hazard Chips:** Shortcut tags (*"Working at height without harness"*, *"Gas leak / odor"*, etc.) for instant prefilling.
* **Offline-First Storage Queue:** Stores reports in device `localStorage` during network drops with 1-tap auto-sync.
* **Tactile Emergency SOS Switch:** High-contrast pulsing button with instant full-screen alert feedback.

### 🔐 5. Dual-Portal Split Authentication Gateway (`/login`)
* **Door 1 (Field Worker):** Low-friction access with Badge/Employee ID, Site selector, or **1-Tap Anonymous Whistleblower Mode** (*zero password barriers*).
* **Door 2 (HSE Safety Officer):** Secure Supabase corporate authentication (Email/Password, Sign Up, Magic Link OTP, or 1-Click Demo Officer access).
* **Role Guards:** Protects `/dashboard` from worker accounts while giving HSE Officers dual access to both `/dashboard` and `/worker`.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend Framework** | FastAPI (Python 3.10+) | High-performance async REST API |
| **LLM Inference** | Groq Cloud (`qwen/qwen3.8-27b`) | Fast multilingual SIF factor extraction (~1-2s) |
| **Semantic Search** | Sentence-Transformers (`all-MiniLM-L6-v2`) | Vector embeddings & cosine similarity for twins |
| **Database** | SQLite (`sif_database.db`) | Embedded zero-config relational store |
| **Frontend Framework** | Next.js 16 (App Router + Turbopack) | Server/Client components & fast rendering |
| **UI & Styling** | TailwindCSS 4 + Industrial Brutalism | Industrial high-contrast safety theme |
| **Charts** | Recharts | Interactive SIF line charts & site risk rankings |
| **Auth** | Supabase Auth + Demo Fallback | Role-based access control & session persistence |
| **Voice Input** | Web Speech API | Native speech-to-text |

---

## 🚀 How to Run Locally

### Prerequisites
* **Python 3.10+**
* **Node.js 18+** and `npm`
* **Groq API Key** (Configured in `.env`)

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/bhavesh2148/sih-final.git
cd sih-final/SIFense
```

---

### Step 2: Backend Setup & Launch (Terminal 1)

```powershell
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Configure Environment Variables
# Create a .env file in SIFense/ with your Groq API key:
echo "GROQ_API_KEY=gsk_your_groq_api_key_here" > .env

# 3. Seed the SQLite Database with 30 realistic Oil & Gas incident reports
python seed_data.py

# 4. Start the FastAPI backend server
python -m uvicorn main:app --reload --port 8000
```

* Backend API will be live at: [http://127.0.0.1:8000](http://127.0.0.1:8000)
* Interactive Swagger API Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### Step 3: Frontend Setup & Launch (Terminal 2)

```powershell
# Navigate to the frontend directory
cd hse-dashboard

# Install Node dependencies
npm install

# Start Next.js development server
npm run dev
```

* Web Application will be live at: **[http://localhost:3000](http://localhost:3000)**

---

### 🌐 Quick Route Navigation

| Route | Page Name | Access Level | Description |
| :--- | :--- | :---: | :--- |
| [`/`](http://localhost:3000) | **Landing Page** | Public | System overview & protocol highlights |
| [`/login`](http://localhost:3000/login) | **Access Gateway** | Public | Two-Door Portal: Field Worker vs. HSE Officer |
| [`/dashboard`](http://localhost:3000/dashboard) | **HSE Command Center** | 🛡️ Officer | Critical SIF triage, bulk upload, charts & audit manifest |
| [`/worker`](http://localhost:3000/worker) | **Field Safety App** | 👷 Worker / Public | Voice reporting, quick hazard chips & Emergency SOS |
| [`http://127.0.0.1:8000/docs`](http://127.0.0.1:8000/docs) | **FastAPI Swagger** | Public | Interactive REST API documentation |

---

## 📡 Key REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/reports/dashboard` | Returns all reports, critical SIF precursors, recurring barriers, and trend metrics |
| `POST` | `/api/v1/reports/submit` | Standard dual-head AI incident report submission |
| `POST` | `/api/v1/reports/bulk-upload` | Batch-screens multiple historical safety logs |
| `POST` | `/api/v1/emergency/sos` | Instant emergency SOS trigger (bypasses AI) |
| `GET` | `/api/v1/reports/{id}/twins` | SBERT cosine similarity semantic twin search |
| `GET` | `/api/v1/reports/{id}/explanation` | SHAP explainability & feature importance |
| `POST` | `/api/v1/reports/{id}/feedback` | Human-in-the-loop audit feedback (Confirm / Reject) |

---

## 📜 License & Acknowledgments
Built for **Smart India Hackathon (SIH)** — Problem Statement: **AI-Powered SIF Precursor Detection in Oil & Gas Operations** for **OIL India Limited**.
