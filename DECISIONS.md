## [2026-08-04] Decision: Introduce Separate Inference Strategies for Missing and Partial Topology

### What we chose

The topology inference module was split into two independent inference strategies.

Transformers with no official topology use the existing constrained MST-based inference engine.

Transformers with partially populated official topology use a dedicated topology completion engine that preserves all authoritative pole connections and infers only the missing connections required to produce a connected radial network.

The appropriate strategy is selected by a topology state classifier.

### What we rejected

We rejected using a single inference algorithm for every transformer regardless of the completeness of its official topology.

We also rejected rebuilding the entire topology and attempting to merge inferred edges with official topology afterwards, because inferred trees may not preserve existing authoritative parent-child relationships.

### Why

Validation against the supplied dataset revealed that transformers may contain partially populated topology.

Existing official connections represent authoritative network information and should never be modified.

Using separate inference strategies allows complete topology inference for missing networks while safely extending partially known topology without altering existing connections.

This produces deterministic behaviour while preserving trusted infrastructure data.

### Assumptions this rests on

- Official topology, when present, is authoritative.
- Official topology may be incomplete.
- Missing topology should be inferred without modifying authoritative connections.
- Full topology inference and partial topology completion are fundamentally different graph problems.

### Consequences

The topology module now supports three network states:

- Complete topology
- Partial topology
- Missing topology

Each state is handled by a dedicated processing path, improving correctness, maintainability, and extensibility while preserving the integrity of official network data.

## [2026-08-03] Decision: Infer Topology Based on Completeness Rather Than Presence of Official Connections

### What we chose

Topology inference is triggered based on whether a transformer's official topology forms a complete radial network rather than simply checking for the existence of official pole connections.

A transformer is considered complete only when the official topology connects all poles into a single valid tree. If the official topology is partial, the system preserves the existing official connections and infers only the missing connections required to complete the topology.

### What we rejected

We rejected the approach of skipping topology inference whenever any official pole connection exists.

We also rejected replacing existing official topology with a newly inferred topology, since official data represents authoritative information that should always be preserved.

### Why

During implementation and validation against the provided dataset, we discovered that some transformers contain partially populated topology.

For example, transformer **D-0112** contains poles where some records include `parent_pole_id` while others do not:

| Pole | parent_pole_id |
|------|----------------|
| P-024431 | P-024430 |
| P-024432 | P-024431 |
| P-024433 | *(missing)* |

Under the original implementation, the presence of any official connection caused topology inference to be skipped entirely, leaving isolated poles permanently disconnected.

To address this, the topology module was redesigned to distinguish between **partial** and **complete** official topology.

The validator now determines whether the official topology already forms a valid connected tree. Only transformers with incomplete topology are passed to the inference engine.

This preserves authoritative topology while allowing missing connections to be inferred where necessary.

### Assumptions this rests on

- Official topology data is authoritative but may be incomplete.
- Missing `parent_pole_id` values represent unknown topology rather than invalid poles.
- Preserving existing official topology is preferable to replacing it with inferred results.
- A complete topology is defined as a connected, acyclic tree spanning all poles belonging to a transformer.

### Consequences

This redesign makes the topology inference pipeline resilient to partially populated datasets while ensuring that trustworthy official topology is never overwritten.

It also aligns the implementation with the actual characteristics of the provided dataset rather than relying solely on assumptions from the assignment brief.

## [2026-08-03] Decision Update — Incident Grouping Using Spatial and Temporal Correlation

### Chose

Incident identity is determined using both:

- Electrical topology
- Temporal proximity

Telemetry contributing to the same outage within a configurable observation period updates the existing incident rather than creating a new one.

This allows localization boundaries and confidence scores to evolve throughout the incident lifecycle while preserving a single incident record.

---

### Rejected

#### Grouping incidents using topology alone

Rejected because telemetry from the same physical outage may arrive gradually, causing repeated localization runs and duplicate incident creation.

---

### Why

A physical outage may produce multiple valid telemetry events over time.

Considering both spatial and temporal relationships allows the system to continuously refine localization without generating duplicate incidents.

---

### Trade-offs

Incident matching becomes slightly more complex because temporal context must also be evaluated.

However, operators receive a cleaner and more stable incident history.

---

### Future Improvements

- Adaptive observation windows based on network conditions.
- Historical outage correlation.
- Automatic incident merge and split detection.

---

### Assumption this rests on

Telemetry describing the same electrical outage is expected to arrive within a relatively short time interval compared to the overall incident duration.

## [2026-08-03] Decision Update — Sequence Number Based Telemetry Deduplication

### Chose

Duplicate telemetry packets are identified using the combination of:

- Device ID
- Sequence Number

Sequence numbers are also used to reject delayed or out-of-order telemetry.

Timestamps are reserved for:

- Observation windows
- Heartbeat timeout detection
- Incident grouping
- Audit history

---

### Rejected

#### Timestamp-based telemetry deduplication

Rejected because retransmitted packets may arrive at different times while representing the same logical device event.

---

### Why

Sequence numbers uniquely identify events generated by a device regardless of network retries or communication delays.

This provides deterministic duplicate detection without relying on transmission timing.

---

### Trade-offs

Devices must generate monotonically increasing sequence numbers.

If device firmware fails to maintain sequence ordering, duplicate detection quality decreases.

---

### Future Improvements

- Detect sequence counter resets after device reboot.
- Support configurable duplicate windows for legacy devices.

---

### Assumption this rests on

Each telemetry device generates strictly increasing sequence numbers for every new event.

## [2026-08-03] Decision Update — Separation of Telemetry Normalization and State Management

### Chose

The Telemetry Normalization Layer performs only protocol translation.

Persistent pole state is maintained by the Telemetry Service.

The responsibilities are separated as follows.

**Telemetry Normalizer**

- Parse telemetry
- Translate firmware-specific events
- Produce canonical domain events

**Telemetry Service**

- Deduplicate telemetry
- Reject out-of-order packets
- Update PoleHealth
- Persist telemetry history

---

### Rejected

#### Combining normalization and state management into a single component

Rejected because protocol translation and persistent state management solve different problems and require different dependencies.

---

### Why

Normalization should remain deterministic and stateless.

Updating the latest pole state requires historical information stored in the database and therefore belongs within the service layer.

---

### Trade-offs

The service layer becomes slightly richer.

However, each component has a single clearly defined responsibility.

---

### Future Improvements

- Stateless streaming normalization.
- Event bus integration.
- Independent telemetry processing workers.

---

### Assumption this rests on

Telemetry normalization should not require access to historical system state.

## [2026-08-03] Decision Update — Canonical Domain Event Normalization

### Chose

The system normalizes all firmware-specific telemetry into canonical domain events before entering the business logic.

Instead of propagating protocol-specific events such as:

- `POWER_LOST`
- `POWER_RESTORED`

throughout the backend, every telemetry message is translated into a common domain representation:

- `POLE_DARK`
- `POLE_LIVE`
- `HEARTBEAT`
- `DEVICE_BOOTED`

Every downstream subsystem operates only on these canonical domain events.

---

### Rejected

#### Using firmware event names throughout the application

Rejected because localization, confidence evaluation, incident management, and future heartbeat processing would all require firmware-specific branching logic.

---

### Why

Business logic should reason about electrical network behaviour rather than communication protocol details.

Introducing canonical domain events decouples the localization pipeline from device firmware and allows future telemetry sources to integrate without modifying downstream components.

---

### Trade-offs

An additional translation layer is introduced during telemetry ingestion.

However, downstream components become significantly simpler and firmware-independent.

---

### Future Improvements

- Support vendor-specific adapters.
- Runtime event mapping configuration.
- Additional domain events for voltage quality and phase imbalance.

---

### Assumption this rests on

Different firmware versions ultimately describe the same physical electrical events and can therefore be represented using a common domain vocabulary.

## [2026-08-02] — AI-Powered Operational Brief

**Chose:**

The system uses AI exclusively to generate concise **Operational Briefs** for detected incidents.

AI never participates in:

- Fault localization
- Incident creation
- Confidence calculation
- Topology inference
- Operational decision making

Instead, AI operates only after deterministic processing has completed.



---

### AI Processing Pipeline

```
Telemetry
        │
        ▼
Localization Engine
        │
        ▼
Incident Manager
        │
        ▼
Confidence Engine
        │
        ▼
AI Operational Brief
        │
        ▼
Operator Dashboard
```

The AI receives a completed incident and generates a human-readable operational summary.

---

### AI Input

The AI receives structured incident data including:

- Incident ID
- Fault span
- Distribution Transformer
- Affected poles
- Confidence report
- Maintenance status
- Suggested inspection location

The AI never receives raw telemetry or performs independent fault analysis.

---

### AI Output

The Operational Brief always answers five questions:

1. What happened?
2. Where is the fault?
3. How confident is the localization?
4. Why was this confidence assigned?
5. What should the field crew inspect first?

Example:

> A likely fault has been localized between Pole P12 and Pole P13. Eighteen downstream poles are affected. Localization confidence is Medium (82%) because the network topology was inferred while telemetry coverage remains high. No scheduled maintenance is active. Field crews should inspect the conductor span between P12 and P13 before investigating downstream equipment.

---

### Prompt Design

The AI is instructed to:

- Use only supplied incident data.
- Never invent new operational facts.
- Never speculate beyond deterministic outputs.
- Explicitly communicate uncertainty when confidence is low.
- Produce concise operational summaries suitable for field operators.

---

### Failure Handling

AI is an optional enhancement.

If the AI service is unavailable:

- Incident creation continues normally.
- Confidence reports remain available.
- Operator dashboard displays deterministic incident information.
- The system records the AI failure for monitoring.

No operational functionality depends on AI availability.

---

### Design Principles

AI augments deterministic system outputs rather than replacing them.

Operational decisions remain fully explainable and reproducible even when AI is unavailable.

The language model serves only as a natural-language presentation layer.

---

**Rejected**

### AI-based fault localization

Rejected because localization must remain deterministic, explainable, and reproducible.

---

### AI-generated confidence scores

Rejected because confidence is calculated using deterministic evaluation modules.

---

### AI-driven operational decisions

Rejected because dispatch and incident management should remain predictable and auditable.

---

**Why**

The assignment requires one AI-powered feature.

Generating operational briefs provides meaningful operator value while preserving the reliability of deterministic localization algorithms.

This approach minimizes hallucination risk, improves explainability, and ensures that every AI-generated statement can be traced back to structured system outputs.

---

**Trade-offs**

The AI does not improve localization accuracy.

Instead, it improves operator understanding and reduces the effort required to interpret incident data.

---

**Future Improvements**

- Multilingual operational briefs.
- Crew-specific recommendations.
- Historical incident comparisons.
- Voice-ready summaries.
- Shift handover summaries.

---

**Assumption this rests on**

Structured incident data contains sufficient information for AI to produce useful operational summaries without independently analyzing raw telemetry or making operational decisions.

## [2026-08-02] — Simulator Architecture

**Chose:**

The simulator is implemented as a backend module that generates synthetic telemetry and submits it through the same telemetry ingestion API used by real devices.

The simulator never bypasses the production processing pipeline.

Every simulated event follows the complete system flow:

```
Simulator
        │
        ▼
Generate Telemetry
        │
        ▼
Telemetry Ingestion API
        │
        ▼
Telemetry Normalization Layer
        │
        ▼
Candidate Observation Window
        │
        ▼
Localization Engine
        │
        ▼
Incident Manager
        │
        ▼
Confidence Engine
        │
        ▼
Notification Service
        │
        ▼
Operator Dashboard
```

---

### Simulator Responsibilities

The simulator is responsible for:

- Generating synthetic telemetry events
- Simulating heartbeat behaviour
- Simulating firmware capabilities
- Triggering predefined outage scenarios
- Accelerating time for demonstrations

The simulator is **not** responsible for localization, confidence calculation, or incident generation.

---

### Supported Scenarios

The simulator includes predefined scenarios covering the major operational workflows.

- Single span fault
- Branch fault
- Distribution Transformer outage
- Multiple simultaneous faults
- Firmware heartbeat timeout
- Scheduled maintenance
- Maintenance overrun
- Power restoration

Each scenario exercises the complete processing pipeline.

---

### Telemetry Generation

Generated telemetry is identical to production telemetry except for a metadata field identifying its origin.

Example:

```json
{
  "source": "SIMULATOR",
  "poleId": "P-102",
  "event": "power_lost",
  "timestamp": "2026-08-02T10:00:00Z"
}
```

The backend processes simulated and real telemetry using exactly the same code path.

---

### Simulator Dashboard

A lightweight administrative panel allows users to:

- Select a predefined scenario
- Choose the affected Distribution Transformer
- Start the simulation
- Reset the simulation

No custom scripting interface is provided.

---

### Time Control

The simulator supports configurable time acceleration.

This allows observation windows, heartbeat timeouts, and restoration events to complete quickly during demonstrations while preserving the same processing logic.

---

### Design Principles

The simulator validates the real system rather than replacing it.

Every simulated event passes through:

- Telemetry Normalization
- Observation Window
- Localization
- Incident Management
- Confidence Evaluation
- Real-time Notification

No subsystem receives simulator-specific shortcuts.

---

**Rejected**

### Separate simulator service

Rejected because it introduces unnecessary deployment complexity without improving the evaluation.

---

### Standalone scripts

Rejected because they do not provide an interactive demonstration experience.

---

### Directly invoking localization or incident creation

Rejected because bypassing the telemetry pipeline would fail to test significant portions of the system.

---

**Why**

The simulator exists to validate the production pipeline.

Reusing the same ingestion endpoint guarantees that simulated scenarios exercise exactly the same code paths as real telemetry, increasing confidence in both testing and demonstrations.

---

**Trade-offs**

Predefined scenarios provide less flexibility than a fully programmable simulator.

However, they significantly reduce implementation complexity while covering every major workflow required for evaluation.

---

**Future Improvements**

- Custom scenario builder
- Scenario recording and replay
- Random fault generation
- Load-testing mode
- Historical playback

---

**Assumption this rests on**

The predefined scenarios cover the critical operational workflows required to demonstrate localization accuracy, incident lifecycle, confidence evaluation, and real-time updates during the project evaluation.

## [2026-08-02] — Real-Time Communication Strategy

**Chose:**

The system uses **Server-Sent Events (SSE)** to deliver real-time incident notifications from the backend to the operator dashboard.

REST APIs remain the primary mechanism for retrieving and modifying application data.

SSE is used **only as a lightweight notification channel**.

When an incident changes, the backend notifies connected clients, which then retrieve the updated resource through the REST API.

---

### Communication Model

```
REST API

Client ─────────────► Backend

Request / Response



SSE

Backend ───────────► Client

One-way Notifications
```

This separation keeps REST as the single source of truth while using SSE only for event notifications.

---

### Processing Pipeline

```
Incoming Telemetry
        │
        ▼
Localization Engine
        │
        ▼
Incident Manager
        │
        ▼
Notification Service
        │
        ▼
Server-Sent Events (SSE)
        │
        ▼
Frontend
        │
        ▼
Refresh Updated Incident
```

The Notification Service publishes changes whenever the Incident Manager creates, updates, or resolves an incident.

---

### Notification Flow

When an incident changes:

1. Incident Manager updates the incident.
2. Notification Service publishes an SSE event.
3. Frontend receives the notification.
4. Frontend requests the updated incident using the REST API.
5. Dashboard refreshes automatically.

The SSE message itself never contains the complete incident payload.

---

### Event Payload

Example notification:

```json
{
  "type": "INCIDENT_UPDATED",
  "incidentId": "INC-104"
}
```

After receiving this notification, the frontend requests:

```
GET /api/incidents/INC-104
```

This ensures that REST remains the authoritative source of application state.

---

### Supported Event Types

The system publishes only meaningful operational events.

- INCIDENT_CREATED
- INCIDENT_UPDATED
- INCIDENT_RESOLVED
- SYSTEM_STATUS

Telemetry messages themselves are **never streamed directly** to the frontend.

Only processed incident-level events are published.

---

### Frontend Update Strategy

The frontend maintains application state using standard REST queries.

SSE events do not directly modify UI state.

Instead:

```
SSE Notification

↓

Invalidate Cached Data

↓

REST Request

↓

Updated Dashboard
```

This keeps state management deterministic and prevents inconsistencies between frontend and backend.

---

### Why Server-Sent Events?

SSE was selected because the dashboard only requires **server-to-client communication**.

Operators do not continuously stream data back to the server.

All operator actions such as:

- Acknowledging incidents
- Closing incidents
- Applying filters
- Viewing details

continue to use standard REST endpoints.

SSE provides:

- Automatic reconnection
- Native HTTP support
- Simpler implementation than WebSockets
- Lower infrastructure complexity
- Easy deployment behind reverse proxies

---

**Rejected**

### Polling

Rejected because it generates unnecessary requests, increases latency, and wastes bandwidth even when no incidents change.

---

### WebSockets

Rejected because the application does not require persistent bidirectional communication.

Introducing WebSockets would increase implementation complexity without providing significant benefits for the project's requirements.

---

### Streaming Raw Telemetry

Rejected because the operator dashboard should visualize processed operational information rather than individual telemetry events.

Streaming every telemetry packet would unnecessarily increase frontend complexity while providing little operational value.

---

**Why**

The operator dashboard requires timely updates whenever incident information changes but does not require continuous bidirectional communication.

Using REST for application state and SSE for notifications provides a clean separation between data retrieval and real-time awareness.

This architecture keeps the backend simple, minimizes bandwidth usage, and maintains REST as the single source of truth.

---

**Trade-offs**

After receiving an SSE notification, the frontend performs an additional REST request to retrieve the updated incident.

Although this introduces one extra HTTP request per update, it greatly simplifies frontend state management and avoids transmitting large payloads through persistent connections.

---

**Future Improvements**

- Broadcast only changed fields instead of invalidating the complete incident.
- Support multiple notification channels.
- Add notification filtering by Distribution Transformer or region.
- Introduce WebSockets if future operator workflows require real-time bidirectional collaboration.

---

**Assumption this rests on**

The operator dashboard primarily consumes real-time operational updates and rarely sends time-sensitive commands back to the server.

Server-to-client notifications combined with REST-based resource retrieval provide sufficient responsiveness while keeping the architecture simple, maintainable, and aligned with the project's requirements.

## [2026-08-02] — Operator Visualization Strategy

**Chose:**

The operator dashboard uses a **hybrid geographic visualization** that overlays the electrical distribution network on top of an OpenStreetMap base layer.

The interface prioritizes operational awareness rather than cartographic accuracy.

The dashboard follows a split-screen layout that allows operators to simultaneously view:

- The affected network
- Incident details
- Confidence explanations
- AI-generated incident summary

---

### Visualization Stack

The system uses:

- Leaflet.js
- OpenStreetMap tiles
- Electrical network overlay

The backend remains independent of the visualization library by exposing visualization-specific API models rather than map-library-specific formats.

---

### Dashboard Layout

```
Header
(KPIs, Filters)

↓

Interactive Network Map (≈70%)

↓

Bottom Information Panel

├── Incident Details

└── Confidence & AI Summary
```

---

### Visualization Layers

The map contains three logical layers.

#### Base Map

Displays geographic context using OpenStreetMap.

Provides:

- Roads
- Landmarks
- Navigation context

---

#### Electrical Network Layer

Displays:

- Distribution Transformers
- Poles
- Electrical connections

Known topology is drawn using solid lines.

Inferred topology is drawn using dashed lines so operators can immediately distinguish inferred connections from officially known infrastructure.

---

#### Incident Layer

Displays active operational information.

Including:

- Fault span
- Affected poles
- Incident status
- Confidence indicators
- Maintenance indicators

Only affected elements are updated during incident changes to avoid unnecessary map redraws.

---

### Operator Information Panel

The lower panel displays operational information without requiring additional navigation.

Incident Details include:

- Incident ID
- Current Status
- Fault Span
- Affected Poles
- Distribution Transformer
- Maintenance Status

Confidence Panel includes:

- Confidence Score
- Confidence Level
- Evaluation Factors
- Human-readable explanations
- AI-generated incident summary
- Localization history

---

### Visualization Model

The backend returns visualization-oriented data transfer objects rather than Leaflet or GeoJSON objects.

Example:

- VisualizationNode
- VisualizationEdge
- VisualizationIncident

This keeps backend services independent of frontend rendering technology while allowing future clients (mobile, desktop, GIS exports) to reuse the same API.

---

### Design Principles

The visualization prioritizes:

- Explainability
- Operator efficiency
- Minimal visual clutter
- Fast incident recognition
- Clear distinction between known and inferred topology

The map communicates electrical relationships while preserving geographic context.

---

**Rejected**

### Pure schematic network view

Rejected because it lacks sufficient geographic context for field crews.

---

### Standard map without network overlay

Rejected because electrical relationships become difficult to interpret.

---

### Full-screen map interface

Rejected because operators must continuously switch between the map, incident details, and confidence explanations.

The split-screen layout allows all critical operational information to remain visible simultaneously.

---

### Animated visualizations

Rejected because they increase implementation complexity without improving operator decision-making.

---

**Why**

Operators need to understand both **where** the fault occurred and **why** the system believes that localization is correct.

A hybrid visualization combines geographic awareness with electrical topology while keeping incident reasoning immediately accessible.

The split-screen layout reinforces the project's emphasis on explainable fault localization by presenting the confidence report and AI explanation alongside the map rather than hiding them behind additional interactions.

---

**Trade-offs**

The interface dedicates less space to the map than a full-screen visualization.

However, operators gain immediate access to incident reasoning, confidence information, and AI-generated explanations without interrupting their workflow.

---

**Future Improvements**

- Layer visibility controls.
- Cluster visualization for dense urban networks.
- Historical outage playback.
- Route guidance for maintenance crews.
- Satellite imagery support.
- Heat maps showing recurring fault locations.

---

**Assumption this rests on**

Operators make better decisions when geographic context, electrical topology, localization confidence, and incident explanations are presented together within a single interface rather than across multiple screens.

## [2026-08-02] — Missing PIN Fallback Strategy

**Chose:**

The system performs fault localization exclusively using internal Pole IDs.

Missing PIN values never affect localization.

When localization results are presented to operators, the system resolves missing PINs using the nearest pole with a valid PIN belonging to the same Distribution Transformer (DT).

This nearest valid pole acts only as a **reference landmark** for field crews.

The original localized span remains unchanged.

---

### Resolution Strategy

During system initialization:

1. Identify every pole with a missing PIN.
2. Search for the geographically nearest pole with a valid PIN under the same DT.
3. Store this mapping for future use.

Example:

```
P8 (Missing PIN)

↓

Nearest Valid PIN

↓

P10 (PIN: KPDB-004128)
```

The mapping is precomputed once and reused during incident presentation.

---

### Operator Display

Localization always reports the actual detected span.

Example:

```
Detected Fault

Between

Pole P8

and

Pole P9
```

If neither pole has a valid PIN:

```
Detected Fault

Between

Pole P8

and

Pole P9

Nearest Reference Pole

KPDB-004128
```

The reference PIN assists field crews without changing the actual localization result.

---

### Processing Pipeline

```
Localization Engine
        │
        ▼
Localized Fault Span
        │
        ▼
Location Formatting Utility
        │
        ▼
Operator-Friendly Location
```

The Location Formatting Utility is responsible only for presentation.

The localization engine never depends on PIN availability.

---

### Why Precompute?

The nearest reference pole is determined during system startup because:

- Pole locations are static.
- PIN mappings rarely change.
- Runtime searches become unnecessary.
- Incident processing remains lightweight.

---

### Design Principles

Localization accuracy must never depend on administrative identifiers.

Pole IDs remain the authoritative identifiers throughout the backend.

PIN values are treated purely as operator-facing metadata.

Missing administrative data should never reduce localization accuracy.

---

**Rejected**

### Using the Distribution Transformer PIN

Rejected because it discards valuable localization precision by collapsing every fault to the DT level.

---

### Displaying "Unknown PIN"

Rejected because it provides little operational value to field crews attempting to locate the affected span.

---

### Performing nearest-neighbour searches during every incident

Rejected because the nearest reference pole can be calculated once during initialization, avoiding unnecessary runtime computation.

---

### Replacing the localized pole with the reference pole

Rejected because this would falsely imply that the fault occurred at the reference pole rather than near it.

The reference PIN exists only to improve operator navigation.

---

**Why**

Localization and operator presentation solve different problems.

Localization identifies the electrical fault location using the network topology.

Operators require recognizable field references to navigate to that location.

Separating these responsibilities ensures that missing administrative identifiers never compromise localization quality while still providing practical guidance to maintenance crews.

---

**Trade-offs**

The nearest reference pole may not always be the pole physically closest to the fault span due to road layouts or terrain.

However, it provides a far better operational reference than displaying no PIN or falling back to the Distribution Transformer.

---

**Future Improvements**

- Integrate GIS road-network data when selecting reference poles.
- Allow operators to manually configure preferred reference landmarks.
- Support multiple nearby reference poles ranked by accessibility.
- Automatically update reference mappings when pole inventory changes.

---

**Assumption this rests on**

Pole coordinates are accurate and nearby poles within the same Distribution Transformer represent meaningful field references for maintenance crews.

Using the nearest valid PIN improves operator usability without affecting the underlying fault localization algorithm.

## [2026-08-02] — Scheduled Outage Handling

**Chose:**

The system treats scheduled maintenance as **context for evaluating incidents**, not as a mechanism for disabling fault detection.

Scheduled outages are represented as maintenance records containing:

- Maintenance ID
- Planned start time
- Planned end time
- Affected Distribution Transformers (DTs)
- Optional description

During fault localization, the system continues processing telemetry normally.

Scheduled maintenance is evaluated as one of the inputs to the **Confidence Engine** through a dedicated **Maintenance Evaluator**.

The Maintenance Evaluator determines whether the observed outage is:

- Fully explained by scheduled maintenance
- Partially explained by scheduled maintenance
- Unrelated to scheduled maintenance
- Persisting after the maintenance window has ended

This evaluation contributes to the final confidence report.

---

### Processing Pipeline

```
Telemetry
     │
     ▼
Localization Engine
     │
     ▼
Confidence Engine
     │
     ├── Topology Evaluator
     ├── Telemetry Evaluator
     ├── Boundary Evaluator
     ├── Sensor Health Evaluator
     ├── Observation Evaluator
     └── Maintenance Evaluator
     │
     ▼
Confidence Report
```

---

### Maintenance Evaluation

The Maintenance Evaluator compares:

- Current timestamp
- Scheduled maintenance window
- Affected DT(s)
- Observed outage location

Based on this comparison it produces one of four outcomes.

---

#### Expected Maintenance

The outage matches the scheduled maintenance window and affected assets.

Result:

- Confidence reduced
- Incident marked as expected maintenance
- No operator action required

---

#### Partial Match

Only part of the observed outage is explained by maintenance.

Example:

Scheduled maintenance affects one DT, but neighboring DTs also lose power.

Result:

- Confidence reduced
- Incident still created
- Operator informed that maintenance does not fully explain the outage

---

#### Unexpected Outage

No scheduled maintenance exists for the affected assets.

Result:

- Confidence unaffected
- Standard incident workflow

---

#### Maintenance Overrun

The maintenance window has ended, but power has not been restored.

Result:

- Maintenance no longer explains the outage
- Confidence recalculated
- Existing incident updated or new incident created depending on incident state

---

### Design Principles

Scheduled maintenance never disables the localization engine.

The localization engine always identifies the most likely fault location based solely on telemetry and topology.

Maintenance information only influences how confidently the system interprets the detected outage.

This preserves a clear separation between:

- Fault detection
- Confidence evaluation
- Operational decision making

---

### Usage Throughout the System

The maintenance evaluation is included in the Confidence Report.

Example:

```
Maintenance

Status: Warning

Reason:
Active maintenance window detected for DT-102.
Observed outage matches scheduled maintenance.
```

This explanation is displayed in:

- Operator Dashboard
- Confidence Report
- AI Incident Summary

---

**Rejected**

### Completely suppressing detection during maintenance

Rejected because genuine faults can occur while maintenance is in progress.

Suppressing all incidents would hide real outages and reduce operator awareness.

---

### Ignoring maintenance completely

Rejected because operators would receive unnecessary alerts for planned outages, reducing trust in the system.

---

### Dedicated Incident Policy Layer

Rejected because introducing another major subsystem adds unnecessary architectural complexity for the scope of this assignment.

The existing Confidence Engine already provides an appropriate place to evaluate maintenance as another source of contextual evidence.

---

**Why**

Scheduled maintenance changes the expected operating conditions of the network but does not change how faults are detected.

Treating maintenance as contextual information rather than a detection rule keeps the localization algorithm deterministic while allowing the system to distinguish between planned and unexpected outages.

This design also minimizes implementation complexity by extending the existing Confidence Engine instead of introducing additional processing layers.

---

**Trade-offs**

Maintenance information may occasionally overlap with genuine faults.

Rather than suppressing incidents, the system reports reduced confidence and provides operators with the relevant maintenance context.

This favors transparency over hiding potential outages.

---

**Future Improvements**

- Import maintenance schedules from external utility systems.
- Support maintenance affecting individual feeders or pole groups.
- Allow operators to acknowledge or override maintenance events.
- Detect maintenance overruns automatically and generate alerts.

---

**Assumption this rests on**

Scheduled maintenance information is reasonably accurate and identifies the affected Distribution Transformers.

Although maintenance explains many planned outages, it is not assumed to explain every outage occurring during the maintenance window.

## [2026-08-02] — Telemetry Normalization & Device Compatibility

**Chose:**

The system introduces a dedicated **Telemetry Normalization Layer** that converts telemetry from different device firmware versions into a single canonical representation before any localization or confidence evaluation occurs.

Every downstream component operates exclusively on this normalized representation and is completely independent of device firmware or message formats.

The normalization layer has one responsibility:

> Convert heterogeneous telemetry into a common pole state without performing fault localization or outage inference.

---

### Processing Pipeline

```
Incoming Telemetry
        │
        ▼
Telemetry Normalization Layer
        │
        ▼
Canonical Pole State
        │
        ▼
Localization Engine
        │
        ▼
Confidence Engine
```

---

### Responsibilities of the Telemetry Normalization Layer

The normalization layer is responsible for:

- Parsing telemetry from different firmware versions.
- Understanding device capabilities.
- Removing duplicate events.
- Ordering delayed or out-of-order messages.
- Tracking heartbeat status.
- Converting all incoming telemetry into a common pole state.
- Preserving uncertainty instead of making outage decisions.

It is **not responsible** for:

- Fault localization
- Incident creation
- Confidence calculation
- Ticket generation

Those responsibilities belong to downstream components.

---

### Device Capability Model

Instead of implementing firmware-specific logic throughout the system, each device advertises its capabilities.

Example:

```json
{
  "supportsPowerLost": true,
  "supportsPowerRestored": true,
  "supportsHeartbeat": true
}
```

Older devices may expose:

```json
{
  "supportsPowerLost": false,
  "supportsPowerRestored": false,
  "supportsHeartbeat": true
}
```

Behavior is determined by capabilities rather than firmware version numbers, making the system extensible to future devices.

---

### Canonical Pole State

Every device is converted into the same internal representation.

Example:

```json
{
  "poleId": "P-102",
  "state": "OUTAGE",
  "source": "POWER_LOST_EVENT",
  "lastHeartbeat": "2026-08-02T10:00:00Z",
  "lastEvent": "power_lost",
  "observationConfidence": 0.95,
  "updatedAt": "2026-08-02T10:00:12Z"
}
```

Example for an older firmware device:

```json
{
  "poleId": "P-205",
  "state": "UNKNOWN",
  "source": "HEARTBEAT_TIMEOUT",
  "lastHeartbeat": "2026-08-02T09:58:30Z",
  "lastEvent": "heartbeat",
  "observationConfidence": 0.45,
  "updatedAt": "2026-08-02T10:00:30Z"
}
```

The normalization layer intentionally distinguishes between:

- Confirmed outage
- Confirmed healthy state
- Unknown state

Missing telemetry is **not automatically interpreted as a power outage**.

---

### Pole State Definitions

Every pole exists in one of three canonical states.

| State | Meaning |
|--------|---------|
| **HEALTHY** | Device confirms power is available. |
| **OUTAGE** | Device explicitly reports loss of power. |
| **UNKNOWN** | Device health or communication is uncertain; outage cannot yet be confirmed. |

The UNKNOWN state prevents the system from confusing communication failures with electrical faults.

---

### Heartbeat Handling

Devices that only support heartbeat messages are monitored using configurable heartbeat intervals.

If expected heartbeats are missed:

- Pole state becomes **UNKNOWN**.
- Sensor health is reduced.
- Confidence may decrease.
- Localization uses neighboring evidence before treating the pole as part of an outage.

A missed heartbeat alone never creates a fault ticket.

---

### Duplicate & Delayed Messages

The normalization layer removes duplicate telemetry and correctly orders delayed messages before updating the canonical pole state.

This prevents downstream components from implementing message-ordering logic.

---

### Usage Throughout the System

Once telemetry is normalized:

- Localization Engine operates only on canonical pole states.
- Confidence Engine evaluates localization reliability using canonical pole states.
- Incident Management consumes only canonical pole states.
- AI explanations are generated using deterministic outputs from downstream components.

No downstream component contains firmware-specific logic.

---

**Rejected**

### Firmware-specific logic throughout the application

Rejected because localization, confidence scoring, and incident management would all require firmware-dependent code, significantly increasing complexity and reducing maintainability.

### Treating missed heartbeats as immediate outages

Rejected because communication failures, device failures, and power outages are fundamentally different events.

Missing telemetry represents uncertainty rather than confirmed loss of power.

---

**Why**

Separating telemetry normalization from localization creates a clear boundary between **data interpretation** and **fault reasoning**.

Every downstream module receives a consistent representation regardless of the device that generated the telemetry.

This reduces code duplication, improves maintainability, and makes future firmware versions easier to support.

The design also aligns with the project's core architectural principles:

- Deterministic processing
- Explainable reasoning
- Separation of concerns
- Graceful handling of uncertainty

---

**Trade-offs**

Introducing a dedicated normalization layer adds one additional processing stage to the telemetry pipeline.

However, it dramatically simplifies every downstream subsystem by eliminating firmware-specific behavior outside a single component.

The architecture becomes easier to test, extend, and maintain as new device capabilities are introduced.

---

**Future Improvements**

- Dynamic capability discovery from connected devices.
- Automatic firmware profile registration.
- Support for additional telemetry types (voltage, current, power quality).
- Runtime validation of telemetry schemas.
- Device health analytics using historical heartbeat patterns.

---

**Assumption this rests on**

Different firmware versions may expose different telemetry capabilities, but every device can ultimately be represented using the same canonical pole state.

Separating telemetry normalization from localization ensures the remainder of the system remains deterministic, firmware-agnostic, and significantly easier to evolve over time.

## [2026-08-01] — Explainable Confidence Scoring Model

**Chose:**

The system uses an **Explainable Confidence Engine** that evaluates the reliability of the detected fault location rather than simply assigning an arbitrary percentage.

Confidence is treated as a first-class domain object.

Instead of producing only a numeric score, the engine generates a structured **Confidence Report** containing:

- Overall confidence score (0–100)
- Confidence level (High / Medium / Low)
- Human-readable summary
- Individual evaluation factors
- Confidence history over the lifetime of the incident

The confidence report is recalculated every time an incident receives new telemetry or the localization result changes.

---

### Confidence Report Structure

Each incident maintains:

- Current Confidence Score
- Confidence Level
- Human-readable Summary
- Evaluation Factors
- Confidence History

Example:

```json
{
  "score": 82,
  "level": "Medium",
  "summary": "Localization confidence is medium because topology was inferred while telemetry coverage remains high.",
  "factors": [
    {
      "category": "Topology",
      "status": "Warning",
      "reason": "Topology reconstructed using constrained graph inference."
    },
    {
      "category": "Telemetry",
      "status": "Good",
      "reason": "18 of 20 expected telemetry reports received."
    },
    {
      "category": "Boundary",
      "status": "Good",
      "reason": "Single Live → Dark transition identified."
    },
    {
      "category": "Sensor Health",
      "status": "Warning",
      "reason": "One delayed heartbeat detected."
    }
  ]
}
```

---

### Structured Confidence Evaluations

The confidence engine evaluates multiple independent aspects of the localization result.

#### 1. Topology Quality

Evaluates the reliability of the network topology.

Examples:

- Official topology available
- Inferred topology
- Topology validation results

---

#### 2. Telemetry Completeness

Measures whether sufficient telemetry was received from the expected downstream devices.

Examples:

- Percentage of expected pole reports received
- Missing telemetry
- Duplicate messages

---

#### 3. Boundary Clarity

Evaluates how clearly the localization engine identified the outage boundary.

Examples:

- Single Live → Dark transition
- Multiple possible boundaries
- Ambiguous localization

---

#### 4. Sensor Health

Evaluates the quality of incoming telemetry.

Examples:

- Delayed packets
- Missing heartbeats
- Duplicate events
- Firmware limitations

---

#### 5. Observation Stability

Evaluates whether the outage remained stable during the Candidate Observation Window.

Examples:

- Continuous outage
- Intermittent restoration
- Flapping telemetry

---

#### 6. Scheduled Outage Validation

Checks whether the detected outage overlaps planned maintenance windows.

Examples:

- Scheduled maintenance
- Unexpected outage
- Maintenance window expired

---

### Confidence Calculation

Each evaluation module independently produces:

- Partial score
- Status (Good / Warning / Poor)
- Human-readable explanation

The Confidence Engine combines these evaluations into a single confidence report.

Confidence is recalculated whenever:

- New telemetry arrives
- Localization improves
- Boundary changes
- Sensor health changes
- Scheduled outage information changes

Confidence is **never manually updated**.

---

### Confidence Explanation Generation

Each confidence evaluator produces structured evaluation data rather than directly generating human-readable text.

Each evaluation contains:

- Category
- Status
- Score
- Evaluation Code
- Metadata

Example:

```json
{
  "category": "Telemetry",
  "status": "Good",
  "score": 91,
  "code": "PARTIAL_TELEMETRY",
  "metadata": {
    "received": 18,
    "expected": 20
  }
}
```

A dedicated **Confidence Explanation Generator** converts these structured evaluation codes into human-readable explanations using predefined message templates.

Example:

```
PARTIAL_TELEMETRY

↓

18 of 20 expected telemetry reports received.
```

This separates evaluation logic from presentation logic and guarantees consistent explanations across the API, dashboard, logs, and AI-generated incident summaries.

---

### Confidence Limits

Confidence is capped according to topology quality.

Examples:

| Topology Source | Maximum Confidence |
|-----------------|-------------------:|
| Official topology | 100% |
| Valid inferred topology | 85% |
| Low-confidence inferred topology | 60% |
| DT-level localization fallback | 40% |

This prevents the system from reporting unrealistic certainty when localization is based on inferred or incomplete topology.

---

### Confidence History

Confidence is not overwritten.

Instead, every recalculation is recorded.

Example:

```
08:00
52%

↓

08:00:18
71%

↓

08:00:42
84%

↓

08:01:10
91%
```

This provides a complete audit trail showing how localization confidence evolved as additional telemetry became available.

---

### Usage Throughout the System

The Confidence Report serves as a shared source of truth for multiple system components.

#### Operator Dashboard

Displays:

- Confidence score
- Confidence level
- Evaluation factors
- Human-readable explanations

---

#### Ticketing System

Uses confidence to determine:

- Priority
- Escalation recommendations
- Operator awareness

Confidence does **not** determine whether a ticket is created.

---

#### AI Incident Summary

The AI explanation is generated from the structured Confidence Report and its associated explanations rather than directly from raw telemetry.

The AI never determines confidence itself.

Instead, it converts deterministic system outputs into a natural-language incident summary.

This ensures every AI-generated explanation remains factually grounded, reproducible, and fully traceable to the underlying confidence evaluations.

---

#### Audit & Debugging

Historical confidence reports allow engineers to understand why confidence increased or decreased during an outage.

---

**Rejected**

### Fixed confidence values

Rejected because they provide no explanation for operators and cannot adapt as telemetry changes.

### Confidence based solely on topology

Rejected because localization quality depends on multiple independent factors beyond network topology.

### Confidence calculated only once

Rejected because localization continuously improves as new telemetry arrives.

---

**Why**

Operators must understand not only the estimated fault location but also how reliable that estimate is.

An explainable confidence model improves transparency, increases trust in automated localization, and supports better operational decision-making.

By separating confidence evaluation from fault localization, the system remains modular, deterministic, and easier to maintain.

The same confidence report can be reused by the UI, ticketing system, AI explanation engine, and debugging tools without duplicating logic.

---

**Trade-offs**

The confidence engine introduces additional implementation complexity because each evaluation factor must be calculated independently.

However, this complexity significantly improves explainability, maintainability, and operator trust while providing a reusable component across the entire platform.

---

**Future Improvements**

- Learn evaluation weights from historical outage data.
- Continuously calibrate confidence using operator feedback.
- Compare predicted confidence with confirmed fault locations to improve scoring accuracy.
- Introduce probabilistic localization models as additional confidence inputs.
- Externalize explanation templates into a configurable message catalog to support localization, multilingual interfaces, and easier maintenance.

---

**Assumption this rests on**

Localization confidence is influenced by multiple independent sources of evidence rather than a single metric.

Providing transparent explanations alongside every confidence score improves operator trust and enables more informed decision-making than presenting an unexplained percentage alone.


## [2026-08-01] — Incident Grouping Strategy

**Chose:**

The system groups telemetry into incidents based on **fault boundaries and affected subtrees**, rather than individual pole events or arbitrary time windows.

Every outage is represented by a single **Incident** object.

Each incident maintains:

- Incident ID
- Current Status
- Current Boundary
- Boundary History
- Affected Subtree
- Affected Poles
- Confidence Score
- Telemetry History
- Created At
- Updated At

The boundary is treated as an evolving property of the incident rather than its unique identity.

An incident represents a real-world outage, while the boundary represents the system's current best estimate of where that outage originated.

As additional telemetry arrives, delayed packets are processed, or localization confidence improves, the estimated boundary may change without creating a new incident. Instead, the existing incident is updated with the improved localization while preserving its lifecycle, history, and ticket identifier.

This prevents duplicate tickets for the same physical outage and allows localization accuracy to improve over time.

---

### Incident Creation

After the Candidate Observation Window expires and localization completes:

1. Identify every live-to-dark boundary in the network.
2. For each boundary, determine the affected downstream subtree.
3. Check for an existing open incident whose affected subtree substantially overlaps the newly detected outage.
4. If such an incident exists, update its boundary, confidence, affected poles, and telemetry history.
5. Otherwise, create a new incident.

---

### Update Rules

New telemetry updates an existing incident when:

- it belongs to the same downstream outage,
- it does not indicate restoration,
- and the existing incident is still open.

The system updates:

- Current boundary (if localization improves)
- Boundary history
- Confidence score
- Affected subtree
- Affected pole list
- Telemetry history
- Last updated timestamp

The incident identifier and lifecycle remain unchanged throughout these updates.

---

### Restoration

When affected poles report restoration telemetry:

- the existing incident is updated,
- restoration is verified,
- and the ticket progresses through its lifecycle.

A restored incident is closed only after telemetry confirms that power has actually returned.

---

### Simultaneous Faults

Multiple faults remain separate whenever they produce independent outage boundaries.

Example:

```
Boundary A
P2 → P3

Boundary B
P10 → P11
```

Two boundaries create two independent incidents, even if they occur at the same time or under the same transformer.

---

### Missing Sensors

If a pole without telemetry lies on the fault boundary, the system reports a candidate span rather than a precise edge.

Example:

```
P2

↓

Unknown Pole

↓

P4
```

The incident stores the candidate span and reduces confidence rather than generating multiple possible tickets.

---

**Rejected**

### One ticket per dark pole

Rejected because a single physical fault may affect dozens of downstream poles, creating unnecessary alerts and overwhelming operators.

### Time-window grouping

Rejected because two unrelated faults occurring close together should remain separate incidents.

Time is used only for telemetry deduplication and event ordering, not for deciding whether two outages are the same incident.

---

**Why**

The physical network produces one outage boundary for one physical fault.

Grouping incidents around the boundary and its downstream subtree mirrors how electricity actually flows through the network.

By treating the boundary as a mutable property rather than the incident's identity, the system can continuously improve localization without generating duplicate tickets.

This produces fewer false alerts, supports incremental localization improvements, and keeps ticket history intact throughout the outage lifecycle.

---

**Trade-offs**

Boundary estimation may change as additional telemetry arrives, especially when topology is inferred or telemetry is incomplete.

Instead of creating new incidents, the system updates the existing incident with improved localization and confidence.

This slightly increases implementation complexity but results in a more stable and trustworthy ticketing system.

---

**Future Improvements**

- Merge repeated outages using historical outage patterns.
- Learn common fault locations over time.
- Detect recurring faults on the same span and automatically increase investigation priority.

---

**Assumption this rests on**

A single physical fault creates one continuous downstream outage.

Telemetry arriving later, out of order, or as retries represents additional evidence for the same outage rather than a new incident unless it produces an independent outage boundary.

## [2026-08-01] — Fault Detection Debounce Strategy

**Chose:**
A fixed 30-second Candidate Observation Window for all outage events before fault localization begins.

Whenever a `power_lost` event occurs (or an outage is inferred from telemetry), the system creates a **Candidate Incident** rather than immediately generating a fault ticket.

The candidate incident then remains under observation for 30 seconds.

During this period:

- Additional telemetry is collected.
- Duplicate or out-of-order messages are merged.
- Restoration events are monitored.
- Pole state updates continuously.

After 30 seconds:

- If the outage still exists, the localization engine is executed.
- If power has already been restored, the candidate incident is discarded without creating a ticket.

This observation window exists only to filter short-lived disturbances before localization begins.

---

### Detection Flow

```
Power Lost Event
        │
        ▼
Create Candidate Incident
        │
        ▼
30-second Observation Window
        │
        ├──────────────► Power Restored?
        │                    │
        │                    ▼
        │             Discard Candidate
        │
        ▼
Still Dark?
        │
        ▼
Run Localization Engine
        │
        ▼
Generate Ticket
```

---

**Rejected**

### Immediate ticket creation

Rejected because frequent voltage fluctuations, communication delays, or brief power interruptions would create unnecessary outage tickets and reduce operator trust.

### Adaptive debounce windows

Rejected because changing debounce time based on cluster size, DT outages or feeder outages adds unneeded complexity with little practical benefit.

In the assignment, the fault localization only takes 120 seconds. This requirement is easily satisfied and the detection pipeline remains deterministic and easy to test by taking a fixed 30-second observation window.

Rather than changing the detection time, the strength of the evidence is incorporated into the confidence scoring model.

---

**Why**

The debounce component is designed for one task only:

> Determine if the outage has been going on long enough to warrant localization.

Notice that it does not attempt to measure the **severity of the outage** or its confidence.

It makes sense to keep the timing separate from confidence for simplicity and because business rules should not be mixed with event timing.

The confidence will be determined based on:

- Quality of the topology
- Boundary detection
- Downstream pole consistency
- Sensor integrity
- Scheduled outage check
- Completeness of the telemetry data

---

**Trade-offs**

There is a delay of around 30 seconds between each verified disruption and the initiation of the process of localization.

This is a deliberate approach, which lowers the occurrence of false positives while staying well below the 120-second limit prescribed in the assignment for localizing faults.

Short disruptions, which get restored before the observation period elapses, will not create any tickets because this approach helps avoid responding to disruptions that no longer exist.

---

**Future Improvements**

Should future data from operations reveal the need for different observation windows based on each outage type, it is possible that the system will be able to adapt accordingly.

This optimization was deliberately delayed since the current implementation already meets all the necessary criteria while being much easier to implement.

---

**Assumption this rests on**

In most cases, real distribution faults last more than 30 seconds; however, temporary disturbances and communication problems occur and are solved within the observation period.

This compromise is justified by the features of telemetry and the task of fault detection in the context of this particular assignment.

## [2026-08-01] — Handling Missing Network Topology

**Chose:**
An approach to hybrid topology reconstruction that creates a plausible radial electric network for transformers having no topology data.

For transformers that have `parent_pole_id` and `seq_on_line` (~40% of them), the system employs the official topology.

For transformers lacking topology data (~60% of them), the system creates an approximative topology via a constrained graph construction technique:

1. Choose all poles associated with the transformer.
2. Construct a graph in which each pole will be connected only to its geographically plausible neighbours (k-nearest neighbours in a reasonable search radius).
3. Add the transformer as the root of the graph and connect it only to geographically plausible candidate poles.
4. Build a MST over the constructed constrained graph in order to get a connected radial network with the minimum sum of wires length.
5. Orient the created tree using BFS starting from the transformer and define parent-child relations between all poles.
6. Save the constructed topology in order to perform localization with the same internal representation as transformers having official topology.

The algorithm of fault localization is the same for both cases, and the only difference is the source of the topology.

---

**Topology Validation**

Before adopting any inferred topology, its validity is confirmed through engineering constraints, not simply taking the graph algorithms' output as gospel truth.

These constraints include the following:

- Every pole should have only one connection to return to the transformer.
- There shouldn't be any isolated poles.
- The inferred topology should be a radial tree (as guaranteed by the MST).
- Large span distances compared to the regional pole distribution lower confidence.
- Large numbers of branches at poles and from the transformer lower confidence.
- Any geographically dubious edge connections raise further doubt.

This step gives a confidence measure for the inferred topology rather than accepting or rejecting it outright.

---

**Localization Strategy**

The system follows a three-tier localization strategy.

### Tier 1 — Known topology

Official topology available.

Output:
- Exact fault span
- High confidence

### Tier 2 — Valid inferred topology

Topology successfully reconstructed and passes validation.

Output:
- Approximate fault span
- Medium confidence
- Ticket explicitly labelled as "Inferred Topology"

### Tier 3 — Low-confidence inference

In cases where topology reconstruction does not pass validation or the confidence drops below the threshold level, then the system purposely compromises on the localization process.

Output:
- Localization at DT level
- Low confidence
- UI indicates that an exact span cannot be determined

The system will never report any false precision just because there was an algorithm result..

---

**Rejected**

### Pure nearest-neighbour chaining

Rejected because it frequently creates incorrect branches and performs poorly in dense urban layouts.

### Unconstrained Minimum Spanning Tree

Rejected because it may generate physically unrealistic long-distance connections when every pole is allowed to connect to every other pole.

### Road-network inference

Rejected because it requires external GIS datasets that are unavailable within the assignment scope.

### Machine Learning approaches

Rejected because no labelled topology data exists for supervised learning.

### Historical outage learning as the primary solution

Rejected because the assignment starts with no operational history. Historical outage patterns are considered a future enhancement rather than the initial solution.

---

**Why**

The electric grid is essentially a radial tree.

The constrained graph approach creates a topological structure that takes into account this property of the physical structure, based on just the data provided by the assignment:

- Transformer location 
- Pole location via GPS coordinates
- Connection between pole and transformer

As we use a constrained MST, the wiring problem is minimized and branching is encouraged.

Tree orientation using BFS recovers the lost parent-child structure and allows the very same localization algorithm to work with either registered topology or inferred one.

Thus we preserve determinacy, explainability, maintainability and reasoning for the localization algorithm.

Most importantly, the system never tries to hide its uncertainty from the operator. Confidence is one of the first-class outputs of the system and the localization will degrade to DT-level in case the topology is unreliable.

---

**Trade-offs**

Proximity does not necessarily indicate electrical connectivity.

The alignment of the streets, branching pattern, or even improper pole positioning can result in faulty connections between edges that do not exist.

The validation phase lowers the probability of erroneous localization but does not prevent mistakes in inference.

There are cases where the algorithm deliberately localizes only at the level of a DT.

---

**Future Improvements**

- Improve inferred topology based on correlation of outage histories.
- Enable field crews to confirm and adjust inferred parent-child relationships.
- Incorporate GIS or survey data when possible to replace inferred topology.
- Increase accuracy of confidence scoring through ongoing feedback loops.

---

**Assumption this rests on**

The pole coordinates faithfully reflect the physical map of the low-tension grid, and the majority of connections happen to be close by geographically.

Even though geographic inference cannot capture the real structure of the network exactly, a radial reconstruction with confidence scores works just fine.

## [2026-08-01] — Primary Database Selection

**Chose:**
PostgreSQL

**Rejected:**
MongoDB as the primary datastore.

**Why:**
The electrical distribution network is essentially a tree of feeders, transformers, poles, and parent-child relationships. Postgres models this structure naturally with foreign keys and recursive CTEs which makes downstream traversal and fault-boundary detection simpler, deterministic, and easier to explain.

PostgreSQL also provides better data integrity for assets and tickets, while the localization algorithm is still resembles the physical network model closely.

**Trade-offs:**
MongoDB would have allowed faster development based on past experience, but also required recursive traversal and topology management to be implemented in application code, which would have been more complex and less explainable.

**Assumption this rests on:**
Network topology is hierarchical most of the time and changes infrequently compared to the telemetry updates, thus a relational model is more suitable than a document oriented one.