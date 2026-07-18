# 🏟️ FIFA 2026 AI Command Center

An event-driven, low-latency operational dashboard designed to ingest raw stadium telemetry and autonomously classify, structure, and stream crisis incidents in real-time. Powered by FastAPI, React, and Gemini 3.5 Flash.

### 🔗 Production Links
- **🔴 Live Dashboard:** [AI Command Center](https://fifa-commandcenter-ai.vercel.app)
- **📺 CurioFurio Demo Reel:** [YouTube Link Coming Soon]

## ✨ Core Features
- **Event-Driven AI Analysis:** Instantly parses manual telemetry into structured intelligence (severity, category, actions) using Google's Gemini 3.5 Flash.
- **Real-Time SSE Streaming:** Pushes active incidents to the client via Server-Sent Events with sub-second latency—no client-side polling required.
- **Asynchronous Pub/Sub Backend:** Utilizes a global `asyncio.Queue` architecture to decouple AI processing from client broadcasting, ensuring zero API waste.
- **Multilingual Broadcasts:** Automatically generates contextual crowd-control announcements in English and Spanish based on threat levels.
- **Ephemeral State Management:** Frontend automatically purges resolved incidents from the DOM to maintain a clean operational view.

## 🏗️ System Architecture
- **Frontend (Vite / React + Tailwind CSS):** A responsive, dark-themed UI maintaining a persistent SSE connection. Handles live state management and manual incident injection.
- **Backend (FastAPI / Python):** A high-performance async API server. Incident payloads are processed via the Google GenAI SDK, persisted to SQLite (`stadium.db`), and pushed to the broadcast queue.

## 🛠️ Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, Lucide React
- **Backend**: FastAPI, Uvicorn, SQLAlchemy, Pydantic, Python `asyncio`
- **Database**: SQLite
- **AI Integration**: Google GenAI SDK (`google-genai`)

## 🎮 How to Use the Dashboard

Whether using the live production link or running locally, the system operates on a manual, event-driven loop to conserve API credits.

1. **Inject an Incident:** Click the floating **"➕ Add Alert"** button in the bottom right corner of the dashboard.
2. **Describe the Crisis:** Enter raw, unstructured text (e.g., *"There is a massive crowd crush forming outside Gate C, people are getting trampled and we need medical fast."*) and click Submit.
3. **Observe the Pipeline:** The backend will securely route the text to Gemini 3.5 Flash for classification. Within seconds, the structured incident will be pushed via SSE to the Live Feed on the dashboard.
4. **Resolve:** Once operational protocol is complete, click the **"Resolve"** button on the incident card to purge it from the active database and UI.

## 🚀 Local Setup Guide

### 1. Clone the Repository
Clone the project to your local machine and navigate into the root directory.

### 2. Backend Setup
Navigate to the `backend` directory:
```bash
cd backend
```
Install the Python dependencies:
```bash
pip install -r requirements.txt
```
Copy the environment example file and add your Gemini API key:
```bash
cp .env.example .env
```
Run the FastAPI development server:
```bash
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
Open a new terminal window and navigate to the `frontend` directory:
```bash
cd frontend
```
Install the Node dependencies:
```bash
npm install
```
Copy the environment example file:
```bash
cp .env.local.example .env.local
```
Run the Vite development server:
```bash
npm run dev
```

### 4. Access the Dashboard
Open your browser and navigate to the URL provided by Vite (typically `http://localhost:5173`).