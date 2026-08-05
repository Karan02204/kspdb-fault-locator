# AI Usage Report

## Development Approach and Architectural Decisions

I used Claude to develop a comprehensive implementation plan for the project, ensuring that I understood the assignment requirements, constraints, and evaluation criteria before writing any code. This helped me decompose the problem into independent modules and establish an implementation order.

Once the overall plan was established, I primarily used ChatGPT as a technical design assistant to evaluate different architectural choices and implementation strategies. For example, I explored the trade-offs between PostgreSQL and MongoDB for storing network topology and operational state. After discussing indexing, graph traversal requirements, relational consistency, and incident management, PostgreSQL was selected as the primary datastore.

One significant design discussion involved automatic topology inference. The initial suggestion was to construct a Minimum Spanning Tree (MST) across all poles and root it at the Distribution Transformer (DT) using Breadth-First Search (BFS). I identified that constructing an MST over every pole would create many geographically implausible connections and unnecessarily increase computational complexity. I suggested introducing a distance threshold so that only nearby poles were considered candidate neighbours before running the MST. After this refinement, the inferred topology became both computationally more efficient and more representative of a real electrical distribution network.

---

## Incident Grouping and Duplicate Detection

Initially, the AI suggested grouping incidents solely based on spatial overlap and excluding time as a consideration. I challenged this by asking how the system would behave if multiple telemetry updates arrived from the same subtree over a short period. Under the original approach, each localization cycle could potentially generate duplicate incidents and maintenance tickets.

Following this discussion, the design was revised to consider both spatial boundaries and temporal proximity when grouping incidents. Existing incidents are updated whenever new telemetry reinforces or slightly adjusts the localized boundary instead of creating duplicate incidents. This significantly reduced unnecessary ticket generation while maintaining accurate fault tracking.

---

## Ticket Creation Strategy

The initial recommendation was to create maintenance tickets immediately after every localized fault. I questioned this approach because localization alone does not guarantee that the detected fault is genuine; noisy telemetry, temporary communication failures, or incomplete topology could produce false positives.

The design was therefore modified so that tickets are only created after the Confidence Engine evaluates the localized fault and the overall confidence exceeds the configured threshold. This additional validation stage substantially reduces unnecessary ticket creation while ensuring that only high-confidence outages are escalated to operators.

---

# What I Delegated vs What I Implemented

I primarily used AI as a design and implementation assistant rather than allowing it to generate complete features without review.

### Tasks delegated to AI

- Discussing architectural alternatives
- Generating implementation plans
- Scaffolding controllers, services, and repositories
- Explaining algorithms and design patterns
- Generating repetitive boilerplate
- Reviewing implementation ideas

### Tasks implemented and verified by me

- Overall project architecture
- Database schema design
- Module boundaries
- Topology inference constraints
- Fault localization workflow
- Confidence scoring strategy
- Incident grouping logic
- API integration
- Frontend implementation
- Debugging runtime issues
- End-to-end testing and validation

Every AI-generated implementation was reviewed, modified where necessary, and tested before becoming part of the final system.

---

# Examples Where AI Was Incorrect

## 1. Topology Inference

The proposed MST implementation connected every pole without considering geographical feasibility. This would have produced unrealistic electrical connections.

I corrected the design by introducing a neighbour distance threshold before MST construction, significantly improving both performance and accuracy.

---

## 2. Duplicate Incident Creation

The original grouping strategy ignored time and only considered spatial overlap.

After reasoning through repeated telemetry arriving from the same outage, I identified that this could continuously create duplicate incidents.

The grouping logic was modified to update existing incidents instead of creating new ones whenever telemetry referred to the same outage.

---

## 3. Ticket Creation

AI initially recommended creating tickets immediately after localization.

I recognized that localization is probabilistic rather than definitive.

The workflow was redesigned so that ticket creation occurs only after confidence evaluation, preventing low-confidence detections from generating unnecessary maintenance work.

---

# AI-Generated Code Estimate

Approximately **40–50%** of the final codebase was initially generated or scaffolded with AI assistance.

However, a substantial portion of that code was subsequently modified during implementation. Core algorithms, architectural decisions, database design, debugging, API integration, frontend behaviour, and end-to-end testing all required manual reasoning and iterative refinement.

The final implementation should therefore be viewed as **AI-assisted software engineering rather than AI-generated software**.

---

# Representative Prompts

Some of the most valuable prompts used during development included:

### Architecture

> Compare PostgreSQL and MongoDB for representing an electrical distribution network with topology inference, incident management, and real-time telemetry. Justify the recommended choice based on graph traversal, consistency, and scalability.

---

### Topology Inference

> Design an algorithm capable of reconstructing missing electrical pole ordering for transformers where no official topology exists. Explain the algorithm, computational complexity, assumptions, and confidence estimation.

---

### Fault Localization

> Given a partially observed electrical tree with live telemetry events, identify the most probable fault boundary and compute the affected downstream subtree.

---

### Confidence Evaluation

> Design a modular confidence engine that combines topology quality, telemetry quality, sensor health, maintenance schedules, and boundary certainty into a single confidence score with an explainable breakdown.

---

### Code Review

> Review the proposed implementation and identify edge cases related to duplicate telemetry, out-of-order packets, heartbeat timeouts, and repeated incident generation. Suggest improvements while preserving the existing architecture.

---

# Reflection

Throughout the project, I treated AI as an engineering collaborator rather than an authoritative source. AI accelerated research, boilerplate generation, and architectural exploration, but every significant design decision and implementation was validated through manual reasoning, iterative refinement, debugging, and testing before becoming part of the final solution.

This approach ensured that I fully understood the system I built and could explain or modify every major component independently.