# Release Hygiene

This repository is the public, clean MathPilot base. The app is allowed to learn from a person locally, but those personal changes must not become source-control changes.

## Public Source Boundary

Commit these:

- app source code
- tests and fixtures
- neutral defaults in `config/`
- course graphs and trusted-source policy
- checked-in skill prompts in `skills/`
- docs, specs, and CI configuration

Do not commit these:

- `memory/`
- `data/`
- SQLite or database files
- homework images
- generated backups
- `.env` files
- `config/*.local.json`
- local agent/plugin folders such as `.agents/`

The root `.gitignore` enforces these rules.

## Runtime Data Boundary

The Tauri desktop app stores private runtime artifacts in the OS app-data directory:

- `mathpilot.sqlite`
- `memory/*.md`
- `backups/*.json`
- `homework_images/*.png`

The web dev shell uses browser localStorage for local state. That data is not part of Git.

## Before Publishing

Run:

```bash
git status --short
pnpm lint
pnpm test
pnpm build
```

Then scan the candidate tree:

```bash
git grep -n -i "api_key\|secret\|token\|password\|bearer\|client_secret"
git grep -n -i "profileName.*Ezzy\|ezzyrappeport\|ezzy1630"
```

Expected behavior:

- no secrets
- no personal profile defaults
- no runtime memory files
- no generated databases or backups

## Future Work Pattern

Use MathPilot normally between releases. When it is time to improve the app:

1. Make code changes in the repo.
2. Keep personal app usage in the app itself.
3. Check `git status --short`.
4. Stage only source, docs, tests, and neutral config.
5. Re-run verification before pushing.

If a runtime artifact appears in `git status`, update `.gitignore` or move the write path back to app data before committing.
