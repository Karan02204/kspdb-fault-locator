                                        ┌──────────────────────────────┐
                                        │     Pole Registry (CSV)      │
                                        │  (Substations, Feeders, DTs, │
                                        │   Poles, Official Topology)  │
                                        └──────────────┬───────────────┘
                                                       │
                                                       ▼
                                         Network Import & Validation
                                                       │
                                ┌──────────────────────┴──────────────────────┐
                                │                                             │
                     Official Topology Available?                     Missing Topology
                                │                                             │
                               Yes                                            No
                                │                                             │
                                ▼                                             ▼
                   Store Official Connections                   MST + BFS Topology Inference
                                │                                             │
                                └──────────────────────┬──────────────────────┘
                                                       ▼
                                            pole_connections
                                    (Official / Inferred + Confidence)
                                                       │
                                                       │
═══════════════════════════════════════════════════════════════════════════════════════════

                     Real Devices                              Simulator UI
                          │                                        │
                          │                         (Operator selects DT, Pole,
                          │                          Fault Type & Duration)
                          │                                        │
                          └──────────────────────┬─────────────────┘
                                                 ▼
                                     Telemetry Ingestion API
                                                 │
                                                 ▼
                                     In-Memory Ingestion Buffer
                                   (Deduplication + Burst Handling)
                                                 │
                                                 ▼
                                   Telemetry Normalization Layer
                                                 │
                                                 ▼
                                         Pole Health Store
                                    (Current State Per Pole)
                                                 │
                               ┌─────────────────┴─────────────────┐
                               │                                   │
                      Meaningful State Change?                Routine Heartbeat
                               │                                   │
                              Yes                                  │
                               │                                   │
                               ▼                                   ▼
                      telemetry_events                    Update Pole Health Only
                      (Historical Audit)                         (No Persistence)
                               │
                               └─────────────────┬─────────────────┘
                                                 ▼
                                       Localization Engine
                                                 │
                                                 ▼
                                   Uses Stored pole_connections
                                   (Never Recomputes MST Here)
                                                 │
                                                 ▼
                                    Fault Boundary Detection
                                                 │
                                                 ▼
                                     Incident Grouping Engine
                                                 │
                                                 ▼
                                            Incident Record
                                                 │
                                                 ▼
                                        Confidence Engine
                                                 │
         ┌──────────────────────┬─────────────────────┬─────────────────────┬──────────────────────┐
         ▼                      ▼                     ▼                     ▼                      ▼
   Topology               Telemetry             Boundary            Sensor Health           Maintenance
   Evaluator              Evaluator             Evaluator             Evaluator              Evaluator
         └──────────────────────┴─────────────────────┴─────────────────────┴──────────────────────┘
                                                 │
                                                 ▼
                                  Confidence Score + Breakdown
                                                 │
                           ┌─────────────────────┴──────────────────────┐
                           │                                            │
                 Confidence ≥ Threshold                     Confidence < Threshold
                           │                                            │
                           ▼                                            ▼
                    Create Ticket                          Monitor Incident
                           │
                           ▼
                     Ticket Lifecycle
        DETECTED → ACKNOWLEDGED → CREW_ASSIGNED
           → RESOLVED → VERIFIED → CLOSED
                           │
                           ▼
                Verification via Live Telemetry
                           │
                           ▼
                  Operator Dashboard (SSE Updates)
                           │
          ┌────────────────┼──────────────────────┐
          ▼                ▼                      ▼
    Interactive Map    Incident Panel      AI Operational Brief


Electrical Infrastructure : These define the electrical network.
──────────────────────────────
Substation -> Represents the highest-level electrical asset supplying one or more feeders.

Feeder -> Represents an outgoing electrical feeder from a substation.

Distribution Transformer -> Root node for every localization tree.

Pole -> Represents a physical electrical pole.

Pole Connections -> Represents the electrical graph.

Device -> Represents installed telemetry hardware.



Incoming Data: These are the data sources that feed into the system.
──────────────────────────────
Telemetry Event -> Represents a telemetry event from a device.

maintenance_events -> Represents maintenance scheduled for a pole.



Operational State: These are the current states of the system.
──────────────────────────────
pole_health -> Represents the health of a pole.

Incident -> Represents a fault.

tickets -> List of tickets for each incident.



Simulation
──────────────────────────────
Simulation Scenario -> Predefined templates.


Telemetry
Method	Endpoint	Purpose
POST	/api/telemetry	Receive telemetry from simulator/devices

Incidents
Method	Endpoint	Purpose
GET	/api/incidents	List incidents
GET	/api/incidents/:id	Incident details
GET	/api/incidents/active	Active incidents

Tickets
Method	Endpoint	Purpose
GET	/api/tickets	List tickets
PATCH	/api/tickets/:id/acknowledge	Acknowledge
PATCH	/api/tickets/:id/assign	Crew Assigned
PATCH	/api/tickets/:id/resolve	Resolve
PATCH	/api/tickets/:id/verify	Verify
PATCH	/api/tickets/:id/close	Close

Simulator
Method	Endpoint	Purpose
POST	/api/simulator/inject	Inject custom fault
POST	/api/simulator/restore	Restore power
GET	/api/network	Topology for simulator/map

Dashboard
Method	Endpoint	Purpose
GET	/api/dashboard/summary	KPI cards
GET	/api/network	Map data
GET	/api/poles/:id	Pole details

AI
Method	Endpoint	Purpose
POST	/api/incidents/:id/summary	Generate AI summary

SSE
GET /api/events