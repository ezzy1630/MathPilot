# MathPilot Spec Completion — Orchestration Plan

> **Goal:** Close every gap from `MathPilot_spec.md` / gap audit to production-quality implementation.

**Branch:** `feat/spec-completion-2026`

## Parallel tracks (no file overlap)

| Track | Owner | Domains |
|-------|-------|---------|
| A | Subagent | `learningEngine`, `reviewScheduler`, `reviewItemEngine`, `interleaving*`, `diagnosticEngine`, `sessionPlanner`, `dailySessionEngine`, `confidenceRouting`, `showWorkPolicy` |
| B | Subagent | `config/course_graphs/*`, `skillProblemCatalog`, `formulaRecallCatalog`, `diagnosticQuestionMix`, `problemGenerator`, `problemBank` |
| C | Subagent | `aiAdapter`, `codexParser`, `mathDisagreement`, `maintenance`, `memoryCompression`, `skills/**`, `relational.rs` gaps, developer UI |
| D | Subagent | `AppShell`, `useMathPilotApp`, `AppViews`, homework/video/settings components, `ProgressReport`, graph presets |

## Verification gate

- `pnpm lint && pnpm test && pnpm build`
- Update `docs/GAP_AUDIT.md` source-of-truth section
- Single commit + push to `feat/spec-completion-2026` then merge to main per user request
