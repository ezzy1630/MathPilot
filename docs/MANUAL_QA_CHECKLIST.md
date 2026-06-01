# MathPilot Manual QA Checklist (Tauri Desktop)

Use this checklist for a full manual pass on a **built Tauri app** (`pnpm tauri dev` or release build). Check each item and note pass/fail plus build/date.

**Prerequisites**

- macOS with Codex CLI installed and authenticated (`codex --version`)
- Python 3 with SymPy available (repo `.venv` or system `python3`)
- Sample homework image (PNG/JPG) with handwritten or typed calculus work

---

## 1. Launch & onboarding

- [ ] App opens without console errors
- [ ] Welcome flow offers Calculus 1 / Calculus 2 focus
- [ ] Starting adaptive diagnostic loads questions and math input
- [ ] Completing diagnostic shows summary and Today “Continue” recommendation

---

## 2. Today & activity flow

- [ ] Today shows one clear recommended next action and **Start**
- [ ] **Adjust today** pace presets (Short / Normal / Deep / Low energy / High focus) change session length feel
- [ ] Activity: submit typed answer; feedback appears; attempt persists after restart
- [ ] Knowledge map opens from Today; skill states reflect recent work
- [ ] Command palette (`Cmd+K`): homework upload, review, map, diagnostic, maintenance shortcuts work

---

## 3. Codex CLI integration

- [ ] **I'm lost** or **Explain why** triggers Codex (network/CLI activity; no API key prompt in app)
- [ ] Developer mode → AI logs show recent Codex task, timestamp, and truncated prompt/response
- [ ] **Manual prompt packet**: copy packet → paste mock JSON response → state updates without crash
- [ ] Codex unavailable: offline fallback message appears (no silent failure)

---

## 4. SymPy / symbolic checking

- [ ] Equivalent forms accepted (e.g. `x^2` vs `x**2` where applicable)
- [ ] Clearly wrong symbolic answer rejected with useful feedback
- [ ] Developer or Python status banner reflects SymPy availability when Python missing
- [ ] Step grading (when show-work requested) returns step-level feedback

**Quick dev check:** invoke from terminal while app runs:

```bash
# From repo root with venv active
python3 scripts/check_math.py --expected "2*x" --actual "x+x" --variables x
```

---

## 5. OCR & homework upload

- [ ] Upload homework from Today or command palette (file picker)
- [ ] Drag/drop or paste image into homework upload area
- [ ] OCR extracts readable text/work summary (Tesseract via `ocr_homework_image` / base64 path)
- [ ] Analysis identifies mistakes and suggests repair; skill graph updates
- [ ] Raw image **not** retained by default (confirm in developer storage notes or UI copy)
- [ ] Optional: save as worked example when offered

---

## 6. Review, repair & diagnostics

- [ ] Spaced review items appear after practice; FSRS scheduling advances on correct review
- [ ] Two failed review attempts suggest continuing diagnostic (banner or Today copy)
- [ ] Quick repair flow: short explanation → examples → targeted problems
- [ ] Prerequisite gate blocks with repair / test-out / override options
- [ ] Test-out quiz (5–8 questions) pass/fail paths behave correctly

---

## 7. Resources & graphs

- [ ] Embedded or external video opens for a skill-linked resource
- [ ] “Was this helpful?” rating can be submitted (not forced every video)
- [ ] Built-in graph renders for a problem with graph preset
- [ ] Desmos fallback link opens external graph when needed
- [ ] Sign chart displays for derivative analysis problems

---

## 8. Syllabus & settings

- [ ] Syllabus upload maps topics; accept/ignore mapping modal works
- [ ] Course focus switch (Calc 1 ↔ Calc 2) persists across restart
- [ ] Bevel energy JSON import updates pace hint (Settings)
- [ ] HealthKit shows as unavailable / manual-only (expected — no entitlements in this build)
- [ ] Local notification opt-in fires a test reminder (if enabled)

---

## 9. Backup & developer mode

- [ ] Enable developer mode from Settings
- [ ] Run maintenance job; changelog entry appears (no blocking popup)
- [ ] **Create backup** writes file; **List backups** shows entry
- [ ] **Restore backup** returns prior state (test on disposable data)
- [ ] Code patch flow (if used): preview → approve → rollback restores prior files
- [ ] Export / search index returns recent attempts or problem text

---

## 10. Persistence & restart

- [ ] Quit and relaunch: mastery, review queue, attempts, and Today recommendation restore
- [ ] SQLite DB present under app data dir (`mathpilot.sqlite`)
- [ ] No data loss after normal study session

---

## Sign-off

| Field | Value |
|-------|-------|
| Tester | |
| Date | |
| Build / commit | |
| macOS version | |
| Codex CLI version | |
| Python / SymPy | |
| Overall result | Pass / Fail |

**Notes / failures:**

---

## Automated gate (run before manual pass)

```bash
pnpm lint && pnpm test && pnpm build
cargo test --lib --manifest-path apps/desktop/src-tauri/Cargo.toml
pnpm test:e2e
```
