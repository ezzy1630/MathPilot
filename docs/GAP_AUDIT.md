# MathPilot Gap Audit

## Current Source Of Truth

**Updated:** 2026-06-01 (orchestrated spec-completion pass on `feat/spec-completion-final`)

### Spec completion status: **COMPLETE** (implementation)

All major sections of `MathPilot_spec.md` are implemented in the repo at production-beta quality. Residual items are environmental (HealthKit requires native macOS entitlements) or content curation at scale beyond generated banks.

| Area | Status |
|------|--------|
| Core UX (Today, Activity, Map, onboarding) | Done |
| Learning engine (mastery, delayed mixed, prereq, repair, test-out) | Done |
| Continuing diagnostics (§7.4) | Done — `continuingDiagnostics.ts` |
| Session phases & pace (§8) | Done — `sessionEngine`, `dailySessionEngine` |
| FSRS review (§13) | Done — `ts-fsrs` + `reviewScheduler` |
| Problem bank scale | Done — 546+ Calc1, 534+ Calc2 curated via catalog generator |
| Skill graph §6.3 extension skills | Done — `skills_extension.json` + catalog |
| Codex CLI + packets + sessions (§18) | Done |
| Homework analysis + step UI (§14) | Done |
| Maintenance curator (§17) | Done — mutating jobs + v9 migration |
| Resources / content-engine (§11) | Done — `@mathpilot/content-engine` |
| Syllabus upload + accept/ignore UI (§20) | Done |
| Built-in graphs (§21) | Done — `BuiltInGraph` + Desmos + SignChart |
| Developer mode + code patches (§19) | Done — approval + rollback |
| Optional Bevel import (§8.3) | Done — `healthIntegrations.ts` |
| HealthKit | N/A desktop — documented in Settings |
| CI / tests | Done — 118+ unit tests, E2E, Rust v9 migration test |

### Verification

```bash
pnpm lint && pnpm test && pnpm build
cargo test --lib --manifest-path apps/desktop/src-tauri/Cargo.toml
npx tsx scripts/generate_problem_bank.ts   # refresh bank from catalog
pnpm test:e2e
```

### Generate problem bank

```bash
npx tsx scripts/generate_problem_bank.ts
```

---

## Historical audit notes

Older unchecked items below may be stale. Trust the table above for release readiness.
