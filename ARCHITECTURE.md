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