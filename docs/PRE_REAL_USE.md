# Pre–real-use checklist (author)

Brief pass before you rely on MathPilot daily. ~15 minutes.

Full sign-off (release `.app`, Calc 1/2 diagnostics, evidence): [`PRODUCTION_CERTIFICATION.md`](PRODUCTION_CERTIFICATION.md).

1. **Fresh install path** — Build or copy a release `.app`, launch from `/Applications`, confirm no Python/pip prompts for you as an end user.
2. **Bundled runtime** — Settings or startup: symbolic checker self-test passes (no Python status banner).
3. **Diagnostic** — Complete Calc 1 or Calc 2 onboarding diagnostic; Today shows a sensible next action.
4. **Practice loop** — Submit a correct and incorrect expression answer; hints and feedback feel right.
5. **Calculus verify** — Open a derivative-style bank problem; answer key validates (SymPy path, not only numeric).
6. **Review queue** — Finish a short session; a review item appears on a later day (or force via dev tools if you use them).
7. **Homework** — Upload or paste one problem; step feedback returns without saving the image unless you opt in.
8. **Codex (optional)** — If you use the coach: `codex` CLI works from the app; if not, offline/help fallback is acceptable.
9. **Backup / reset** — Settings → Export downloads `mathpilot-archive.json` (state + memory + homework images). Maintenance snapshots land in `backups/` under app data. Reset requires typing `RESET`.
10. **Data location** — `~/Library/Application Support/local.mathpilot.desktop/` (`mathpilot.sqlite`, `memory/`, `backups/`, `homework_images/`). Schema upgrades copy `mathpilot.sqlite.pre-migration-*.bak` beside the DB.

When all ten are checked, treat the build as your daily driver and log issues in your usual tracker.
