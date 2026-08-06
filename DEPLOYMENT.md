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

You may simply copy the provided example.

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
| HEARTBEAT_TIMEOUT_MINUTES | No | 2 | Heartbeat timeout threshold |
| NODE_ENV | No | development | Runtime environment |

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

Open

```
http://localhost:5173
```

Click

```
Import Network
```

Upload

- Transformers CSV
- Poles CSV

The platform automatically

- imports the network
- reconstructs missing topology
- stores official topology
- refreshes the dashboard

No additional setup is required.

---

# Verification

A successful deployment should display

- Interactive network map
- KPI dashboard
- Incident panel
- Ticket panel
- Simulator
- Live Event Feed

After importing the sample network,

trigger

```
BOOT

↓

HEARTBEAT

↓

POWER LOST
```

Expected behaviour

- Pole turns red
- Incident created
- Ticket created
- Live Event Feed updates
- Confidence score displayed

Trigger

```
POWER RESTORED
```

Expected behaviour

- Pole becomes energized again
- Ticket automatically transitions to RESOLVED
- Operator may manually VERIFY and CLOSE the ticket

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
```

Then re-import the sample network.

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

1. Start the application.
2. Import the sample network.
3. Verify the topology appears.
4. Trigger BOOT.
5. Trigger HEARTBEAT.
6. Trigger POWER LOST.
7. Observe:
   - Pole state changes
   - Incident creation
   - Ticket creation
   - Confidence score
   - Live Event Feed updates
8. Progress the ticket through ACKNOWLEDGED and CREW_ASSIGNED.
9. Trigger POWER RESTORED.
10. Observe automatic transition to RESOLVED.
11. Manually VERIFY and CLOSE the ticket.

Following these steps reproduces the complete end-to-end workflow demonstrated in the project.