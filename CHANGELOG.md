# MathPilot Changelog

Entries are structured so app, memory, content, and developer changes can be audited without reading old gap notes.

## 2026-06-01

### Changed

- type: docs
  actor: codex
  files_changed: `docs/GAP_AUDIT.md`, `docs/MANUAL_QA_CHECKLIST.md`, `CHANGELOG.md`
  summary: Rewrote the gap audit as a section-by-section §0–§30 checklist (all items done or N/A for HealthKit). Added a Tauri manual QA checklist for Codex, SymPy, OCR, homework, and backup flows.

- type: bugfix
  actor: codex
  files_changed: `apps/desktop/src/domain/continuingDiagnostics.ts`, `apps/desktop/src/domain/continuingDiagnostics.test.ts`
  summary: Fixed continuing-diagnostic review-failure detection so `triggerFromAttempt` excludes the just-recorded attempt from history scans and does not double-count on re-evaluation.

- type: architecture
  actor: codex
  files_changed: `apps/desktop/src/domain/healthIntegrations.ts`, `apps/desktop/src-tauri/src/db.rs`, `apps/desktop/src-tauri/src/lib.rs`
  summary: Documented HealthKit as N/A without macOS entitlements; added stub Tauri command `health_kit_available` returning false and async probe helper.

## 2026-05-31

### Changed

- type: ui
  actor: codex
  files_changed: `apps/desktop/src/app/AppShell.tsx`, `apps/desktop/src/views/AppViews.tsx`, `apps/desktop/src/app/app-shell.css`, `apps/desktop/src/styles/tokens.css`, `apps/desktop/src/components/CommandPalette.tsx`, `apps/desktop/src/components/KnowledgeMapWheel.tsx`
  summary: Reworked the desktop shell toward a native macOS productivity surface: labeled sidebar navigation, light restrained palette, no body grid, no cockpit panel, grouped inspector/help surfaces, richer MathLive toolbar, raw LaTeX toggle, confidence chips, structured feedback panels, and stronger knowledge-map treatment.

- type: bugfix
  actor: codex
  files_changed: `apps/desktop/src/app/AppShell.tsx`, `apps/desktop/e2e/acceptance.spec.ts`
  summary: Fixed active diagnostic navigation stacking. Activity now renders only for the Activity workspace, while Map and Settings can be active without diagnostic controls remaining visible. Added a Playwright regression test.

- type: docs
  actor: codex
  files_changed: `docs/GAP_AUDIT.md`, `CHANGELOG.md`
  summary: Added a current source-of-truth note so future work uses the live audit state instead of repeating stale gaps.

- type: architecture
  actor: codex
  files_changed: `apps/desktop/vite.config.ts`
  summary: Added explicit vendor chunking for React, MathLive, charting, and Tauri APIs. The main app chunk is now substantially smaller; MathLive remains a large vendor chunk.
