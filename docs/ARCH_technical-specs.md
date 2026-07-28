# ARCH_technical-specs.md
> **Owner:** This file owns all data structures, database schema details, and routing logic.
> **Must NOT contain:** UI/UX guidelines, CSS rules, component code patterns.

---

## 1. Database Schema — V3.0 (Canonical)

Schema file: `Master Schema/psyche_v3_master_schema.sql` — this is the single source of truth. The tables below are the authoritative reference for all Supabase queries written in application code.

### Dependency Tiers

```
TIER 1 (No FK deps)
  PsychE_Students
  PsychE_Settings
  PsychE_Modules
  PsychE_System_Tags
  PsychE_Domains                  -- V5

TIER 2 (Single FK)
  PsychE_Questions       → PsychE_Modules(id)
  PsychE_Counseling_Logs → PsychE_Students(id)
  PsychE_Student_Telemetry → PsychE_Students(id)   -- V5

TIER 3 (Multiple FKs)
  PsychE_Student_Tags    → PsychE_Students(id) + PsychE_System_Tags(id)
  PsychE_Responses       → PsychE_Counseling_Logs(id) + PsychE_Questions(id)
```

> **Schema location caveat:** `PsychE_Domains`, `PsychE_Student_Telemetry`, and the `domain_code`/`domain_weight`/`scale_min`/`scale_max` columns on `PsychE_Modules` were introduced by `v5_migration.sql`, `v5_analytics_migration.sql`, and `v6_domain_scoring_engine.sql` at the repo root — they are **not yet merged** into `Master Schema/psyche_v3_master_schema.sql`. Until a formal merge is approved, treat all four files together as the canonical schema.

---

### Table: `PsychE_Students`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, default uuid_generate_v4() | Internal FK target |
| `student_id` | VARCHAR(50) | UNIQUE, NOT NULL | Human-readable ID (e.g., roll number) |
| `full_name` | VARCHAR(255) | NOT NULL | |
| `fathers_name` | VARCHAR(255) | | |
| `mothers_name` | VARCHAR(255) | | |
| `mobile` | VARCHAR(20) | | |
| `email` | VARCHAR(255) | | |
| `course` | VARCHAR(100) | | |
| `enrolled_date` | DATE | | |
| `risk_level` | VARCHAR(20) | DEFAULT `'Low'` | Values: `Low`, `Medium`, `High` |
| `engagement_modifier` | INT | DEFAULT `0` | V2 scheduling weight |
| `profile_image` | TEXT | | URL string |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Search fields (global search):** `full_name`, `student_id`, `mobile`

---

### Table: `PsychE_Settings`
> Single-row table. `id` is always `1`. Never INSERT a second row.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | INT | 1 (PK) | Singleton pattern |
| `daily_session_capacity` | INT | 7 | Max sessions per counselor per day |
| `allowed_pins` | TEXT | `'2001,0987,0999,2580'` | Comma-separated PIN string |
| `app_version` | VARCHAR(20) | `'4.0.0'` | Display in Settings UI |
| `assessment_cooldown_days` | INT | 30 | Days before re-assigning a module to same student |

---

### Table: `PsychE_Modules`
> Replaces the V2.0 `PsychE_Assessment_Master` JSONB monolith.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `name` | VARCHAR(255) | NOT NULL | |
| `type` | VARCHAR(20) | NOT NULL, CHECK IN (`COMPE`, `PsycheSPA`, `Custom`) | Module type |
| `description` | TEXT | | Legacy keyword field (v14) |
| `smart_keywords` | TEXT[] | DEFAULT `'{}'` | GIN-indexed array; drives Add Log suggestions |
| `is_locked` | BOOLEAN | DEFAULT FALSE | One-time-edit lock for formal tests |
| `domain_code` | VARCHAR(10) | FK → `PsychE_Domains(code)` | V5 — which of the 7 domains this module scores |
| `domain_weight` | NUMERIC | DEFAULT `1.0` | V6 — `w_m`, clinical weight within its domain. Editable in `LibraryManager` |
| `scale_min` | NUMERIC | DEFAULT `1` | V6 — instrument's theoretical minimum raw score, for min-max normalization |
| `scale_max` | NUMERIC | DEFAULT `4` | V6 — instrument's theoretical maximum raw score. Defaults preserve the current 4-point Likert; a future PHQ-9/GAD-7 module sets its own range here — no engine changes needed |
| `created_at` | TIMESTAMPTZ | | |

**Module types:**
- `COMPE` — Competency/Likert-based assessments (editable)
- `PsycheSPA` — Formal standardized tests (lockable)
- `Custom` — Administrator-defined custom questionnaires

**One-time-edit lock rule:** If `is_locked = TRUE`, questions within that module can only have `has_been_edited` set once. Once `has_been_edited = TRUE`, any further update must be blocked at the application layer.

---

### Table: `PsychE_Questions`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `module_id` | UUID | FK → `PsychE_Modules(id)` ON DELETE CASCADE | |
| `prompt_text` | TEXT | NOT NULL | Question body |
| `is_reverse_scored` | BOOLEAN | DEFAULT FALSE | Flip scoring: `(max+1) - score` |
| `custom_labels` | JSONB | DEFAULT 4-point Likert | Keys `"1"–"4"`, values are label strings |
| `is_active` | BOOLEAN | DEFAULT TRUE | Soft-delete toggle |
| `has_been_edited` | BOOLEAN | DEFAULT FALSE | One-time-edit flag (V3 lock enforcement) |
| `created_at` | TIMESTAMPTZ | | |

**Default `custom_labels`:**
```json
{"1": "Not True", "2": "A little true", "3": "Pretty true", "4": "Very true"}
```

**Reverse-scoring formula:** `effective_score = (max_scale + 1) - raw_score`
- For 4-point Likert: `effective_score = 5 - raw_score`

---

### Table: `PsychE_System_Tags`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `tag_name` | VARCHAR(255) | UNIQUE, NOT NULL | Display label |
| `tag_category` | VARCHAR(100) | DEFAULT `'General'` | Behavioral / Academic / Career / Custom / General |
| `color_hex` | VARCHAR(20) | DEFAULT `'#4ade80'` | Hex string for UI color swatch |
| `created_at` | TIMESTAMPTZ | | |

**Standard categories:** `Behavioral`, `Academic`, `Career`, `Custom`, `General`

---

### Table: `PsychE_Counseling_Logs`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `student_uuid` | UUID | FK → `PsychE_Students(id)` ON DELETE CASCADE | |
| `counselor_name` | VARCHAR(255) | NOT NULL | |
| `session_date` | TIMESTAMPTZ | NOT NULL | Actual session timestamp |
| `scheduled_date` | DATE | | V2: date scheduled (used by Kanban) |
| `session_status` | VARCHAR(20) | DEFAULT `'Scheduled'` | `Scheduled`, `Completed`, `Overdue`, `Cancelled`, `No_Show` |
| `interaction_type` | VARCHAR(50) | DEFAULT `'Session'` | `Session`, `Phone`, `Email`, `Walk-in` |
| `reason` | VARCHAR(255) | NOT NULL | Presenting concern |
| `student_response` | TEXT | | Counselor's notes |
| `recommended_action` | TEXT | | |
| `file_updated` | BOOLEAN | DEFAULT FALSE | Physical file updated checkbox |
| `notification_sent` | BOOLEAN | DEFAULT FALSE | Parent/guardian notified |
| `follow_up_date` | TIMESTAMPTZ | | |
| `follow_up_status` | VARCHAR(20) | DEFAULT `'Pending'` | `Pending`, `Done`, `Cancelled` |
| `assessment_data` | JSONB | | Raw PsycheSPA result storage |
| `created_at` | TIMESTAMPTZ | | |

**Session status flow:**
```
Scheduled → Completed (user marks done, prompts for notes)
Scheduled → Overdue   (auto: scheduled_date < today, status still Scheduled)
Completed → (terminal)
Overdue   → Completed (user can still complete from Kanban overdue column)
```

**V2 Capacity Rule (daily_session_capacity):** Count of logs WHERE `scheduled_date = target_date AND session_status != 'Cancelled'` must not exceed `PsychE_Settings.daily_session_capacity`.

---

### Table: `PsychE_Student_Tags`
> Junction table. Composite primary key.

| Column | Type | Constraints |
|---|---|---|
| `student_uuid` | UUID | FK → `PsychE_Students(id)` ON DELETE CASCADE |
| `tag_id` | UUID | FK → `PsychE_System_Tags(id)` ON DELETE CASCADE |
| `assigned_at` | TIMESTAMPTZ | DEFAULT NOW() |

**PK:** `(student_uuid, tag_id)` — prevents duplicate tag assignment.

---

### Table: `PsychE_Responses`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `log_id` | UUID | FK → `PsychE_Counseling_Logs(id)` ON DELETE CASCADE | |
| `question_id` | UUID | FK → `PsychE_Questions(id)` ON DELETE CASCADE | |
| `score_value` | INTEGER | CHECK (1–4) | Raw score before reverse-scoring |
| `created_at` | TIMESTAMPTZ | | |

---

### Table: `PsychE_Domains` (V5)
> Static reference table for the 7 psychological scoring domains. Seeded once; not user-editable via any current UI.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `code` | VARCHAR(10) | PK | `BHV`, `SOC`, `COG`, `EMH`, `FAM`, `CAR`, `SEL` |
| `name` | VARCHAR(100) | NOT NULL | e.g. `Behavioural Regulation` |
| `description` | TEXT | | e.g. `How the student acts` |

**Seeded rows:** Behavioural Regulation (BHV), Social & Interpersonal (SOC), Cognitive Functioning (COG), Emotional & Mental Health (EMH), Family & Home Environment (FAM), Career Alignment (CAR), Self & Identity (SEL).

---

### Table: `PsychE_Student_Telemetry` (V5)
> One row per student per calendar day (UTC). Isolated analytics store — never joined into read paths that need guaranteed-fresh data without a NULL check, since a student with no activity yet has no row.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, default uuid_generate_v4() | |
| `student_uuid` | UUID | FK → `PsychE_Students(id)` ON DELETE CASCADE | |
| `calculated_at` | TIMESTAMPTZ | DEFAULT NOW() | Upserted same-day (see §8) |
| `metrics_payload` | JSONB | | Domain Scoring Engine output — see §8.1 |
| `engine_status` | TEXT | | Cold-Start Gatekeeper state — see §8.2 |
| `confidence_multiplier` | NUMERIC | | 0–1, ramps up over the warming period |
| `eti_score` | NUMERIC | | ETI Engine output, 0–100 — see §8.3 |
| `eti_data` | JSONB | | Full ETI breakdown (ratios + avoidance flag) — see §8.3 |

---

## 2. Indexes (Query Performance)

| Index Name | Table | Column(s) | Type |
|---|---|---|---|
| `idx_students_student_id` | `PsychE_Students` | `student_id` | btree |
| `idx_questions_module_id` | `PsychE_Questions` | `module_id` | btree |
| `idx_questions_is_active` | `PsychE_Questions` | `is_active` | btree |
| `idx_logs_student_uuid` | `PsychE_Counseling_Logs` | `student_uuid` | btree |
| `idx_logs_session_date` | `PsychE_Counseling_Logs` | `session_date DESC` | btree |
| `idx_logs_scheduled_date` | `PsychE_Counseling_Logs` | `scheduled_date` | btree |
| `idx_student_tags_student` | `PsychE_Student_Tags` | `student_uuid` | btree |
| `idx_student_tags_tag` | `PsychE_Student_Tags` | `tag_id` | btree |
| `idx_responses_log_id` | `PsychE_Responses` | `log_id` | btree |
| `idx_responses_question_id` | `PsychE_Responses` | `question_id` | btree |
| `idx_modules_smart_keywords` | `PsychE_Modules` | `smart_keywords` | **GIN** |
| `idx_telemetry_student_uuid` | `PsychE_Student_Telemetry` | `student_uuid` | btree |
| `idx_telemetry_calculated_at` | `PsychE_Student_Telemetry` | `calculated_at DESC` | btree |

> The GIN index on `smart_keywords` powers the Add Log keyword-suggestion engine. Query pattern: `WHERE smart_keywords && ARRAY['keyword']`.

---

## 3. Row Level Security (RLS)

- All 10 tables have RLS **enabled** (8 V3 tables + `PsychE_Domains` + `PsychE_Student_Telemetry`).
- Current policy for each: `FOR ALL USING (true) WITH CHECK (true)` — open access via anon key.
- **⚠ For production:** Replace with `auth.uid()` predicates.
- Policy naming convention: `"psyche_v3_allow_all on <TableName>"` for the original 8 tables; the two V5 tables use `"psyche_v5_allow_all on <TableName>"` — same effective policy, inconsistent prefix. Not corrected here since it requires a live SQL statement against Supabase, not just a doc edit.

---

## 4. Supabase Client

**File:** `src/lib/supabase.ts`
```typescript
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mock-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'mock-key';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```
**Env vars required in `.env`:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Import pattern across app:**
```typescript
import { supabase } from '../lib/supabase';
```

---

## 5. Application Routing

**Router:** react-router-dom v7, `BrowserRouter`, nested under `PinScreen` auth guard.

| Route Path | Page Component | Notes |
|---|---|---|
| `/` | `Dashboard` | Mission Control, Bento Grid |
| `/student/:studentId` | `StudentProfile` | `:studentId` = `PsychE_Students.id` (UUID) |
| `/add-log` | `AddLog` | Capacity-aware date picker |
| `/add-student` | `AddStudent` | Inline student creation |
| `/edit-student/:id` | `AddStudent` | Edit mode via `:id` param |
| `/logs` | `AllLogs` | Chronological log feed |
| `/directory` | `StudentDirectory` | Filterable student table |
| `/settings` | `Settings` | `PsychE_Settings` row editor |
| `/kanban` | `KanbanBoard` | 7-day rolling planner with drag-and-drop |
| `/bulk-schedule` | `BulkSchedule` | Auto-distribute students to dates |
| `/analytics` | `Analytics` | Charts & metrics |
| `/report` | `ReportExport` | A4 print view (outside Layout wrapper) |
| `/library` | `LibraryManager` | **V3 NEW** — Assessment CMS Master-Detail |
| `/tags` | `GlobalTagManager` | **V3 NEW** — System Tag manager |

---

## 6. V2 Scheduling Logic

### Capacity Enforcement
1. Fetch `PsychE_Settings.daily_session_capacity` (default: 7).
2. For any candidate `scheduled_date`, query:
   ```sql
   SELECT COUNT(*) FROM "PsychE_Counseling_Logs"
   WHERE scheduled_date = $date AND session_status != 'Cancelled'
   ```
3. If `count >= capacity` → mark date as **full** (highlight red in date picker, block selection).

### Overdue Detection
- Auto-detected at query time (no background job needed):
  ```sql
  WHERE scheduled_date < CURRENT_DATE AND session_status = 'Scheduled'
  ```
- UI renders these as "Overdue" (red column on Kanban).

### Bulk Auto-Scheduler Algorithm
1. Accept list of `student_uuid[]`.
2. Fetch upcoming dates (start from tomorrow).
3. For each date, compute remaining capacity.
4. Greedily assign students to the next available slot.
5. Batch INSERT `PsychE_Counseling_Logs` rows with `session_status = 'Scheduled'`.

### Assessment Cooldown
- `PsychE_Settings.assessment_cooldown_days` (default: 30).
- Before allowing a module re-assignment: check last `PsychE_Responses` entry for that student + module combination is > cooldown_days old.

---

## 7. V3 CMS Schema Constraints

### Module Lock Rules
- `PsychE_Modules.is_locked = TRUE` → module is formally locked.
- A locked module's questions may only be edited **once** per question.
- Enforcement: Before any UPDATE to a `PsychE_Questions` row:
  - If `PsychE_Modules.is_locked = TRUE` AND `PsychE_Questions.has_been_edited = TRUE` → **block the edit, show error**.
  - If `has_been_edited = FALSE` → allow edit, then set `has_been_edited = TRUE`.

### Smart Keywords
- Column: `PsychE_Modules.smart_keywords TEXT[]`
- GIN-indexed for fast `&&` (overlap) queries.
- Add Log page: when counselor types in the `reason` field, tokenize input and query:
  ```sql
  SELECT * FROM "PsychE_Modules"
  WHERE smart_keywords && ARRAY[$tokens]
  ```
- Return matching modules as suggestion pills to the counselor.

### Tag Assignment
- Tags created in `PsychE_System_Tags`.
- Assigned via INSERT into `PsychE_Student_Tags(student_uuid, tag_id)`.
- Conflict: `ON CONFLICT DO NOTHING` (prevents duplicates, PK is composite).
- Removal: DELETE from `PsychE_Student_Tags WHERE student_uuid = $s AND tag_id = $t`.

### Response Scoring
- Scores stored raw (1–4) in `PsychE_Responses.score_value`.
- Reverse-scoring applied at **read time** in application code, not at DB write time.
- Module score = `SUM(effective_score)` / question count — normalized to 0–100 scale.

---

## 8. V5 Analytics & Telemetry Engines

> Two independent scoring engines write into the same `PsychE_Student_Telemetry` row per student per day. Both are pure SQL (`plpgsql` functions), invoked nightly by `psyche_run_daily_batch()` via the GitHub Actions cron in `.github/workflows/daily_analytics.yml` (21:30 UTC / 03:00 IST, `workflow_dispatch` also available for manual runs). No client-side recomputation exists — the frontend only reads the latest row.

### 8.1 Domain Scoring Engine (V6 rewrite — `calculate_student_telemetry`, `v6_domain_scoring_engine.sql`)

> Formal model: a **second-order (hierarchical) factor model** — the same architecture underlying instruments like the WISC (subtests → index scores → full-scale IQ). Designed with an external psychometrics consultant; superseded the V5.0 prototype in `v5_migration.sql`, which flattened all responses directly into a domain average and could not support a second instrument type. See conversation history for the full consultant rationale — this section documents the shipped implementation.

Scores counseling activity from the trailing **90-day window**, in three explicit stages:

**Stage 1 — Item → Module (`q̄_m`).** Every response is direction-corrected first: `q* = (scale_min + scale_max) - q` if the question `is_reverse_scored`, else `q* = q`. The module's raw score `q̄_m` is the mean of corrected responses for that module, computed independently per module (not flattened across the domain) — this is the fix for V5.0's item-count bias, where a 20-item module could silently outweigh a 5-item module.

**Stage 2 — Normalize (`Z_m`).** `Z_m = (q̄_m - scale_min) / (scale_max - scale_min)`, using **that module's own** `PsychE_Modules.scale_min`/`scale_max` (default 1/4 for the current 4-point Likert modules). This is what makes the engine instrument-agnostic — a future PHQ-9 or GAD-7 module normalizes correctly the moment its own scale range is set in `LibraryManager`, with zero changes to the scoring function.

**Stage 3 — Module → Domain (`D_k`).** `D_k = SUM(Z_m · w_m · λ_m) / SUM(w_m · λ_m)`, where:
- `w_m` = `PsychE_Modules.domain_weight` (clinical weight, editable in `LibraryManager` — see `GUIDE_developer.md` §6).
- `λ_m` = 1 if the module was actually administered in the window, 0 otherwise — implemented by simply never including that module's row in the aggregation (a `GROUP BY module.id` subquery only ever produces rows for administered modules), so an unadministered module is excised from both sides of the fraction rather than treated as zero.
- **Domain-level null rule:** if every module in the domain has `λ_m = 0`, the query returns zero rows and `D_k` is `NULL` by construction — never a fabricated default.

**Direction convention:** Stage 3's `D_k` is *distress-direction* internally (higher = worse), per the consultant's model. It is inverted once, at storage time, into the existing wellness-direction convention the frontend already expects: `domain_scores.<CODE> = 1 - D_k` (0–1, higher = better). **This is why the radar chart and archetype thresholds below needed zero changes** — the storage contract (0–1, higher = better) is unchanged from V5.0; only the computation feeding it became rigorous.

> **Content-authoring contract:** the direction-correction in Stage 1 only fixes *within-module* semantic direction. Whoever authors questions and sets `is_reverse_scored` in `LibraryManager` must do so consistently such that "higher `q*`" always means "more of the construct" — the engine has no way to verify this from the data alone.

- **Cold start:** if 0 sessions-with-responses in the window, all domain scores are `NULL` and `archetype = 'Pending Baseline Assessment'` (unchanged from V5.0).
- **Data completeness** = `(# non-NULL domains) / 7` (unchanged from V5.0).
- **Archetype** — unchanged priority order and thresholds from V5.0 (see below), since the storage convention is preserved: 0 active domains → `Pending Baseline Assessment`; `EMH < 0.35 AND BHV < 0.35` → `High Vulnerability Support Priority`; then highest-scoring domain wins one of `Cognitive & Analytic Dominant` / `Emotional Processing Centric` / `Interpersonal & Social Oriented` / `Family Environment Dependent` / `Behavioral Regulation Focused` / `Career & Future Aligned` / `Self & Identity Exploration` (ties broken by domain priority in that same order).

**Tension Matrix** — the bifactor-residual approximation: divergent domain profiles are more diagnostic than uniformly low ones (a masking pattern — e.g. high Cognitive, low Emotional — is a distinct clinical signature, not noise to average away). Computed only when *both* underlying domains are non-NULL, on the same 0–1 wellness scale as `domain_scores` (signed, direction preserved — sign carries clinical meaning, see `GUIDE_developer.md` §9.5):
- `T_cognitive_emotional = COG - EMH` — masking/suppressor axis (thinking vs. feeling)
- `T_social_home = SOC - FAM` — escape-valve axis (peer refuge vs. home instability)
- `T_career_identity = CAR - SEL` — authenticity axis (chosen vs. externally-imposed direction) — **new in V6**
- `T_behavioral_emotional = BHV - EMH` — externalizing vs. internalizing axis — **new in V6**
- `dominant_tension = { pair, value }` — the single pair with `max|T_a,b|` across all 4, or `null` if none are valid. Answers "how internally inconsistent is this profile overall," independent of which specific axis. **New in V6** — did not exist in the V5.0 prototype.
- The old V5.0 `T_internal_external` composite average (`((COG+EMH)/2) - ((SOC+FAM)/2)`) is **removed** — it collapsed exactly the divergence information the tension layer exists to preserve.
- UI significance threshold: `|tension| > 0.3` (30 points when displayed ×100) triggers a flagged card; `dominant_tension` is always surfaced (styled differently above/below that same threshold) since it's informative on its own (see `GUIDE_developer.md` §9.5).

Result stored in `PsychE_Student_Telemetry.metrics_payload` (shape: `TelemetryPayload` in `src/types/index.ts`).

### 8.2 Cold-Start Gatekeeper (`psyche_get_engine_status`, `v5_analytics_migration.sql`)
Determines `engine_status` — gates whether ETI/domain data is trustworthy enough to show:

| State | Condition |
|---|---|
| `cold_start` | 0 completed sessions AND 0 responses ever |
| `assessment_only` | Sessions exist but never a formal assessment (0 responses) |
| `stale` | Last completed session > 90 days ago |
| `warming` | Days since first activity < 15, OR completed sessions < 3, OR responses < 10 |
| `active` | All thresholds cleared — full data available |

`confidence_multiplier` (`src/analytics/ColdStart.ts` → `calculateConfidenceMultiplier`) is a **frontend-only** display ramp, not stored by the SQL engine: `min(1, daysSinceFirst / 15) * min(1, completedSessions / 3)`. Used to show a "Building profile — N% Confidence" badge during `warming`.

### 8.3 ETI Engine (`psyche_calculate_eti`, `v5_analytics_migration.sql`)
Engagement Trajectory Index — scores the trailing `p_window_days` (default 30) of `PsychE_Counseling_Logs` for one student:
- `A` (attendance ratio) = `Completed / (Completed + No_Show)`
- `F` (follow-through) = `1 - (Pending follow-ups / total logs in window)`
- `R` (recency factor) = `EXP(-days_since_last_completed / 30)` — exponential decay, so a completed session today gives `R ≈ 1`, 30 days ago gives `R ≈ 0.37`.
- `ETI = 100 * (0.50*A + 0.30*F + 0.20*R)`
- **Avoidance flag:** `No_Show / (Completed + No_Show) >= 0.5` → chronic no-show pattern, surfaced as a red banner on the Student Profile ETI card.
- Returns `NULL` eti (with `reason: 'no_activity'`) if zero logs exist in the window — distinct from `cold_start` (§8.2), which looks at all-time activity, not just the window.

### 8.4 Daily Batch (`psyche_run_daily_batch`)
Loops every row in `PsychE_Students`, computes §8.2 + §8.3 for each, and **upserts** into `PsychE_Student_Telemetry` — same calendar day (UTC) updates in place, a new day inserts a new row. This cron does **not** call §8.1's `calculate_student_telemetry` — that RPC is instead triggered client-side, synchronously, from `AssessmentWizard.tsx` right after a completed assessment's responses are inserted. Net effect: domain scores update the instant a counselor finishes scoring a student; `engine_status`/ETI update once nightly.

### 8.5 Cross-Engine Upsert Fix (V6.1 — `v6_1_telemetry_upsert_fix.sql`)
Both engines above write the **same row** (keyed on `student_uuid` + calendar day), and each `UPDATE` branch correctly touches only its own columns. But each `INSERT` branch (taken when no row exists yet for that student today) originally set **only its own columns**, leaving the other engine's columns `NULL` on the new row. Whichever engine ran first each day "won" the `INSERT`; in production the nightly cron always ran before same-day assessments, so this stayed latent until `calculate_student_telemetry()` was invoked manually (V6 backfill) on students with no row yet for the day — which silently zeroed their `engine_status`/`eti_score`/`eti_data` for that day.

**Fix:** both functions now look up the student's most recent prior row (any day, via `ORDER BY calculated_at DESC LIMIT 1`) before an `INSERT`, and carry the *other* engine's last-known values forward instead of leaving them `NULL`. A metric that has genuinely never been computed for a student (e.g. true cold-start) still correctly stays `NULL` — carry-forward only ever copies a value that existed before. Superseded, not appended: `v6_1_telemetry_upsert_fix.sql` reissues `CREATE OR REPLACE` for both functions; their scoring math is unchanged.
