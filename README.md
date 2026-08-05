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
- Starts the backend API
- Starts the frontend application

No additional setup or manual database configuration is required.

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

1. Open **http://localhost:5173**
2. Import the provided CSV files.
3. Verify that the electrical network appears on the map.
4. Open the Simulator panel.
5. Trigger:
   - BOOT
   - HEARTBEAT
   - POWER LOST
6. Verify that:
   - Pole health updates in real time
   - Fault localization is performed
   - An incident is automatically created
   - A maintenance ticket is generated
   - The Live Event Feed updates automatically
7. Progress the ticket through its lifecycle.
8. Trigger **POWER RESTORED** or **Repair** and verify the network returns to normal.

If all of the above work successfully, the platform has been configured correctly.

---

# 🎥 Demo Video

**Demo Video:** *(Add Google Drive / YouTube link here)*

---

# 🌍 Live Deployment

**Frontend:** *https://kspdb-fault-locator.vercel.app/*

**Backend API:** *https://propel-grid-intelligence-backend.onrender.com*

---

# ✨ Platform Features

- Import electrical network data from CSV files
- Automatic network validation during import
- Automatic topology reconstruction for missing LT networks
- Interactive GIS network visualization
- Live telemetry ingestion
- Duplicate and out-of-order telemetry handling
- Pole health monitoring
- Heartbeat timeout detection
- Fault localization using electrical topology
- Confidence scoring with explainable breakdown
- Automatic incident grouping
- Automatic maintenance ticket creation
- Ticket lifecycle management
- Live dashboard updates using Server-Sent Events
- Interactive fault simulator
- AI Operational Brief generation

---

# 🧪 Demo Workflow

1. Import the provided Transformer and Pole registry CSV files.
2. Verify the imported electrical network.
3. Confirm missing topology is inferred automatically.
4. Select a telemetry device in the Simulator.
5. Send a **BOOT** event.
6. Send a **HEARTBEAT** event.
7. Inject a **POWER LOST** event.
8. Observe:
   - Live telemetry ingestion
   - Pole health updates
   - Fault localization
   - Confidence calculation
   - Incident creation
   - Ticket generation
   - Live dashboard updates
9. Advance the maintenance ticket through its lifecycle.
10. Restore power using **POWER RESTORED** or **Repair**.

---

# 📚 Documentation Map

| Document | Purpose |
|----------|---------|
| README.md | Project overview, quick start, demo workflow and links |
| architecture.md | System architecture, algorithms, data flow and API design |
| deployment.md | Deployment guide, environment variables and troubleshooting |
| ai_usage.md | AI-assisted development process and validation approach |

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