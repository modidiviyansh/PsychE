# Graph Report - .  (2026-07-30)

## Corpus Check
- 84 files · ~103,290 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 374 nodes · 613 edges · 18 communities (17 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Database Migrations
- Application Pages
- UI Components
- Application Core
- App Layout
- Analytics Engine
- Dev Dependencies
- App Typescript Config
- Node Typescript Config
- Assessment Engine
- Package Config
- Tag Management
- Student Utils
- Express Webhook
- Base Typescript Config

## God Nodes (most connected - your core abstractions)
1. `supabase` - 21 edges
2. `compilerOptions` - 17 edges
3. `compilerOptions` - 16 edges
4. `Dashboard()` - 15 edges
5. `getAvailableCapacityForDateRange()` - 9 edges
6. `Analytics()` - 9 edges
7. `toSentenceCase()` - 9 edges
8. `scripts` - 7 edges
9. `dateKey()` - 7 edges
10. `todayKey()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Dashboard()` --calls--> `underServed()`  [EXTRACTED]
  src/pages/Dashboard.tsx → src/analytics/programmeHealth.ts
- `AddLog()` --calls--> `toSentenceCase()`  [EXTRACTED]
  src/pages/AddLog.tsx → src/utils/stringFormatter.ts
- `Dashboard()` --calls--> `toTitleCase()`  [EXTRACTED]
  src/pages/Dashboard.tsx → src/utils/stringFormatter.ts
- `Dashboard()` --calls--> `isValidStudentId()`  [EXTRACTED]
  src/pages/Dashboard.tsx → src/utils/studentId.ts
- `StudentProfile()` --calls--> `calculateConfidenceMultiplier()`  [EXTRACTED]
  src/pages/StudentProfile.tsx → src/analytics/ColdStart.ts

## Import Cycles
- None detected.

## Communities (18 total, 1 thin omitted)

### Community 0 - "Database Migrations"
Cohesion: 0.07
Nodes (42): baseReason(), bucketFollowUps(), bucketScheduled(), DatedRow, dateKey(), dayLoad, daysBetween(), dedupeFollowUps() (+34 more)

### Community 1 - "Application Pages"
Cohesion: 0.08
Nodes (31): App(), Layout(), LiveAssessmentModalProps, Navbar(), PinScreen(), PinScreenProps, getAvailableCapacityForDateRange(), getCapacityMap() (+23 more)

### Community 2 - "UI Components"
Cohesion: 0.08
Nodes (33): DeleteQModalState, LibraryManager(), LockModalState, moduleTypeLabel(), moduleTypePillClass(), ModuleWithCount, QuestionCardProps, CompositeData (+25 more)

### Community 3 - "Application Core"
Cohesion: 0.06
Nodes (31): body-parser, clsx, cors, date-fns, dotenv, express, framer-motion, lucide-react (+23 more)

### Community 4 - "App Layout"
Cohesion: 0.09
Nodes (26): calculateConfidenceMultiplier(), EngineStatus, card, CompositeContribution(), CompositeContributionProps, DOMAIN_LABELS, DomainProfile(), DomainProfileProps (+18 more)

### Community 5 - "Analytics Engine"
Cohesion: 0.14
Nodes (24): allocationSummary, depthFrontier(), feasibility(), FeasibilityInput, FeasibilityResult, gini(), lorenzCurve(), needAlignment() (+16 more)

### Community 6 - "Dev Dependencies"
Cohesion: 0.07
Nodes (27): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies, eslint, @eslint/js (+19 more)

### Community 7 - "App Typescript Config"
Cohesion: 0.08
Nodes (24): DOM, src, src/pages/StudentProfile.backup.tsx, vite/client, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx (+16 more)

### Community 8 - "Node Typescript Config"
Cohesion: 0.10
Nodes (20): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+12 more)

### Community 9 - "Assessment Engine"
Cohesion: 0.14
Nodes (14): AssessmentWizard(), AssessmentWizardProps, AssessmentQuestion, buildAssessmentSummary(), computeModuleScore(), effectiveScore(), fetchAssessmentQuestions(), reverseScore() (+6 more)

### Community 10 - "Package Config"
Cohesion: 0.14
Nodes (13): engines, node, name, private, scripts, build, build:v2, dev (+5 more)

### Community 11 - "Tag Management"
Cohesion: 0.27
Nodes (9): categoryPillClass(), EDIT_EMPTY, EditState, GlobalTagManager(), NEW_EMPTY, NewTagState, TAG_CATEGORIES, SystemTag (+1 more)

### Community 12 - "Student Utils"
Cohesion: 0.43
Nodes (5): AddStudent(), container, toTitleCase(), isValidStudentId(), STUDENT_ID_REGEX

### Community 13 - "Express Webhook"
Cohesion: 0.29
Nodes (6): app, bodyParser, cors, { createClient }, express, supabase

## Knowledge Gaps
- **143 isolated node(s):** `name`, `private`, `version`, `type`, `node` (+138 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `supabase` connect `Application Pages` to `Database Migrations`, `UI Components`, `App Layout`, `Analytics Engine`, `Assessment Engine`, `Tag Management`, `Student Utils`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Application Core` to `Package Config`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Dev Dependencies` to `Package Config`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _143 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Database Migrations` be split into smaller, more focused modules?**
  _Cohesion score 0.06892655367231638 - nodes in this community are weakly interconnected._
- **Should `Application Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.07993197278911565 - nodes in this community are weakly interconnected._
- **Should `UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.08095238095238096 - nodes in this community are weakly interconnected._