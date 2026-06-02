# MathPilot production certification

**Purpose:** Single sign-off checklist before treating a **release build** (`/Applications/MathPilot.app`) as a daily-driver macOS app.

**Not the same as:** [`GAP_AUDIT.md`](GAP_AUDIT.md) (spec implementation inventory) or green CI alone.

**Sources:** [`MathPilot_spec.md`](../MathPilot_spec.md) §27, [`PRODUCT.md`](../PRODUCT.md), [`PRE_REAL_USE.md`](PRE_REAL_USE.md), [`PRE_REAL_USE_CHECKLIST.md`](PRE_REAL_USE_CHECKLIST.md), [`MANUAL_QA_CHECKLIST.md`](MANUAL_QA_CHECKLIST.md).

---

## How to certify

1. **Build artifact** — Record git commit, `pnpm --filter @mathpilot/desktop desktop:build`, and install via [`scripts/install-mathpilot-macos.sh`](../scripts/install-mathpilot-macos.sh) (or copy the release `.app` + DMG if shipped).
2. **Automated gate** — Run the commands in [Automated gate](#automated-gate); all must pass on the candidate commit.
3. **Manual pass** — On the **installed `.app`**, complete every [Release-blocking](#release-blocking-manual-checks) item below; attach evidence (see [Evidence](#evidence-to-attach)).
4. **Sign-off** — Fill the [Sign-off record](#sign-off-record). Only then mark the build **production-ready for daily use**.

E2E and visual tests today run against the **Vite dev shell** (browser `localStorage` facade), not the Tauri SQLite bundle. Passing E2E is necessary but **not sufficient** for packaged-app certification.

---

## Automated gate

Run from repo root on the candidate commit:

```bash
pnpm lint && pnpm test && pnpm build
cargo test --lib --manifest-path apps/desktop/src-tauri/Cargo.toml
pnpm test:e2e
```

Optional before a visual snapshot bump:

```bash
pnpm test:e2e -- --grep visual-regression --update-snapshots
```

Record: command output (or CI run URL), commit SHA, macOS version, Apple Silicon vs Intel.

---

## Release-blocking manual checks

Complete on **`/Applications/MathPilot.app`** unless noted. Mark **Pass / Fail** and link evidence.

### A. Install & first launch

| # | Check | Pass criteria |
|---|--------|----------------|
| A1 | **Fresh install** | New copy to `/Applications`; no stale `~/Library/Application Support/local.mathpilot.desktop/` (or intentional clean wipe via Settings → Reset). |
| A2 | **First launch (Gatekeeper)** | Unsigned/ad-hoc build: **Right-click → Open** works once; app launches without requiring Terminal. |
| A3 | **No dev dependency prompts** | No banner asking end user to install Python/pip; **Settings** or startup **runtime self-test** reports SymPy OK (bundled runtime on release build). |
| A4 | **Quit / relaunch** | After onboarding step below, quit (`Cmd+Q`) and reopen: profile, focus, and coach desk restore from **SQLite** (`mathpilot.sqlite` in app data dir). |

### B. Onboarding

| # | Check | Pass criteria |
|---|--------|----------------|
| B1 | **Welcome flow** | Calc 1 / Calc 2 focus selectable; copy matches product tone (no childish gamification). |
| B2 | **Start diagnostic** | Adaptive diagnostic loads; math input and **Check answer** work. |
| B3 | **Post-diagnostic** | Summary + **Coach desk** with a **Continue** recommendation; **Why this now** opens. |

### C. Diagnostics (Calc 1, Calc 2, adaptation)

| # | Check | Pass criteria |
|---|--------|----------------|
| C1 | **Calculus 1 diagnostic** | Full pass on **Calculus 1** focus: completes (~25 Q or early confidence stop); map/mastery reflect weak areas; Today recommendation is plausible. |
| C2 | **Calculus 2 diagnostic** | Repeat on **fresh profile** or after **Settings → Reset** (`RESET`): Calc 2 graph/skills surface in map; no Calc-1-only leakage in first recommendation. |
| C3 | **Dynamic adaptation** | During diagnostic: after mixed correct/incorrect answers, later questions **bias toward weak skills** (observe skill labels or question topics shifting). If Codex installed: diagnostic plan banner may appear; if not: **offline plan banner** still appears (see acceptance E2E). |
| C4 | **Early stop (optional evidence)** | With honest confidence prompts, diagnostic can finish before 25 when confidence threshold met (`diagnosticConfidenceMet`). |

### D. Today & activity loop

| # | Check | Pass criteria |
|---|--------|----------------|
| D1 | **Today recommendation** | One clear **Continue** action; **Adjust today** (Short / Normal / Deep / Low energy / High focus) changes session feel. |
| D2 | **Activity answer checking** | Correct answer → positive feedback; wrong answer → useful correction (not silent). |
| D3 | **Equivalent symbolic answers** | For a derivative/algebra bank item: equivalent forms accepted (e.g. `2x` vs `x+x`, `x^2` vs `x**2` where applicable). |
| D4 | **Step grading** | On a show-work problem: partial step feedback returns; final answer still gradable. |
| D5 | **Attempt persistence** | Submit attempts → quit → relaunch: history / mastery still reflect attempts. |

### E. Repair & review

| # | Check | Pass criteria |
|---|--------|----------------|
| E1 | **Quick repair** | Trigger repair (weak skill / prerequisite gate): short explanation → examples → targeted problems. |
| E2 | **Review scheduling** | After practice, review items appear on Today or map; completing a review updates schedule (FSRS). *Same-day:* item exists in queue. *Multi-day:* spot-check due date advances after correct review, or document dev-time override if used. |
| E3 | **Continuing diagnostic** | After **two failed review** attempts on a skill, continuing diagnostic or repair path is offered (banner / Today copy). |

### F. Homework & OCR

| # | Check | Pass criteria |
|---|--------|----------------|
| F1 | **Upload paths** | File picker from Today / command palette (`Cmd+K`); drag/drop or paste in modal. |
| F2 | **OCR / analysis** | Sample image yields readable extraction and step/mistake feedback. |
| F3 | **Storage policy** | Raw image **not** retained by default; optional save only when user opts in. |

### G. Codex & AI paths

Test **both** profiles on separate runs or machines if possible.

| # | Check | Pass criteria |
|---|--------|----------------|
| G1 | **Codex available** | `codex` in PATH, authenticated: **I'm lost** / **Explain why** invokes CLI; Developer → AI logs show recent task (no in-app API key). |
| G2 | **Codex offline fallback** | With Codex unavailable (rename binary or disconnect): help shows **offline fallback** message, not hang or empty panel. |
| G3 | **Manual prompt packet** | Settings (or Developer): copy packet → paste valid JSON → state updates; malformed JSON rejected (see `codex-trust` E2E). |

### H. Map, settings, data lifecycle

| # | Check | Pass criteria |
|---|--------|----------------|
| H1 | **Knowledge map** | Wheel + list; states update after activity; **Recommendation evidence** visible from Today. |
| H2 | **Settings** | Course focus switch persists; confidence toggle; notifications test (if enabled); HealthKit shown unavailable (expected). |
| H3 | **Export** | Settings → Export produces JSON archive. |
| H4 | **Reset** | Type `RESET` → returns to onboarding; data wiped as documented. |
| H5 | **Backup / restore** | Developer: maintenance backup → list → restore on **disposable** profile returns prior state. |
| H6 | **Local data path** | Confirm `~/Library/Application Support/local.mathpilot.desktop/` contains `mathpilot.sqlite` and expected subdirs; user knows this is the only profile copy (no cloud sync). |

### I. Accessibility & polish (release-blocking for *your* daily use)

| # | Check | Pass criteria |
|---|--------|----------------|
| I1 | **Reduced motion** | macOS **Reduce motion** on: no essential information only in motion; UI remains usable (`prefers-reduced-motion` CSS). |
| I2 | **Keyboard navigation** | Tab through Today → Start → Check answer; `Cmd+K` palette; modal Escape closes; Settings shortcuts list accurate. |
| I3 | **Visual polish** | No broken layouts at default window size; math renders via MathLive; contrast readable (WCAG AA spot-check on coach desk + activity). |
| I4 | **Packaged app identity** | Launch only from `/Applications/MathPilot.app` (not `pnpm tauri dev`) for this section. |
| I5 | **CSP smoke** | With the packaged app open: Today, Activity math input/display, Knowledge map, Settings, homework modal, and Desmos/video surfaces load without blank panels or webview CSP errors. |

---

## Nice-to-have (non-blocking)

| Area | Check |
|------|--------|
| Codex post-diagnostic curator | Rich coach narrative vs deterministic fallback |
| Syllabus upload | Paste syllabus → mapping modal → active topics |
| Resources | Embedded/external video, helpfulness rating, Desmos/sign chart |
| Bevel energy JSON | Import updates pace hint |
| Prerequisite test-out | 5–8 Q quiz pass/fail |
| Formula recall | Targeted recall cards in session mix |
| Developer maintenance | Skill audit, code patch preview/rollback (power user) |
| Visual regression | `visual-regression.spec.ts` snapshots match on CI |
| Intel Mac | Smoke on Intel hardware if you support it |
| DMG distribution | Friend install via DMG + first-open instructions |
| Multi-day mastery | Delayed mixed review proves mastery over days (spec §27.2) |

---

## Evidence to attach

Store with the sign-off record (folder, issue, or `docs/certification-runs/YYYY-MM-DD/`):

| Evidence | What to capture |
|----------|------------------|
| Build | Commit SHA, `desktop:build` log tail, `.app` path |
| Automated | CI URL or local test command exit 0 |
| Runtime | Screenshot: no Python banner; runtime self-test OK |
| Diagnostics | Screenshot: post-diagnostic summary for Calc 1 and Calc 2 |
| Symbolic | Problem ID + equivalent answers tried + pass/fail |
| Persistence | `ls` of app support dir + sqlite file timestamp after relaunch |
| Codex | AI log screenshot (available path) + offline fallback screenshot |
| Homework | Analysis result screenshot; confirm no raw image on disk if default |
| Accessibility | Short screen recording or notes for Reduce motion + keyboard-only session |

---

## Release-blocking criteria (summary)

**Ship as daily driver only if:**

- Automated gate passes on the release commit.
- Every **A–I** manual row is **Pass** on `/Applications/MathPilot.app`.
- **C1 + C2** both exercised (separate focuses).
- **G1 or G3** satisfied for AI help (Codex live *or* verified manual packet path); **G2** required (offline must not break UX).
- **A4 + D5 + H6** prove real persistence (not browser dev alone).
- Sign-off record completed with evidence links.

**Explicit non-blockers** (document, do not pretend shipped): HealthKit, cloud sync, code-signing notarization, Intel parity, problem-bank content quality at scale.

---

## “Ready to use” definition

A build is **ready for daily use** when:

1. **You** (certifying user) completed this checklist on the **exact binary** you will open each day.
2. **Core loop works offline:** diagnostic → Today → practice → feedback → map update → review queue, without Codex.
3. **Math trust:** symbolic equivalence and step grading behave correctly on at least one Calc 1 and one Calc 2 representative problem each.
4. **Data trust:** quit/relaunch preserves progress; export + reset + backup/restore behave as documented.
5. **No silent failures** on Codex-offline and homework paths.
6. Evidence is filed so a future you can tell *which build* was certified.

**Not implied:** spec §0–§30 “complete,” friend-ready notarized distribution, or “mastered” skills after one good session (mastery remains evidence-based over review days per spec).

---

## Sign-off record

| Field | Value |
|-------|--------|
| Certified by | |
| Date | |
| Git commit | |
| macOS version | |
| Hardware (AS/Intel) | |
| Codex CLI version (or N/A) | |
| Bundled Python self-test | Pass / Fail |
| Calc 1 diagnostic | Pass / Fail |
| Calc 2 diagnostic | Pass / Fail |
| Codex path tested | Available / Offline only / Manual packet only |
| Evidence folder / issue | |
| **Overall** | **Ready / Not ready** |

**Failures / notes:**

---

## Doc maintenance

| Doc | Role |
|-----|------|
| This file | **Certification** — evidence-based daily-driver sign-off |
| [`MANUAL_QA_CHECKLIST.md`](MANUAL_QA_CHECKLIST.md) | Detailed feature QA (dev or release) |
| [`PRE_REAL_USE.md`](PRE_REAL_USE.md) | Author 15-minute smoke |
| [`GAP_AUDIT.md`](GAP_AUDIT.md) | Spec implementation map (not release proof) |

When adding features, update **MANUAL_QA** first, then add a row here if the feature is release-blocking for daily use.
