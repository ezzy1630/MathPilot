# MathPilot Desktop

This package contains the Tauri desktop shell and React study cockpit.

## Commands

```bash
pnpm --filter @mathpilot/desktop dev
pnpm --filter @mathpilot/desktop desktop:dev
pnpm --filter @mathpilot/desktop test
pnpm --filter @mathpilot/desktop test:e2e
pnpm --filter @mathpilot/desktop build
```

## Runtime State

Desktop runtime state is private app data, not source data. SQLite state, memory files, backups, and retained homework images are written to the OS app-data directory through Tauri commands.

For browser-only dev mode, local state is stored in localStorage.
