# MathPilot packages

Shared libraries for the desktop app. Import from `@mathpilot/*` in `apps/desktop`.

| Package | Role |
|---------|------|
| `learning-engine` | Mastery, diagnostics, review, sessions (`fsrsSchedule` is native; other exports re-export desktop domain during migration) |
| `math-engine` | Answer checking and problem generation |
| `ai-adapter` | Codex CLI and homework analysis |
| `content-engine` | Resource ranking and `searchResources` |
| `data` | Persistence types and hydrate helpers |
| `ui` | Shared React components (`BuiltInGraph`, shells, panels) |

Domain logic still lives under `apps/desktop/src/domain/` for Tauri coupling; packages expose stable import paths per `MathPilot_spec.md` §3.1.
