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
| **Last Updated** | 2026-07-26 (V3 bootstrap) |

---

### `docs/ARCH_technical-specs.md`
| Attribute | Value |
|---|---|
| **Path** | `/docs/ARCH_technical-specs.md` |
| **Load Trigger** | When writing or debugging Supabase queries; when adding/modifying DB columns; when verifying routing |
| **Owns** | Full table schemas (all 8 PsychE_ tables), column-level details, FK dependency tiers, index definitions, RLS policy summary, Supabase client setup, all route definitions, V2 scheduling logic (capacity enforcement, overdue detection, bulk scheduler algorithm, cooldown), V3 CMS schema constraints (lock rules, smart keywords query, tag assignment pattern, response scoring) |
| **Must NOT Contain** | CSS, UI component structure, animation specs, React patterns |
| **Last Updated** | 2026-07-26 (V3 bootstrap) |

---

### `docs/GUIDE_developer.md`
| Attribute | Value |
|---|---|
| **Path** | `/docs/GUIDE_developer.md` |
| **Load Trigger** | When building/modifying UI components; when defining new pages; when working on print view; when implementing animations |
| **Owns** | Design philosophy, layout paradigms (Bento Grid, Apple Master-Detail, Enterprise Data Grid), all color tokens, typography scale, micro-animation specs, file/folder conventions, TypeScript interface patterns, page component template, modal pattern, pill/badge component, risk level display rules, state management rules, A4 print view CSS + structure, assessment engine function signatures, LibraryManager CMS component spec, GlobalTagManager component spec, Navbar rules, forbidden patterns list |
| **Must NOT Contain** | Raw SQL, database schema details, FK relationships |
| **Last Updated** | 2026-07-26 (V3 bootstrap) |

---

### `docs/ARCH_documentation-governance.md`
| Attribute | Value |
|---|---|
| **Path** | `/docs/ARCH_documentation-governance.md` (this file) |
| **Load Trigger** | When adding a new file to the project; when a file's ownership needs to change; when performing a "doc sweep" |
| **Owns** | The complete file registry, ownership rules, when-to-load triggers, last-updated timestamps, cross-reference conflict resolution rules |
| **Must NOT Contain** | Schema, UI rules, application code |
| **Last Updated** | 2026-07-26 (V3 bootstrap) |

---

### `Master Schema/psyche_v3_master_schema.sql`
| Attribute | Value |
|---|---|
| **Path** | `/Master Schema/psyche_v3_master_schema.sql` |
| **Load Trigger** | When verifying exact column types, constraints, or index definitions; when running schema migrations; when seeding a blank Supabase project |
| **Owns** | Executable, canonical DDL for all 8 tables, RLS policies, indexes, and baseline seed data. This is the single source of truth for the database schema. |
| **Must NOT Contain** | Application logic, UI code |
| **Do NOT modify** unless a formal schema migration is approved by the human |
| **Last Updated** | Compiled from v2–v14 migration chain (see file header comments) |

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
| `src/pages/Analytics.tsx` | `/analytics` | Charts & metrics |
| `src/pages/ReportExport.tsx` | `/report` | A4 print view (outside Layout) |

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
