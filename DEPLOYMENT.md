# Deployment Guide

This document describes how to build, configure, run, verify, troubleshoot, and reset the Propel Grid Intelligence Platform.

---

# System Requirements

## Software

| Software | Version |
|----------|----------|
| Node.js | >= 20.x |
| npm | >= 10.x |
| PostgreSQL | >= 16 |
| Git | Latest |
| Prisma CLI | Installed via project dependencies |

Optional:

- Docker Desktop (latest)

---

# Repository Structure

```
backend/
frontend/
sample-data/
README.md
```

---

# Environment Variables

Create a `.env` file inside the **backend** directory.

Example:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/propel_grid"

PORT=3000

HEARTBEAT_TIMEOUT_MINUTES=2

NODE_ENV=development
```

---

## Environment Variable Reference

| Variable | Required | Default | Purpose |
|----------|----------|----------|----------|
| DATABASE_URL | Yes | — | PostgreSQL connection string |
| PORT | No | 3000 | Backend API port |
| HEARTBEAT_TIMEOUT_MINUTES | No | 2 | Heartbeat timeout threshold |
| NODE_ENV | No | development | Runtime environment |

---

# Frontend

The frontend does not require additional environment variables in the current implementation.

If desired, a `.env.example` may contain:

```env
VITE_API_URL=http://localhost:3000/api
```

---

# Installation

## 1. Clone Repository

```bash
git clone <repository-url>

cd <repository-name>
```

---

## 2. Backend

```bash
cd backend

npm install
```

---

## 3. Configure Database

Create a PostgreSQL database.

Example:

```
propel_grid
```

Update:

```
backend/.env
```

with the correct connection string.

---

## 4. Run Prisma Migrations

```bash
npx prisma migrate deploy
```

If running locally during development:

```bash
npx prisma migrate dev
```

---

## 5. Generate Prisma Client

```bash
npx prisma generate
```

---

## 6. Start Backend

```bash
npm run dev
```

Backend runs at

```
http://localhost:3000
```

---

## 7. Frontend

Open another terminal.

```bash
cd frontend

npm install

npm run dev
```

Frontend runs at

```
http://localhost:5173
```

---

# Initial Data Import

Open the dashboard.

Upload:

- Poles CSV
- Transformers CSV

using the **Import Network** button.

The platform automatically:

- imports the network
- stores official topology
- infers missing topology
- refreshes the dashboard

No additional commands are required.

---

# Verification

Open

```
http://localhost:5173
```

A successful deployment should display:

- Interactive network map
- KPI cards
- Incident panel
- Ticket panel
- Simulator
- Live event feed

Click

```
Import Network
```

and upload the sample CSV files.

Then:

- topology should appear
- poles should be visible
- simulator controls should work

Finally:

Trigger

```
BOOT

↓

HEARTBEAT

↓

POWER LOST
```

Expected result:

- pole color changes
- incident created
- ticket created
- event appears in live feed

---

# Troubleshooting

## Database Connection Failed

### Symptom

```
PrismaClientInitializationError
```

### Cause

Invalid database connection string.

### Fix

Verify:

```
DATABASE_URL
```

Ensure PostgreSQL is running.

---

## Prisma Client Out of Date

### Symptom

```
Property does not exist on Prisma Client
```

### Fix

Run

```bash
npx prisma generate
```

---

## Migration Errors

### Symptom

```
Migration failed
```

### Cause

Database schema differs from migration history.

### Fix

Development:

```bash
npx prisma migrate reset
```

Production:

```bash
npx prisma migrate deploy
```

---

## CSV Import Fails

### Symptom

Import endpoint returns validation errors.

### Cause

Missing required columns.

### Fix

Verify the CSV contains the expected columns.

For transformers:

- dt_id
- feeder_id
- lat
- lon

For poles:

- pole_id
- dt_id
- lat
- lon

---

## Simulator Produces No Incident

### Symptom

Power loss occurs but no incident appears.

### Cause

Network has not been imported or topology has not been inferred.

### Fix

Import the network first using the dashboard.

---

## Live Dashboard Does Not Update

### Symptom

Map updates only after refresh.

### Cause

Server-Sent Events connection failed.

### Fix

Verify:

```
GET /api/events
```

returns a valid SSE stream.

Check browser developer tools for EventSource errors.

---

## CORS Errors

### Symptom

```
Access-Control-Allow-Origin
```

errors in browser console.

### Fix

Ensure the backend CORS configuration allows

```
http://localhost:5173
```

---

## Port Already In Use

### Symptom

```
EADDRINUSE
```

### Fix

Terminate the existing process or change

```
PORT
```

inside

```
backend/.env
```

---

## Frontend Cannot Reach Backend

### Symptom

Network requests fail.

### Fix

Verify backend is running on

```
http://localhost:3000
```

and the frontend API base URL matches the backend.

---

## React Strict Mode

### Symptom

SSE events appear twice during development.

### Cause

React Strict Mode intentionally mounts components twice.

### Fix

This only occurs in development.

Production builds behave normally.

---

## Leaflet Map Does Not Render

### Symptom

Blank map.

### Cause

Leaflet CSS not loaded.

### Fix

Ensure

```ts
import "leaflet/dist/leaflet.css";
```

is imported in

```
main.tsx
```

---

# Resetting the Project

To reset the application to a clean state:

## Reset Database

```bash
npx prisma migrate reset
```

This removes all imported network data, incidents, tickets, telemetry, and topology.

---

## Regenerate Prisma Client

```bash
npx prisma generate
```

---

## Restart Backend

```bash
npm run dev
```

---

## Restart Frontend

```bash
npm run dev
```

---

## Re-import Sample Network

Use the dashboard's **Import Network** button and upload the provided CSV files.

---

# Expected Demo Flow

1. Start backend.
2. Start frontend.
3. Open `http://localhost:5173`.
4. Import the sample network.
5. Verify topology is displayed.
6. Simulate:
   - BOOT
   - HEARTBEAT
   - POWER LOST
7. Observe:
   - Live pole status changes
   - Incident creation
   - Ticket creation
   - Live dashboard updates
8. Advance the ticket through its lifecycle.
9. Trigger **POWER RESTORED** or **Repair** to restore the network.

Following these steps should reproduce the complete end-to-end workflow demonstrated in the project.