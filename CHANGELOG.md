# MathPilot Changelog

Entries are structured so app, memory, content, and developer changes can be audited without reading old gap notes.

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
