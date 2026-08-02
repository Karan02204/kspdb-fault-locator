                          Real Devices              Simulator
                                │                      │
                                └──────────┬───────────┘
                                           │
                                           ▼
                              Telemetry Ingestion API
                                           │
                                           ▼
                           Telemetry Normalization Layer
                                           │
                                           ▼
                               Pole Health Snapshots
                                           │
                                           ▼
                            Candidate Observation Window
                                   (30 seconds)
                                           │
                              ┌────────────┴────────────┐
                              │                         │
                       Power Restored?            Still Dark?
                              │                         │
                              ▼                         ▼
                     Discard Candidate        Localization Engine
                                                      │
                                                      ▼
                                          Topology Resolution
                                  ┌────────────────────────────┐
                                  │                            │
                           Official Topology         Inferred Topology
                                  │                            │
                                  └──────────────┬─────────────┘
                                                 ▼
                                    Fault Boundary Detection
                                                 │
                                                 ▼
                                   Incident Grouping Engine
                                                 │
                                                 ▼
                                 Incident (Create / Update)
                                                 │
                                                 ▼
                                      Confidence Engine
                                                 │
      ┌────────────────┬────────────────┬────────────────┬────────────────┬────────────────┬────────────────┐
      ▼                ▼                ▼                ▼                ▼                ▼
  Topology        Telemetry        Boundary      Sensor Health     Observation     Maintenance
  Evaluator       Evaluator        Evaluator       Evaluator         Evaluator       Evaluator
      └────────────────┴────────────────┴────────────────┴────────────────┴────────────────┴────────────────┘
                                                 │
                                                 ▼
                                      Confidence Report
                                                 │
                                                 ▼
                                  Location Formatting Utility
                                      (Missing PIN Resolver)
                                                 │
                  ┌──────────────────────────────┼──────────────────────────────┐
                  ▼                              ▼                              ▼
         Notification Service (SSE)      REST API Response             AI Operational Brief
                  │                              │                              │
                  ▼                              ▼                              ▼
             Operator Dashboard         External Clients              Operator Dashboard


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

Incident History -> Append-only. Every status change gets recorded.

confidence_evaluations -> One row per evaluator.

incident_briefs -> AI generated operational briefs.



Simulation
──────────────────────────────
Simulation Scenario -> Predefined templates.

simulation_sessions -> Every execution.