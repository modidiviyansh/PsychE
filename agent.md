# agent.md — PsychE Session Entry Point
> Read this file at the **start of every session**. For deeper tasks, load the relevant docs listed below.

---

## 1. Project Identity
- **Product:** PsychE — Student Counseling CRM
- **Current Version:** 5.3.0 (in development) — 5.2.0 shipped 2026-07-27 (ETI engine, avoidance flags, automated cron)
- **Platform:** Web — optimized for desktop/macOS
- **Architecture Style:** Lightweight, Low-Overhead ("Antigravity")
- **V5.3 / V6 note:** The Domain Scoring Engine was rewritten (`v6_domain_scoring_engine.sql`) to a formal second-order hierarchical factor model (item → module → domain, cross-instrument normalization via `scale_min`/`scale_max`, 4-axis Tension Matrix + dominant tension) per an external psychometrics consultant's spec. Run and verified in dev only — **still needs to run against production** via the Supabase SQL editor.
- **V6.1 note:** A cross-engine data-loss bug was found and fixed (`v6_1_telemetry_upsert_fix.sql`) — `calculate_student_telemetry()` and `psyche_run_daily_batch()` share one table row per student/day, and whichever ran first on a fresh day was silently nulling the other's columns on `INSERT`. **This file has NOT been run against Supabase yet (dev or prod)** — must be applied before the next time either engine could hit a fresh day's `INSERT` for any student. See `ARCH_technical-specs.md` §8.5.

---

## 2. Tech Stack (Canonical — do not deviate)
| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 8 |
| Backend / DB | Supabase (PostgreSQL) |
| Routing | react-router-dom v7 |
| Styling | Vanilla CSS (custom design tokens in `src/index.css`) |
| Animation | framer-motion |
| Icons | lucide-react |
| Date Utils | date-fns |
| CSV Parsing | papaparse |
| Charts | recharts (Analytics page, radar/domain chart on Student Profile) |
| DB Client | `src/lib/supabase.ts` — single exported `supabase` instance |

> `express`, `body-parser`, `cors`, `dotenv` in `package.json` are **not** frontend deps — they belong to the standalone `webhook.js` import server (registered in `docs/ARCH_documentation-governance.md` §3), not the Vite app.

---

## 3. Database (Supabase — Tables prefixed `PsychE_`)
**Canonical schema lives in:** `Master Schema/psyche_v3_master_schema.sql`

| Table | Role |
|---|---|
| `PsychE_Students` | Master student registry |
| `PsychE_Settings` | Single-row app config (id=1 always) |
| `PsychE_Modules` | Assessment module library (COMPE / PsycheSPA / Custom) |
| `PsychE_Questions` | Relational question bank linked to modules |
| `PsychE_System_Tags` | Global problem-system tag definitions |
| `PsychE_Counseling_Logs` | Session/interaction records |
| `PsychE_Student_Tags` | Junction: student ↔ system tag |
| `PsychE_Responses` | Individual scored question responses per log |
| `PsychE_Domains` | V5 — 7 psychological domains (BHV/SOC/COG/EMH/FAM/CAR/SEL) for scoring |
| `PsychE_Student_Telemetry` | V5 — daily snapshot: domain scores, tensions, archetype, ETI, engine_status |

> **V5 schema caveat:** `PsychE_Domains` and `PsychE_Student_Telemetry` (plus `Modules.domain_code`/`domain_weight`) were added via `v5_migration.sql` and `v5_analytics_migration.sql`, **not** merged into `Master Schema/psyche_v3_master_schema.sql`. Treat both migration files as canonical for V5 objects until a formal merge is approved. See `ARCH_technical-specs.md` §8.

---

## 4. Security
- PIN access screen wraps entire app (glassmorphic `PinScreen` component)
- Valid PINs stored in `PsychE_Settings.allowed_pins` (comma-separated string)
- App version string in `PsychE_Settings.app_version` — **known gap:** not currently read or edited by any UI (`Settings.tsx` only exposes `daily_session_capacity`; `Navbar.tsx` does not display it despite `GUIDE_developer.md` §8 describing it). Flagged for a future fix, not touched in this sweep.

---

## 5. Key Routes (from `src/App.tsx`)
| Path | Component |
|---|---|
| `/` | Dashboard |
| `/student/:studentId` | StudentProfile |
| `/add-log` | AddLog |
| `/add-student` | AddStudent |
| `/edit-student/:id` | AddStudent (edit mode) |
| `/logs` | AllLogs |
| `/directory` | StudentDirectory |
| `/settings` | Settings |
| `/kanban` | KanbanBoard |
| `/bulk-schedule` | BulkSchedule |
| `/analytics` | Analytics |
| `/report` | ReportExport (Print View) |
| `/library` | LibraryManager (Assessment CMS, master-detail) |
| `/tags` | GlobalTagManager (System Tags, data grid) |

---

## 6. Pre-Task Checklist
- [ ] Is the target table correct? Cross-reference `ARCH_technical-specs.md`.
- [ ] Does the UI follow the Bento Grid / Master-Detail language? See `GUIDE_developer.md`.
- [ ] Am I mutating schema? If yes, update `Master Schema/psyche_v3_master_schema.sql`.
- [ ] Am I adding a new file? If yes, register it in `docs/ARCH_documentation-governance.md`.
- [ ] Did the human approve code changes? If yes, request a "doc sweep."

---

## 7. Living Docs Registry (quick-load)
| File | Load When |
|---|---|
| `docs/ARCH_technical-specs.md` | Schema, routing, data structures, Supabase queries |
| `docs/GUIDE_developer.md` | Styling, component patterns, state management, print view |
| `docs/ARCH_documentation-governance.md` | Adding/renaming files; checking ownership rules |
