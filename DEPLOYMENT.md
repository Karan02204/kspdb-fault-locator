# Deployment Guide

This document describes how to build, configure, deploy, verify, troubleshoot, and reset the Propel Grid Intelligence Platform.

---

# System Requirements

## Software

| Software | Version |
|----------|----------|
| Docker Desktop | Latest |
| Docker Compose | v2+ |
| Git | Latest |

### Optional (Manual Development)

| Software | Version |
|----------|----------|
| Node.js | >=20.x |
| npm | >=10.x |
| PostgreSQL | >=16 |
| Prisma CLI | Installed via project dependencies |

---

# Repository Structure

```
backend/
frontend/
sample-data/
docker-compose.yml
README.md
DEPLOYMENT.md
```

---

# Environment Variables

Create a `.env` file inside the **backend** directory.

You may simply copy the provided example (committed at `backend/.env.example`).

```bash
cp backend/.env.example backend/.env
```

Example:

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

PORT=3000

HEARTBEAT_TIMEOUT_MINUTES=2

NODE_ENV=development
```

---

# Environment Variable Reference

| Variable | Required | Default | Description |
|-----------|----------|----------|-------------|
| DATABASE_URL | Yes | — | PostgreSQL pooled connection string used by Prisma |
| DIRECT_URL | Yes | — | Direct PostgreSQL connection used for migrations |
| PORT | No | 3000 | Backend API port |
| HEARTBEAT_TIMEOUT_MINUTES | No | 15 | Minutes of heartbeat silence before a pole is treated as possibly dark (matches the 15-minute heartbeat cadence) |
| NODE_ENV | No | development | Runtime environment |

`docker-compose.yml` supplies `DATABASE_URL` for the local stack. For manual
runs, `backend/.env.example` shows the full set of variables.

---

# Quick Start (Recommended)

## 1. Clone Repository

```bash
git clone <repository-url>

cd <repository-name>
```

---

## 2. Configure Environment

Copy

```
backend/.env.example
```

to

```
backend/.env
```

Update

- DATABASE_URL
- DIRECT_URL

to match your PostgreSQL or Neon database.

---

## 3. Start Everything

```bash
docker compose up --build
```

Docker automatically:

- installs dependencies
- generates Prisma Client
- runs migrations
- seeds a realistic synthetic network (idempotent — skipped if poles exist)
- starts the backend
- starts the frontend

---

# Application URLs

| Service | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| Live Events (SSE) | http://localhost:3000/api/events |

---

# Manual Installation (Optional)

## Backend

```bash
cd backend

npm install

npx prisma generate

npx prisma migrate deploy

npm run dev
```

---

## Frontend

```bash
cd frontend

npm install

npm run dev
```

---

# Initial Data Import

The database is **seeded on startup**, so no import is required to see a
working system.

If you want to replace the seeded network (for example after a reset):

1. Open `http://localhost:5173`.
2. Click **Import Network**.
3. Upload `sample-data/transformers.csv` and `sample-data/poles.csv`
   (or your own CSVs matching the schemas in `02-data-and-systems.md`).

The platform automatically

- imports the network
- reconstructs missing topology
- stores official topology
- refreshes the dashboard

To re-seed the synthetic network on demand (after wiping the DB):

```bash
docker compose exec backend npm run seed
```

---

# Verification

A successful deployment should display

- Interactive network map (seeded network, not empty)
- KPI dashboard
- Incident panel
- Ticket panel
- Simulator
- Live Event Feed

Trigger

```
BOOT

↓

HEARTBEAT

↓

POWER LOST
```

Expected behaviour

- Pole turns red
- Within ~30 seconds an incident is created
- A ticket is created
- Live Event Feed updates
- Confidence score displayed

Trigger

```
POWER RESTORED
```

Expected behaviour

- Pole becomes energized again
- Ticket is auto-verified from telemetry (RESOLVED → VERIFIED without a click)
- Operator may CLOSE the ticket

---

# Resetting the Project

To completely reset the application

Stop containers

```bash
docker compose down -v
```

Remove generated containers

```bash
docker compose build --no-cache
```

Restart

```bash
docker compose up --build
```

If running manually

```bash
npx prisma migrate reset

npx prisma generate

npm run seed
```

Then open the dashboard — the synthetic network is present again.

---

# Troubleshooting

---

## Backend Cold Start

### Symptom

The frontend loads but

- map remains loading
- tickets remain loading
- incidents remain loading

for approximately 30–60 seconds.

### Cause

The public backend is deployed on a free-tier hosting provider which suspends inactive services.

### Fix

Wait for the backend to wake up.

Once the first request completes the application loads normally.

---

## Database Connection Failed

### Symptom

```
PrismaClientInitializationError
```

or

```
P1001: Can't reach database server
```

### Cause

Incorrect database connection string.

### Fix

Verify

```
DATABASE_URL
DIRECT_URL
```

Ensure PostgreSQL or Neon is reachable.

---

## Neon Connection Issues

### Symptom

Prisma migrations fail but the application starts.

### Cause

Using the direct Neon endpoint for application traffic.

### Fix

Use

- pooled endpoint for `DATABASE_URL`
- direct endpoint for `DIRECT_URL`

---

## Migration Errors

### Symptom

```
Migration failed
```

### Cause

Database schema differs from migration history.

### Fix

Development

```bash
npx prisma migrate reset
```

Production

```bash
npx prisma migrate deploy
```

---

## Prisma Client Out of Date

### Symptom

```
Property does not exist on Prisma Client
```

### Fix

```bash
npx prisma generate
```

---

## Prisma Engine Binary Download Fails

### Symptom

```
request to https://binaries.prisma.sh/... failed
```

during `npx prisma generate` (common on restricted networks).

### Fix

Retry — the download is flaky on some networks. If it persists, download
the engine binaries on a machine with open network access and copy them
into the image, or set `PRISMA_ENGINES_MIRROR` to a reachable mirror.

---

## Seed Skips / "already contains poles"

### Symptom

`Seed skipped: database already contains N poles.` in backend logs.

### Cause

The seeder is idempotent by design; it only seeds an empty database.

### Fix

That is expected after the first start. To force a fresh seed:

```bash
docker compose down -v
docker compose up --build
```

---

## Running the Tests

```bash
cd backend
npm test        # unit tests for localization, confidence, grouping,
                # debounce, ingest schema, topology completion, seed generator
npm run bench   # measured pure-logic timings
```

---

## Docker Uses Old Code

### Symptom

Code changes are not reflected after rebuilding.

### Cause

Docker layer cache.

### Fix

```bash
docker compose build --no-cache

docker compose up
```

---

## start.sh Not Found

### Symptom

```
./start.sh: not found
```

### Cause

Windows CRLF line endings.

### Fix

Convert

```
start.sh
```

to Unix (LF) line endings and rebuild the image.

---

## CSV Import Fails

### Symptom

Import endpoint returns validation errors.

### Cause

CSV format does not match the expected schema.

### Fix

Ensure transformers contain

- dt_id
- feeder_id
- lat
- lon

Ensure poles contain

- pole_id
- dt_id
- lat
- lon

---

## Simulator Produces No Incident

### Symptom

Power loss occurs but no incident appears.

### Cause

The network has not yet been imported.

### Fix

Import the sample network before using the simulator.

---

## Live Dashboard Does Not Update

### Symptom

Incidents or tickets only update after refreshing.

### Cause

Server-Sent Events connection failed.

### Fix

Verify

```
GET /api/events
```

returns a valid SSE stream.

Check the browser Network tab for EventSource errors.

---

## Frontend Cannot Reach Backend

### Symptom

Every API request fails.

### Cause

Backend is not running or frontend API URL is incorrect.

### Fix

Verify

```
http://localhost:3000
```

is reachable.

---

## CORS Errors

### Symptom

```
Access-Control-Allow-Origin
```

errors appear in the browser console.

### Fix

Ensure the backend CORS configuration allows

```
http://localhost:5173
```

or your deployed frontend URL.

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

## Leaflet Map Does Not Render

### Symptom

Blank map.

### Cause

Leaflet stylesheet is missing.

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

## React Strict Mode

### Symptom

Server-Sent Events appear twice during development.

### Cause

React Strict Mode intentionally mounts components twice.

### Fix

This only occurs in development.

Production builds behave normally.

---

# Expected Demo Workflow

1. Start the application (the synthetic network is seeded automatically).
2. Verify the topology appears.
3. Trigger BOOT, then HEARTBEAT, then POWER LOST.
4. Observe within ~30 seconds:
   - Pole state changes
   - Incident creation
   - Ticket creation
   - Confidence score
   - Live Event Feed updates
5. Progress the ticket through ACKNOWLEDGED and CREW_ASSIGNED.
6. Try marking it RESOLVED while the span is still dark — the server
   rejects it and the card shows the reason (telemetry says power is
   not back yet).
7. Trigger POWER RESTORED.
8. Observe the ticket auto-transitions to VERIFIED from telemetry.
9. Manually CLOSE the ticket.

Following these steps reproduces the complete end-to-end workflow demonstrated in the project.