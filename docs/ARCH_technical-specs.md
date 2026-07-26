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

TIER 2 (Single FK)
  PsychE_Questions       → PsychE_Modules(id)
  PsychE_Counseling_Logs → PsychE_Students(id)

TIER 3 (Multiple FKs)
  PsychE_Student_Tags    → PsychE_Students(id) + PsychE_System_Tags(id)
  PsychE_Responses       → PsychE_Counseling_Logs(id) + PsychE_Questions(id)
```

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
| `session_status` | VARCHAR(20) | DEFAULT `'Scheduled'` | `Scheduled`, `Completed`, `Overdue`, `Cancelled` |
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

> The GIN index on `smart_keywords` powers the Add Log keyword-suggestion engine. Query pattern: `WHERE smart_keywords && ARRAY['keyword']`.

---

## 3. Row Level Security (RLS)

- All 8 tables have RLS **enabled**.
- Current policy for each: `FOR ALL USING (true) WITH CHECK (true)` — open access via anon key.
- **⚠ For production:** Replace with `auth.uid()` predicates.
- Policy naming convention: `"psyche_v3_allow_all on <TableName>"`

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
