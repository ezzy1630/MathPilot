# MathPilot Gap Audit

## Current Source Of Truth

**Updated:** 2026-06-01  
**Use this section first.** Older unchecked items in this file are retained as historical audit notes and can be stale. Before repeating a gap, verify the current code paths and this section.

### 2026-06-01 spec completion pass (branch `feat/spec-completion-2026`)

- [x] Full spec §6.3 prerequisite/C2 skill nodes in `skills_extension.json` (~82 graph skills)
- [x] `skillProblemCatalogExtension.ts` — catalog coverage for all extension skills
- [x] `formulaRecallCatalog` expanded to 40+ prompts
- [x] FSRS-inspired adaptive `reviewScheduler` (stability index, retention-aware intervals)
- [x] Continuing diagnostics API + triggers; minimal diagnostic feedback
- [x] Session pace affects difficulty/review/video via `dailySessionEngine`
- [x] Codex task-specific sessions, prompt hashing, ChatGPT/Gemini packet labels, test Codex button
- [x] Maintenance: skill audit, consistency fixes, auto-trigger after 3 sessions, migration v8 `maintenance_runs`
- [x] Homework: multi-problem parse, worked-example save, step feedback; lost-flow branches; syllabus mapping UI
- [x] UX: Today collapse, confidence setting, graph presets, GeoGebra/Wolfram links, expanded ProgressReport
- [x] `codeSelfImprovement` approval workflow (§19 scaffold); SymPy derivative/integral verify in `math_check.py`
- [x] CI: `feat/**` branches + macOS desktop build job
- [x] 91 unit tests passing; lint + build green

### 2026-06-01 high-ROI follow-up (`feat/high-roi-followup`)

- [x] Production problem bank: catalog 3× variants per skill + `config/problem_bank/*.json` + `problemBankLoader.ts` (150+ problems Calc 1)
- [x] True FSRS via `ts-fsrs` in `packages/learning-engine/src/fsrsSchedule.ts`, wired in `reviewScheduler`
- [x] Codex code apply + rollback Tauri commands (`apply_code_patches`, `rollback_code_patches`) + Developer UI
- [x] Batch verify problem bank (Developer → promotes SymPy-verified items)
- [x] Rust migration test (v8 + `maintenance_runs`)
- [x] Storybook: `ProgressReport.stories.tsx`; expanded graph presets (Taylor, slope fields)

### Still not at literal 100% spec (honest)

- [ ] Production-scale problem bank at thousands of hand-curated items (current: catalog expansion + 15 curated JSON items)
- [ ] Full package extraction from `apps/desktop/src/domain` (FSRS module extracted; engines still in desktop)
- [ ] Automated Codex-generated bank ingest pipeline
- [x] CI runs `cargo test --lib` for Tauri migration tests
- [~] Accessibility: skip link, `aria-current` on nav, map wheel labels (full audit still open)
- [ ] HealthKit / Bevel integrations (optional in spec)
- [ ] Full built-in graphing suite (Taylor overlays, slope fields, etc.)
- [ ] Accessibility audit + broad visual regression harness
- [ ] Rust/Tauri integration tests in CI

### 2026-05-31 implementation pass

- [x] Fixed active diagnostic navigation stacking. `AppShell` now renders `ActivityView` only for the Activity workspace, with a regression test in `apps/desktop/e2e/acceptance.spec.ts`.
- [x] Made diagnostic leave/resume behavior explicit: leaving Activity during an active diagnostic asks to pause, and the sidebar keeps a visible Diagnostic resume entry.
- [x] Replaced the icon-only rail with a labeled native sidebar pattern.
- [x] Removed the decorative body grid texture and the dark cockpit readiness panel from Today.
- [x] Shifted the default visual direction to a restrained macOS productivity surface with a lighter neutral palette and redesigned dark tokens still available through theme settings.
- [x] Reduced uppercase eyebrow use in the primary shell, activity, settings, map, and command palette styles.
- [x] Removed side-stripe feedback/toast treatment in favor of full-border semantic panels.
- [x] Redesigned Activity around the problem, answer input, check action, and an inspector-style contextual side panel.
- [x] Expanded MathLive helpers for calculus, trig, Greek, roots/fractions, limits, sums, piecewise, and vectors.
- [x] Added a raw LaTeX input toggle for expression answers.
- [x] Replaced the confidence slider with labeled confidence chips.
- [x] Added structured learning feedback panels for why, try next, similar example, and repair, while keeping diagnostic feedback minimal.
- [x] Improved the command palette with icons, command groups, recents, and a visible homework action.
- [x] Strengthened Knowledge Map presentation with a more prominent wheel container, weak-skill side cards, hover emphasis, and clearer legend language.
- [x] Added structured changelog entries in `CHANGELOG.md`.
- [x] Added desktop vendor chunking in `apps/desktop/vite.config.ts`; main app chunk is smaller, with MathLive still the largest vendor chunk.

### Still open after this pass

- [ ] Full content scale: much larger Calc 1/Calc 2 problem bank, diagnostic variety at production volume, and generated-problem verification/deprecate workflow.
- [ ] True package boundaries: move domain implementations from `apps/desktop/src/domain` into real `packages/*` modules with standalone tests.
- [ ] Full normalized SQLite coverage for all spec tables and Tauri/Rust integration tests.
- [ ] Visual regression coverage beyond current Storybook/E2E: Today, Activity, Map, Settings, feedback, empty states.
- [ ] Desktop CI build verification and deeper lazy-loading for the large MathLive vendor chunk.
- [ ] Developer-control workflows for self-modifying app code, prompt/response viewer privacy controls, rollback UI, and task-specific Codex sessions.

**Date:** 2026-05-29 (full re-audit)  
**Spec:** `MathPilot_spec.md` (repo root)  
**Repo state:** pnpm monorepo — primary app at `apps/desktop/` (Tauri 2 + React 19 + Vite 8 + Tailwind 4); six `packages/*` re-export barrels; Python scripts for SymPy/OCR  
**Verdict:** Strong beta approaching spec-complete — core learning loop, normalized schema v7, Storybook harness, resource catalog, and expanded diagnostic mix are in place. Remaining gaps: content volume, full package extraction, accessibility audit.

---

## Executive summary

| Area | Spec alignment | Notes |
|------|----------------|-------|
| Core UX shell (Today, activity, map, settings) | ~88% | Progress report, study plan, orbit map nodes |
| Data model / SQLite | ~92% | v7 skills/resources/resource_events; FTS + events synced |
| Memory / skills / maintenance | ~52% | Profile/preferences memory sync |
| **UI / UX quality & visual polish** | ~85% | Storybook for MasteryBadge, SignChart |
| Resources & video | ~82% | Trusted-source filter; orphan ID catalog merge |
| Learning engine (mastery, review, diagnostic, repair) | ~88% | 16 diagnostic mix items across 12 skills |
| Homework / photo | ~78% | Step feedback persisted + UI |
| AI / Codex | ~72% | Full state_updates schema |
| Polish / native / acceptance criteria | ~78% | 6 E2E tests (2 acceptance paths); package imports wired |

**Tests:** 62+ unit tests — all passing after verification.  
**E2E:** 6 Playwright tests — onboarding + acceptance path.  
**Lint:** `pnpm lint` passes.  
**Build:** `pnpm build` succeeds.  
**Storybook:** `pnpm --filter @mathpilot/desktop storybook` (MasteryBadge, SignChart).  
**Tauri commands:** 16; SQLite **migration v7** (`skills`, `skill_edges`, `resources`, `resource_events`).

---

## Progress since prior audit (2026-05-29 morning)

These items were listed as missing in the earlier audit but are **now implemented** (at least partially):

- [x] `packages/ui`, `learning-engine`, `math-engine`, `ai-adapter`, `content-engine`, `data` — exist as re-export barrels (desktop does not import them yet)
- [x] Monolithic `App.tsx` split → `AppShell`, `useMathPilotApp`, `AppViews`, `components/`, `ui/`
- [x] Tauri commands expanded from 7 → **12** (`check_math_symbolic`, OCR, `write_backup`, `list_backups`, `restore_backup`)
- [x] SQLite migration **v3** (`mistake_patterns`, `resource_effectiveness` tables — schema only, not wired in `relational.rs`)
- [x] **`invokeCodexCli` wired** from `requestHelp` (non-developer) and homework analysis
- [x] **`db_sync_attempt` wired** via `syncAttemptRecord` on submit
- [x] **Memory files loaded** via `ensureMemoryLoaded` / Tauri `read_memory_files`
- [x] **Real test-out quiz** — `testOutEngine` (6 generated questions, ~67% pass threshold)
- [x] **Diagnostic templates** for 7 key skills (`diagnosticTemplates.ts`); fallback text prompts for uncovered skills (not `"ready"`)
- [x] **Python SymPy** (`scripts/math_check.py`) + **OCR** (`scripts/ocr_homework.py`)
- [x] **`config/app_settings.json` loaded** at boot (`loadAppSettings`)
- [x] **`advancedMode` UI** — weak skills + review lists on Today
- [x] **Design system** — `styles/tokens.css`, `ui/` (Button, Card, Modal, Toast, MasteryBadge), Tailwind 4
- [x] **App icons** in `tauri.conf.json`; window title **MathPilot**
- [x] **WhyPanel** — dedicated “Why this step?” modal (separate from map)
- [x] **Knowledge map wheel** + collapsible list view + area readiness chips
- [x] **Toasts** — “Skill updated”, “Initial knowledge map created”, etc.
- [x] **Desmos embed** in activity sidebar (expression from problem)
- [x] **VideoEmbed** in activity when session phase is `resource_watch`
- [x] **HomeworkResultCard** on Today after analysis
- [x] **Command palette** with fuzzy search input
- [x] **macOS menu bar** (MathPilot, Edit, View, Session, Window)
- [x] **3-step onboarding** (welcome → focus → diagnostic)
- [x] **Symbol toolbar** uses MathLive `executeCommand` when available
- [x] **Codex paste-back** in Settings + `applyCodexResponse`
- [x] **Backup list/restore** in Developer view
- [x] **`Decayed` mastery state** assigned via `applyDecayIfStale` on hydrate
- [x] **`skills_extension.json`** — ~25 additional skills merged into graph
- [x] **`feedbackByMode`**, **`narrativeCopy`**, **`studyPlanEngine`**, **`SessionChrome`**
- [x] **Formula recall panel** (minimal — 3 prompts)
- [x] **Worked example read-only** phases in quick repair
- [x] **Lint green** (was failing)

---

## UI / UX quality audit (spec author intent)

> **Target experience:** Polished native macOS app; one obvious Continue action; ALEKS-inspired map; fluid unified learning workspace; contextual help (not chatbot-first); strict but motivating; no childish gamification.

**Current reality:** Visibly improved from the prior scaffold — tokens, wheel map, toasts, session chrome, embedded video/Desmos — but still reads as a **capable beta**, not a finished Apple-quality calculus product. Today remains multi-panel; activity help quality depends on Codex availability; many flows lack designed teaching moments.

### UX philosophy gaps

- [x] **Single obvious action on open** — Continue hero dominates Today; secondary items collapsed under “More for today”
- [ ] **Compelling “what to do next” copy** — `narrativeCopy` + Codex hints; not consistently spec-quality
- [x] **Fluid navigation** — Resources off rail (⌘K); session button when active; Map secondary
- [x] **Session frame** — SessionChrome timeline, phase dots, mode-specific labels
- [x] **Resources tab prominence** — removed from main rail; ⌘K + activity sidebar
- [x] **Onboarding step 3 missing** — `confirm_diagnostic` step before `beginDiagnostic()`
- [x] **Navigation away during diagnostic** — `navigate()` confirm when leaving mid-diagnostic

### Visual design & aesthetic polish gaps

- [x] **True native macOS feel** — `initNativeChrome()` Sidebar effect + vibrancy CSS + traffic-light titlebar inset
- [x] **Window vibrancy / traffic-light spacing** — `--mp-traffic-light-inset`, platform-macos classes
- [x] **Responsive resize** — rail → horizontal top bar at ≤900px
- [x] **Animation on mastery change** — `mp-mastery-pulse` + weak wheel node pulse
- [x] **Weak-spot sort on map entry** — wheel areas sorted by readiness ascending
- [x] **Skill file writes** — `skillFileSync.ts` appends mastery notes to memory
- [x] **Mistake pattern detail** — `MistakePatternsPanel` in advanced Today view
- [x] **Resource effectiveness charts** — `ResourceEffectivenessPanel` ranked list
- [x] **Session model phases** — normal plan includes mixed_review → resource_watch → guided → independent → mixed; planner respects phase
- [x] **Interleaving policy** — independent_practice uses `pickInterleavedProblem`
- [x] **Preferences UI** — tone, gamification, theme, notifications, active video
- [x] **Graceful SymPy missing UI** — `PythonStatusBanner` when checker unavailable
- [x] **Prerequisite / skill modals** — use `Modal` with Escape + focus trap
- [ ] **No Storybook / visual regression** harness
- [x] **Dark mode** — `preferences.theme` + `.theme-dark` / `.theme-light` tokens in Settings
- [x] **Motion & transitions** — `--mp-transition` token; `prefers-reduced-motion` respected in tokens.css
- [ ] **Typography still loud** — reduced from 44px legacy; hero ~26px, page titles ~22px
- [ ] **Brand identity** — clean Apple-blue palette; no custom wordmark yet
- [x] **Problem prompt card** — light elevated card with accent bar (no inverted dark block)
- [x] **Confidence slider** — styled range input in activity flow
- [ ] **Illustration / empty-state art** — text-only empty states
- [x] **MathLive theme** — CSS variables aligned to design tokens
- [x] **Developer UI tone bleed** — `.developer-page` + `.developer-shell` visual separation
- [x] **Settings layout** — macOS-style grouped list rows (`settings-group`)
- [x] **Preferences incomplete in Settings** — tone, active video mode, theme selectors wired
- [x] **Reset destructive action** — typed `RESET` confirmation required
- [ ] **Accessibility audit** — focus order, ARIA, contrast not validated
- [ ] **No Storybook / visual regression** harness

### Knowledge map UX gaps (ALEKS-inspired)

- [x] Wheel view + list toggle (partial)
- [x] Area readiness % on Today chips and map headers (partial)
- [x] Collapsible area sections in list view (partial)
- [x] MasteryBadge color language (partial)
- [ ] **True ALEKS wheel/orbit metaphor** — `KnowledgeMapWheel` is a start, not full spatial topic map
- [x] **Graph/tree alternate view** — wheel · list · prerequisite tree cycle
- [x] **Map highlights tied to recommendation** — Why panel “View on map” + highlightSkillIds
- [ ] **Animation on mastery change** — static updates
- [x] **Search/filter skills** on map — filter input on Knowledge map
- [x] **Legend** for mastery states — legend chips on map
- [ ] **Weak-spot sort on map entry** — partial highlighting only

### Learning workspace UX gaps

- [x] Unified activity with video embed, Desmos, resources sidebar (partial)
- [x] Contextual help collapsed under “More help” (partial)
- [x] Read-only worked examples in quick repair (partial)
- [ ] **Minimal contextual controls** — still many buttons when expanded
- [x] **“Similar example” interactive** — SimilarExamplePanel + “Try one like this”
- [x] **Quick repair explain phase** — numbered repair steps panel
- [x] **Session progress timeline** — progress bar + phase dots
- [x] **Problem transition animation** — problem-enter keyframe
- [x] **Enter to submit** — ActivityView Enter key submits answer
- [x] **Plain text input for conceptual answers** — text input when `answerType === 'text'`
- [x] **Multiple choice UI** — choice buttons in ActivityView + diagnostic/review pool
- [x] **Wrong-answer escalation** — 3-level chain in `feedbackByMode` (`escalationLevel`, `nextEscalation`)
- [x] **Active video mode settings** — Never / Sometimes / Active in Settings preferences

### Motivation, strictness, and tone

- [x] Toasts for progress (“Skill updated”, “Initial knowledge map created”) (partial)
- [x] Generally direct copy (partial)
- [ ] **Warm strict mastery messaging** — prereq modal functional but dry vs spec examples
- [x] **Structured “what to try next”** on wrong answers — feedbackNextSteps list
- [x] **Resource helpfulness prompt** — “Helpful?” Yes/No on Resources updates `effectivenessScore`
- [ ] **Tasteful motivation micro-copy** — limited beyond toasts

### Interaction & macOS-native feel

- [x] Cmd+K command palette with search (partial)
- [x] macOS application menu + shortcuts Cmd+1/2/3, Cmd+Return, Cmd+U (partial)
- [x] **Global drag-drop into window** — window-level drop handler in `AppShell` triggers analyze (discard image)
- [x] **Clipboard paste homework globally** — window paste handler for images and long text
- [x] **Notification/reminder system** — gentle review nudge on Today when reminders enabled (in-app)
- [ ] **Window vibrancy / traffic-light spacing** — default chrome
- [ ] **Command palette Escape** — relies on Modal; verify focus trap polish
- [ ] **Responsive resize** — rail → top bar breakpoint; not deeply designed

### UI / UX acceptance bar

| Criterion | Met? |
|-----------|------|
| Polished native macOS app | **Partial / no** |
| Clear, directed, manageable | **Partial** |
| One obvious next action on open | **Partial** |
| Clean Continue + reason + adjust + map | **Partial** |
| Apple-like modern visual style | **Partial** |
| ALEKS-inspired mastery map | **Partial** |
| No childish gamification | **Yes** |
| Fluid combined learning workspace | **Partial** |
| Contextual help (not chatbot-first) | **Partial** — Codex when available; lost branches manual |
| Strict but smooth and motivating | **Partial** |

**Estimated UI/UX completion vs spec author intent: ~62%.**

**Honest overall spec completion: ~90%** — native chrome (vibrancy CSS + Sidebar effect), session phase pipeline, insight panels, skill mastery logs, responsive shell; remaining: Storybook, full content catalog scale, complete schema normalization.

---

## Phase F / G (2026-05-29)

- [x] Git repository initialized at repo root with `.gitignore`
- [x] Playwright E2E smoke tests (`apps/desktop/e2e/smoke.spec.ts`)
- [x] CI `e2e` job (build + preview + Playwright on Ubuntu)
- [x] `@mathpilot/learning-engine` package test + vitest config
- [x] **Packages consumed by desktop** — `@mathpilot/learning-engine`, `@mathpilot/math-engine`, `@mathpilot/ai-adapter` wired via tsconfig + vite aliases
- [x] **Diagnostic MC / graph / error-ID mix** — `diagnosticQuestionMix.ts` seeded into problem bank
- [x] **`diagnostic_items` normalized table** — v6 migration + sync on save
- [x] **Progress analytics charts** — `ProgressReport.tsx` with recharts (mastery trend, weak skills)
- [x] **Study plan on Today** — visible + link to progress report
- [x] **Step grading depth** — intermediate step expectations + `gradeStepsAsync` with SymPy
- [x] **Confidence routing to mastery** — overconfident misses amplify negative delta

**Next phase:** Native vibrancy/titlebar, prerequisite tree map, FTS search UI, deeper FSRS, remaining ~350 gap items

---

## What exists (partial implementations)

Use as “demo-ready,” not “spec-complete.”

### Architecture & tooling

- [x] pnpm workspace: `apps/desktop` + six `packages/*` (re-export only; desktop imports domain directly)
- [x] Tauri 2 shell (1240×820, min 920×680), bundle icons, dmg/app targets
- [x] Vite web dev + `relationalStore.ts` localStorage fallback
- [x] Vitest: 34 tests / 18 files
- [x] Tailwind 4 + design tokens + `ui/` component primitives
- [x] Config: `config/course_graphs/` (calc1, calc2, extension), `app_settings.json`, `sources.json`
- [x] Memory: four markdown files under `memory/`
- [x] Skills: five markdown files (`teaching/`, `grading/`, `planning/`, `resources/`, `maintenance/`)
- [x] Python: `scripts/math_check.py`, `scripts/ocr_homework.py`

### UI / navigation

- [x] Views: Today, Activity, Knowledge Map (wheel + list), Resources, Settings, Developer, Onboarding (3 steps)
- [x] Left icon rail; command palette (Cmd+K) with search
- [x] Today: Continue hero, Start, Why panel, Open map, readiness ring, area chips, adjust pace (collapsible), homework upload, result card, formula recall, advanced panel
- [x] Activity: MathLive, hints, steps, confidence, I’m lost, check setup, explain why, Get help (Codex), Desmos, resources links, video embed, session chrome
- [x] Prerequisite modal: repair / test-out / override
- [x] Quick repair phases with read-only worked examples
- [x] Test-out session UI (6 questions)
- [x] Settings: profile name, course focus, advanced toggle, developer enable, Codex paste-back, export, reset
- [x] Developer: packets, changelog, AI log, maintenance, generate problem, backup restore
- [x] Toasts; macOS menu integration

### Domain engines (37 implementation files)

- [x] `courseGraph.ts` — merged graph (~45+ unique skills per focus with extension)
- [x] `learningEngine.ts` — mastery, decay, delayed mixed for Mastered, prereq weighting, next action, study plan attach
- [x] `diagnosticEngine.ts` — 25-question queue (fixed at start), summary, mastery signals
- [x] `diagnosticTemplates.ts` — real math for 7 skills
- [x] `testOutEngine.ts` — 6-question adaptive pass/fail
- [x] `dailySessionEngine.ts` + `sessionEngine.ts` — pace, prereq gate, test-out/override
- [x] `quickRepairEngine.ts` — explain → examples → practice → mixed_check
- [x] `sessionPlanner.ts` + `interleavingEngine.ts` — problem resolution, light interleaving
- [x] `reviewScheduler.ts` — intervals `[1,3,7,14,30,60]`, FSRS-inspired heuristic (not full FSRS)
- [x] `mathEngine.ts` + `symbolicCheck.ts` — normalize, numeric, SymPy via Tauri
- [x] `problemGenerator.ts` — templates for chain_rule, derivative_rules, limits, integration_by_parts, related_rates
- [x] `problemBank.ts` — diagnostic pool, deprecate helper
- [x] `homeworkAnalysis.ts` — OCR + Codex + keyword fallback
- [x] `aiAdapter.ts` — packets, memory, Codex invoke, logging
- [x] `codexParser.ts` — JSON parse + partial state apply
- [x] `maintenance.ts` — stub jobs + Tauri backup file write
- [x] `resourceLearning.ts` — effectiveness score updates (in-memory)
- [x] `activeVideoMode.ts` — session + post-check hook
- [x] `formulaRecall.ts` — 3 static prompts
- [x] `studyPlanEngine.ts` — lightweight plan object
- [x] `narrativeCopy.ts` — richer next-action reasons
- [x] `feedbackByMode.ts` — mode-styled feedback strings
- [x] `stepGrading.ts` — heuristic step comments (not symbolic per-step)
- [x] `syllabus.ts` — default week alignment + upload parser (`syllabusUpload.ts`)
- [x] `persistence.ts` + Tauri `relational.rs` — split save/load + JSON blob backup

### Tauri commands (12)

- [x] `db_load_state`, `db_save_state`, `db_sync_attempt`
- [x] `save_homework_image`, `read_memory_files`, `invoke_codex`
- [x] `check_math_symbolic`, `ocr_homework_base64`, `ocr_homework_image`
- [x] `write_backup`, `list_backups`, `restore_backup`

### SQLite schema (migrations v1–v3)

- [x] v1: `schema_migrations`, `app_state`, `changelog`, `attempts`
- [x] v2: `settings`, `skill_mastery`, `review_items`, `diagnostics`, `problems`, `homework_analyses`
- [x] v3: `mistake_patterns`, `resource_effectiveness` (**created, not read/written by `relational.rs`**)

---

## Missing, shallow, or incorrect — full inventory

Every item below is still absent, stubbed, or materially below spec. Small UI gaps included intentionally.

---

### §0 Product summary & §27 Acceptance criteria

- [ ] End-to-end acceptance path at **quality bar** — open → diagnose → clear next step → solve with excellent input → **useful adaptive feedback** → map updates → spaced review → **homework step feedback** → Codex without API keys → persist — **partially achievable, not at spec quality**
- [ ] System does not yet “become better at teaching this user over time” — no durable skill file updates, memory compression writes, or resource learning in DB
- [ ] Passive video overconsumption not fully prevented — embed exists; no timed interrupts, predictions, or enforced checks beyond self-report
- [ ] User still effectively chooses topics via map click (no repair/review/learn choice)
- [ ] Delayed/mixed mastery proof at scale — engine rules exist; **content volume too thin**
- [ ] Homework step-level feedback — analysis summary only; no step-by-step wrong-move identification in UI

---

### §1 Product philosophy

- [x] **Syllabus upload** — Settings textarea + `syllabusUpload.ts` parser; `syllabusSkillBoost` wired in `chooseNextAction` + `studyPlanEngine`
- [x] **Show-work policy** — `showWorkPolicy.ts`; auto-opens steps in activity when policy triggers
- [x] **Explain-in-words review type** — `reviewItemEngine` `explain_in_words` + graph interpretation prompts
- [x] **Sign charts** — `SignChart.tsx` for extrema/concavity/related rates in activity sidebar
- [x] **SQLite FTS** — `save_search_index` on save; `search_index_query` Tauri command; CommandPalette merges FTS + in-memory
- [x] **Homework step feedback persistence** — v5 migration columns `step_feedback_json`, `repair_recommendation_json`
- [x] **Session/review event persistence** — `save_review_events`, `save_session_events` in `relational.rs`
- [x] **Active video interrupts** — `VideoEmbed` timed check-in; `startActiveVideo` on resource_watch phase
- [x] **OS notifications** — Web Notification API + macOS `osascript` via `show_local_notification`
- [x] **Memory profile sync** — `memorySync.ts` writes `profile.md` / `preferences.md`
- [x] **Codex state_updates lists** — `skills_to_increase/decrease/review/boost` in `codexParser.ts`
- [ ] Metacognitive calibration — confidence collected and used for mastery delta + review boost; routing partial
- [ ] Visual regression / Storybook harness
- [ ] Session model (warmup → concept → guided → independent → mixed) — phase labels exist; **does not consistently drive content selection**
- [ ] Interleaving similar-looking types — `interleavingEngine` light; not policy-rich

---

### §2 Non-negotiable requirements

| # | Requirement | Status | Gap |
|---|-------------|--------|-----|
| 1 | Local-first macOS desktop | Partial | Tauri + local SQLite; **not** deeply native (vibrancy, notifications, appearance) |
| 2 | Polished native-feeling UI | Partial | Improved scaffold; **~28%** vs spec polish bar |
| 3 | Codex CLI primary AI | Partial | Wired for help + homework; **fails gracefully to manual**; web dev mode unavailable |
| 3b | Manual ChatGPT/Gemini packet | Partial | Paste-back + parser; **no ChatGPT/Gemini-specific packet UX** |
| 4 | MathPilot owns learning state | Partial | Core in SQLite + blob; v3 tables, many spec entities JSON-only |
| 5 | No whiteboard-first | OK | Typed input + photo upload on Today; **no photo from activity** |
| 6 | Non-exact-match checking | Partial | SymPy when Python available; numeric fallback; **no Codex disambiguation on disagreement** |
| 7 | Homework image retention | Partial | Flag + save path; OCR often empty without PyObjC/Vision |
| 8 | Self-improvement with backups | Partial | Maintenance writes backup JSON; **no skill/memory/code rollback, no approval gates** |
| 9 | No forced weekly report | OK | On-demand report overlay minimal |
| 10 | No panic mode | OK | Not built (correct) |

---

### §3 Technology direction

#### §3.1 Monorepo layout

- [x] `packages/ui`, `learning-engine`, `math-engine`, `ai-adapter`, `content-engine`, `data` — **stub re-exports**
- [x] Packages **consumed** by desktop app for core engine, math, and AI adapter
- [ ] `packages/*` have **no standalone implementations or tests**
- [x] `skills/resources/`, `skills/maintenance/` folders exist (1 file each)
- [ ] `docs/spec.md` — pointer only; canonical spec at repo root

#### §3.2 Python / SymPy sidecar

- [x] `scripts/math_check.py` — simplify + numeric probe (partial)
- [x] `scripts/ocr_homework.py` — macOS Vision when PyObjC available (partial)
- [ ] Persistent Python sidecar process — uses per-call subprocess
- [ ] SymPy: differentiate/integrate verification for generated problems — **not in pipeline**
- [ ] Graph data generation from Python — missing
- [ ] Graceful UI when Python/SymPy missing — falls back silently to numeric/string

#### §3.3 Offline behavior

- [x] Progress persists offline (partial)
- [ ] Codex/homework AI offline — manual packet only; **no structured offline teaching fallback**

#### §3.4 Data storage split

- [x] Memory markdown loaded at runtime (partial)
- [x] `app_settings.json` loaded (partial)
- [ ] `sources.json` — **`loadSourcesConfig()` unused** in Resources view (static seed resources)
- [ ] Skill graph `resources` string IDs — **not joined** to `ResourceRecord` objects in many cases (orphan refs like `ka-algebra`)
- [x] Local skills — **full bodies loaded** via `skillLoader.ts` + Tauri `read_skill_files` (was index paths only)

---

### §4 Core user experience

#### §4.1 First-time setup

- [x] Welcome + focus + diagnostic intent copy (partial)
- [x] 3-step onboarding UI (partial)
- [ ] Step 3 “Start adaptive diagnostic” as **explicit confirmation** before activity
- [ ] Brief standalone explanation screen between focus and diagnostic start

#### §4.2 Home / Today screen

- [x] Continue framing, next step, Start, adjust, map, why (partial)
- [x] Separate “Why this step?” and “Open knowledge map” (partial)
- [ ] **Settings shortcut on Today** — rail only
- [ ] Spec-minimal default — **still multi-panel** (homework, recent signal, formula recall, area chips)
- [ ] Example-quality narrative copy — inconsistent

#### §4.3 Complexity toggle

- [x] `advancedMode` shows weak skills + review (partial)
- [x] Missing advanced panels: **progress analytics charts** (ProgressReport); study plan on Today
- [ ] `studyPlan` object exists but **not shown on Today** (only in Why panel)

#### §4.4 Navigation structure

- [ ] Spec fluid flow — **fixed left rail** with Map/Resources always visible
- [x] Current Activity unifies learn/solve/review/video (partial)
- [ ] Homework from activity / global drag-drop — **Today only**
- [ ] Command palette “upload homework” — navigates to Today, not inline upload
- [x] Developer hidden under Settings (partial)

#### §4.5 Command palette

- [x] Cmd+K with search (partial)
- [x] Weak skills, resources, diagnostic, maintenance, report commands (partial — verify all wired in AppShell)
- [ ] **Dynamic resource search** — list navigation only
- [ ] Icons per command — text list only

#### §4.6 Local reminders

- [x] OS notification integration — Web Notification + macOS osascript
- [x] Opt-in review reminders — `maybeNotifyReviewDue` when enabled
- [x] `notificationsEnabled` in Settings — toggle + scheduler on state load

#### §4.7 Local profile

- [x] Profile name editable in Settings (partial)
- [ ] Preferences UI: tone, gamification level, reports mode — **state only, no Settings controls**
- [ ] `memory/profile.md` not **bi-directionally synced** with runtime profile edits

---

### §5 Visual design requirements

#### §5.1 Visual identity

- [x] Serious tone; no childish gamification (partial)
- [ ] Apple-style productivity feel — **beta web-in-window**
- [ ] ALEKS-like map — **wheel started, not full metaphor**
- [ ] Light gamification — toasts only; no “Review ready” / “Skill strengthened” dedicated affordances beyond text

#### §5.2 Knowledge map

- [x] Area grouping, mastery labels, wheel + list, collapsible areas (partial)
- [ ] Topic wheel/cards at spec fidelity
- [ ] Top-level readiness layout exactly like spec example — **chips exist, not primary map entry layout**
- [ ] Optional graph/tree prerequisite view
- [x] `Decayed` state — assigned on stale hydrate (partial)
- [ ] Visual differentiation beyond MasteryBadge — no icons, weak-spot pulse, etc.

#### §5.3 Current activity UI

- [x] Problem, math input, hints, feedback, I’m lost, check setup, explain why, get help, Desmos, video, resources (partial)
- [ ] Optional step input **graded symbolically** — heuristic only
- [ ] “Show graph/visual” as explicit action — Desmos always in sidebar, not contextual
- [ ] “Upload work photo” from activity
- [ ] Context-minimal controls when collapsed — still dense when expanded
- [ ] Wrong-answer behavior differs materially by mode — **copy only**, not flow escalation

#### §5.4 Math input

- [x] MathLive field + symbol toolbar via executeCommand (partial)
- [ ] Keyboard shortcuts / LaTeX raw mode toggle — not exposed
- [ ] Verified support docs for: piecewise, vectors/parametric, summation, nth roots, absolute value — **untested**
- [ ] Plain text mode for conceptual explanations in same flow
- [ ] Internal parseable representation beyond LaTeX string
- [ ] Multiple choice input UI

---

### §6 Learning engine

#### §6.1 Unified course focus

- [x] Calc 1 / Calc 2 switch (partial)
- [x] Internal modules: **formula recall**, **syllabus upload**, **show-work policy**, **maintenance** (partial), **test-out** (partial)

#### §6.2 Skill graph

- [x] JSON skills with metadata (partial)
- [ ] Live mastery fields on graph export nodes — separate mastery table only
- [ ] Per-skill resource links surfaced in activity — partial sidebar join

#### §6.3 Initial skill graph scope — remaining gaps vs spec

**Prerequisite readiness still missing or thin:**

- [ ] Exponents and radicals (explicit skill)
- [ ] Logarithms (explicit skill)
- [ ] Exponential functions (explicit skill)
- [ ] Inverse functions
- [ ] Graph interpretation
- [ ] Transformations
- [ ] Trig identities needed for calculus (beyond `trig_values`)
- [ ] Rates and units
- [ ] Word-problem translation

**Calculus 1 gaps:**

- [ ] Inverse trig derivatives (explicit skill)
- [ ] First derivative test (separate from `extrema`)
- [ ] Second derivative test (separate from `concavity`)
- [ ] Area / net change / average value (explicit application skill)
- [ ] Logarithmic differentiation (partially covered by `implicit_log_diff` extension merge)

**Calculus 2 gaps:**

- [ ] Numerical integration
- [ ] Work applications
- [ ] Exponential / logistic growth
- [ ] Telescoping series
- [ ] Root test (explicit — `ratio_test` exists)
- [ ] Absolute vs conditional convergence (explicit skill)
- [ ] Surface area
- [ ] Polar arc length separate from `polar_area` combined skill

**Content depth note:** ~71 skill nodes in JSON files (with dedup merge); spec lists more granular micro-skills than currently modeled.

#### §6.4 Mastery model

- [x] Numeric score + labels; sub-scores on record (partial)
- [ ] Mastery incorporates difficulty, problem type, conceptual explanation quality, transfer performance, confidence mismatch — **mostly unused**
- [x] `Decayed` via time-based decay (partial)
- [ ] `Needs Review` — due date heuristic, not full retention model

#### §6.5 Mastery update rules

- [x] Hint penalty, delayed mixed boost, prereq mistake routing (partial)
- [ ] Correct but slow — fluency tracked, **not surfaced** to user/planner
- [ ] Wrong on delayed mixed → **bigger drop** — same magnitude as same-day in code
- [ ] `partial_credit` on attempts — not tracked

#### §6.6 Strict mode and override

- [x] Prerequisite modal + real test-out + override log (partial)
- [ ] Override **warning copy** minimal; no later struggle adaptation
- [ ] Spaced review explicitly scheduled on test-out pass — implicit only
- [ ] Test-out **5–8 questions** — fixed at 6 (acceptable but not configurable)

#### §6.7 Dynamic study plan

- [x] `studyPlan` object built on attempts (partial)
- [ ] “Living route” UI on Today/advanced view — **Why panel only**
- [x] Plan inputs: syllabus upload + `syllabusSkillBoost` in study plan and chooseNextAction

---

### §7 Diagnostic system

#### §7.1 First diagnostic

- [x] ~25 questions, queue, progress, summary (partial)
- [x] **Mid-session adaptive reprioritization** — queue rebuilt every 3 answers via `reprioritizeDiagnosticQueue`
- [ ] Prerequisite checks **conditionally inserted** when weak — ordering by low mastery only
- [ ] Silent **measured** time tracking — hardcoded ~90–95s in attempts
- [ ] Dedicated post-diagnostic **summary screen** — inline on Today + toast

#### §7.2 Diagnostic question types — gaps

- [x] Final answer calculation for templated skills (partial)
- [ ] Conceptual multiple choice
- [ ] Graph interpretation
- [ ] Method selection
- [x] Short explanation / explain-in-words — review type in `reviewItemEngine`
- [ ] Prerequisite check (distinct type)
- [ ] Error identification
- [ ] Simple application problems at scale
- [x] Optional show-work when setup matters — `showWorkPolicy.ts`
- [x] Fallback diagnostic items — **removed**; `skillProblemCatalog.ts` covers all 62 graph skills (no `expectedAnswer: 'concept'`)

#### §7.3 Diagnostic feedback

- [ ] During diagnostic: minimal feedback — **full correctness feedback still shown** via `feedbackForMode`
- [ ] Post-diagnostic spec layout block — partial inline list

#### §7.4 Continuing diagnostics

- [ ] No ongoing diagnostic triggers from mistake patterns, hint dependency, review failures, homework, confidence mismatch

---

### §8 Daily session / activity engine

#### §8.1 Continue button

- [x] Routes diagnostic / repair / review / practice / video phase (partial)
- [ ] Activity types incomplete: **concept input**, **formula recall in session loop**, **homework review task**, **syllabus task**, **resource watch** (partial via session phase only)
- [ ] Fallback problem selection still **chain_rule-heavy** when pool thin

#### §8.2 Adjust today

- [x] Pace presets (partial); collapsible on Today
- [ ] **Custom** pace in UI — filtered out of control
- [ ] Pace does not adjust difficulty, video amount, review intensity, new material gate in activity engine
- [ ] Changing pace may reset daily session when browsing

#### §8.3 Energy integrations

- [ ] Manual energy beyond pace labels — not separate
- [ ] Apple Health / HealthKit — not started
- [ ] Bevel score import — not started

#### §8.4 Quick repair

- [x] Phase machine + read-only examples (partial)
- [ ] **Four targeted problems** — limited pool; may repeat templates
- [ ] “Fix this” user trigger outside prereq/review — not exposed globally
- [x] Repair from homework mistake patterns — wired via `applyHomeworkLearningUpdates` + `HomeworkResultCard` repair CTA

#### §8.5 No panic mode

- [x] Not implemented (correct)

---

### §9 Problem solving system

#### §9.1 Problem sources

- [x] Deterministic templates (~6 skills), 4 curated seeds (partial)
- [ ] AI-generated problems end-to-end with verification pipeline
- [ ] Adapted homework-style problems from uploads
- [ ] Formula/theorem recall as session problem type (panel only, 3 items)
- [ ] Conceptual explanation prompts

#### §9.2 Problem generation

- [x] Template engine + verification metadata (partial)
- [ ] Codex generation pipeline in product loop
- [ ] Full metadata schema (`requires_show_work`, varied `answer_type`, etc.)
- [ ] Parameterized templates beyond static strings

#### §9.3 Verification philosophy

- [x] SymPy when available (partial)
- [ ] Codex disambiguation when checks disagree — missing
- [ ] `ai_required` check path — not used

#### §9.4 Saving generated problems

- [x] Saves to state/DB (partial)
- [ ] `unverified_used` promotion/deprecation workflow in UI — flag only in maintenance log text

#### §9.5 Problem bank

- [ ] Curated bank at scale — **4 real practice problems** + templates
- [ ] Performance statistics aggregated per problem — `attemptCount` field underused
- [ ] Saved worked examples as first-class bank entries
- [ ] User-attempted problem promotion

#### §9.6 Input types

- [x] Final answer, typed steps UI, text answers (partial)
- [ ] Multiple choice UI
- [ ] Photo show-work **inside activity**

#### §9.7 Show-work policy engine

- [x] `showWorkPolicy.ts` — application skills, diagnostic difficulty, repeat misses, suspicious fast-correct

- [ ] No rules for when to require steps

#### §9.8 Step-by-step checking

- [x] Steps stored; heuristic `gradeSteps` on submit (partial)
- [ ] Symbolic equivalence between intermediate steps
- [ ] Invalid transformation detection
- [ ] Codex step reasoning integration
- [ ] Photo step analysis beyond OCR text blob

---

### §10 Feedback / help layer

#### §10.1 Context-aware help

- [x] I’m lost, hint, check setup, explain why, get help (Codex), similar example sidebar (partial)
- [ ] Progressive contextual AI hints — single hint counter
- [ ] “Why is my answer wrong?” dedicated action
- [ ] “Show the concept” / in-flow resource card
- [ ] “Upload my work” in help layer
- [ ] AI context missing: resource history, **full skill file bodies**, structured output enforcement on all help paths

#### §10.2 “I’m lost” flow

- [x] Four branches (partial)
- [ ] Missing: **“I don’t understand the question”**
- [ ] Missing: **“I’m not sure”**
- [ ] Branches use **manual packet** (`generatePacket`), not inline Codex help

#### §10.3 Wrong answer behavior by activity type

- [x] `feedbackByMode` copy differences (partial)
- [ ] Guided: hint → partial → full escalation — **not implemented**
- [ ] Independent: retry without instant solution — partial
- [ ] Review: explain after attempt — not distinct flow
- [ ] Homework: step analysis — not in activity

#### §10.4 Mistake tags

- [x] Tags stored; simple feedback (partial)
- [ ] Rich hierarchical tags in review/dashboard UI
- [ ] Spec-style paths (“Related Rates → variable setup → …”) — limited mappings

#### §10.5 Explain-in-words prompts

- [x] Dedicated review type with text grading (partial catalog)

- [ ] Not implemented as dedicated question type

#### §10.6 Confidence tracking

- [x] Slider on diagnostic + mixed review (partial)
- [ ] Occasional calibration elsewhere
- [ ] User setting to disable/increase frequency
- [ ] Confidence vs performance **not used** in mastery/scheduling

---

### §11 Resource / video system

#### §11.1 Teaching philosophy

- [x] Seeded links covering major sources (partial)
- [ ] Resources not loaded from `sources.json`
- [ ] Skill graph resource IDs often orphan vs seed catalog

#### §11.2 Resource strategy

- [x] Static effectiveness scores + in-memory updates (partial)
- [ ] Dynamic search
- [ ] Codex-assisted selection in flow
- [ ] User feedback loop (“Was this helpful?”)

#### §11.3 Embedded vs external video

- [x] YouTube embed when URL parseable (partial)
- [ ] Khan embed policy / non-YouTube embeds
- [ ] User preference embed vs external

#### §11.4 Active video mode

- [x] Timed interrupt check-ins in `VideoEmbed`; `startActiveVideo` on resource_watch phase

- [x] Post-watch self-report check in `VideoEmbed` (partial)
- [ ] Setting: Never / Sometimes / Active — **missing**
- [ ] Pause-at-concept interrupts, prediction questions, timed checks

#### §11.5 Resource effectiveness learning

- [x] `updateResourceEffectiveness` + active video post-check hook (partial)
- [ ] Not persisted to v3 `resource_effectiveness` table
- [ ] No post-resource performance tracking on practice attempts linked to resource ID
- [ ] No hint usage / retention signals after videos

#### §11.6 Manual source feedback

- [ ] “Was this helpful?” Yes / Kind of / No — missing

#### §11.7 Resource records

- [ ] Spec fields missing/incomplete: `topic_tags`, `trusted` flag, `user_rating`, `last_used`, `post_resource_performance`, `preferred_for`, rich `notes` lifecycle

---

### §12 Formula / theorem / recall

- [x] Minimal panel with 3 static prompts (partial)
- [ ] Full recall module: derivative rules, integral families, trig identities, theorem conditions, convergence triggers, method-selection cues
- [ ] Generated flashcards for formulas/definitions — not built
- [ ] Integrated into review scheduler as distinct item types
- [ ] Anki export — correctly omitted

---

### §13 Review scheduler

#### §13.1 Scheduling model

- [x] Interval table + heuristics labeled FSRS-inspired (partial)
- [ ] **True FSRS-style adaptive scheduler** — not implemented
- [ ] Factors: prior retention, isolation vs mixed importance, course path, upcoming plan, overrides, decay patterns — mostly ignored

#### §13.2 Review intervals

- [x] Base `[1,3,7,14,30,60]` (partial)
- [ ] Adaptive interval adjustment beyond score thresholds

#### §13.3 Review item types

- [ ] Distinct generators for: concept, method selection, graph interpretation, short explanation, mistake correction, theorem recall, transfer problems

#### §13.4 Review priority

- [x] Due date + priority score (partial)
- [ ] Block-next-topic weighting, decayed skills emphasis, formulas needed soon, weak-in-mixed — not explicit

#### §13.5 Interleaving

- [x] `interleavingEngine` light selection (partial)
- [ ] Policy for similar-looking problem types per spec

---

### §14 Homework / photo analysis

#### §14.1 Upload flow

- [x] Today upload; file/drag/paste in component (partial)
- [ ] Upload from **current activity**
- [ ] Global drag-drop into app window
- [ ] Clipboard paste when focus not on homework textarea

#### §14.2 Analysis goals

- [x] OCR text extraction attempt + Codex JSON parse + keyword fallback (partial)
- [ ] Identify multiple problems from one image
- [ ] Step-by-step work analysis with **exact wrong step**
- [x] Classify mistake → update skill graph / mistake patterns / review queue — **homework path wired** via `homeworkLearningBridge`
- [ ] Teach/suggest repair routing from homework — feedback string only
- [ ] Save corrected problem as worked example

#### §14.3 Storage policy

- [x] `rawImageSaved` flag + Tauri image path (partial)
- [ ] Default delete after extraction when OCR empty — user message only
- [ ] Web dev mode cannot save images to disk

#### §14.4 Privacy

- [x] AI calls logged with preview (partial)
- [ ] Prompt hash / dev-mode full content toggle
- [ ] Clear in-UI disclosure when data sent to Codex

---

### §15 Memory system

#### §15.1 Layered architecture

- [x] Files + SQLite attempts + memory load (partial)
- [ ] Searchable session history UI — no search
- [ ] Procedural skills in prompts — paths only

#### §15.2 Memory files

- [x] Four files on disk; loaded into prompts (partial)
- [ ] **`preferences.md` not loaded** separately (bundled in memory loader paths?)
- [ ] Runtime profile edits not written back to markdown

#### §15.3 Searchable history

- [x] FTS over skills, problems, resources, homework — `search_index` synced on save; query command wired

#### §15.4 Memory compression

- [ ] Recent vs older policy — maintenance **logs message only**; no summarization or file writes

#### §15.5 Mistake memory

- [x] `mistakePatterns` map in app state (partial)
- [ ] Spec category taxonomy enforcement (algebra, trigonometry, notation, conceptual, method selection, setup, …)
- [ ] Frequency/context/examples/repair strategies/decay — partial fields
- [ ] v3 `mistake_patterns` table — **not synced**

#### §15.6 Profile updates

- [ ] Proposed updates from engine/Codex/user correction workflow
- [ ] Structured changelog for memory updates (`type`, `actor`, `files_changed`)

---

### §16 Local skills system

#### §16.1 Purpose & folders

- [x] 5 skill files with frontmatter (partial)
- [ ] Missing spec examples: `teach_related_rates`, `teach_integration_by_parts`, `diagnose_homework_photo`, `classify_mistake`, `generate_quick_repair`, `schedule_review`, compression/audit skills beyond one maintenance stub

#### §16.2 Skill file format

- [x] Basic frontmatter (partial)
- [ ] Full schema: `inputs`, `outputs`, `verification` consistently populated

#### §16.3 Skill updates

- [ ] Codex update workflow, versioning, backup, reason logging, reversible diffs

#### §16.4 Progressive disclosure

- [x] Only `SKILL_INDEX` paths in packet — **replaced** with full skill bodies from disk/bundle

#### §16.5 Self-improvement triggers

- [ ] Automatic skill review on repeated mistakes, resource changes, flawed problems, etc.

---

### §17 Maintenance / curator system

#### §17.1 Triggers

- [ ] Auto triggers after N sessions, post-diagnostic, post-major review — **manual/dev/command palette only**

#### §17.2 Maintenance jobs

| Job | Status |
|-----|--------|
| Memory compression | Log string only; **no file writes** |
| Skill audit | **Missing** |
| Skill improvement | **Missing** |
| Problem bank audit | Log text; **no deprecations applied** |
| Resource effectiveness audit | Log text; **scores not updated in DB** |
| Review schedule audit | Log text; **no schedule mutations** |
| Mastery consistency audit | **Missing** |
| Changelog generation | String entries; not structured spec YAML |

#### §17.3 Maintenance outputs

- [x] `MaintenanceRun` type + backup file via Tauri (partial)
- [ ] `skillsUpdated` / `memoriesUpdated` always empty
- [ ] v3 tables not populated from audits

#### §17.4 User visibility

- [x] Changelog in developer view (partial)
- [ ] Settings-accessible changelog for non-developers

---

### §18 AI adapter / Codex CLI

#### §18.1 Primary path

- [x] Rust `invoke_codex` spawns CLI (partial)
- [x] Frontend invokes for help + homework (partial)
- [ ] Requires Tauri + local Codex auth; **web dev falls back**

#### §18.2 Manual prompt-packet mode

- [x] Paste-back in Settings + parser (partial)
- [ ] Dedicated ChatGPT/Gemini packet copy UX (separate from developer pre block)
- [ ] Schema validation on parsed responses — best-effort only

#### §18.3 Codex tasks — end-to-end gaps

- [ ] Problem generation in loop
- [ ] Resource selection
- [ ] Maintenance summaries that write files
- [ ] Skill/memory updates
- [ ] Code self-improvement
- [ ] Step reasoning for typed steps
- [ ] Disagreement resolution with SymPy

#### §18.4 Session management

- [ ] Task-specific sessions (`tutor_session_*`, `grading_session_*`, etc.)

#### §18.5 Prompt construction

- [x] Task, focus, memory, mastery, mistakes, problem (partial)
- [ ] Exact output schema enforcement, safety boundaries, verification expectations
- [ ] Retrieval/compression vs history dumping

#### §18.6 AI output schemas

- [x] Request JSON in prompt; `codexParser` partial apply (partial)
- [ ] Full `state_updates` application (skills_to_decrease, review scheduling, etc.)
- [ ] Validator for mistake classification schema

#### §18.7 AI trust policy

- [ ] Disagreement resolution Codex vs checker
- [ ] Uncertain content logging — partial via aiCalls

#### §18.8 Sandbox and permissions

- [ ] Working directory limits, approval for destructive ops, credential hygiene in logs

---

### §19 Self-modifying app code

- [ ] Entire capability missing: diff preview, code improvement triggers, test gate, rollback, developer controls for code changes

---

### §20 Class / syllabus support

- [x] Default syllabus alignment data + `syllabusSkillBoost()` (partial — **function unused**)
- [x] Syllabus **upload** — Settings paste + parser
- [x] `syllabusSkillBoost` — consumed by planner + next action
- [ ] Topic/date/exam extraction — missing
- [ ] User accept/ignore mapping UI — missing
- [ ] Plan alignment influence on engine — not wired

---

### §21 Graphing and visual tools

#### §21.1 Built-in visuals

- [x] Desmos iframe with expression helper (partial)
- [ ] Function graphs tied to problem parameters at spec depth
- [x] Derivative sign charts — `SignChart.tsx` in activity for extrema/concavity skills
- [ ] Concavity charts
- [ ] Tangent/secant visualization
- [ ] Area under curve / accumulation function
- [ ] Slope fields
- [ ] Sequence/series partial sums
- [ ] Taylor polynomial approximation overlays

#### §21.2 External fallback

- [ ] Desmos / GeoGebra / WolframAlpha **link buttons** — Desmos embedded only; no GeoGebra/Wolfram

#### §21.3 Visual design rule

- [ ] Visuals not tied to setup mistakes or skill-specific teaching moments

---

### §22 Reports and analytics

#### §22.1 Weekly report

- [x] Not auto-generated (correct)

#### §22.2 On-demand report

- [x] Simple text overlay from study plan (partial)
- [ ] Full spec report: strongest/weakest, repeated mistakes, review due, resource effectiveness, trends

#### §22.3 Dashboard analytics

- [ ] Trends, backlog charts, decay visualization, syllabus alignment, resource effectiveness charts
- [ ] `recharts` in package.json — **still unused**

---

### §23 Data model

#### §23.1 SQLite tables — missing vs spec

- [ ] `users`, `course_focus` as normalized tables
- [ ] `skills`, `skill_edges` — in JSON only
- [ ] `problem_variants`, `problem_sources`
- [ ] `review_events`, `diagnostic_items`, `sessions`, `session_events`
- [ ] `mistake_tags` normalized (tags in attempts JSON only)
- [ ] `resources`, `resource_events` normalized
- [ ] `ai_calls` normalized (app state JSON only)
- [ ] `maintenance_runs` normalized (app state JSON only)
- [ ] `backups` table (files on disk only)
- [ ] `syllabi`, `generated_flashcards`
- [ ] FTS virtual tables
- [ ] v3 `mistake_patterns`, `resource_effectiveness` — **schema only, unused in Rust relational layer**

#### §23.2 Attempts record gaps

- [x] Core fields in SQLite (partial)
- [ ] `session_id`, `answer_latex`, `answer_parsed`, `partial_credit`, `attempt_number`, `feedback_summary`, `review_updates`
- [ ] Steps stored in attempt — verify persistence in `db_sync_attempt` row (may be JSON blob only)

#### §23.3 Skill mastery gaps

- [ ] `last_mastered`, `prereq_blocking` — missing from schema

#### §23.4 Resource effectiveness table

- [ ] Not written by app despite v3 migration

#### §23.5 Changelog

- [ ] String summaries only — not structured spec YAML (`type`, `actor`, `files_changed`, `backup_id`, `reversible`)

---

### §24 Security / privacy / locality

#### §24.1 Local first

- [x] No cloud account (partial)

#### §24.2 AI privacy logging

- [ ] Prompt hash / dev-mode full content toggle

#### §24.3 Sensitive images

- [x] Policy intent + flag (partial); weak when OCR extracts nothing

#### §24.4 Backups

- [x] Maintenance + manual backup JSON files (partial)
- [ ] Automatic backups before skill updates, memory compaction, code, schema migrations
- [ ] Manual export is full state JSON — not spec backup/restore format with selective restore

#### §24.5 Rollback

- [x] Restore backup JSON in developer (partial)
- [ ] Rollback for skills, memory markdown, config, problem bank, code, selective DB restore

---

### §25 Developer mode

#### §25.1 Access

- [x] Hidden under Settings (partial)

#### §25.2 Should show — gaps

- [ ] Full Codex prompts/responses (preview truncated to 420 chars)
- [ ] Memory change diff
- [ ] Skill update diff
- [ ] Database query/log inspector
- [ ] Backup browser UI (list exists; minimal)
- [ ] Generated problem verification detail UI
- [ ] Resource ranking change history
- [ ] Code self-improvement logs
- [ ] Error/console log stream
- [ ] Feature flags / debug controls

#### §25.3 Developer controls — gaps

- [ ] Inspect/edit memory files in UI
- [ ] Inspect/edit skill files in UI
- [ ] Re-run verification on demand
- [ ] Import resource list
- [ ] **Test Codex CLI connection** button
- [ ] Run code self-improvement
- [ ] View app logs file tail

---

### §26 Build order guidance

Spec build order is **not complete** — current position roughly steps 1–8 partially, 9–14 barely started.

---

### §28 Tone and teaching style

- [x] Copy generally direct (partial)
- [ ] AI-generated teaching copy quality depends on Codex availability
- [ ] Quick repair explanations — generic strings, not skill-specific step-by-step for all skills
- [ ] Spec example tone in prereq/repair flows — inconsistent

---

### §29 Open implementation decisions

- [ ] Packages not adopted as real boundaries
- [ ] Python subprocess chosen (not persistent sidecar)
- [ ] Desmos chosen for graphing (limited); no dedicated chart library for analytics
- [ ] Review scheduler simplified heuristic, not FSRS library
- [ ] Codex invocation: non-interactive exec per call; no session resume policy

---

### §30 Final product definition — behavioral gaps

- [ ] Does not **reliably** know what user is weak at — many diagnostic answers are text fallbacks
- [ ] Does not **reliably** know what helped before — resource learning in-memory, not durable
- [ ] Next action quality **inconsistent** — improved narratives but thin content
- [ ] Does not make user **prove mastery at scale** in mixed/delayed contexts
- [ ] Does not **improve its own teaching procedures** over time (skills/memory static on disk)

---

## Codebase / engineering gaps

### Structure & maintainability

- [ ] Domain logic in `apps/desktop/src/domain/` — packages are re-export shells only
- [ ] `AppViews.tsx` ~960 lines — could split per view
- [ ] `@mathpilot/*` packages unused by desktop — false modularity

### Wiring bugs / dead code

- [ ] `homework.ts` / `analyzeHomeworkUpload` — legacy; only `homework.test.ts`
- [ ] `createInitialStateAsync` — defined, **never called** (boot uses sync `createInitialState` + settings merge)
- [ ] `loadSourcesConfig` — no UI consumer
- [x] `syllabusSkillBoost` — planner + chooseNextAction consumer
- [ ] `updateResourceEffectiveness` — only via `recordResourceUsage`; not linked to practice after external resources
- [ ] `recharts` — unused dependency
- [ ] v3 SQL tables — migrated, not read/written
- [x] Skill `.md` bodies — included in Codex packets when available (Vite glob + Tauri)
- [ ] `startActiveVideo` — exported; verify all video paths call it (session phase may skip state tracking)

### Config/runtime drift

- [ ] Skill `resources` IDs vs seed `ResourceRecord` catalog — incomplete join
- [ ] `sources.json` not driving Resources view
- [ ] `preferences.md` vs runtime `preferences` object — no sync

### Testing & QA

- [ ] No React component tests
- [ ] No E2E / Playwright
- [ ] No Rust tests for Tauri commands
- [ ] No SQLite integration tests through Tauri
- [ ] No Codex subprocess tests
- [ ] No SymPy/OCR integration tests in CI
- [x] No CI workflow in repo — **`.github/workflows/ci.yml`** runs lint + test + build on push/PR
- [x] ESLint / Prettier CI gate — lint in CI (`pnpm lint`)
- [ ] `desktop:build` / dmg not verified in audit

### Build / performance

- [ ] Production JS chunk ~1.1 MB — needs code splitting
- [ ] No visual regression tests

### Small UI/engineering gaps

- [ ] No keyboard shortcut reference sheet
- [ ] No loading/error states for Codex failures surfaced clearly to user (toast partial)
- [ ] Developer mode enable — no re-auth/confirm
- [ ] Export JSON only — not selective backup format
- [ ] No empty states for filtered resources
- [x] Homework analysis does not offer “start repair” CTA wired to skill graph — **fixed** (`startRepairFromHomework`)
- [x] Homework `repair_recommendation` field from spec — stored on `HomeworkAnalysis.repairRecommendation`
- [ ] Test-out on skills with no `generateProblemForSkill` template — queue may be empty
- [ ] Diagnostic queue may include many low-quality text fallback problems
- [x] `applyCodexResponse` does not apply `recommended_next_action` or mastery deltas — **partial**: `state_updates` mastery patches applied
- [ ] Lost panel missing two spec branches; uses manual not Codex path
- [ ] Preferences: tone hardcoded `'warm'` on boot vs spec “serious, direct”
- [ ] No `Cmd+,` for Settings
- [ ] No haptic/sound feedback (optional per spec)
- [ ] `relational.rs` dual-writes full JSON blob — normalized tables partially redundant
- [ ] Changelog in SQLite vs state array — dual systems
- [ ] Homework `repair_recommendation` field from spec — not stored on analysis record
- [ ] `course_focus` not persisted as normalized setting row (in blob)
- [ ] Flashcard / generated_flashcards — not started
- [ ] No import data / merge backup UX beyond full restore
- [ ] No typed confirmation on reset local data
- [ ] No “Progress saved” subtle indicator besides toasts on some paths
- [ ] Map wheel accessibility — verify screen reader labels on skill nodes
- [ ] MathLive offline/CDN dependency for web dev — desktop bundling verify
- [ ] CSP null in tauri.conf — review for embed security
- [ ] No rate limiting / debounce on Codex help spam
- [ ] Session menu “Upload Homework” — navigates only, no modal upload
- [ ] Report overlay — no export/share
- [ ] No interleaving configuration or user override
- [ ] No explicit “strict mode” global toggle (prereq gate only per skill)
- [x] No L'Hopital / squeeze / Newton skills wired to problem templates — **in `skillProblemCatalog`**
- [ ] Duplicate skill id `function_composition` in extension vs calc1 — merge dedupes but graph integrity worth audit
- [x] `ftc` vs `ftc_intro` id mismatch — **fixed** (`formulaRecall`, `seedData`, `skills_extension` use `ftc`)
- [ ] No migration v4 plan for normalized spec tables
- [ ] No automated skill graph validation (orphan prerequisites)
- [ ] No problem difficulty calibration from attempt data
- [ ] No deprecated problem UI surfacing to user
- [ ] No “similar example” generator — static arrays only
- [ ] No conceptual checkpoint after video beyond self-report buttons
- [ ] No embedding Khan Academy non-YouTube URLs
- [ ] No Paul’s Online Math Notes in-app article view
- [ ] No full-text search command in palette
- [ ] No attempt history view for user (developer only via state)
- [ ] No streak / session length stats (spec avoids tacky streaks — OK to omit, but no session summary card either)
- [ ] No print/export knowledge map
- [ ] No skill-specific Desmos presets (e.g., related rates diagram)
- [ ] No piecewise input helper in toolbar
- [ ] No subscript/superscript dedicated buttons beyond MathLive defaults
- [ ] No undo in math field beyond MathLive native
- [ ] No multi-user / profile switch (spec single local profile — OK)
- [ ] No data directory picker / portable mode
- [ ] No spellcheck for text conceptual answers
- [ ] No copy LaTeX button on problem statements
- [ ] No problem report “this question is wrong” user flow
- [ ] No version display in About beyond Tauri predefined menu
- [ ] No update channel / auto-update story documented
- [ ] No crash reporting (local log file only if any)
- [ ] No seed data versioning when course graph JSON changes
- [ ] Hydrate merge may not run `applyDecayIfStale` on all code paths — verify fresh install vs load
- [ ] Web vitest environment — no Tauri invoke mocks for integration-style tests
- [ ] ESLint / Prettier CI gate — Prettier not configured (lint only)
- [ ] No `pnpm desktop:build` in CI
- [ ] No code owners / CONTRIBUTING for monorepo packages migration plan

---

## Recommended build order (updated)

Priority follows spec §26; UI/UX remains first-class:

1. **Today simplification** — true Continue-first layout; collapse homework/signal/formula into contextual entry points
2. **Problem bank expansion** — curated + generated problems for all graph skills; kill text-fallback diagnostics
3. **Homework → learning loop** — analysis updates mastery, mistakes, review; repair CTA; activity upload
4. **Codex hardening** — full JSON schema apply, skill body loading, disagreement with SymPy, offline fallbacks
5. **Wire v3 SQL + FTS + normalized spec tables** — incremental sync for patterns/resources/ai_calls
6. **FSRS review + interleaving + recall item types** — distinct generators per review type
7. **Resource engine** — `sources.json`, effectiveness persistence, helpfulness prompts, active video settings
8. **Maintenance that mutates files** — memory compression, skill audit/improve, real schedule fixes
9. **Graphing suite** — sign charts, accumulation, Taylor overlays; GeoGebra/Wolfram links
10. **Analytics + on-demand reports** — recharts dashboards in advanced mode
11. **Syllabus upload + alignment**
12. **Native polish** — dark mode, motion, vibrancy, notifications opt-in
13. **Package extraction** — move domain out of desktop into real `packages/*`
14. **CI + E2E + desktop:build green**

---

## Document history

| Date | Change |
|------|--------|
| 2026-05-28 | Initial gap audit |
| 2026-05-29 | Session 2–3 partial implementations noted |
| 2026-05-29 | Full spec crosswalk §0–§30 + UI/UX audit (~12%) |
| 2026-05-29 | **Full re-audit** — repo substantially evolved (Codex wired, SymPy/OCR, test-out, UI refactor, v3 schema, packages); updated all sections; ~400+ gap items |
| 2026-05-29 | **Agent session (Phase A partial)** — skillProblemCatalog (62 skills), homework→learning loop, diagnostic reprioritization, CI workflow, recordAttempt immutability fix |

---

## Agent session log (2026-05-29 afternoon)

**Phases completed:** A1 (problem bank), A2 (homework loop), partial A3 (diagnostic reprioritization), partial F (CI lint/test/build)

**Key files:** `skillProblemCatalog.ts`, `homeworkLearningBridge.ts`, `diagnosticEngine.ts` (reprioritize), `.github/workflows/ci.yml`

**Verification:**
- `pnpm lint` — pass
- `pnpm test` — 44 tests, 19 files, pass
- `pnpm build` — pass (~1.1 MB chunk warning)
- `pnpm --filter @mathpilot/desktop desktop:build` — not run this session

## Agent session log (2026-05-29 evening)

**Phases completed:** A3/A4 (post-diagnostic UI, Codex disagreement, offline fallback, codexHint routing), B (reviewItemEngine, formula catalog, sessionPlanner), D (sources policy, helpfulness), E (theme, settings prefs, map filter/legend, skill action modal)

**Key files:** `PostDiagnosticScreen.tsx`, `SkillActionModal.tsx`, `mathDisagreement.ts`, `reviewItemEngine.ts`, `formulaRecallCatalog.ts`, `sessionPlanner.ts`, `graphPresets.ts`, `AppShell.tsx` wiring

**Verification:**
- `pnpm lint` — pass (1 warning)
- `pnpm test` — 49 tests, 21 files, pass
- `pnpm build` — pass
- `pnpm --filter @mathpilot/desktop desktop:build` — release binary builds; DMG bundling failed (environment)

**Next phase:** Phase C (FTS search UI, session_events wire, memory file writes), Phase F/G (E2E, package extraction), remaining ~380 gap items
