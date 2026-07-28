# ARCH_documentation-governance.md — The Registry
> **Owner:** This file owns the registry of every documentation file: what it contains, what it must NOT contain, and when an agent should load it.
> **This file is updated ONLY when the human explicitly requests a "doc sweep" after approving code changes.**

---

## 1. The Living Doc System — Rules Summary

1. **One file owns each rule.** No duplication. If a rule exists in two places, neither source is reliable.
2. **Read before acting.** Load `agent.md` at session start. Load relevant files from this registry before deeper tasks.
3. **Update only on request.** The agent registers new files, enforces ownership, and keeps this registry accurate only when the human explicitly requests a "doc sweep" after approving code changes.
4. **The human checkpoint is the system.** The agent trusts human confirmation as the gate for all doc updates.

---

## 2. File Registry

### `agent.md`
| Attribute | Value |
|---|---|
| **Path** | `/agent.md` (root) |
| **Load Trigger** | Every session, immediately |
| **Owns** | Session-critical rules, full tech stack table, quick-reference pre-task checklist, route map summary, living docs quick-load table |
| **Must NOT Contain** | Full schema definitions, CSS rules, detailed component code |
| **Last Updated** | 2026-07-28 (V5.3 doc sweep) |

---

### `docs/ARCH_technical-specs.md`
| Attribute | Value |
|---|---|
| **Path** | `/docs/ARCH_technical-specs.md` |
| **Load Trigger** | When writing or debugging Supabase queries; when adding/modifying DB columns; when verifying routing |
| **Owns** | Full table schemas (all 10 PsychE_ tables incl. V5 `Domains`/`Student_Telemetry`), column-level details, FK dependency tiers, index definitions, RLS policy summary, Supabase client setup, all route definitions, V2 scheduling logic (capacity enforcement, overdue detection, bulk scheduler algorithm, cooldown), V3 CMS schema constraints (lock rules, smart keywords query, tag assignment pattern, response scoring), V5 Domain Scoring Engine + Cold-Start Gatekeeper + ETI Engine + daily batch cron (§8) |
| **Must NOT Contain** | CSS, UI component structure, animation specs, React patterns |
| **Last Updated** | 2026-07-28 (V5.3 doc sweep — added §8) |

---

### `docs/GUIDE_developer.md`
| Attribute | Value |
|---|---|
| **Path** | `/docs/GUIDE_developer.md` |
| **Load Trigger** | When building/modifying UI components; when defining new pages; when working on print view; when implementing animations |
| **Owns** | Design philosophy, layout paradigms (Bento Grid, Apple Master-Detail, Enterprise Data Grid), all color tokens, typography scale, micro-animation specs, file/folder conventions, TypeScript interface patterns, page component template, modal pattern, pill/badge component, risk level display rules, state management rules, A4 print view CSS + structure, assessment engine function signatures, LibraryManager CMS component spec, GlobalTagManager component spec, Navbar rules, Analytics/Telemetry UI patterns (§9), forbidden patterns list |
| **Must NOT Contain** | Raw SQL, database schema details, FK relationships |
| **Last Updated** | 2026-07-28 (V5.3 doc sweep — added §9, flagged §10 violations) |

---

### `docs/ARCH_documentation-governance.md`
| Attribute | Value |
|---|---|
| **Path** | `/docs/ARCH_documentation-governance.md` (this file) |
| **Load Trigger** | When adding a new file to the project; when a file's ownership needs to change; when performing a "doc sweep" |
| **Owns** | The complete file registry, ownership rules, when-to-load triggers, last-updated timestamps, cross-reference conflict resolution rules |
| **Must NOT Contain** | Schema, UI rules, application code |
| **Last Updated** | 2026-07-28 (V5.3 doc sweep) |

---

### `Master Schema/psyche_v3_master_schema.sql`
| Attribute | Value |
|---|---|
| **Path** | `/Master Schema/psyche_v3_master_schema.sql` |
| **Load Trigger** | When verifying exact column types, constraints, or index definitions; when running schema migrations; when seeding a blank Supabase project |
| **Owns** | Executable, canonical DDL for the original 8 tables, RLS policies, indexes, and baseline seed data. |
| **Must NOT Contain** | Application logic, UI code |
| **Do NOT modify** unless a formal schema migration is approved by the human |
| **Last Updated** | Compiled from v2–v14 migration chain (see file header comments) |
| **⚠ Not fully canonical since V5:** `PsychE_Domains`, `PsychE_Student_Telemetry`, and `Modules.domain_code`/`domain_weight` were added by `v5_migration.sql` and are not reflected here. See the two files below. |

---

### `v5_migration.sql`
| Attribute | Value |
|---|---|
| **Path** | `/v5_migration.sql` (root) |
| **Load Trigger** | When touching `PsychE_Domains`, `PsychE_Student_Telemetry`, `Modules.domain_code`/`domain_weight`, or the Domain Scoring Engine |
| **Owns** | Idempotent DDL for `PsychE_Domains` (+ seed data) and `PsychE_Student_Telemetry`, RLS policies for both, and `calculate_student_telemetry()` (Domain Scoring Engine — see `ARCH_technical-specs.md` §8.1) |
| **Must NOT Contain** | Application/UI code |
| **Do NOT modify** unless a formal schema migration is approved by the human |
| **Last Updated** | Registered 2026-07-28 (V5.3 doc sweep) — file itself predates this sweep (V5.0) |

---

### `v5_analytics_migration.sql`
| Attribute | Value |
|---|---|
| **Path** | `/v5_analytics_migration.sql` (root) |
| **Load Trigger** | When touching `engine_status`, `eti_score`/`eti_data`, or the Cold-Start Gatekeeper / ETI Engine / daily batch cron |
| **Owns** | DDL adding `engine_status`/`confidence_multiplier`/`eti_score`/`eti_data` columns to `PsychE_Student_Telemetry`, plus `psyche_get_engine_status()`, `psyche_calculate_eti()`, `psyche_run_daily_batch()` (see `ARCH_technical-specs.md` §8.2–§8.4) |
| **Must NOT Contain** | Application/UI code |
| **Do NOT modify** unless a formal schema migration is approved by the human |
| **Last Updated** | Registered 2026-07-28 (V5.3 doc sweep) — file itself shipped in v5.2.0 |

---

### `.github/workflows/daily_analytics.yml`
| Attribute | Value |
|---|---|
| **Path** | `/.github/workflows/daily_analytics.yml` |
| **Load Trigger** | When changing the analytics cron schedule or its Supabase RPC target |
| **Owns** | GitHub Actions cron (21:30 UTC daily + manual `workflow_dispatch`) that POSTs to the Supabase RPC endpoint `psyche_run_daily_batch` using `SUPABASE_SERVICE_ROLE_KEY` from repo secrets |
| **Must NOT Contain** | Application logic (lives in the SQL function itself) |
| **Last Updated** | Registered 2026-07-28 (V5.3 doc sweep) — file itself shipped in v5.2.0 |

---

### `v6_domain_scoring_engine.sql`
| Attribute | Value |
|---|---|
| **Path** | `/v6_domain_scoring_engine.sql` (root) |
| **Load Trigger** | When touching the Domain Scoring Engine, `PsychE_Modules.scale_min`/`scale_max`/`domain_weight`, or the Tension Matrix |
| **Owns** | `ALTER TABLE "PsychE_Modules"` adding `scale_min`/`scale_max`; `psyche_compute_domain_score()` helper (the item→module→domain hierarchy); the rewritten `calculate_student_telemetry()` (`CREATE OR REPLACE`, same function name/signature as `v5_migration.sql`'s version — **supersedes it in place**, does not run alongside it) |
| **Must NOT Contain** | Application/UI code |
| **Do NOT modify** unless a formal schema migration is approved by the human |
| **Status** | ✅ Run against dev Supabase 2026-07-28. Superseded in part by `v6_1_telemetry_upsert_fix.sql` (its `INSERT` branch had a cross-engine data-loss bug — see `ARCH_technical-specs.md` §8.5). |
| **Last Updated** | 2026-07-28 (V6 domain scoring rewrite, per external psychometrics consultant spec) |

---

### `v6_1_telemetry_upsert_fix.sql`
| Attribute | Value |
|---|---|
| **Path** | `/v6_1_telemetry_upsert_fix.sql` (root) |
| **Load Trigger** | When touching either telemetry-writing function's `INSERT` branch, or debugging why `engine_status`/`eti_score` or `metrics_payload` is unexpectedly `NULL` on a fresh row |
| **Owns** | `CREATE OR REPLACE` for `calculate_student_telemetry()` and `psyche_run_daily_batch()` — same scoring math as `v6_domain_scoring_engine.sql`/`v5_analytics_migration.sql`, fixes only the `INSERT` branch of each to carry forward the *other* engine's last-known values instead of nulling them. See `ARCH_technical-specs.md` §8.5 for the full bug writeup. |
| **Must NOT Contain** | Application/UI code |
| **Do NOT modify** unless a formal schema migration is approved by the human |
| **Status** | ⚠ Written 2026-07-28, **not yet executed against Supabase** — the SQL editor run is still needed. Today's data-loss symptom was separately repaired by calling the (still old/buggy) `psyche_run_daily_batch()` RPC directly, which happened to succeed via its `UPDATE` branch since today's rows already existed from the V6 backfill. That workaround does **not** fix the underlying bug for future days — this file must still be run to prevent recurrence next time either engine hits an `INSERT` first. |
| **Last Updated** | 2026-07-28 (bug found and fixed same-session as the V6 backfill) |

---

### `LIVING_DOC_SYSTEM.md`
| Attribute | Value |
|---|---|
| **Path** | `/LIVING_DOC_SYSTEM.md` (root) |
| **Load Trigger** | Only when bootstrapping a new session context from scratch, or re-explaining the system to a new agent |
| **Owns** | The meta-rules governing the entire living doc system (core principles, directory structure ownership definitions) |
| **Must NOT Contain** | Project-specific rules (those live in the files it defines) |
| **Last Updated** | 2026-07-26 (original) |

---

## 3. Application Source Files (Code Registry)

> These are registered so the agent knows the existing file structure and does not create duplicates.

### `src/App.tsx`
**Purpose:** Route tree definition. All route additions must be made here.

### `src/main.tsx`
**Purpose:** React DOM entry point. Do not modify unless changing render mode.

### `src/lib/supabase.ts`
**Purpose:** Singleton Supabase client. Only file that imports `@supabase/supabase-js`. All pages import from here.

### `src/lib/assessmentEngine.ts`
**Purpose:** Pure scoring functions (reverse-score, module score computation). No Supabase calls.

### `src/lib/capacity.ts`
**Purpose:** V2 scheduling capacity utility functions. No UI code.

### `src/analytics/ColdStart.ts`
**Purpose:** V5 — `EngineStatus` type + `calculateConfidenceMultiplier()`, the frontend-only display ramp for the "Building profile — N% Confidence" badge. Does not call Supabase; pairs with (but does not duplicate) the SQL-side `psyche_get_engine_status()` in `v5_analytics_migration.sql`.

### `src/types/index.ts`
**Purpose:** TypeScript interfaces for all 8 database entities and derived UI shapes. Single source of truth for type definitions.

### `src/index.css`
**Purpose:** Global CSS, design token variables (`:root`), print media queries, utility classes.

### `src/App.css`
**Purpose:** App-level layout rules only (top-level grid, sidebar/content split).

### Components

| File | Purpose |
|---|---|
| `src/components/Layout.tsx` | Shell layout (sidebar + content area) |
| `src/components/Navbar.tsx` | Navigation sidebar with route links |
| `src/components/PinScreen.tsx` | Glassmorphic PIN authentication gate |
| `src/components/LibraryManager.tsx` | **V3** Assessment CMS — Master-Detail UI |
| `src/components/GlobalTagManager.tsx` | **V3** System Tag management — Data Grid |
| `src/components/AssessmentWizard.tsx` | Step-through assessment administration UI |
| `src/components/LiveAssessmentModal.tsx` | Modal for in-session assessment scoring |

### Pages

| File | Route | Purpose |
|---|---|---|
| `src/pages/Dashboard.tsx` | `/` | Mission Control — Bento Grid |
| `src/pages/StudentProfile.tsx` | `/student/:studentId` | Student bento profile + session history |
| `src/pages/AddLog.tsx` | `/add-log` | New session log form |
| `src/pages/AddStudent.tsx` | `/add-student`, `/edit-student/:id` | Student create/edit form |
| `src/pages/AllLogs.tsx` | `/logs` | Chronological log feed |
| `src/pages/StudentDirectory.tsx` | `/directory` | Filterable student table |
| `src/pages/Settings.tsx` | `/settings` | PsychE_Settings row editor |
| `src/pages/KanbanBoard.tsx` | `/kanban` | 7-day rolling Kanban planner |
| `src/pages/BulkSchedule.tsx` | `/bulk-schedule` | Auto-distribute students |
| `src/pages/Analytics.tsx` | `/analytics` | School-wide aggregate metrics (risk distribution, session health, course breakdown) — not the same as the per-student V5 telemetry engines, see `ARCH_technical-specs.md` §8 |
| `src/pages/ReportExport.tsx` | `/report` | A4 print view (outside Layout) |

---

## 3a. Auxiliary / Legacy Files (not part of the built Vite app)

> Registered so the agent doesn't mistake these for dead code to delete, or for active application code to extend. None of these are imported by `src/App.tsx` or its tree.

| File | Status | Notes |
|---|---|---|
| `webhook.js` | Standalone, separate deploy target | Express server (`node webhook.js`) exposing `POST /webhook/import` for external student+log bulk import via `PsychE_Students`/`PsychE_Counseling_Logs` upsert. Uses the frontend's `.env` Supabase vars. Not started by `npm run dev`; not documented as deployed anywhere. |
| `fix_rls.sql` | Superseded, historical | One-off RLS-enable patch for `PsychE_Students`/`PsychE_Counseling_Logs` predating the master schema's own RLS section. Kept for history; the master schema's RLS policies are authoritative now. |
| `refactor.py` | One-off dev script, already run | Python script that mechanically split `StudentProfile.tsx` into the "Profile & History" / "Telemetry Analytics" tab structure (see `GUIDE_developer.md` §9.2). Its edit has already been applied and committed — running it again against the current file will not match its hardcoded markers. Not part of any build step. |
| `src/pages/StudentProfile.backup.tsx` | Stray backup, not imported anywhere | Pre-`refactor.py` snapshot of `StudentProfile.tsx`. Not referenced by any route or import. Left in place pending an explicit cleanup request — not removed in this sweep. |

---

## 4. Doc Sweep Protocol

When the human explicitly requests a "doc sweep," execute the following:

1. **Review all source file changes** since the last doc sweep.
2. **Update the code registry** above: add new files, remove deleted files, update purpose descriptions.
3. **Check ownership violations:** If a rule was added to the wrong file (e.g., a schema detail added to `GUIDE_developer.md`), move it to the correct owner and note the correction.
4. **Bump `Last Updated`** on any doc file that was modified.
5. **Report summary** to the human: list of files registered, any ownership violations corrected.

---

## 5. Conflict Resolution

If a rule appears in more than one doc file:
1. Identify which file *should* own the rule per the registry above.
2. Remove the rule from the non-owner file.
3. Ensure the owner file has the definitive, up-to-date version.
4. Note the correction in the next doc sweep report.

---

## 6. Registry Manifest

| File | Type | Version Introduced |
|---|---|---|
| `agent.md` | Doc — Entry Point | V3 (bootstrap) |
| `docs/ARCH_technical-specs.md` | Doc — Architecture | V3 (bootstrap) |
| `docs/GUIDE_developer.md` | Doc — Guide | V3 (bootstrap) |
| `docs/ARCH_documentation-governance.md` | Doc — Registry | V3 (bootstrap) |
| `LIVING_DOC_SYSTEM.md` | Doc — Meta-system | V1 (original) |
| `Master Schema/psyche_v3_master_schema.sql` | Schema — DDL | V3 (compiled from v2–v14) |
| `src/App.tsx` | Code | V1 |
| `src/main.tsx` | Code | V1 |
| `src/types/index.ts` | Code — Types | V3 |
| `src/lib/supabase.ts` | Code — Client | V1 |
| `src/lib/assessmentEngine.ts` | Code — Utility | V2 |
| `src/lib/capacity.ts` | Code — Utility | V2 |
| `src/index.css` | Style — Global | V1 |
| `src/components/Layout.tsx` | Component | V1 |
| `src/components/Navbar.tsx` | Component | V2 |
| `src/components/PinScreen.tsx` | Component | V2 |
| `src/components/LibraryManager.tsx` | Component | V3 |
| `src/components/GlobalTagManager.tsx` | Component | V3 |
| `src/components/AssessmentWizard.tsx` | Component | V2 |
| `src/components/LiveAssessmentModal.tsx` | Component | V3 |
| `src/pages/Dashboard.tsx` | Page | V1 |
| `src/pages/StudentProfile.tsx` | Page | V1 |
| `src/pages/AddLog.tsx` | Page | V1 |
| `src/pages/AddStudent.tsx` | Page | V1 |
| `src/pages/AllLogs.tsx` | Page | V1 |
| `src/pages/StudentDirectory.tsx` | Page | V1 |
| `src/pages/Settings.tsx` | Page | V1 |
| `src/pages/KanbanBoard.tsx` | Page | V2 |
| `src/pages/BulkSchedule.tsx` | Page | V2 |
| `src/pages/Analytics.tsx` | Page | V2 |
| `src/pages/ReportExport.tsx` | Page | V2 |
| `src/analytics/ColdStart.ts` | Code — Utility | V5 |
| `v5_migration.sql` | Schema — DDL (unmerged) | V5 |
| `v5_analytics_migration.sql` | Schema — DDL (unmerged) | V5 |
| `.github/workflows/daily_analytics.yml` | Ops — CI cron | V5 |
| `v6_domain_scoring_engine.sql` | Schema — DDL + function rewrite (unmerged, run in dev) | V6 |
| `v6_1_telemetry_upsert_fix.sql` | Schema — bugfix (unmerged, not yet run) | V6.1 |
| `webhook.js` | Code — Auxiliary server (not built app) | Pre-V3, undated |
| `fix_rls.sql` | Schema — Historical patch (superseded) | Pre-V3, undated |
| `refactor.py` | Code — One-off script (already applied) | V5 |
| `src/pages/StudentProfile.backup.tsx` | Code — Stray backup (unused) | Pre-V5 |
