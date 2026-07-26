# agent.md — PsychE Session Entry Point
> Read this file at the **start of every session**. For deeper tasks, load the relevant docs listed below.

---

## 1. Project Identity
- **Product:** PsychE — Student Counseling CRM
- **Current Version:** 4.0.0
- **Platform:** Web — optimized for desktop/macOS
- **Architecture Style:** Lightweight, Low-Overhead ("Antigravity")

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
| DB Client | `src/lib/supabase.ts` — single exported `supabase` instance |

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

---

## 4. Security
- PIN access screen wraps entire app (glassmorphic `PinScreen` component)
- Valid PINs stored in `PsychE_Settings.allowed_pins` (comma-separated string)
- App version string in `PsychE_Settings.app_version`

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

> **V3 routes to add:** `/library` (LibraryManager CMS), `/tags` (GlobalTagManager)

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
