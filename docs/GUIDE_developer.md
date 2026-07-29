# GUIDE_developer.md
> **Owner:** This file owns all frontend coding standards, UI language definitions, component patterns, and state management rules.
> **Must NOT contain:** Database schema definitions, SQL, or raw Supabase query logic (those live in `ARCH_technical-specs.md`).

---

## 1. UI Language & Design System

### 1.1 Core Design Philosophy
- **Minimalist, high-contrast, intuitive.** No heavy UI clutter.
- **Desktop-first.** Optimized for macOS/Chrome at ≥1280px wide.
- **Premium aesthetic.** Glassmorphism, staggered fade-in animations, and premium hover states. Avoid generic browser-default styles.

### 1.2 Layout Paradigms

#### Bento Grid (Primary Dashboard / Student Profile)
- Information compartmentalized into distinct cards on a single screen.
- Avoids unnecessary navigation — everything relevant visible without scrolling.
- Cards: Personal Details, Quick Actions, Recent Logs Timeline, Risk Level indicator, Tag Chips.
- Use CSS Grid (`display: grid; grid-template-columns: ...`) with named grid areas.
- Cards have a subtle backdrop-blur glassmorphic treatment.

#### Apple-Style Master-Detail (Library CMS / Tag Manager)
- **Two-pane layout:**
  - **Master pane (left, ~320px):** Scrollable list of items (modules, tags). Each item is a compact card with a title, metadata chip, and active state.
  - **Detail pane (right, flex-grow):** Full edit form + question list rendered when a master item is selected.
- Selection state maintained in React local state (`selectedId: string | null`).
- Empty state in detail pane: centered illustration + "Select an item from the left to begin."
- Transition between items: 150ms ease fade on the detail pane content.

#### Enterprise Data Grid (Tag Manager table)
- High-density, scannable table with column headers.
- Each row: color swatch circle, tag name, category badge pill, action buttons (Edit, Delete).
- Inline editing: clicking the row's "Edit" icon replaces cells with input fields; Save/Cancel appear inline.
- Hover: subtle row highlight with `background: rgba(255,255,255,0.05)`.

### 1.3 Color Tokens (defined in `src/index.css`)

```css
:root {
  --bg-primary:       #0a0a0f;       /* Near-black base */
  --bg-secondary:     #111118;       /* Card/panel background */
  --bg-tertiary:      #1a1a24;       /* Elevated surface */
  --border-subtle:    rgba(255,255,255,0.08);
  --border-active:    rgba(255,255,255,0.20);
  --text-primary:     #f0f0f5;
  --text-secondary:   #8888a8;
  --text-muted:       #55556a;
  --accent-blue:      #5b8af5;       /* Primary actions */
  --accent-purple:    #9b59f5;       /* Secondary / assessment */
  --accent-green:     #3fc98f;       /* Success / Completed */
  --accent-red:       #f55b5b;       /* Danger / Overdue / High-risk */
  --accent-amber:     #f5a623;       /* Warning / Medium-risk */
  --glass-bg:         rgba(255,255,255,0.04);
  --glass-border:     rgba(255,255,255,0.10);
  --shadow-card:      0 4px 24px rgba(0,0,0,0.4);
}
```

### 1.4 Typography
- **Font:** `Inter` (Google Fonts) — import in `index.html` or `index.css`.
- `h1` / page titles: `font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em;`
- Section headers: `font-size: 1rem; font-weight: 600; color: var(--text-secondary);`
- Body / labels: `font-size: 0.875rem; font-weight: 400;`
- Metadata / timestamps: `font-size: 0.75rem; color: var(--text-muted);`

### 1.5 Micro-Animations

| Trigger | Behavior | Duration |
|---|---|---|
| Page mount | Staggered card fade-in from `translateY(12px)` | 300ms, 50ms stagger |
| Hover on card | `translateY(-2px)` + shadow deepen | 150ms ease |
| Button press | `scale(0.97)` | 100ms |
| Master-Detail item select | Detail pane: `opacity: 0 → 1` | 150ms ease |
| Modal open | Slide up from `translateY(20px)` + fade | 200ms ease-out |
| Toast / notifications | Slide in from right | 250ms ease |

Prefer **CSS transitions** where possible. Use **framer-motion** only for complex gestures (drag-and-drop on Kanban) or multi-step animations.

---

## 2. Component Patterns

### 2.1 File & Folder Conventions
```
src/
  components/        # Reusable UI components (no page-level state)
  pages/             # Route-level page components
  lib/               # Supabase client + utility modules
  styles/            # (reserved for future extracted CSS modules)
  types/             # TypeScript interfaces and type aliases
  utils/             # Pure utility functions (scoring, date formatting)
```

### 2.2 TypeScript Interfaces
Define all DB-mapped types in `src/types/`. Naming convention: match table name without prefix.

```typescript
// src/types/index.ts (example)
export interface Student {
  id: string;
  student_id: string;
  full_name: string;
  risk_level: 'Low' | 'Medium' | 'High';
  // ...
}

export interface Module {
  id: string;
  name: string;
  type: 'COMPE' | 'PsycheSPA' | 'Custom';
  smart_keywords: string[];
  is_locked: boolean;
}

export interface Question {
  id: string;
  module_id: string;
  prompt_text: string;
  is_reverse_scored: boolean;
  custom_labels: Record<string, string>;
  is_active: boolean;
  has_been_edited: boolean;
}

export interface SystemTag {
  id: string;
  tag_name: string;
  tag_category: string;
  color_hex: string;
}
```

### 2.3 Page Component Structure
Every page component follows this template:

```tsx
// pages/ExamplePage.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function ExamplePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data, error } = await supabase
      .from('PsychE_TableName')
      .select('*');
    if (error) setError(error.message);
    else setData(data ?? []);
    setLoading(false);
  }

  if (loading) return <div className="page-loading">Loading...</div>;
  if (error)   return <div className="page-error">{error}</div>;

  return (
    <div className="page-container">
      {/* content */}
    </div>
  );
}
```

### 2.4 Modal Pattern
- Modals are rendered via a portal or inline at the page root.
- Backdrop: `position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px)`.
- Modal panel: centered, max-width `560px`, glassmorphic card style.
- Always include: Title, close (×) button, content area, action buttons row (Confirm + Cancel).
- ESC key closes modal (useEffect keydown listener).

### 2.5 Pill / Badge Component
- Tags, status chips, module type badges are all "pills."
- CSS class: `.pill { padding: 2px 10px; border-radius: 99px; font-size: 0.75rem; font-weight: 600; }`
- Color variants via modifier classes: `.pill--blue`, `.pill--green`, `.pill--red`, `.pill--amber`, `.pill--purple`.

### 2.6 Risk Level Display Rules

| `risk_level` | Color | Treatment |
|---|---|---|
| `Low` | `--accent-green` | Subtle pill |
| `Medium` | `--accent-amber` | Amber pill + icon |
| `High` | `--accent-red` | Red pill + pulsing red border on profile card + alert badge on Kanban |

High-risk students must be **heavily highlighted** across: Kanban board cards, Dashboard recent activity, Directory table rows.

---

## 3. State Management Rules

- **No global state library** (no Redux, no Zustand). Use React's `useState` + `useEffect` + prop drilling for shallow trees.
- **Data fetching:** Direct Supabase calls inside `useEffect` on each page. No custom hooks layer unless the same query appears in 3+ places.
- **Optimistic updates:** Allowed for simple toggle operations (e.g., `is_active` toggle on Questions). Revert on error.
- **Loading states:** Every async operation sets a `loading: boolean`. Show a skeleton or spinner — never a blank screen.
- **Error handling:** Every Supabase call destructures `{ data, error }`. Always check `error` before using `data`.

---

## 4. Print View — A4 Export

**Route:** `/report` — rendered **outside** the Layout component (no sidebar, no navbar).

**Behavior:**
1. `/report?student=<uuid>` renders a print-ready HTML view of the student record.
2. All dark-mode CSS is suppressed inside `@media print` or when the route is active.
3. On load, call `window.print()` automatically (or via a "Print" button).

**CSS rules (in `index.css`):**
```css
@media print {
  body { background: #fff; color: #000; }
  .no-print { display: none !important; }
  .print-page {
    width: 210mm;
    min-height: 297mm;
    padding: 20mm;
    font-family: 'Times New Roman', serif;
    font-size: 11pt;
  }
  h1 { font-size: 14pt; font-weight: bold; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #000; padding: 4pt 8pt; }
}
```

**Print view content structure:**
1. School header (logo placeholder + "Student Counseling Record")
2. Student demographics table
3. Tag list (rendered as plain text)
4. Chronological session history (each session as a bordered section)
5. Assessment results summary (if any)
6. Footer: Generated date + counselor signature line

---

## 5. Assessment Engine (src/lib/assessmentEngine.ts)

- **Location:** `src/lib/assessmentEngine.ts`
- **Purpose:** Pure functions for scoring. No Supabase calls.

**Key functions:**
```typescript
// Apply reverse-scoring to a raw score on a 4-point scale
function reverseScore(rawScore: number, maxScale = 4): number {
  return (maxScale + 1) - rawScore;
}

// Compute effective score for a response
function effectiveScore(raw: number, isReverse: boolean): number {
  return isReverse ? reverseScore(raw) : raw;
}

// Compute total module score as a 0–100 percentage
function computeModuleScore(responses: Array<{score_value: number, is_reverse_scored: boolean}>): number {
  const maxPossible = responses.length * 4;
  const total = responses.reduce((sum, r) => sum + effectiveScore(r.score_value, r.is_reverse_scored), 0);
  return Math.round((total / maxPossible) * 100);
}
```

---

## 6. LibraryManager CMS — Component Spec

**Route:** `/library`
**Component file:** `src/components/LibraryManager.tsx`
**Layout:** Apple-Style Master-Detail (two-pane)

### Master Pane
- List of `PsychE_Modules` sorted by `created_at DESC`.
- Each item card shows: module name, type badge pill, question count (from sub-query or join), locked icon if `is_locked = true`.
- Header: "Assessment Library" title + "+ New Module" button.
- Search/filter input to filter modules by name client-side.
- Active item highlighted with `border-left: 3px solid var(--accent-blue)` and `background: var(--bg-tertiary)`.

### Detail Pane
- **Module header section:** Name (editable inline), Type selector, Domain selector, Smart Keywords pill editor (add/remove keywords as pills), Description textarea, Lock toggle (with confirmation modal if locking).
- **Domain Scoring Configuration (V6):** two number inputs next to the Domain selector — **Domain Weight** (`domain_weight`, the module's clinical weight `w_m` within its domain relative to other modules; default `1.0`, must be `> 0`) and **Scale Min–Max** (`scale_min`/`scale_max`, the instrument's theoretical raw-score range for min-max normalization; default `1`–`4` for 4-point Likert). Both save on blur via the same `patchModule` pattern as name/description. `scale_max` must be `>` `scale_min` — reject and revert with a toast if violated. Disabled when `is_locked`, same as the rest of the module header. Owned by `ARCH_technical-specs.md` §8.1 for the scoring math; this entry owns only the form/UI.
- **Questions list:** Below module header; each question in a card with:
  - Prompt text (editable if module not locked OR if `has_been_edited = false`)
  - Reverse-scored toggle (checkbox)
  - Label editor (4 custom_labels fields)
  - Active/Inactive toggle (soft-delete)
  - Edit/Delete (delete only if `is_active = false` and module not locked)
- **"+ Add Question" button** at the bottom of the questions list (disabled if module is locked).
- **One-time-edit enforcement:** If `module.is_locked AND question.has_been_edited`, show a gray disabled lock icon next to the question. The edit form fields are `disabled`.

---

## 7. GlobalTagManager — Component Spec

**Route:** `/tags`
**Component file:** `src/components/GlobalTagManager.tsx`
**Layout:** Enterprise Data Grid (full-width table) + Top-section "Create Tag" form.

### Create Tag Form (top of page)
- Fields: Tag Name (text), Category (select: Behavioral / Academic / Career / Custom / General), Color (color picker, defaults to `#4ade80`).
- On submit: INSERT into `PsychE_System_Tags`. Immediately prepend to table.

### Tag Table
| Column | Content |
|---|---|
| Color | 16px circle swatch (background = `color_hex`) |
| Tag Name | Text, inline-editable on Edit |
| Category | Badge pill (color varies by category) |
| Actions | Edit icon → inline edit mode; Trash icon → confirm-delete modal |

### Student Tag Assignment
- Accessible from `StudentProfile` page.
- UI: Search-and-select dropdown of all `PsychE_System_Tags`.
- On select: INSERT into `PsychE_Student_Tags`.
- Assigned tags shown as color-coded pills below student name.
- Remove: × on each pill → DELETE from `PsychE_Student_Tags`.

---

## 8. Navbar & Navigation Rules

**Component:** `src/components/Navbar.tsx`

- Sidebar-style navigation on desktop (fixed left, ~220px wide).
- Navigation items with lucide-react icons.
- Active route: highlighted with `var(--accent-blue)` background pill.
- Bottom of nav: App version string (fetched from `PsychE_Settings.app_version`).
- **V3 additions:** "Library" (BookOpen icon) and "Tags" (Tag icon) nav items.

---

## 9. Analytics & Telemetry UI Patterns (V5)

**Data source:** `PsychE_Student_Telemetry` (schema + scoring formulas owned by `ARCH_technical-specs.md` §8 — this section owns presentation only).

### 9.1 School-Wide Metrics (`src/pages/Analytics.tsx`)
- `MetricCard`: bento card, label (uppercase, muted) + icon chip (top row) + large value (bottom), optional `sub` caption. Skeleton pulse block shown while `loading`.
- `MiniBar`: label + count/percentage row over a thin animated fill bar (`framer-motion`, width animates `0 → pct%` on mount, 700ms ease-out).
- Layout: row 1 = four `col-span-3` `MetricCard`s; row 2 = three `col-span-4` detail cards (Risk Distribution, Session Health, Course Breakdown).

### 9.2 Student Profile Tabs (`src/pages/StudentProfile.tsx`)
- Two tabs: **Profile & History** (default) and **Telemetry Analytics** (`Sparkles` icon).
- Tab switch uses `framer-motion` `AnimatePresence mode="wait"` — outgoing tab fades/slides out (`y: -10`) before incoming fades/slides in (`y: 10`), not a simultaneous cross-fade.
- Tab underline: 2px solid `var(--color-primary)` on active, transparent otherwise; 200ms transition on all properties.

### 9.3 Domain Radar Chart
- Library: `recharts` `RadarChart` (not `framer-motion` — recharts owns its own animation).
- One axis per `PsychE_Domains` code, 0–100 scale, `PolarRadiusAxis` gridlines at `rgba(255,255,255,0.15)`.
- Stroke `#818cf8` / fill `#6366f1` at `fillOpacity: 0.35` — an indigo pairing distinct from the standard `--accent-purple` (`#9b59f5`) token. Not yet reconciled into `src/index.css` tokens; treat as an intentional one-off for telemetry surfaces, not a pattern to reuse elsewhere without adding a token first.
- `warming` engine_status overlays a "Building profile — N% Confidence" badge (amber, `--accent-amber` family) top-right of the chart card.

### 9.4 ETI Data Card
- Full-width (`col-span-12`) card, hidden entirely when `engine_status === 'cold_start'` or no ETI score exists yet (not shown as an empty/zero state — just absent).
- Three-stat row (Attendance / Follow-Through / Recency), each an equal-width sub-card, followed by a centered "Master ETI Score / 100" hero stat in an indigo-tinted panel.
- `avoidance_flag === true` renders a red banner above the stats: "Chronic No-Show Pattern (N% avoidance)".

### 9.5 Cross-Domain Tension (V6)
- Full-width card, only rendered when `data_completeness > 0` AND (at least one of the 4 named axes exceeds `|tension| > 0.3`, OR a `dominant_tension` exists) — threshold and formulas owned by `ARCH_technical-specs.md` §8.1.
- **Profile Consistency summary** (indigo-tinted, `Compass` icon): always shown first when `dominant_tension` is present, naming which of the 4 axes has the largest divergence and its magnitude in points (`value × 100`). Its supporting sentence changes based on whether that dominant value also crosses the 0.3 threshold — "a single overall score would mislead here" above threshold, vs. "profile is currently internally consistent" below it. This card can appear even when no individual axis is flagged — it's informative on its own per the consultant model, not just a rollup of the flagged list below it.
- **Flagged axis cards** (amber, `AlertTriangle` icon): one per axis exceeding the threshold, each showing the point divergence and a **sign-aware interpretation sentence** (positive vs. negative direction have distinct clinical meanings — e.g. `COG_EMH > 0` reads as a masking pattern, `< 0` reads as a possible learning/attention pattern; see `ARCH_technical-specs.md` §8.1 for all 4 axes' interpretations). Never collapse to `Math.abs()` before choosing the message — sign is the whole point.

### 9.6 Composite Score & RSI Cards (V7)
Rendered as a **side-by-side pair** (`col-span-6` each) at the bottom of the Telemetry tab. Formulas and thresholds owned by `ARCH_technical-specs.md` §8.6/§8.7 — this entry owns presentation only.

- **Composite Score** (`Gauge` icon): hidden entirely when `composite_score` is null (cold-start). Large score + a colour-coded load-band pill (Low `--accent-green` / Moderate indigo / Elevated `--accent-amber` / High `--accent-red`), an explicit confidence line ("Confidence: N% (X/4 components available)"), and a 4-cell sub-component breakdown (DD / WD / TS / ED) so a counselor can see *which* term is driving the score. Unavailable sub-components render `—`, never `0` — a missing component and a zero component mean very different things.
  - **⚠ Confidence gate (V7.1):** when `composite_confidence < MIN_COMPOSITE_CONFIDENCE` (0.5, imported from `src/types`), the score **and its load-band pill are replaced** by an "Insufficient Assessment Data" panel — never rendered as a number with a colour band. This is a safety requirement, not a stylistic one: an ETI-only composite is an engagement signal, and presenting it as "High Load / priority escalation" is a clinical false positive (see `ARCH_technical-specs.md` §8.6 for the case that prompted this). The confidence line and sub-component grid still render below it for context.
- **RSI** (`Users` icon): renders in one of two states. When computable, shows the percentile + a standing-band pill, plus a cohort context line naming the fallback level actually used ("Ranked against N peers at the class section / grade level / whole school level"). When null, renders a **plain-language explanation instead of a number** — distinguishing three cases: `insufficient_cohort_size` (not enough eligible peers, includes the actual count), `insufficient_confidence` (V7.1 — this student's own profile is too thin to rank), and `no_composite_score`. Never render `0` or `—` for an uncomputable RSI; a percentile of 0 is a real, alarming value and must never be confusable with missing data.
- **Pairing is deliberate, not cosmetic:** RSI is purely relative and will always produce a 0–100 spread even in a uniformly struggling cohort. The RSI card's own body text restates this ("Always read alongside the Composite Score above"), and the two cards must stay adjacent — do not surface RSI anywhere Composite Score isn't also visible.

### 9.7 Telemetry tab structure (V7.2 redesign)

The tab was rebuilt from score-first cards to **evidence-first** cards: each panel answers *what happened,
why, how sure are we, and what to look at next* before it shows a number. Presentational components live in
`src/components/TelemetryPanel.tsx` (pure, props-in, no Supabase); all fetching stays in `StudentProfile.tsx`
per §2.1.

Fixed vertical order — do not reorder, the sequence is the argument:

1. **Evidence Coverage strip** (`col-span-12`) — engine status, domains measured, composite components, last
   assessment, plus an amber banner naming any domain with **no assessment items at all**. This is first
   because every number below is conditional on it.
2. **Archetype row** — label + the caveat that it is derived only from measured domains.
3. **Domain Profile** (`col-span-7`) + **Cross-Domain Tension** (`col-span-5`).
4. **Engagement (ETI)** (`col-span-12`) — score, driver sentence, ratio bars, 30-day trend.
5. **Composite Load** (`col-span-6`) + **Relative Standing** (`col-span-6`).

**Colour rule for all charts.** One accent hue (`#5b8af5`) carries every data mark; neutral grey carries
context (peer bars, empty rows); the status colours are **reserved** for load/coverage bands only. A
two-hue categorical palette was tested and rejected — `#5b8af5`↔`#9b59f5` scored a normal-vision ΔE of
**13.3**, below the 15 floor, so identity is carried by position, labels, and mark type rather than hue.
Do not introduce a categorical palette here without re-validating.

**"No items" vs "not assessed" must stay distinct.** In both the domain list and the tension strip, a
domain with no instrument reads `no items` and a domain that simply hasn't been assessed for this student
reads `not assessed`. Collapsing these into one empty state hides a structural gap as if it were a
per-student gap.

**Trend and delta degrade gracefully.** Under two snapshots the sparkline is replaced by a message naming
how many exist; deltas render as "no change" rather than a fabricated zero.

### 9.8 Known deviation — inline styles
Sections 9.1–9.7 above are implemented almost entirely with inline `style={{ }}` objects rather than the CSS classes mandated by Forbidden Pattern #4 below. This is a real, current violation of that rule — not a doc gap. Flagged here rather than silently retrofitted; a future pass should extract these into `index.css` utility classes if the pattern keeps expanding.

---

## 10. Forbidden Patterns
- ❌ Do NOT use `TailwindCSS` unless the user explicitly enables it.
- ❌ Do NOT use any global state management library (Redux, Zustand, Jotai).
- ❌ Do NOT duplicate schema definitions here — link to `ARCH_technical-specs.md`.
- ❌ Do NOT write inline styles for layout. Use CSS classes defined in `index.css`. *(Currently violated across the Analytics/Telemetry surfaces — see §10.6.)*
- ❌ Do NOT use `!important` except inside `@media print` blocks.
- ❌ Do NOT silently swallow Supabase errors — always surface them to the UI. *(Currently violated in `AssessmentWizard.tsx`'s telemetry RPC call, which only `console.warn`s on failure — see registry note in `ARCH_documentation-governance.md`.)*
