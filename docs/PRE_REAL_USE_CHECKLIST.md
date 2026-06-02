# Pre–real-use checklist (Calc 1/2 mastery)

Use this **after** installing the latest `MathPilot.app` and **before** treating scores as “where you really are.”

Formal daily-driver certification (evidence + full matrix): [`PRODUCTION_CERTIFICATION.md`](PRODUCTION_CERTIFICATION.md).

## You should be able to (no terminal)

- [ ] Open `/Applications/MathPilot.app` — no Python/SymPy banner at top
- [ ] Complete onboarding + **adaptive diagnostic** (~25 questions or early stop)
- [ ] See **Coach desk** with a personalized narrative (Codex if installed; otherwise deterministic summary)
- [ ] **Start session** → submit answers → mastery/map updates
- [ ] Quit and reopen — progress persists (`~/Library/Application Support/local.mathpilot.desktop/`)

## Optional but recommended

- [ ] **Codex CLI** installed and signed in (`codex` in PATH) — best explanations, post-diagnostic curator, homework analysis
- [ ] Run diagnostic when focused; use **Adjust today** (Short/Normal/Deep) for session length

## Before sharing with friends

- [ ] Ship **DMG** or zipped `.app` (not “clone and pnpm”)
- [ ] Tell them: **Right-click → Open** first launch (unsigned app)
- [ ] Clarify: data stays on their Mac; Codex is optional and sends work to OpenAI when used

## Known limitations (not blockers for solo study)

| Item | Note |
|------|------|
| HealthKit | Not integrated |
| Cloud sync | None — one Mac = one profile |
| Codex | Not bundled; install separately for full AI |
| Problem bank | Large catalog; occasional odd prompt — report if confusing |
| Intel Mac | Build is Apple Silicon–first |

## If something fails

1. **Settings → Export** backup JSON  
2. **Settings → Reset** (type `RESET`) for clean diagnostic  
3. Reinstall: `./scripts/install-mathpilot-macos.sh` from repo after `desktop:build`

## Suggested first session (your eval)

1. Reset or fresh install  
2. Choose **Calculus 1** or **2** (or Calc 2 if you finished Calc 1)  
3. Finish diagnostic without rushing — use confidence prompts honestly  
4. Read **Why this now** + coach narrative  
5. Follow **Start** for 3–5 days before judging whether pacing feels right  

Mastery is **evidence-based** (delayed mixed review matters). Same-day perfect scores do not mean “mastered” until review passes.
