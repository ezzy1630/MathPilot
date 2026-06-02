# ADR: Engine Boundaries and Command Policy

## Status
Accepted

## Context
Desktop logic and engine logic have been loosely coupled, and privileged desktop commands (patching files, rolling back patches, running tests) needed explicit capability and path-policy enforcement.

## Decision
- Treat `packages/learning-engine` and `packages/math-engine` as engine contract surfaces consumed by desktop composition code.
- Keep `apps/desktop` responsible for UI/application composition and runtime orchestration only.
- Enforce explicit command capabilities for sensitive Tauri commands:
  - `run_tests` for `run_pnpm_test`
  - `code_patch` for `apply_code_patches`
  - `code_patch_rollback` for `rollback_code_patches`
- Constrain patch and rollback paths to allowed repository prefixes and known file extensions.
- Add command-audit logging for sensitive patch/test operations.
- Add CI quality gates for backend command tests and bundle budget regressions.

## Consequences
- Production builds now require explicit capability configuration for sensitive commands.
- Invalid/misused patch and rollback operations fail fast with audit traceability.
- Package contracts are protected by engine contract tests from desktop integration drift.
- Bundle growth is constrained by CI-enforced budgets.

## Phase 2 (2026-06-02)
- Moved math grading core (`checkAnswer`, `checkAnswerAsync`, `symbolicCheck`) into `@mathpilot/math-engine` as package-owned source.
- Desktop `mathEngine.ts` now composes Codex disagreement handling only; grading primitives import from the package.
- Unified patch path policy via `config/code-patch-policy.json` consumed by both TypeScript validators and Tauri apply/rollback guards.
- Added `pnpm check:engine-boundaries` to block new reverse imports from packages into `apps/desktop` (except transitional `index.ts` / `contracts.ts` / `desktopAdapter.ts`).
- Added package `typecheck` scripts and CI enforcement.
- `run_pnpm_test` now supports bounded execution via `MATHPILOT_PNPM_TEST_TIMEOUT_SECS` (default 900s).

## Follow-ups
- Continue migrating additional learning-engine internals from desktop-owned modules into package-owned modules while preserving contracts.
- Move `problemGenerator` out of desktop domain into `@mathpilot/math-engine` or a dedicated generation package.
- Expand command capability storage from env-only configuration to signed runtime policy if needed.
