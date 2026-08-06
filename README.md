# Propel Grid Intelligence Platform

An intelligent distribution grid monitoring platform that imports utility network data, automatically reconstructs missing topology, processes live telemetry, localizes electrical faults, computes confidence scores, creates maintenance incidents and tickets, and visualizes the complete operational workflow in real time.

---

# 🚀 Quick Start

## Prerequisites

- Docker Desktop (Docker Engine 24+ with Docker Compose v2)
- Git

---

## One-Command Setup

Clone the repository and start the complete platform:

```bash
git clone <repository-url>

cd kspdb-fault-locator

docker compose up --build
```

The command automatically:

- Builds the backend container
- Builds the frontend container
- Starts PostgreSQL
- Waits for the database to become healthy
- Generates the Prisma Client
- Applies all Prisma migrations
- **Seeds a realistic synthetic network** (~900 poles across 16
  transformers, ~60% of transformers with missing official pole ordering,
  ~9% of poles without devices) so the dashboard is usable immediately
- Starts the backend API
- Starts the frontend application

No additional setup or manual database configuration is required.
The `sample-data/` CSVs are optional — the seeded network is already there.

---

## 🌐 Application URLs

| Service | URL |
|----------|-----|
| Frontend Dashboard | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| Server-Sent Events | http://localhost:3000/api/events |

---

## ✅ Verify Installation

After the containers finish starting:

1. Open **http://localhost:5173** — the synthetic network is already seeded.
2. Verify that the electrical network appears on the map (blue = official
   topology, purple dashed = inferred topology).
3. Open the Simulator panel.
4. Trigger:
   - BOOT
   - HEARTBEAT
   - POWER LOST
5. Verify that:
   - Pole health updates in real time
   - Within ~30 seconds (the candidate observation window) the outage is
     localized, an incident is created and a maintenance ticket is generated
   - The Live Event Feed updates automatically
6. Inject a **Span Fault** (darkens the whole downstream subtree) or a
   **Feeder Fault**, then toggle **Realistic noise** to see firmware-1.2
   silence, lost dying messages, duplicates and out-of-order retries handled.
7. Progress the ticket through its lifecycle. Marking it RESOLVED while the
   span is still dark is rejected by the server, and the card shows why.
8. Trigger **POWER RESTORED** or **Repair** and verify the network returns
   to normal and the ticket is auto-verified from telemetry.

If all of the above work successfully, the platform has been configured correctly.

## ✅ Tests & Benchmarks

```bash
cd backend
npm test        # 31 unit tests on the logic that matters (localization, confidence, grouping, debounce, ingest schema, topology completion, seed generator)
npm run bench   # measured timings for localization / confidence / topology completion
```

---

# 🎥 Demo Video

**Demo Video:** *https://drive.google.com/file/d/1Agv-mR7-Ivz264FhZInxRe_LCqA4x9aJ/view?usp=sharing*

---

# 🌍 Live Deployment

**Frontend:** *https://kspdb-fault-locator.vercel.app/*

 **Note:** The backend is hosted on a free-tier service. If the application has been idle, the first request may take 30–60 seconds while the backend wakes up. During this period, the dashboard may display loading indicators. Once the backend is awake, subsequent requests respond normally.

---

# ✨ Platform Features

- Seeded on startup with a realistic synthetic network (Gate G3)
- Import electrical network data from CSV files (`sample-data/`)
- Automatic network validation during import
- Automatic topology reconstruction for missing LT networks
- Interactive GIS network visualization (whole network, not one transformer)
- Live telemetry ingestion accepting the device payload contract
  (`device_id`, `pole_id`, `event`, `energized`, `seq`, `ts`, `battery_mv`,
  `rssi`, `fw`) and the simulator's camelCase form
- Duplicate and out-of-order telemetry handling with boot sessions
- 30-second candidate observation window before tickets are created
- Pole health monitoring
- Heartbeat timeout detection (firmware-1.2 silent outages)
- Fault localization using electrical topology:
  - clean LIVE→DARK span boundaries
  - RANGE boundaries when the fault passes through untelemetered poles
  - evidence-based whole-DT detection
  - physically-impossible-pattern suppression (dead sensors, not outages)
- Confidence scoring with explainable breakdown
- Automatic incident grouping (one ticket per fault, not per dark pole)
- Scheduled-outage suppression (no tickets during load shedding)
- Ticket lifecycle management with telemetry-verified restoration
- Live dashboard updates using Server-Sent Events
- Interactive fault simulator: span / transformer / feeder faults,
  realistic noise (lost dying messages, firmware-1.2 silence, duplicates,
  out-of-order retries), dead-device simulation, scheduled-outage windows
- AI Operational Brief generation
- Unit tests for the localization and confidence logic (`npm test`)

---

# 🧪 Demo Workflow

The network is seeded on startup, so a demo runs like this:

1. Open the dashboard and verify the electrical network (blue = official
   topology, purple dashed = inferred — ~60% of transformers are inferred).
2. Select a transformer, feeder and telemetry device in the Simulator.
3. Send a **BOOT** event, then a **HEARTBEAT** event.
4. Inject a **POWER LOST** event (or **Inject Span Fault** / **Inject
   Transformer Fault** / **Inject Feeder Fault**).
5. Within ~30 seconds (candidate observation window) observe:
   - Live telemetry ingestion
   - Pole health updates (red = dark)
   - Fault localization with the correct boundary span
   - Confidence calculation with explainable breakdown
   - One incident + one ticket per fault (not one per dark pole)
   - Live dashboard updates via SSE
6. Try **KILL DEVICE (power stays on)** — the impossible-pattern check
   means a dead sensor never becomes a ticket.
7. Try **Start Scheduled Outage (30 min)** then a fault — no ticket is
   created while the window is active.
8. Advance the ticket: DETECTED → ACKNOWLEDGED → CREW ASSIGNED → RESOLVED.
   Marking RESOLVED while the span is still dark is rejected, and the card
   shows the reason.
9. Restore power using **POWER RESTORED** or **Repair**. The ticket is
   auto-verified from telemetry (no click needed) and can be closed.

---

# 📚 Documentation Map

| Document | Purpose |
|----------|---------|
| README.md | Project overview, quick start, demo workflow and links |
| ARCHITECTURE.md | System architecture, algorithms, data flow and API design |
| DEPLOYMENT.md | Deployment guide, environment variables and troubleshooting |
| DECISIONS.md | Decision log, assumptions, known limitations |
| AI-WORKFLOW.md | AI-assisted development process and validation approach |

---

# 🏗️ Technology Stack

**Frontend**

- React
- TypeScript
- Tailwind CSS
- React Query
- React Leaflet
- Server-Sent Events

**Backend**

- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL

**Infrastructure**

- Docker
- Docker Compose
- Neon PostgreSQL
- Render
- Vercel

---

> A reviewer can clone the repository, execute a single `docker compose up --build` command, import the provided sample network, simulate electrical faults, observe automatic topology inference, real-time fault localization, confidence evaluation, incident creation, ticket management, and live dashboard updates without any additional configuration.