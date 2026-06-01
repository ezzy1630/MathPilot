# MathPilot Gap Audit

**Updated:** 2026-06-01 (main branch — spec completion pass)  
**Source spec:** [`MathPilot_spec.md`](../MathPilot_spec.md) §0–§30  
**Status:** **COMPLETE** — every spec section is implemented or honestly marked N/A (HealthKit only).

---

## Verification commands

```bash
pnpm lint && pnpm test && pnpm build
cargo test --lib --manifest-path apps/desktop/src-tauri/Cargo.toml
npx tsx scripts/generate_problem_bank.ts
pnpm test:e2e
```

Manual Tauri pass: [`docs/MANUAL_QA_CHECKLIST.md`](MANUAL_QA_CHECKLIST.md)

---

## §0 Product Summary — Done

| Item | Status | Pointers |
|------|--------|----------|
| Local-first macOS Calc 1 / Calc 2 mastery engine | Done | `README.md`, `PRODUCT.md`, `apps/desktop/` |
| Unified “what to do next” flow | Done | `packages/learning-engine/src/index.ts`, `apps/desktop/src/domain/studyPlanEngine.ts`, `apps/desktop/src/domain/narrativeCopy.ts` |
| Prerequisite repair, syllabus, review, homework as modules | Done | `quickRepairEngine.ts`, `syllabus.ts`, `reviewScheduler.ts`, `homeworkAnalysis.ts` |

---

## §1 Product Philosophy — Done

| Item | Status | Pointers |
|------|--------|----------|
| Adaptive diagnostics + skill graph + spaced review | Done | `diagnosticEngine.ts`, `courseGraph.ts`, `reviewScheduler.ts`, `fsrsAdapter.ts` |
| Not exact-string answer checking | Done | `mathEngine.ts`, `symbolicCheck.ts`, `mathDisagreement.ts` |
| Codex CLI primary AI (not generic chat wrapper) | Done | `aiAdapter.ts`, `codexParser.ts`, `packages/ai-adapter/` |
| Strict mastery, friendly help tone | Done | `feedbackByMode.ts`, `motivationCopy.ts`, `sessionEngine.ts` |

---

## §2 Non-Negotiable Product Requirements — Done

| # | Requirement | Status | Pointers |
|---|-------------|--------|----------|
| 1 | Local-first macOS desktop, local data | Done | `apps/desktop/src-tauri/`, `persistence.ts`, `relationalStore.ts` |
| 2 | Polished native-feeling UI | Done | `AppShell.tsx`, `app-shell.css`, `styles/tokens.css` |
| 3 | Codex CLI primary; prompt-packet alternate | Done | `aiAdapter.ts`, `useMathPilotApp.ts` |
| 4 | App owns learning state | Done | `types.ts`, `learningEngine.ts`, SQLite sync in `db.rs` |
| 5 | Typed math input, photo upload (no whiteboard-first) | Done | `MathInput.tsx`, `HomeworkUpload.tsx` |
| 6 | Symbolic / numeric / AI answer checking | Done | `mathEngine.ts`, `symbolicCheck.ts`, `stepGrading.ts` |
| 7 | Homework images deleted by default | Done | `homework.ts`, `homeworkAnalysis.ts`, `saveHomeworkImage` in `db.rs` |
| 8 | Self-improvement with logs + backups + approval | Done | `codeSelfImprovement.ts`, `maintenance.ts`, `apply_code_patches` in `db.rs` |
| 9 | No forced weekly report | Done | `ProgressReport.tsx` (on-demand only) |
| 10 | No panic mode | Done | No panic feature; `sessionEngine.ts` pace modes only |

---

## §3 Technology Direction — Done

| Item | Status | Pointers |
|------|--------|----------|
| Monorepo layout (desktop + packages + skills + config) | Done | repo root structure |
| Tauri + React + TypeScript | Done | `apps/desktop/` |
| SQLite persistence | Done | `apps/desktop/src-tauri/src/db.rs`, `migrations.rs`, `relational.rs` |
| MathLive input | Done | `MathInput.tsx`, `mathlive.d.ts` |
| Python/SymPy subprocess checking | Done | `scripts/check_math.py`, `check_math_symbolic` in `db.rs` |
| Built-in + Desmos graphing | Done | `BuiltInGraph.tsx`, `DesmosEmbed.tsx`, `SignChart.tsx`, `graphPresets.ts` |
| Codex CLI adapter | Done | `invoke_codex` in `db.rs`, `aiAdapter.ts` |
| Markdown/JSON skills, memory, config | Done | `skills/`, `config/`, runtime memory via `read_memory_files` / `write_memory_file` |

---

## §4 Core User Experience — Done

| Item | Status | Pointers |
|------|--------|----------|
| §4.1 First-time setup (Calc 1/2 + start diagnostic) | Done | `AppViews.tsx` onboarding, `PostDiagnosticScreen.tsx`, `diagnosticEngine.ts` |
| §4.2 Today / Continue screen | Done | `AppViews.tsx` Today view, `TodayMasteryStrip.tsx`, `chooseNextAction` |
| §4.3 Simple vs advanced complexity toggle | Done | `AppShell.tsx` inspector panels, `WhyPanel.tsx`, `ProgressReport.tsx` |
| §4.4 Fluid navigation (Today, Map, Activity, Settings) | Done | `AppShell.tsx`, `useMathPilotApp.ts` |
| §4.5 Command palette (Cmd+K) | Done | `CommandPalette.tsx` |
| §4.6 Local reminders (opt-in) | Done | `notifications.ts`, `show_local_notification` in `db.rs` |
| §4.7 Local profile (no cloud account) | Done | `types.ts` profile fields, `memorySync.ts`, `config/app_settings.json` |

---

## §5 Visual Design Requirements — Done

| Item | Status | Pointers |
|------|--------|----------|
| §5.1 Apple-style productivity + ALEKS map + light motivation | Done | `tokens.css`, `KnowledgeMapWheel.tsx`, `motivationCopy.ts` |
| §5.2 Knowledge map (wheel, mastery states) | Done | `KnowledgeMapWheel.tsx`, `mapHelpers.ts`, `MasteryBadge.tsx` |
| §5.3 Current activity UI (input, hints, feedback, help) | Done | Activity flow in `AppViews.tsx`, `SessionChrome.tsx` |
| §5.4 Excellent math input (LaTeX, toolbar, preview) | Done | `MathInput.tsx` |

---

## §6 Learning Engine — Done

| Item | Status | Pointers |
|------|--------|----------|
| §6.1 Unified course focus + internal modules | Done | `courseGraph.ts`, `types.ts` `CourseFocus` |
| §6.2 Skill graph backbone | Done | `config/course_graphs/calculus_1.json`, `calculus_2.json` |
| §6.3 Calc 1/2 + prerequisite scope | Done | course graphs + `skills_extension.json`, `skillProblemCatalog.ts` |
| §6.4 Mastery model (score + state labels) | Done | `learningEngine.ts`, `types.ts` `MasteryRecord` |
| §6.5 Mastery update rules (hints, delayed mixed, prereq) | Done | `recordAttempt` in `learningEngine.ts`, `learningEngine.test.ts` |
| §6.6 Strict mode, test-out, override | Done | `sessionEngine.ts`, `testOutEngine.ts`, `SkillActionModal.tsx` |
| §6.7 Dynamic study plan | Done | `studyPlanEngine.ts`, `sessionPlanner.ts` |

---

## §7 Diagnostic System — Done

| Item | Status | Pointers |
|------|--------|----------|
| §7.1 Adaptive first diagnostic (~25 questions) | Done | `diagnosticEngine.ts`, `diagnosticTemplates.ts`, `diagnosticQuestionMix.ts` |
| §7.2 Mixed question types | Done | `diagnosticQuestionMix.ts`, `seedData.ts` |
| §7.3 Minimal in-diagnostic feedback; post summary | Done | `feedbackByMode.ts`, `PostDiagnosticScreen.tsx` |
| §7.4 Continuing diagnostics | Done | `continuingDiagnostics.ts`, wired in `learningEngine.ts` |

---

## §8 Daily Session / Activity Engine — Done

| Item | Status | Pointers |
|------|--------|----------|
| §8.1 Continue → best next activity | Done | `dailySessionEngine.ts`, `sessionEngine.ts`, `chooseNextAction` |
| §8.2 Adjust today (pace presets) | Done | `sessionEngine.ts` `SessionPace`, UI in `AppViews.tsx` |
| §8.3 Energy integrations | Done (HealthKit N/A) | `healthIntegrations.ts`, Bevel import in Settings; **HealthKit N/A** — `health_kit_available` stub in `db.rs` |
| §8.4 Quick repair mode | Done | `quickRepairEngine.ts`, `generate_quick_repair.md` |
| §8.5 No panic mode | Done | Not implemented (by design) |

---

## §9 Problem Solving System — Done

| Item | Status | Pointers |
|------|--------|----------|
| §9.1 Mixed problem sources | Done | `seedData.ts`, `problemBank.ts`, `problemGenerator.ts`, homework bridge |
| §9.2 Problem generation + metadata | Done | `problemGenerator.ts`, `types.ts` `Problem` |
| §9.3 Verification philosophy (Codex + SymPy) | Done | `mathDisagreement.ts`, `symbolicCheck.ts` |
| §9.4 Saving generated problems | Done | `problemBankLoader.ts`, `config/problem_bank/` |
| §9.5 Problem bank | Done | `problemBank.ts`, `scripts/generate_problem_bank.ts` |
| §9.6 Input types (answer, steps, text, choice, photo) | Done | Activity UI, `HomeworkUpload.tsx`, `stepGrading.ts` |
| §9.7 Show-work policy | Done | `showWorkPolicy.ts` |
| §9.8 Step-by-step + photo checking | Done | `stepGrading.ts`, `ocrHomework.ts`, `homeworkAnalysis.ts` |

---

## §10 Feedback / Help Layer — Done

| Item | Status | Pointers |
|------|--------|----------|
| §10.1 Context-aware help actions | Done | `useMathPilotApp.ts` `requestHelp`, `codexOfflineFallback.ts` |
| §10.2 “I’m lost” flow | Done | `AppViews.tsx` lost-menu, `aiAdapter.ts` |
| §10.3 Wrong-answer behavior by mode | Done | `feedbackByMode.ts`, `feedbackByMode.test.ts` |
| §10.4 Mistake tags | Done | `MistakePatternsPanel.tsx`, mistake pattern updates in `learningEngine.ts` |
| §10.5 Explain-in-words prompts | Done | `diagnosticQuestionMix.ts`, conceptual problems in bank |
| §10.6 Confidence tracking | Done | `confidenceRouting.ts`, Settings toggle, diagnostic/review prompts |

---

## §11 Resource / Video System — Done

| Item | Status | Pointers |
|------|--------|----------|
| §11.1 Trusted sources philosophy | Done | `config/sources.json`, `packages/content-engine/` |
| §11.2 Resource strategy (curated + search + Codex) | Done | `resourceResolver.ts`, `resourceEngine.ts` |
| §11.3 Embedded vs external videos | Done | `VideoEmbed.tsx`, `activeVideoMode.ts` |
| §11.4 Active video mode | Done | `activeVideoMode.ts`, settings in `AppViews.tsx` |
| §11.5 Resource effectiveness learning | Done | `resourceLearning.ts`, `ResourceEffectivenessPanel.tsx` |
| §11.6 Manual source feedback | Done | resource rating in activity flow |
| §11.7 Resource records | Done | `types.ts`, `relational.rs` resource tables |

---

## §12 Formula / Theorem / Recall — Done

| Item | Status | Pointers |
|------|--------|----------|
| §12.1 Purpose (targeted recall, not random flashcards) | Done | `formulaRecall.ts`, `formulaRecallCatalog.ts` |
| §12.2 Recall prompts | Done | catalog + `FormulaRecallPanel.tsx` |
| §12.3 Flashcard generation scope | Done | `formulaRecall.ts` |
| §12.4 Built-in review (no Anki export required) | Done | FSRS review queue, not Anki-dependent |

---

## §13 Review Scheduler — Done

| Item | Status | Pointers |
|------|--------|----------|
| §13.1 FSRS-style adaptive scheduler | Done | `reviewScheduler.ts`, `packages/learning-engine/src/fsrsSchedule.ts`, `ts-fsrs` |
| §13.2 Adaptive intervals | Done | `buildReviewItemUpdate`, `fsrsSchedule.test.ts` |
| §13.3 Mixed review item types | Done | `reviewItemEngine.ts`, interleaving in `interleavingEngine.ts` |
| §13.4 Review priority | Done | `enrichReviewQueue`, `interleavingPolicy.ts` |

---

## §14 Homework / Photo Analysis — Done

| Item | Status | Pointers |
|------|--------|----------|
| §14.1 Upload from Today, activity, palette, drag/drop | Done | `HomeworkUpload.tsx`, `CommandPalette.tsx`, `useMathPilotApp.ts` |
| §14.2 Analysis goals (steps, mistakes, repair) | Done | `homeworkAnalysis.ts`, `HomeworkResultCard.tsx` |
| §14.3 Storage policy (extract + delete raw image) | Done | `homework.ts`, `persistence.ts` `saveHomeworkImageFile` |
| §14.4 Local privacy + developer logging | Done | `promptHash.ts`, developer AI logs in `AppViews.tsx` DeveloperView |

---

## §15 Memory System — Done

| Item | Status | Pointers |
|------|--------|----------|
| §15.1 Layered memory architecture | Done | SQLite + markdown files + skills |
| §15.2 Memory files (profile, learning_model, durable_notes, preferences) | Done | `memoryLoader.ts`, `memorySync.ts`, `read_memory_files` / `write_memory_file` in `db.rs` |
| §15.3 Searchable attempt history (FTS) | Done | `searchIndex.ts`, `search_index_query` in `db.rs` |
| §15.4 Memory compression | Done | `memoryCompression.ts`, `maintenance.ts` |
| §15.5 Mistake memory | Done | `mistakePatterns` in state, `MistakePatternsPanel.tsx` |
| §15.6 Profile updates with logging | Done | `memorySync.ts`, changelog entries |

---

## §16 Local Skills System — Done

| Item | Status | Pointers |
|------|--------|----------|
| §16.1 Purpose (teaching, grading, resources, planning, maintenance) | Done | `skills/` tree (15 skill files) |
| §16.2 Skill file format with frontmatter | Done | e.g. `skills/teaching/teach_chain_rule.md` |
| §16.3 Skill updates (logged, reversible) | Done | `skillFileSync.ts`, `backup_skill_file`, `write_skill_patch` in `db.rs` |
| §16.4 Progressive disclosure in prompts | Done | `skillLoader.ts`, `loadSkillsForPrompt` |
| §16.5 Self-improvement skill triggers | Done | `maintenance.ts`, skill changelog append |

---

## §17 Maintenance / Curator System — Done

| Item | Status | Pointers |
|------|--------|----------|
| §17.1 Triggered maintenance (sessions, diagnostic, manual) | Done | `maintenance.ts`, developer run control |
| §17.2 Jobs (compression, skill audit, problem bank, resources, review, mastery) | Done | `maintenance.ts`, `memoryCompression.ts`, `run_safe_maintenance.md` |
| §17.3 Maintenance run outputs | Done | `types.ts` maintenance records, SQLite `maintenance_runs` |
| §17.4 Changelog visibility (no popups) | Done | `CHANGELOG.md`, in-app changelog in state |

---

## §18 AI Adapter / Codex CLI — Done

| Item | Status | Pointers |
|------|--------|----------|
| §18.1 Codex CLI primary path | Done | `invoke_codex` in `db.rs`, `aiAdapter.ts` |
| §18.2 Manual prompt-packet mode | Done | `createPromptPacket`, `logManualPacket`, `useMathPilotApp.ts` |
| §18.3 Codex task coverage | Done | tutor, homework, generation, maintenance, code improvement |
| §18.4 Task-specific sessions | Done | `resolveCodexSession` in `aiAdapter.ts` |
| §18.5 Prompt construction | Done | `aiAdapter.ts`, skill + memory injection |
| §18.6 Structured AI output schemas | Done | `codexParser.ts`, `applyCodexResponse` |
| §18.7 AI trust policy | Done | `mathDisagreement.ts` |
| §18.8 Sandbox, backups, approval | Done | `codeSelfImprovement.ts`, `write_backup`, patch rollback |

---

## §19 Self-Modifying App Code — Done

| Item | Status | Pointers |
|------|--------|----------|
| §19.1 Allowed with user opt-in | Done | `developerModeEnabled`, Developer view |
| §19.2 Visibility, backup, rollback, tests | Done | `codeSelfImprovement.ts`, `apply_code_patches`, `rollback_code_patches`, `run_pnpm_test` |
| §19.3 Code improvement triggers | Done | developer UI + maintenance hooks |
| §19.4 Learning vs code change separation | Done | changelog `type` field, separate flows |

---

## §20 Class / Syllabus Support — Done

| Item | Status | Pointers |
|------|--------|----------|
| §20.1 Optional syllabus mode | Done | `syllabus.ts`, `defaultSyllabus` |
| §20.2 Syllabus upload + topic extraction | Done | `syllabusUpload.ts`, `SyllabusMappingModal.tsx` |
| §20.3 Plan influence without overriding mastery | Done | `syllabusSkillBoost`, prerequisite gate in `sessionEngine.ts` |

---

## §21 Graphing and Visual Tools — Done

| Item | Status | Pointers |
|------|--------|----------|
| §21.1 Built-in visuals | Done | `BuiltInGraph.tsx`, `SignChart.tsx`, `graphPresets.ts` |
| §21.2 External Desmos / GeoGebra fallback | Done | `DesmosEmbed.tsx`, external links in graph panel |
| §21.3 Visuals clarify concepts | Done | presets tied to skills in `graphPresets.ts` |

---

## §22 Reports and Analytics — Done

| Item | Status | Pointers |
|------|--------|----------|
| §22.1 No automatic weekly report | Done | on-demand only |
| §22.2 On-demand progress report | Done | `ProgressReport.tsx`, `analyticsEngine.ts` |
| §22.3 Advanced dashboard (not default) | Done | inspector / advanced panels in `AppShell.tsx` |

---

## §23 Data Model Sketch — Done

| Item | Status | Pointers |
|------|--------|----------|
| §23.1 SQLite tables | Done | `relational.rs`, `migrations.rs` (v9+) |
| §23.2 Attempt records | Done | `types.ts` `AttemptRecord`, `db_sync_attempt` |
| §23.3 Skill mastery | Done | `types.ts` `MasteryRecord`, relational mastery sync |
| §23.4 Resource effectiveness | Done | `resourceLearning.ts`, relational resource tables |
| §23.5 Changelog entries | Done | `CHANGELOG.md`, state `changelog`, SQLite entries |

---

## §24 Security / Privacy / Locality — Done

| Item | Status | Pointers |
|------|--------|----------|
| §24.1 Local-first, no cloud account | Done | Tauri app data dir, no auth layer |
| §24.2 AI privacy logging | Done | `promptHash.ts`, developer logs |
| §24.3 Sensitive image deletion | Done | homework storage policy |
| §24.4 Automatic backups | Done | `write_backup`, `list_backups`, maintenance backups |
| §24.5 Rollback support | Done | `restore_backup`, skill/code rollback commands |

---

## §25 Developer Mode — Done

| Item | Status | Pointers |
|------|--------|----------|
| §25.1 Hidden under Settings | Done | Settings → enable developer mode |
| §25.2 Logs (Codex, memory, maintenance, backups) | Done | `DeveloperView` in `AppViews.tsx` |
| §25.3 Controls (maintenance, backup, Codex test, code patches) | Done | `codeSelfImprovement.ts`, `maintenance.ts`, developer UI |

---

## §26 Build Order Guidance — Done

All 14 build-order stages from the spec are represented in the shipped codebase (skeleton through polish). See pointers in §3–§25 above and `README.md` setup instructions.

---

## §27 Acceptance Criteria — Done

| Area | Status | Pointers |
|------|--------|----------|
| §27.1 Core experience | Done | E2E: `apps/desktop/e2e/acceptance.spec.ts`, `smoke.spec.ts` |
| §27.2 Learning quality | Done | `learningEngine.test.ts`, delayed mixed in `recordAttempt` |
| §27.3 UI quality | Done | `visual.spec.ts`, shell components |
| §27.4 AI quality | Done | `aiAdapter.test.ts`, `codexParser.test.ts` |
| §27.5 Data quality | Done | `persistence.test.ts`, `relationalStore.test.ts`, backup tests |

---

## §28 Tone and Teaching Style — Done

| Item | Status | Pointers |
|------|--------|----------|
| Serious, direct copy; no childish gamification | Done | `motivationCopy.ts`, `narrativeCopy.ts`, `feedbackByMode.ts` |

---

## §29 Open Implementation Decisions — Done

Codex chose: Tauri structure, Vitest, custom SQLite migrations, Python subprocess SymPy, `ts-fsrs`, MathLive, catalog-driven problem bank. All preserved spec requirements. Documented in `README.md` and package layout.

---

## §30 Final Product Definition — Done

The shipped app matches the spec essence: adaptive next-action tutoring, mastery tracking, mistake repair, spaced review, resource learning, Codex-powered help, and self-improving local skills/maintenance.

**Only explicit N/A:** native **Apple HealthKit** integration (§8.3) — requires macOS HealthKit entitlements and a Swift bridge; stub `health_kit_available` returns `false`. Manual energy selection and Bevel JSON import are implemented.

---

## Residual (non-blocking)

| Item | Notes |
|------|-------|
| HealthKit live integration | N/A until entitlements + native module |
| Problem bank curation at scale | 546+ Calc1 / 534+ Calc2 via `scripts/generate_problem_bank.ts`; ongoing content curation is operational, not a code gap |
| Runtime `memory/*.md` files | Created in app data dir on first run, not committed to git |

---

## Historical audit notes

Pre-2026-06-01 unchecked items below this line may be stale. Trust the §0–§30 checklist above for release readiness.
