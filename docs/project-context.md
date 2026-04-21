# Project context (scope and assumptions)

**Audience:** anyone working on this repository—humans and automated agents—before making architectural or cross-cutting changes.

This file is the **narrative contract** for what this codebase is meant to be. The normative boilerplate checklist remains in [boilerplate-requirements.md](./boilerplate-requirements.md). If something conflicts, **this file describes product intent**; the checklist describes generic “pro boilerplate” alignment.

---

## 1) Project type

- **HTTP API backend only.** This repository is **not** a frontend or full-stack app; do not treat a separate frontend folder or client as part of the core deliverable unless the team explicitly expands scope.

---

## 2) Deployment target

- **Primary today:** run with **Docker** (Compose / container image as documented).
- **Design constraint:** core application code should remain **portable** so the same service can later run on **VPS** or **Kubernetes** without a rewrite of the domain layer. Prefer configuration (env, probes, logging, metrics) over hard-coding orchestrator-specific behavior.

---

## 3) Instances and horizontal scale

- **Today:** typically **single instance** on one server.
- **Future:** the system may run **multiple replicas** behind a **load balancer**.
- **Implication:** features that are naturally **process-local** (in-memory rate limiting, in-process session affinity, ad-hoc in-memory caches) must either:
  - be implemented behind an abstraction that can switch to a **shared store** (e.g. Redis), or
  - be **clearly documented** as single-instance-only with a migration path.

**HTTP rate limiting:** with **`NODE_ENV=production`**, **`RATE_LIMIT_REDIS_URL`** is **required** (validated in **`src/config/env.ts`**) so every replica shares **Redis**-backed counters. In **development**, omitting it keeps the default **in-memory** store (single process).

Do not assume sticky sessions unless they are explicitly configured and documented.

---

## 4) API consumers

- **Initially:** the API owner / same team.
- **Trajectory:** the API should stay usable by **other internal teams** and, if needed, as a **public API**.
- **Implication:** invest in a **stable, explicit contract** from the start—versioning, validation, predictable errors, OpenAPI accuracy, and consistent pagination/sorting conventions—so external consumers are not an afterthought.

---

## 5) Data store

- **MongoDB only** for persistence in scope. **SQL** and dual-database designs are **out of scope** unless the team explicitly revises this document.

---

## How to use this file

- When adding middleware, auth, caching, or limits, ask: **does this break with N > 1 replicas?**
- When adding dependencies or deployment steps, ask: **does this still make sense on Docker, VPS, and K8s with only env/probes changing?**
- After a deliberate scope change (e.g. adding SQL or a first-party frontend), **update this file** in the same PR.
