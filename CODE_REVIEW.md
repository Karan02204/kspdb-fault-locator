# Code Review — kspdb-fault-locator vs. the Assignment

**Review date:** 2026-08-06 · **Branch reviewed:** `main` @ `7466c64`
**Scope:** every file in `assignment/`, all backend modules, all frontend components, `README/ARCHITECTURE/DEPLOYMENT/DECISIONS/AI-WORKFLOW`, docker-compose, seed data.
**Method:** full read + targeted execution of the pure logic (localization engine, boundary detector, subtree builder, incident grouper, confidence engine, partial-topology completion) against realistic scenarios, using the project's own code copied into a scratch harness (`tsx`). Prisma's generated client couldn't be rebuilt here (binary download blocked), so repository-level claims are from reading; all algorithm claims are from *running* the code.

---

## Status update (same day): fixes applied

All P0/P1 findings in this review have been implemented in the repo (see
`DECISIONS.md`, entry "2026-08-06 Hardening Pass"). Verified in this
sandbox:

- `tsc --noEmit` → 0 errors (via a gitignored stub of the Prisma client)
- `npm test` → 31/31 passing (localization range/evidence/impossible-pattern
  behaviour, confidence honesty, grouping, debouncer, ingest schema,
  topology completion, seed generator)
- `npm run lint` (frontend) → 0 errors
- `npm run build` (frontend) → succeeds
- `npm run bench` → topology completion 240 poles ≈ 44 ms (was ~3.9 s)

Not yet verifiable in this sandbox (no Docker/Postgres/Prisma binaries):
the end-to-end `docker compose up` flow. That must be re-validated on a
machine with Docker before relying on the submission gates.

---

## Bottom line

The skeleton is right: radial-tree localization via live→dark boundaries, one incident per boundary, per-device sequence dedup, boot sessions, confidence with an explainable breakdown, ticket lifecycle with telemetry-based pushback, SSE, Docker. But **the core detection logic has five demonstrable correctness defects that will produce exactly the failures the assignment warns about** (missing the fault, crying wolf, firing on scheduled outages), and **several acceptance-gate deliverables are missing or mis-documented** (no seed on startup, no synthetic-registry generator, no feeder-fault injection, no tests, single commit, docs that describe systems not in the repo). For a submission, the localization defects are the most expensive because localization is 25% of the score and "correct handling" is its first criterion.

---

## What is genuinely good (keep)

- **Localization is a graph problem, not an LLM problem** — the right call, and correctly argued in `ARCHITECTURE.md`. Deterministic, instant, explainable.
- **Per-device serialization buffer** (`telemetry-buffer.ts`) is a sound burst-handling primitive: no two packets of the same device are processed concurrently, queue per device, overflow protection.
- **Sequence-number dedup + boot sessions** is the right frame for at-least-once delivery and clock skew (design is right; there is a stale-retry hole, see P1-4).
- **Topology inference** for missing ordering (MST over a distance-capped candidate graph, rooted at the nearest pole, per-edge confidence 0.6–0.95) is a legitimate, honest answer to the 60% problem, with failure modes acknowledged in `ARCHITECTURE.md`.
- **Ticket transitions are validated** and marking RESOLVED re-runs localization and rejects while the span is still dark (`ticket.service.ts:67-73`) — the "don't believe the lineman" requirement is genuinely implemented.
- **DECISIONS.md is unusually honest** — a real "known limitations" list, documented assumptions, performance claims explicitly *not* benchmarked. That honesty is a differentiator at review time; preserve it.
- **SSE live updates** work through the whole flow (backend → event bus → frontend invalidation).

---

## Findings, ranked

### P0 — Correctness defects in the core logic (each verified by execution)

#### P0-1. A fault whose boundary touches an UNKNOWN pole is missed entirely
`boundary-detector.ts:32` only emits a boundary for an exact `LIVE → DARK` adjacent pair. If the pole just downstream of a live pole is UNKNOWN (no device fitted, device offline, firmware 1.2 that never sends `power_lost`, or simply never heard from yet), **no boundary is found and the fault silently vanishes**.

Verified: line `P1(LIVE) → P2(UNKNOWN) → P3(DARK) → P4(DARK)` returns **0 faults** (harness scenario S2).

Why it matters: this is not an edge case. ~9% of poles have no device, ~4% of the fleet is offline at any moment, and 8% of devices (firmware 1.2) never send `power_lost` at all. The assignment's FAQ asks this exact question ("A pole with no device is on the fault boundary. Now what?"). Today the answer is "the fault is not detected."

Fix direction: treat UNKNOWN as a *soft* dark when the pattern is consistent with a fault (e.g., live→UNKNOWN→…→dark with no live in between), and report the boundary as a **range** ("between P1 and P3") instead of a point, with topology/telemetry confidence lowered accordingly — exactly the "report a range and be honest in the UI" answer the brief suggests. The `LocalizedFault` type should support `(fromPoleId, toPoleId)` as a span range, not just a single edge.

#### P0-2. An all-UNKNOWN transformer is treated as a full DT outage
`localization.engine.ts:29` — `if (energizedPoles.length === 0)` returns a DT-level fault over **all** poles, with no check of *why* there are no live poles. On a freshly imported network (or a DT whose reporting poles haven't heartbeated yet, which is the normal state in the first 15 minutes), a single `power_lost` packet flips exactly one pole to DARK, the rest stay UNKNOWN → `energizedPoles.length === 0` → a **spurious high-confidence "whole DT down" incident + ticket**.

Verified: all-UNKNOWN with one DARK pole → 1 fault covering every pole (S5); with the confidence chain below it scores **0.945 → HIGH → ticket** (S8-style with UNKNOWN-as-DARK). This fires on the very first dark packet after import — a guaranteed cry-wolf in a reviewer's demo if they press POWER LOST on a device whose neighbors haven't reported yet.

Fix: the all-dark branch must require *evidence* — e.g., only poles observed DARK count as dark, UNKNOWN poles must not be asserted dark, and the branch should require a minimum observed-dark ratio or explicit "DT/feeder fault" corroboration (all *known* poles dark).

#### P0-3. Dead sensors are reported as high-confidence span faults (cry wolf)
A single dark pole whose children are LIVE is physically impossible as a line fault (power to the children flows through the parent). The assignment spells this out as the canonical "your sensor is lying" signature (`01-problem-context.md` §2). The system does nothing with it: the boundary detector happily emits `LIVE → DARK` for it, and the confidence engine gives no penalty.

Verified: `P1(LIVE) → P2(DARK) → P3(LIVE)` → **1 fault** on P1→P2 (S10), confidence **0.982 → HIGH → ticket** (S11).

Fix: add an explicit "dark pole with live descendants = sensor fault, not outage" check (invert the boundary test — walk downstream of every dark pole; if any descendant is LIVE, suppress or heavily penalize). This is also the natural place to implement the "killed a device with power still on → no ticket" self-check robustly.

#### P0-4. Telemetry confidence is inflated because UNKNOWN counts as "observed dark"
`localization.repository.ts:21` (`getPoleStatesByIds`) maps *anything* that isn't `POLE_LIVE` to DARK — including UNKNOWN poles that have never reported, poles with no device, and poles with `lastPoleStateEvent = UNKNOWN`. This feeds `TelemetryConfidenceEvaluator` (`telemetry-confidence.evaluator.ts`), so a DT where half the poles have never been heard from reports "excellent telemetry coverage."

Verified: with 3 affected poles all UNKNOWN, correct handling scores **0.863** vs. the repo's UNKNOWN-as-DARK behavior **0.945** (S9) — and the difference is *smaller* than it should be because the evaluator itself floors coverage at 0.5 even with zero observations.

Why it matters: the assignment requires **honest confidence reporting** ("how confident you are, and why"). Today confidence is systematically over-stated precisely in the situations that should lower it. Note the coupling: this bug currently *masks* P0-1/P0-2 in demos — fixing `getPoleStatesByIds` alone will make the demo's span-fault confidence drop below threshold unless the simulator is also fixed (see P1-3) and the evaluators made honest. Fix them together.

#### P0-5. Scheduled outages still create tickets (fires on load shedding)
`maintenance.evaluator.ts:29` scores an active maintenance window 0.5 with weight 0.1 — a 0.05 max effect. Verified: a clean span fault scores 0.945 normally and **0.895 during an overlapping scheduled outage** — still HIGH, still above the 0.7 creation threshold, ticket still created. The assignment lists "Firing on scheduled load shedding" as actively costing you, and the real-world caveat is that the feed overruns/cancels, so suppression needs a nuanced rule — but as implemented the maintenance feed does essentially nothing.

Fix: scheduled outages should *suppress or gate* incident/ticket creation (with an override for corroborated faults, e.g., dark *during* the window is expected; dark *after* the advertised end is a real fault — that is exactly what "shutdowns overrun by 20–40 minutes, one in ten cancelled" implies the logic must handle). At minimum the maintenance factor needs a much larger weight or a hard gate, plus a visible "within scheduled outage" tag in the UI rather than just a confidence nibble.

---

### P1 — Assignment-deliverable gaps

#### P1-1. G3 (seed on startup) is not met — reviewer opens an empty screen
`docker compose up` starts an **empty** database. Nothing is seeded; the reviewer must find the CSVs and click "Import Network." Gate G3 explicitly requires "seeded on startup with a usable synthetic network, so a reviewer sees a working system immediately." The shipped CSVs are also tiny (3 poles, 1 transformer, all official topology) — they never exercise the 60%-missing-topology inference that is the assignment's central problem, and the FAQ asks for "a few thousand poles… ~60% of transformers missing pole ordering."

Fix: a startup seeder that imports/creates a realistic synthetic network (a few thousand poles, ~60% DTs without `parent_pole_id`, ~9% poles without devices, a couple of DTs with official ordering) *and* a documented re-seed command. The seed must also be idempotent for `docker compose restart`.

#### P1-2. The simulator is missing required capabilities (`02-data-and-systems.md` §6)
Required: (a) generate synthetic pole/transformer registries, (b) inject span / DT / **feeder** faults, (c) realistic dying-message loss (30%) and firmware-1.2 silence, (d) independent noise (dead device while power fine, scheduled outage, out-of-order + duplicates), (e) repair with restoration telemetry. Shipped: manual boot/heartbeat/power-lost/power-restored, span-fault (2 poles), transformer-fault (all devices), repair. Missing: registry generation, **feeder fault**, dying-message loss, silent-firmware behavior, scheduled outage, dead-device-while-energized. (These are partially acknowledged in `DECISIONS.md` #4, which is good — but the gates say the simulator is "how we will actually evaluate your work.") Also, `SimulatorService.spanFault` darkens only the downstream device's pole, not the whole downstream subtree — a real span fault would darken every pole below the break (see P0-4 coupling).

#### P1-3. No tests, and the assignment asks for tests on exactly this logic
`backend/package.json` `test` script is `echo "Error: no test specified" && exit 1`. The assignment is explicit: "If you test one thing, test that a known fault in a known topology produces the expected span" (5% craft + underpins the 25% localization weight). A reviewer picking any function and asking you to explain it line-by-line is guaranteed — the follow-up call is 30 minutes and localization is the first question. The harness used for this review (see above) is a good starting point: ~10 scenarios, 5 of which currently fail.

#### P1-4. Partial-topology completion is O(n³) (docs claim O(n log n))
`partial-topology-completion.engine.ts:161-165` recomputes an **all-pairs max distance** inside the `while` loop — it doesn't depend on the loop variable at all — plus `findBestAttachment` is O(n²) per iteration → O(n³) total. Verified: **~3.9 s for 200 poles** (a 240-pole DT is the spec's max); for a few-thousand-pole import this runs synchronously inside the import request (`network.service.ts` → `inferMissingTopology`), so a big import blocks the HTTP response. `ARCHITECTURE.md` claims "Topology inference O(n log n)" — not true for the partial path. Fix: hoist `maxDistance` out of the loop (O(n²) total), and cache nearest-connected lookups.

#### P1-5. Feeder faults are not representable
Each transformer is localized independently; a feeder-level outage (all DTs dark) produces one incident per DT with no feeder-level grouping or "this is one event" presentation. The simulator can't inject one either (P1-2). The assignment requires distinguishing feeder faults (`01-problem-context.md` §2 table). A minimal fix: after per-DT localization, cluster incidents sharing a feeder + time window into a feeder incident, and don't create 412 tickets for one switch event.

#### P1-6. The "AI feature" is a static template, and the docs admit it can be wrong
`OperationalBrief.tsx` renders a fixed sentence from the first incident; there is no LLM, no prompt, no generation. That is a *legitimate* decision (deterministic localization should not be an LLM), and `ARCHITECTURE.md` argues it. But `DECISIONS.md` #1 admits "the generated narrative may not accurately reflect the current operational state" — a self-inflicted wound. Either (a) remove the "AI" framing and present it as a deterministic "Operational Brief" (honest, defensible), or (b) actually call an LLM with the incident/confidence/ticket context and include a deterministic fallback. Given the brief says "reaching for an LLM to do the fault localization itself is a choice we will interrogate hard," option (a) plus a one-paragraph "why no LLM" argument in `AI-WORKFLOW.md` is the safer path for the call.

---

### P2 — Robustness, ops, and docs-vs-code mismatches

#### P2-1. Docs describe systems that don't exist in the repo
- `DECISIONS.md` (2026-08-01) documents a **30-second Candidate Observation Window / debounce** as "Chose" — there is no candidate-incident or observation-window code anywhere; incidents are created synchronously on the first dark packet (`telemetry.service.ts:164-172` → `incident.service.ts:92-95`). The evaluation explicitly penalizes "documentation that describes a system other than the one in the repo."
- `ARCHITECTURE.md` API table lists `PATCH /api/tickets/:id`; the real route is `PATCH /api/tickets/:id/status` (`ticket.route.ts:15`).
- `ARCHITECTURE.md`: "Heartbeat timeout… contributes negatively to confidence" — it does not touch confidence or pole state at all (see P2-3).
- `DEPLOYMENT.md` references `backend/.env.example` and a `sample-data/` directory that **do not exist** in the repo; it documents `HEARTBEAT_TIMEOUT_MINUTES` (default 2) but the code hardcodes 15 (`heartbeat-monitor.ts:7`) and never reads the env var.
- `README.md`'s documentation-map table points to `architecture.md` / `deployment.md` / `ai_usage.md` (lowercase) which don't exist (actual: `ARCHITECTURE.md` etc.).

#### P2-2. `docker compose up` on a clean clone is at risk (gate G2)
`schema.prisma` declares `directUrl = env("DIRECT_URL")`; `docker-compose.yml` sets only `DATABASE_URL`. On a clean clone there is no `backend/.env` (gitignored, and the referenced `.env.example` doesn't exist), so `prisma migrate deploy` in `start.sh` loads a schema whose `DIRECT_URL` env var is missing — a classic G2 breakage. Verify on a truly clean clone right now; if it passes, document why. Also: `frontend/.env` contains `baseURL: http://localhost:3000/api` which is not valid dotenv syntax (harmless only because `axios.ts` falls back to the same default).

#### P2-3. Silent outages (firmware 1.2 / lost dying message) are never detected
`HeartbeatMonitor` writes a `HEARTBEAT_TIMEOUT` telemetry row and sets `healthStatus = OFFLINE` (`telemetry.repository.ts:81-93`), but **never flips `isEnergized`, never updates `lastPoleStateEvent`, and never calls localization** — the `IncidentService` import in `heartbeat-monitor.ts:3` is dead code. Localization reads only `isEnergized` (`localization.repository.ts:56`), so a pole that goes dark without a `power_lost` packet (30% of real faults, 100% of firmware-1.2 devices) stays LIVE forever and the outage is invisible. The `HEARTBEAT_TIMEOUT` event is also rejected by the normalizer ("Unsupported event type"), so it can't enter the pipeline even manually. This is the exact scenario the assignment says the heartbeat cadence exists for.

#### P2-4. Burst race: one fault can become several incidents; ticket numbers can collide
`processTransformer` is invoked per dark packet; two concurrent `power_lost` packets for the same transformer can both read "no open incident" and both create one (`incident.service.ts:75-95`) — no per-transformer lock/upsert. `generateIncidentNumber`/ticket number use `count + 1` (`incident.repository.ts:10-14, 296-299`), which collides under concurrency and violates the unique constraint. For the 5,000-message/10 s burst this is a live risk. Fix: unique key on `(transformerId, boundaryFrom, boundaryTo)` + `INSERT … ON CONFLICT`, or a per-transformer async mutex; replace count-based numbers with a sequence/date-based scheme.

#### P2-5. Stale retries can flip pole state after a duplicate BOOT
Dedup compares only `sequenceNumber <= lastSequenceNumber` (`telemetry.service.ts:42-46`), not the boot session. A duplicate BOOT (at-least-once delivery makes these real) increments the boot session and resets `lastSequenceNumber` to 0, so a **retried `power_lost` from the previous session (up to 6 h stale per the data contract) is accepted** and flips the pole dark. The DB unique key is `(deviceId, bootSession, sequenceNumber)` — the in-memory dedup should use the same tuple.

#### P2-6. Auto-verification is narrower than the assignment asks
On `POWER_RESTORED` with no remaining faults, the system only auto-advances a ticket that is already `CREW_ASSIGNED` (`telemetry.repository.ts:374-383`, `telemetry.service.ts:173-183`). If the operator never clicked through the lifecycle, a repaired fault leaves the ticket in DETECTED forever; and `findOpenIncidentWithTicket` picks the *first* CREW_ASSIGNED ticket on the transformer, so with two simultaneous faults one repair can resolve the wrong ticket. The requirement is "the system confirms from field data that power is actually flowing again, and closes the ticket" — consider auto-resolving regardless of manual state (or at least from DETECTED/ACKNOWLEDGED too), scoped to the incident's own affected poles, and auto-verifying after a grace period.

#### P2-7. RESOLVED pushback checks the whole transformer, not the incident's span
`ticket.service.ts:67-73` re-localizes the *transformer*; if two faults are open and the crew fixed only theirs, marking RESOLVED still throws ("Power has not been restored"). Scope the check to the incident's boundary/subtree.

#### P2-8. The operator UI silently swallows the pushback
`useUpdateTicket.ts` has no `onError` and `TicketCard` renders no error — React Query v5 doesn't rethrow by default, so when the backend rejects "Mark as RESOLVED" while poles are dark, **the operator sees nothing happen**. The pushback exists server-side but is invisible at 2 a.m., which defeats the requirement. Also the UI exposes no coordinates for the fault (the "coordinates to drive to" requirement) — incidents/tickets return pole IDs and (ticket-side) pincode only; lat/lon never leave the backend with the incident.

#### P2-9. `TelemetryBuffer` overflow throws into the HTTP handler
`telemetry-buffer.ts:23` throws on queue overflow, which becomes a 500 to the device; devices retry, making it worse. Overflow should drop-and-count (and surface a metric), not error.

---

### P3 — Craft and polish

- **Single commit.** `git log` shows one commit ("fix: Refactor score calculation…") — the assignment explicitly wants "incremental commits with meaningful messages." Even if history can't be rewritten now, future work should be committed in small steps.
- **Dead code / unused imports:** `IncidentService` in `heartbeat-monitor.ts`, `resolveIncident`, `deleteIncident`, `createIncidentWithTicket` in `incident.repository.ts`; `getPoleHealthByDeviceId`; `console.log("🚀 network.routes.ts loaded")` left in a route file.
- **BOOT with `seq != 0` throws** (`telemetry.service.ts:37-39`) → 500 to the device on a slightly non-conformant packet; be lenient at the ingest boundary (log + normalize), not strict.
- **Ingest contract drops fields** the assignment defines: `energized`, `pole_id`, `battery_mv` thresholds — the Zod schema (`telemetry.schema.ts`) doesn't accept `energized`/`pole_id` at all; the device payload per `02-data-and-systems.md` carries them. Accept and store them (they're the only ground truth for heartbeat state).
- **Map hard-coded to `transformers[0]`** (`NetworkMap.tsx`) — multi-DT synthetic data (which the FAQ encourages) will mis-center; acknowledged in DECISIONS #6 but worth fixing before any follow-up demo.
- **No maintenance API/UI** — the scheduled-outage behavior can't be demonstrated end-to-end (only confidence nudged by rows inserted manually). This blocks demonstrating a core "don't cry wolf" requirement.
- **Performance targets unmeasured** — DECISIONS #7 honestly says so (good). The assignment says "state whether you meet these, and measure rather than guess" — if you get a chance to revise, add a small benchmark script (ingest burst + localization p95) and report actual numbers, even if some miss.

---

## Verified defect summary (run, not guessed)

| # | Scenario | Expected | Actual |
|---|----------|----------|--------|
| S2 | LIVE → UNKNOWN → DARK → DARK (no-device/dead sensor on boundary) | 1 fault | **0 faults — missed** |
| S5 | Fresh DT, one DARK report, rest UNKNOWN | no fault | **1 spurious DT fault** |
| S9 | 3 affected poles all UNKNOWN | low confidence | **0.945 (UNKNOWN counted as observed dark)** |
| S10 | LIVE → DARK → LIVE (impossible pattern = lying sensor) | no fault | **1 spurious span fault** |
| S11 | confidence for S10 | < 0.7 | **0.982 → HIGH → ticket** |
| — | same fault with + without scheduled outage | suppressed | **0.945 → 0.895, still creates ticket** |
| — | partial topology completion, 200 poles | — | **≈ 3.9 s (O(n³) all-pairs recompute)** |

---

## If you get to improve it (priority order)

1. **Fix the UNKNOWN-pole handling** (P0-1, P0-2, P0-4 together — they are one design problem: "what is known vs. unknown, and what may we assert"). This is the localization answer your reviewer will interrogate.
2. **Add the impossible-pattern / dead-sensor check** (P0-3) — cheap, directly answers "don't cry wolf."
3. **Gate ticket creation on scheduled outages** (P0-5).
4. **Wire heartbeat timeout into state + localization** (P2-3) — this is the firmware-1.2 answer.
5. **Seed on startup + make the simulator capable of the full §6 list** (P1-1, P1-2) — gates G3/G5.
6. **Write the localization tests** (P1-3) — start from the harness scenarios in this review.
7. **Fix the clean-clone G2 risk** (P2-2) — clone into a fresh dir and run `docker compose up` yourself; make `.env.example` real.
8. **Make the docs match the code** (P2-1) — either implement the 30 s observation window or strike it; fix the API table, env-var table, file names.
9. **De-race burst handling and stale-retry dedup** (P2-4, P2-5).
10. **Surface errors + coordinates in the UI** (P2-8).

## Before the follow-up call

Expect: "walk us through your localization algorithm" → be ready to explain the live→dark boundary, the all-dark branch, and **what happens at an UNKNOWN pole** (currently: nothing — say what you'd change, as above). "Pick two or three parts of your code and explain them" → confidence engine and incident grouper are the likely picks; also `PartialTopologyCompletionEngine` (have the complexity answer ready — it's O(n³) today, not O(n log n)). "A constraint disappears — what if the pole registry had no GPS?" → your answer should lean on the existing sequence/heartbeat machinery and the observation-window design you documented but haven't built. Being able to say "the demo works today because bug X masks bug Y; here's the fix" is the strongest signal you understand what shipped.
