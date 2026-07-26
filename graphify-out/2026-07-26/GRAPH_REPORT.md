# Graph Report - PsychE  (2026-07-26)

## Corpus Check
- 54 files · ~53,682 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 440 nodes · 539 edges · 31 communities (25 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ba4b70d7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- GUIDE_developer.md
- index.ts
- dependencies
- devDependencies
- 1. Database Schema — V3.0 (Canonical)
- What You Must Do When Invoked
- 3. Application Source Files (Code Registry)
- compilerOptions
- compilerOptions
- Product Requirements Document (PRD)
- capacity.ts
- 2. Directory Structure & Ownership
- package.json
- assessmentEngine.ts
- agent.md — PsychE Session Entry Point
- graphify reference: extra exports and benchmark
- webhook.js
- graphify reference: query, path, explain
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- React + TypeScript + Vite
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- tsconfig.json
- rules/graphify.md
- extraction-spec.md
- workflows/graphify.md

## God Nodes (most connected - your core abstractions)
1. `supabase` - 20 edges
2. `compilerOptions` - 17 edges
3. `compilerOptions` - 16 edges
4. `What You Must Do When Invoked` - 12 edges
5. `3. Application Source Files (Code Registry)` - 11 edges
6. `/graphify` - 10 edges
7. `1. Database Schema — V3.0 (Canonical)` - 10 edges
8. `getAvailableCapacityForDateRange()` - 9 edges
9. `graphify reference: extra exports and benchmark` - 8 edges
10. `Product Requirements Document (PRD)` - 8 edges

## Surprising Connections (you probably didn't know these)
- `AssessmentWizard()` --calls--> `fetchAssessmentQuestions()`  [EXTRACTED]
  src/components/AssessmentWizard.tsx → src/lib/assessmentEngine.ts
- `EditState` --references--> `TagCategory`  [EXTRACTED]
  src/components/GlobalTagManager.tsx → src/types/index.ts
- `NewTagState` --references--> `TagCategory`  [EXTRACTED]
  src/components/GlobalTagManager.tsx → src/types/index.ts
- `ModuleWithCount` --inherits--> `Module`  [EXTRACTED]
  src/components/LibraryManager.tsx → src/types/index.ts
- `DeleteQModalState` --references--> `Question`  [EXTRACTED]
  src/components/LibraryManager.tsx → src/types/index.ts

## Import Cycles
- None detected.

## Communities (31 total, 6 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.06
Nodes (37): App(), AssessmentWizard(), AssessmentWizardProps, Layout(), LiveAssessmentModalProps, Navbar(), PinScreen(), PinScreenProps (+29 more)

### Community 1 - "GUIDE_developer.md"
Cohesion: 0.07
Nodes (28): 1.1 Core Design Philosophy, 1.2 Layout Paradigms, 1.3 Color Tokens (defined in `src/index.css`), 1.4 Typography, 1.5 Micro-Animations, 1. UI Language & Design System, 2.1 File & Folder Conventions, 2.2 TypeScript Interfaces (+20 more)

### Community 2 - "index.ts"
Cohesion: 0.07
Nodes (38): categoryPillClass(), EDIT_EMPTY, EditState, GlobalTagManager(), NEW_EMPTY, NewTagState, TAG_CATEGORIES, DeleteQModalState (+30 more)

### Community 3 - "dependencies"
Cohesion: 0.07
Nodes (29): body-parser, clsx, cors, date-fns, dotenv, express, framer-motion, lucide-react (+21 more)

### Community 4 - "devDependencies"
Cohesion: 0.07
Nodes (27): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies, eslint, @eslint/js (+19 more)

### Community 5 - "1. Database Schema — V3.0 (Canonical)"
Cohesion: 0.08
Nodes (24): 1. Database Schema — V3.0 (Canonical), 2. Indexes (Query Performance), 3. Row Level Security (RLS), 4. Supabase Client, 5. Application Routing, 6. V2 Scheduling Logic, 7. V3 CMS Schema Constraints, Assessment Cooldown (+16 more)

### Community 6 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 7 - "3. Application Source Files (Code Registry)"
Cohesion: 0.08
Nodes (23): 1. The Living Doc System — Rules Summary, 2. File Registry, 3. Application Source Files (Code Registry), 4. Doc Sweep Protocol, 5. Conflict Resolution, 6. Registry Manifest, `agent.md`, ARCH_documentation-governance.md — The Registry (+15 more)

### Community 8 - "compilerOptions"
Cohesion: 0.09
Nodes (22): DOM, src, vite/client, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib (+14 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (20): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+12 more)

### Community 10 - "Product Requirements Document (PRD)"
Cohesion: 0.11
Nodes (18): 1. Product Overview, 2. Design & UI/UX Language, 3. Core User Journeys, 4.1. Mission Control Dashboard, 4.2. Student Profile View, 4.3. Print & Export Engine, 4. Key Features Breakdown, 5. Technical Requirements & Database Schema Integration (+10 more)

### Community 11 - "capacity.ts"
Cohesion: 0.23
Nodes (13): getAvailableCapacityForDateRange(), getCapacityMap(), getDailyCapacity(), getDateLoad(), getDateStatus(), getSessionCountsForDateRange(), toLocalDateStr(), BulkSchedule() (+5 more)

### Community 12 - "2. Directory Structure & Ownership"
Cohesion: 0.17
Nodes (11): 1. Core Principles, 2. Directory Structure & Ownership, agent.md: The entry point. Contains session-critical rules, tech stack (React, TypeScript, Vite, Supabase), and quick-reference checklists. Short by design., docs/ARCH_documentation-governance.md: The registry. Every doc file is mapped here by what it contains, what it must not contain, and when to load it., docs/ARCH_technical-specs.md: Owns data structures, database schema (PsychE_ tables), and routing logic., docs/GUIDE_developer.md: Owns frontend coding standards, UI language (Bento Grid, minimalist A4 print views, Apple-style Master-Detail UI), and state management rules., One file owns each rule. No duplication. If a rule exists in two places, you have two sources of truth, which means you have none., Query the Graph: Before modifying complex data flows or architecture, always use the /graphify skill to run graphify query or graphify path to trace exactly how files and dependencies connect. Do not blindly search through files. (+3 more)

### Community 13 - "package.json"
Cohesion: 0.17
Nodes (11): engines, node, name, private, scripts, build, dev, lint (+3 more)

### Community 14 - "assessmentEngine.ts"
Cohesion: 0.36
Nodes (6): AssessmentQuestion, buildAssessmentSummary(), computeModuleScore(), effectiveScore(), reverseScore(), AssessmentSummary

### Community 16 - "agent.md — PsychE Session Entry Point"
Cohesion: 0.22
Nodes (8): 1. Project Identity, 2. Tech Stack (Canonical — do not deviate), 3. Database (Supabase — Tables prefixed `PsychE_`), 4. Security, 5. Key Routes (from `src/App.tsx`), 6. Pre-Task Checklist, 7. Living Docs Registry (quick-load), agent.md — PsychE Session Entry Point

### Community 17 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 18 - "webhook.js"
Cohesion: 0.29
Nodes (6): app, bodyParser, cors, { createClient }, express, supabase

### Community 19 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 20 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 21 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 22 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 23 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + TypeScript + Vite

## Knowledge Gaps
- **245 isolated node(s):** `name`, `private`, `version`, `type`, `node` (+240 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `supabase` connect `App.tsx` to `index.ts`, `capacity.ts`, `assessmentEngine.ts`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _245 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.062146892655367235 - nodes in this community are weakly interconnected._
- **Should `GUIDE_developer.md` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0708245243128964 - nodes in this community are weakly interconnected._