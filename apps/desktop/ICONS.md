# MathPilot app icon

**Source files**

- `app-icon-square.png` — 1024×1024 master raster (edit or replace)
- `app-icon-source.svg` — vector source (integral + mastery arc on brand blue)

**Regenerate platform icons**

```bash
cd apps/desktop
pnpm exec tauri icon app-icon-square.png -o src-tauri/icons
pnpm desktop:build
```

Then reinstall `src-tauri/target/release/bundle/macos/MathPilot.app` to `/Applications`.
