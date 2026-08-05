# Propel Grid Intelligence Platform

An intelligent distribution grid monitoring platform that imports utility network data, automatically reconstructs missing topology, processes live telemetry, localizes outages, computes confidence scores, creates maintenance incidents and tickets, and visualizes the complete operational workflow in real time.

---

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL
- Docker (optional)

### Backend

```bash
cd backend

npm install

npx prisma migrate deploy

npm run dev
```

### Frontend

```bash
cd frontend

npm install

npm run dev
```

---

## Application URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| Live Events (SSE) | http://localhost:3000/api/events |

---

## Demo Video

> **Demo Video:** *(Paste your Loom / YouTube / Drive link here)*

Example:

```
https://loom.com/share/xxxxxxxxxxxxxxxx
```

---

## What the Platform Demonstrates

- Import a distribution network from CSV files
- Automatically infer missing electrical topology
- Process live telemetry events from field devices
- Detect heartbeat failures
- Localize outages using topology and telemetry
- Compute confidence scores for localized faults
- Automatically create incidents and maintenance tickets
- Stream live updates to the dashboard using Server-Sent Events
- Simulate field events such as BOOT, HEARTBEAT, POWER LOSS and RESTORATION

---

## Demo Workflow

1. Import the provided CSV files.
2. Verify that the network is imported and topology is inferred automatically.
3. Select a device in the Simulator.
4. Trigger **BOOT** and **HEARTBEAT**.
5. Trigger **POWER LOST** to simulate an outage.
6. Observe:
   - Pole status updates
   - Incident creation
   - Automatic ticket creation
   - Live event feed
7. Advance the ticket through its lifecycle.
8. Trigger **POWER RESTORED** or **Repair** to restore service.

---

# Documentation Map

| Section | Description |
|----------|-------------|
| Project Architecture | High-level system architecture and design |
| Features | Overview of implemented functionality |
| Backend Architecture | Modules, services and data flow |
| Frontend Architecture | Dashboard structure and UI components |
| API Reference | REST endpoints and SSE events |
| Design Decisions | Engineering choices and assumptions |
| Future Improvements | Potential enhancements |

---

> A reviewer can import the sample network, simulate outages, observe automatic topology inference, fault localization, incident generation, ticket management, and real-time dashboard updates using the steps above.