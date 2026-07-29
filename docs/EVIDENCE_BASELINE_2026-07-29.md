# Evidence Baseline — 2026-07-29

Point-in-time snapshot extracted from the **development** database to support model assessment.
Not a living doc; not registered in the governance registry. Supersede or delete once real data exists.

> **⚠ Read this first:** every number below comes from **10 dev students with obviously seeded names**
> (Alice Johnson, John Doe, Michael Smith, Sarah Williams…). It describes **engine behaviour**, not clinical
> reality, and **cannot validate any model**. See §6 for what would be needed.

---

## 1. Headline finding — 3 of 7 domains have no instrument at all

The module library does not cover the domain model. This is the single most important fact for assessing
these models, and it invalidates several features we shipped.

| Domain | Modules assigned | Real items | Status |
|---|---|---|---|
| **EMH** Emotional & Mental Health | Emotional Stability Baseline | 30 | ✅ real |
| **COG** Cognitive Functioning | Cognitive Problem Solving | 30 | ✅ real |
| **FAM** Family & Home Environment | Family Dynamics Index | 30 | ✅ real |
| **SOC** Social & Interpersonal | Peer Group Stability | **1 dummy item** | ⚠ placeholder |
| **BHV** Behavioural Regulation | "New Module" (0 items), "PHQ-9 Depression Screener" (0 items) | **0** | ❌ none |
| **CAR** Career Alignment | *none* | **0** | ❌ none |
| **SEL** Self & Identity | *none* | **0** | ❌ none |

The SOC item is literally `"Question 1 : Dummy Question"` with response labels
`Great / Not Great / NGL / NGLA`. Every SOC domain score in the system derives from that one placeholder.

### What this structurally disables

| Feature | Consequence |
|---|---|
| **`High Vulnerability Support Priority` archetype** | **Can never fire.** Its rule requires `EMH < 0.35 AND BHV IS NOT NULL AND BHV < 0.35`. BHV is always `NULL`, so the single highest-priority archetype in the system is unreachable. |
| **Tension axis CAR−SEL** (authenticity) | Can never fire — neither domain has an instrument. |
| **Tension axis BHV−EMH** (externalizing↔internalizing) | Can never fire — BHV is always `NULL`. |
| **Tension axes remaining** | Only COG−EMH and SOC−FAM can fire — and SOC−FAM rests on the dummy item. |
| **`data_completeness`** | Structurally capped at 4/7 ≈ **0.571**. Observed maximum is exactly `0.5714` — confirms the cap is binding, not coincidental. |
| **`WD` (Worst Domain)** | Only ever ranges over 3–4 domains, so "worst" means "worst of the three we measure." |
| **Archetypes for BHV / CAR / SEL dominance** | Unreachable. |

**PHQ-9 is also mis-assigned:** it sits in `BHV` (Behavioural Regulation), but PHQ-9 is a depression
screener — it belongs in `EMH`. It has 0 questions, so it currently contributes nothing either way, but the
mapping should be corrected before content is added.

---

## 2. Module map (complete)

All modules are `scale_min = 1`, `scale_max = 4`, `domain_weight = 1.0`.

| Module | Type | Domain | Items | Active | Reverse | Responses ever | Locked |
|---|---|---|---|---|---|---|---|
| Emotional Stability Baseline | COMPE | EMH | 30 | 30 | 10 | 23 | no |
| Cognitive Problem Solving | COMPE | COG | 30 | 30 | 10 | 19 | no |
| Family Dynamics Index | COMPE | FAM | 30 | 30 | 10 | 28 | no |
| Peer Group Stability | COMPE | SOC | 1 | 1 | 1 | 1 | no |
| PHQ-9 Depression Screener | PsycheSPA | BHV ⚠ | 0 | 0 | 0 | 0 | **yes** |
| New Module | COMPE | BHV | 0 | 0 | 0 | 0 | no |

### Reverse-scoring convention — verified consistent ✅

I checked all 31 reverse-flagged items by hand. The convention is applied correctly and uniformly across
all three real modules:

- **Distress-worded items → NOT reversed.** e.g. *"I feel easily overwhelmed by everyday emotional situations."*, *"I give up quickly when a solution isn't immediately obvious."*, *"I believe my parents favor my siblings over me."*
- **Wellness-worded items → reversed.** e.g. *"I can remain calm when faced with stressful situations."*, *"I enjoy analyzing complex problems to find the best solution."*, *"I feel fully supported and loved by my family."*

Each real module is exactly 20 distress-keyed + 10 wellness-keyed. After correction, higher `q*` reliably
means "more distress" in every case — which is the one property the engine **cannot** verify itself
(documented as the content-authoring contract in `ARCH_technical-specs.md` §8.1). It currently holds.

### Scale/weight machinery is unexercised

Every module is 1–4 with weight 1.0. The cross-instrument normalization (`Z_m`) and clinical weighting
(`w_m`) built in V6 are therefore **correct but completely untested against real variation** — no module
yet has a different scale range or a non-default weight.

---

## 3. Distribution data (n = 10, dev)

**Engine status**

| Status | n |
|---|---|
| `assessment_only` | 4 |
| `cold_start` | 3 |
| `warming` | 2 |
| `active` | **1** |

**Domain population** — how many of 10 students have a non-null score

| BHV | SOC | COG | EMH | FAM | CAR | SEL |
|---|---|---|---|---|---|---|
| 0 | 1 | 3 | 3 | 3 | 0 | 0 |

Observed `data_completeness` values: `0`, `0.4286` (3/7), `0.5714` (4/7).

**Composite Score**

| | n |
|---|---|
| Has a composite score | 8 / 10 |
| `CF_C = 1.00` (all 4 components) | 3 |
| `CF_C = 0.25` (ED only) | 5 |
| **Suppressed by the ≥ 0.5 gate** | **5 of 8 (62.5%)** |

**RSI outcome — no student currently receives an RSI**

| Outcome | n |
|---|---|
| `insufficient_confidence` | 5 |
| `insufficient_cohort_size` (eligible pool = 3, need 8) | 3 |
| `no_composite_score` | 2 |
| **Computed** | **0** |

This is correct behaviour, not a fault — but it means RSI is entirely unexercised against real data. Its
percentile, tie-handling, and cohort-fallback logic were verified pre-gating (see session history) and are
mathematically sound; they have simply never run in a live-eligible state.

---

## 4. Trajectories — not available

Only **4 distinct snapshot days** exist (2026-07-26 → 2026-07-29), and the 07-28 / 07-29 rows were
generated by my own verification runs, not by organic use. There is **no multi-week history**, and
therefore no improving / deteriorating / masking / disengaging exemplars to extract.

Two structural notes for when you do want trajectories:

1. **The data model supports them.** `PsychE_Student_Telemetry` is append-per-day, so history accumulates
   automatically once the cron runs daily in production. Nothing needs building.
2. **But same-day writes overwrite.** Multiple assessments on one calendar day update one row, so
   within-day movement is not retained. Day-granularity is the floor.

---

## 5. What I cannot produce — and why

Two of your five asks are not extractable from any system I can reach. They are definitional, not
computational.

### Outcome labels
Nothing in the schema encodes deterioration, urgent concern, false positive, recovery, escalation, or
successful intervention. `risk_level` (Low/Medium/High) is a manually-set field with no defined criteria,
and `follow_up_status` is operational, not clinical.

These have to be **defined by you and your counselors** before anything can be measured against them. What
would make them usable:

- A written rule per label (e.g. *"deterioration = composite rises ≥ 15 points across two consecutive assessments"* — or whatever your practice actually treats as deterioration).
- A place to record them. There is currently no field for a counselor to mark an outcome, so even if defined, they cannot be captured. **This is a build item, and a prerequisite for every validation question you asked.**

### Clinical review feedback
Requires counselors reviewing real cases. I can build the instrument — an export of top-ranked students
with their archetype, domain profile, and dominant tension, plus a structured agree/disagree capture — but
the judgements themselves have to come from practitioners.

---

## 6. What would actually make these models assessable

In dependency order:

1. **Fill the domain gaps.** Build instruments for BHV, CAR, SEL and replace the SOC dummy. Until then, three domains, two tension axes, and the highest-priority archetype are dead code.
2. **Fix the PHQ-9 domain assignment** (BHV → EMH) and populate its items.
3. **Define outcome labels** in writing (§5).
4. **Add a field to record them** — without this, no supervised evaluation is possible at all.
5. **Let the cron accumulate** ~8–12 weeks of production history for trajectories.
6. **Then** run: threshold calibration, weight recalibration against outcomes, archetype agreement rates, and RSI cohort-eligibility rates on real enrolment numbers.

Steps 1–4 are prerequisites. Steps 5–6 cannot start without them.

---

## 7. On the weights, restated

The Composite weights (0.44 / 0.28 / 0.17 / 0.11) and `domain_weight` values (all 1.0) remain
**unvalidated engineering judgment**. Nothing in this baseline changes that — and with 3 of 7 domains
empty, `DD` and `WD` are currently averages over a partial and non-representative slice of the domain
model, which makes any calibration attempt premature until §6.1 is done.
