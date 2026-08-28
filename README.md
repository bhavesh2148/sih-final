# SIFense - SIF Precursor Detection System

SIFense is an AI-powered Serious Injury and Fatality (SIF) precursor detection and HSE (Health, Safety, and Environment) dashboard designed for high-risk industrial environments (Oil & Gas).

## Architecture

- **Backend (`main.py`)**: FastAPI REST API powered by Groq LLM (Llama 3) for multilingual incident classification, energy hazard analysis, barrier evaluation, causal chain extraction, and IOGP life-saving rule mapping.
- **Data Generator (`seed_data.py`)**: Realistic incident data seeder with high/low SIF scenarios.
- **Frontend (`hse-dashboard/`)**: Next.js dashboard for visualizing safety analytics, incident monitoring, and risk heatmaps.

## Getting Started

### 1. Backend Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and insert your GROQ_API_KEY

# Seed mock database
python seed_data.py

# Run FastAPI server
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd hse-dashboard
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the dashboard.
