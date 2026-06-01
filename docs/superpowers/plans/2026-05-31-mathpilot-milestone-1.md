# MathPilot Milestone 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make MathPilot feel like a premium Coach desk learning app by redesigning the shared UI foundation, Today, Activity, basic Map support, secondary trust surfaces, and visual regression coverage.

**Architecture:** Keep the current React/Tauri app and existing domain engines. Extract small UI helpers only where they reduce repeated raw controls, then reshape the existing views in `AppViews.tsx` instead of rewriting the whole app shell. CSS remains centralized in `app-shell.css` and `tokens.css` for this milestone so the implementation is reviewable.

**Tech Stack:** React 19, TypeScript, Vite, Tauri 2, Vitest, Playwright, lucide-react, MathLive.

---

## File Structure

- Modify `apps/desktop/src/styles/tokens.css`: refine app-level design tokens, semantic surfaces, focus, and shadow/radius vocabulary.
- Modify `apps/desktop/src/app/app-shell.css`: implement Coach desk, focused Activity, inspector, Map support, secondary surface, modal, and responsive styles.
- Modify `apps/desktop/src/ui/Button.tsx`: support consistent icon-only and loading/pressed states without forcing each view to hand-roll button classes.
- Modify `apps/desktop/src/ui/Modal.tsx`: add focus trapping and focus restoration.
- Modify `apps/desktop/src/ui/index.ts`: export any new or changed primitives.
- Create `apps/desktop/src/ui/SegmentedControl.tsx`: one segmented-control primitive for pace, themes, and mode toggles.
- Create `apps/desktop/src/ui/Panel.tsx`: one panel primitive for desk drawers, inspector blocks, and secondary information.
- Modify `apps/desktop/src/views/AppViews.tsx`: redesign Today, Activity, Map copy/support, Resources empty state, Settings labels, Developer confirmation, and onboarding copy.
- Modify `apps/desktop/src/components/KnowledgeMapWheel.tsx`: make wheel states and accessible fallback hooks clearer without full map rewrite.
- Modify `apps/desktop/src/components/ProgressReport.tsx`: replace stale non-`--mp-*` variables.
- Modify `apps/desktop/e2e/acceptance.spec.ts`: update role/text assertions for Coach desk and Activity inspector.
- Modify `apps/desktop/e2e/visual.spec.ts`: capture the redesigned Today, Activity, feedback, Map, Settings, and onboarding states.

## Task 1: Foundation Regression Tests

**Files:**
- Modify: `apps/desktop/e2e/acceptance.spec.ts`
- Modify: `apps/desktop/e2e/visual.spec.ts`
- Test: `apps/desktop/e2e/acceptance.spec.ts`
- Test: `apps/desktop/e2e/visual.spec.ts`

- [ ] **Step 1: Update the onboarded acceptance expectations before changing UI**

Replace the central assertions in `apps/desktop/e2e/acceptance.spec.ts` for the onboarded path with Coach desk and focused Activity expectations:

```ts
await expect(page.getByRole('heading', { name: 'Coach desk' })).toBeVisible({ timeout: 15_000 })
await expect(page.getByText('Recommended next move')).toBeVisible()
await expect(page.getByText('Why this now')).toBeVisible()
await expect(page.getByText('Session pace')).toBeVisible()
const continueBtn = page.getByRole('button', { name: /Start session|Continue session|Resume diagnostic|Practice/i }).first()
await continueBtn.click()
await expect(page.getByRole('button', { name: 'Check answer' })).toBeVisible({ timeout: 15_000 })
await expect(page.getByRole('complementary', { name: 'Teaching inspector' })).toBeVisible()
await expect(page.getByRole('button', { name: 'More help' })).toBeHidden()
await page.getByRole('button', { name: 'Knowledge map' }).click()
await expect(page.getByRole('img', { name: 'Knowledge map wheel' })).toBeVisible()
await expect(page.getByText('Recommendation evidence')).toBeVisible()
```

- [ ] **Step 2: Update the visual QA expectations before changing UI**

Replace the Today and Activity text checks in `apps/desktop/e2e/visual.spec.ts`:

```ts
await expect(page.getByRole('heading', { name: 'Coach desk' })).toBeVisible({ timeout: 15_000 })
await expect(page.getByText('Recommended next move')).toBeVisible()
await attachViewport(page, 'today-coach-desk.png')

await page.getByRole('button', { name: /Start session|Continue session|Resume diagnostic|Practice/i }).first().click()
await expect(page.getByRole('button', { name: 'Check answer' })).toBeVisible()
await expect(page.getByRole('complementary', { name: 'Teaching inspector' })).toBeVisible()
await attachViewport(page, 'activity-studio.png')

await page.getByRole('button', { name: 'Check answer' }).click()
await expect(page.getByText('Next move').or(page.getByText('Keep moving'))).toBeVisible()
await attachViewport(page, 'teaching-feedback.png')
```

- [ ] **Step 3: Run the focused E2E tests and confirm they fail**

Run:

```bash
pnpm --filter @mathpilot/desktop test:e2e -- acceptance.spec.ts visual.spec.ts
```

Expected: FAIL because `Coach desk`, `Recommended next move`, `Teaching inspector`, and `Recommendation evidence` do not exist yet.

- [ ] **Step 4: Commit the failing test expectations**

```bash
git add apps/desktop/e2e/acceptance.spec.ts apps/desktop/e2e/visual.spec.ts
git commit -m "test: define milestone 1 UI expectations"
```

## Task 2: Shared UI Foundation

**Files:**
- Modify: `apps/desktop/src/styles/tokens.css`
- Modify: `apps/desktop/src/app/app-shell.css`
- Modify: `apps/desktop/src/ui/Button.tsx`
- Modify: `apps/desktop/src/ui/Modal.tsx`
- Modify: `apps/desktop/src/ui/index.ts`
- Create: `apps/desktop/src/ui/Panel.tsx`
- Create: `apps/desktop/src/ui/SegmentedControl.tsx`
- Test: `pnpm --filter @mathpilot/desktop lint`

- [ ] **Step 1: Add semantic tokens**

Append these tokens inside the `:root` block in `apps/desktop/src/styles/tokens.css` and add dark equivalents inside `.theme-dark`:

```css
  --mp-bg-coach: #f1f4f6;
  --mp-surface: #ffffff;
  --mp-surface-soft: #f9fafb;
  --mp-surface-selected: rgba(18, 100, 216, 0.08);
  --mp-focus-ring: rgba(18, 100, 216, 0.34);
  --mp-shadow-coach: 0 18px 52px rgba(20, 28, 38, 0.1);
```

```css
  --mp-bg-coach: #0f1412;
  --mp-surface: #1a201d;
  --mp-surface-soft: #141a17;
  --mp-surface-selected: rgba(99, 209, 183, 0.14);
  --mp-focus-ring: rgba(99, 209, 183, 0.4);
  --mp-shadow-coach: 0 18px 52px rgba(0, 0, 0, 0.42);
```

- [ ] **Step 2: Extend the Button primitive**

Replace `ButtonProps` and the `Button` body in `apps/desktop/src/ui/Button.tsx` with:

```tsx
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  icon?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  iconOnly?: boolean
}

export function Button({
  variant = 'secondary',
  icon,
  size = 'md',
  loading = false,
  iconOnly = false,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`mp-btn ${variantClass[variant]} mp-btn-${size} ${iconOnly ? 'mp-btn-icon-only' : ''} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {icon}
      {!iconOnly && <span>{loading ? 'Working...' : children}</span>}
    </button>
  )
}
```

- [ ] **Step 3: Create Panel primitive**

Create `apps/desktop/src/ui/Panel.tsx`:

```tsx
import type { ReactNode } from 'react'

export function Panel({
  children,
  className = '',
  ariaLabel,
}: {
  children: ReactNode
  className?: string
  ariaLabel?: string
}) {
  return (
    <section className={`mp-panel ${className}`.trim()} aria-label={ariaLabel}>
      {children}
    </section>
  )
}
```

- [ ] **Step 4: Create SegmentedControl primitive**

Create `apps/desktop/src/ui/SegmentedControl.tsx`:

```tsx
export interface SegmentOption<T extends string> {
  value: T
  label: string
  description?: string
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: SegmentOption<T>[]
  onChange: (value: T) => void
}) {
  return (
    <div className="mp-segmented-field">
      <span className="mp-field-label">{label}</span>
      <div className="mp-segmented" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            className={value === option.value ? 'active' : ''}
            onClick={() => onChange(option.value)}
            title={option.description}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Export the primitives**

Update `apps/desktop/src/ui/index.ts`:

```ts
export * from './Button'
export * from './Card'
export * from './MasteryBadge'
export * from './Modal'
export * from './Panel'
export * from './SegmentedControl'
export * from './Toast'
export * from './toastState'
```

- [ ] **Step 6: Add focus trap and restoration to Modal**

In `apps/desktop/src/ui/Modal.tsx`, replace the `useEffect` body with:

```tsx
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const panel = panelRef.current
    panel?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab' || !panel) return
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (!focusable.length) {
        e.preventDefault()
        panel.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previous?.focus()
    }
  }, [onClose])
```

- [ ] **Step 7: Add shared CSS classes**

Add to `apps/desktop/src/app/app-shell.css` near the existing component styles:

```css
.mp-panel {
  background: var(--mp-surface);
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-radius-lg);
  box-shadow: var(--mp-shadow-sm);
}

.mp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: var(--mp-transition);
  white-space: nowrap;
}

.mp-btn-sm { min-height: 32px; padding: 0 10px; font-size: 0.8125rem; }
.mp-btn-md { min-height: 38px; padding: 0 14px; font-size: 0.9rem; }
.mp-btn-lg { min-height: 46px; padding: 0 18px; font-size: 0.96rem; }
.mp-btn-icon-only { width: 38px; padding: 0; }
.mp-btn-primary { background: var(--mp-accent); color: white; }
.mp-btn-primary:hover { background: var(--mp-accent-hover); }
.mp-btn-secondary { background: var(--mp-bg-elevated); color: var(--mp-text); border-color: var(--mp-border); }
.mp-btn-secondary:hover { background: var(--mp-bg-muted); }
.mp-btn-ghost { background: transparent; color: var(--mp-text-secondary); }
.mp-btn-ghost:hover { background: var(--mp-bg-muted); color: var(--mp-text); }
.mp-btn-danger { background: color-mix(in srgb, var(--mp-danger) 12%, transparent); color: var(--mp-danger); border-color: color-mix(in srgb, var(--mp-danger) 25%, transparent); }
.mp-btn:disabled { cursor: not-allowed; opacity: 0.56; }

.mp-field-label {
  display: block;
  color: var(--mp-text-secondary);
  font-size: 0.8125rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.mp-segmented {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--mp-border);
  border-radius: 12px;
  background: var(--mp-bg-muted);
}

.mp-segmented button {
  border: none;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  background: transparent;
  color: var(--mp-text-secondary);
  cursor: pointer;
}

.mp-segmented button.active,
.mp-segmented button[aria-checked='true'] {
  background: var(--mp-surface);
  color: var(--mp-text);
  box-shadow: var(--mp-shadow-sm);
}
```

- [ ] **Step 8: Run lint**

Run:

```bash
pnpm --filter @mathpilot/desktop lint
```

Expected: PASS.

- [ ] **Step 9: Commit shared foundation**

```bash
git add apps/desktop/src/styles/tokens.css apps/desktop/src/app/app-shell.css apps/desktop/src/ui
git commit -m "feat: strengthen shared UI foundation"
```

## Task 3: Today Coach Desk

**Files:**
- Modify: `apps/desktop/src/views/AppViews.tsx`
- Modify: `apps/desktop/src/app/app-shell.css`
- Test: `apps/desktop/e2e/acceptance.spec.ts`

- [ ] **Step 1: Import shared primitives and icons**

In `apps/desktop/src/views/AppViews.tsx`, include `Panel`, `SegmentedControl`, and `Button` from `../ui`, and add `Clock3`, `FolderOpen`, and `ShieldCheck` to the lucide import.

```tsx
import { Button, MasteryBadge, Panel, SegmentedControl } from '../ui'
```

- [ ] **Step 2: Add Coach desk derived copy**

Inside `TodayView`, after `focusAreas`, add:

```tsx
  const coachConstraint = primarySkill
    ? `${primarySkill.name} is the current constraint.`
    : `${state.currentFocus} calibration is the current constraint.`
  const actionLabel = diagnostic && !diagnostic.completed
    ? 'Resume diagnostic'
    : nextAction.kind === 'quick_repair'
      ? 'Start repair'
      : nextAction.kind === 'mixed_review'
        ? 'Start review'
        : 'Start session'
  const evidenceItems = [
    `${due} review${due === 1 ? '' : 's'} ready`,
    `${weakCount} weak skill${weakCount === 1 ? '' : 's'}`,
    `${readinessValue}% course readiness`,
  ]
```

- [ ] **Step 3: Replace the Today header and continue hero**

Replace the `today-header`, `continue-hero`, and `today-support-grid` sections with:

```tsx
      <header className="coach-desk-header">
        <div>
          <p className="eyebrow">{state.profileName ? `Hi, ${state.profileName}` : 'Private calculus desk'}</p>
          <h1>Coach desk</h1>
          <p className="today-subtitle">{coachConstraint} MathPilot will keep the next move small and measurable.</p>
        </div>
        {onOpenSettings && (
          <Button variant="secondary" size="sm" onClick={onOpenSettings}>
            Settings
          </Button>
        )}
      </header>

      <section className="coach-desk" aria-label="Recommended next move">
        <div className="coach-primary">
          <p className="eyebrow">Recommended next move</p>
          <h2>{nextAction.title}</h2>
          <p className="coach-reason">{nextAction.reason}</p>
          <div className="coach-actions">
            <Button variant="primary" size="lg" icon={<Play size={18} />} onClick={startAction}>
              {actionLabel}
            </Button>
            <Button variant="ghost" size="lg" icon={<Eye size={18} />} onClick={onWhy}>
              Why this now
            </Button>
          </div>
        </div>
        <aside className="coach-card" aria-label="Session setup">
          <SegmentedControl
            label="Session pace"
            value={sessionPace}
            options={(Object.keys(paceLabels) as SessionPace[]).map((pace) => ({
              value: pace,
              label: paceLabels[pace],
            }))}
            onChange={setPace}
          />
          <div className="coach-evidence" aria-label="Why this now">
            <p className="eyebrow">Why this now</p>
            {evidenceItems.map((item) => (
              <span key={item}>
                <ShieldCheck size={14} />
                {item}
              </span>
            ))}
          </div>
        </aside>
      </section>

      <section className="desk-drawer" aria-label="Desk drawer">
        <Panel className="desk-drawer-card">
          <FolderOpen size={18} />
          <div>
            <strong>Homework</strong>
            <span>Paste, drop, or type work to turn mistakes into repair.</span>
          </div>
        </Panel>
        <Panel className="desk-drawer-card">
          <Map size={18} />
          <div>
            <strong>Map evidence</strong>
            <span>{focusAreas[0] ? `${focusAreas[0].area} needs attention.` : 'Your map will sharpen after the next session.'}</span>
          </div>
        </Panel>
        <Panel className="desk-drawer-card">
          <Clock3 size={18} />
          <div>
            <strong>Recall</strong>
            <span>Use formula recall when a rule is blocking the session.</span>
          </div>
        </Panel>
      </section>
```

- [ ] **Step 4: Keep homework and formula panels reachable below the drawer**

Move the existing `HomeworkUpload`, `HomeworkResultCard`, and `FormulaRecallPanel` rendering below `desk-drawer`, wrapped in a `<section className="coach-secondary-stack">`. Keep the existing props unchanged.

```tsx
      <section className="coach-secondary-stack" aria-label="Desk tools">
        <HomeworkUpload
          text={homeworkText}
          onTextChange={setHomeworkText}
          onAnalyze={(p, saveRaw) => void analyzeHomework(p, saveRaw)}
          compact
        />
        {homeworkAnalyzing && <p className="eyebrow">Analyzing homework...</p>}
        {state.homeworkAnalyses[0] && (
          <HomeworkResultCard analysis={state.homeworkAnalyses[0]} onStartRepair={onStartRepair} />
        )}
        {showFormulaRecall && (
          <FormulaRecallPanel state={state} onComplete={() => onFormulaRecallDone()} />
        )}
      </section>
```

- [ ] **Step 5: Add Coach desk CSS**

Add to `apps/desktop/src/app/app-shell.css` near Today styles:

```css
.coach-desk-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;
}

.coach-desk-header h1 {
  font-size: 1.875rem;
  line-height: 1.15;
  letter-spacing: -0.025em;
  margin: 0;
}

.coach-desk {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
  gap: 22px;
  padding: 28px;
  border: 1px solid var(--mp-border);
  border-radius: 18px;
  background: linear-gradient(135deg, var(--mp-surface) 0%, var(--mp-bg-coach) 100%);
  box-shadow: var(--mp-shadow-coach);
}

.coach-primary h2 {
  max-width: 12ch;
  margin: 0 0 12px;
  font-size: 2rem;
  line-height: 1.15;
  letter-spacing: -0.025em;
}

.coach-reason {
  max-width: 62ch;
  color: var(--mp-text-secondary);
  font-size: 1rem;
  line-height: 1.6;
  margin: 0;
}

.coach-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
}

.coach-card {
  display: grid;
  gap: 18px;
  padding: 18px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--mp-surface) 86%, transparent);
  border: 1px solid var(--mp-border);
}

.coach-evidence {
  display: grid;
  gap: 8px;
}

.coach-evidence span,
.desk-drawer-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: var(--mp-text-secondary);
  font-size: 0.875rem;
}

.desk-drawer {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.desk-drawer-card {
  min-height: 86px;
  padding: 16px;
}

.desk-drawer-card strong {
  display: block;
  color: var(--mp-text);
  margin-bottom: 3px;
}

.coach-secondary-stack {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}
```

- [ ] **Step 6: Run the onboarded acceptance test**

Run:

```bash
pnpm --filter @mathpilot/desktop test:e2e -- acceptance.spec.ts
```

Expected: onboarded path now reaches Activity; failures remaining should be Activity inspector expectations only.

- [ ] **Step 7: Commit Today redesign**

```bash
git add apps/desktop/src/views/AppViews.tsx apps/desktop/src/app/app-shell.css apps/desktop/e2e/acceptance.spec.ts apps/desktop/e2e/visual.spec.ts
git commit -m "feat: redesign today as coach desk"
```

## Task 4: Focused Activity And Teaching Inspector

**Files:**
- Modify: `apps/desktop/src/views/AppViews.tsx`
- Modify: `apps/desktop/src/app/app-shell.css`
- Test: `apps/desktop/e2e/acceptance.spec.ts`

- [ ] **Step 1: Add inspector derived state**

Inside `ActivityView`, after `const signChart = ...`, add:

```tsx
  const inspectorTitle = feedback
    ? feedbackTone === 'correct'
      ? 'Keep moving'
      : 'Next move'
    : isDiagnostic
      ? 'Diagnostic focus'
      : 'Teaching inspector'
  const inspectorBody = feedback
    ? isDiagnostic
      ? 'Answer recorded. Keep moving so the map can calibrate.'
      : feedback
    : isDiagnostic
      ? 'Work cleanly. Diagnostics only need enough feedback to calibrate the map.'
      : 'Use a hint if you are blocked. If the setup feels unsteady, mark that you are lost.'
  const graphExpression = primaryGraphExpression(problem)
  const showGraph = Boolean(graphExpression && problem.skillIds.some((id) => id.includes('graph') || id.includes('derivative') || id.includes('optimization') || id.includes('area')))
```

- [ ] **Step 2: Replace the visible help button cluster**

Replace the existing visible stuck/help tool block with:

```tsx
              <div className="activity-primary-actions">
                <Button variant="primary" icon={<CheckCircle2 size={18} />} onClick={submitAnswer} disabled={codexBusy}>
                  Check answer
                </Button>
                <Button variant="secondary" icon={<HelpCircle size={18} />} onClick={() => setHintCount(hintCount + 1)}>
                  Hint
                </Button>
                <Button variant="ghost" icon={<PanelRightOpen size={18} />} onClick={() => setLostOpen(true)}>
                  I'm lost
                </Button>
              </div>
```

- [ ] **Step 3: Replace feedback card grid with a teaching inspector**

Replace the `feedback-panel` rendering and the problem side panel header with one complementary inspector:

```tsx
        <aside className="teaching-inspector" role="complementary" aria-label="Teaching inspector">
          <div className={`inspector-card ${feedbackTone ? `inspector-${feedbackTone}` : ''}`}>
            <p className="eyebrow">{inspectorTitle}</p>
            <p>{inspectorBody}</p>
            {feedbackNextSteps?.length ? (
              <ul className="inspector-next">
                {feedbackNextSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            ) : null}
            <div className="inspector-actions">
              {!isDiagnostic && (
                <Button variant="secondary" size="sm" onClick={() => requestHelp('explain this problem')} loading={codexBusy}>
                  Ask Codex
                </Button>
              )}
              {!showSteps && (
                <Button variant="ghost" size="sm" onClick={() => setShowSteps(true)}>
                  Add steps
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => generatePacket('explain current problem attempt')}>
                Prompt packet
              </Button>
            </div>
          </div>
          {feedbackTone !== 'correct' && (
            <SimilarExamplePanel
              problem={problem}
              onTrySimilar={() => startAction(problemForSkill(state, problem.skillIds[0], problem.mode))}
            />
          )}
          {showGraph && graphExpression && <DesmosEmbed expression={graphExpression} />}
          {signChart && (
            <div className="mini-panel">
              <h3>Sign chart</h3>
              <SignChart intervals={signChart.intervals} testPoint={signChart.testPoint} />
            </div>
          )}
        </aside>
```

Remove the old `feedback-panel` block and the old `problem-side studio-side` block after the new `teaching-inspector` is in place.

- [ ] **Step 4: Collapse MathLive categories into a compact toolbar**

Change the math toolbar wrapper class from the category-heavy layout to:

```tsx
            <div className="math-toolbar compact" aria-label="Math shortcuts">
```

Show Core and Calculus groups by default. Render Trig, Greek, Linear, and Piecewise inside a native `<details className="symbol-drawer">`:

```tsx
              <details className="symbol-drawer">
                <summary>More symbols</summary>
                <div className="symbol-drawer-grid">
                  {/* move the existing Trig, Greek, Linear, Piecewise button groups here */}
                </div>
              </details>
```

- [ ] **Step 5: Add Activity CSS**

Add to `apps/desktop/src/app/app-shell.css` near Activity styles:

```css
.activity-primary-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.teaching-inspector {
  display: grid;
  align-content: start;
  gap: 14px;
  min-width: 0;
}

.inspector-card {
  padding: 18px;
  border-radius: 16px;
  border: 1px solid var(--mp-border);
  background: var(--mp-surface);
  box-shadow: var(--mp-shadow-sm);
}

.inspector-card > p:not(.eyebrow) {
  margin: 0;
  color: var(--mp-text-secondary);
  line-height: 1.55;
}

.inspector-correct { border-color: color-mix(in srgb, var(--mp-success) 28%, var(--mp-border)); }
.inspector-wrong { border-color: color-mix(in srgb, var(--mp-danger) 26%, var(--mp-border)); }
.inspector-almost { border-color: color-mix(in srgb, var(--mp-warning) 28%, var(--mp-border)); }

.inspector-next {
  margin: 12px 0 0;
  padding-left: 18px;
  color: var(--mp-text-secondary);
}

.inspector-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.math-toolbar.compact {
  display: grid;
  gap: 10px;
}

.symbol-drawer summary {
  cursor: pointer;
  color: var(--mp-text-secondary);
  font-size: 0.875rem;
}

.symbol-drawer-grid {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}
```

- [ ] **Step 6: Run Activity acceptance**

Run:

```bash
pnpm --filter @mathpilot/desktop test:e2e -- acceptance.spec.ts
```

Expected: Activity assertions pass, or failures identify exact missed labels.

- [ ] **Step 7: Commit Activity redesign**

```bash
git add apps/desktop/src/views/AppViews.tsx apps/desktop/src/app/app-shell.css apps/desktop/e2e/acceptance.spec.ts apps/desktop/e2e/visual.spec.ts
git commit -m "feat: focus activity around teaching inspector"
```

## Task 5: Knowledge Map Recommendation Support

**Files:**
- Modify: `apps/desktop/src/views/AppViews.tsx`
- Modify: `apps/desktop/src/components/KnowledgeMapWheel.tsx`
- Modify: `apps/desktop/src/app/app-shell.css`
- Test: `apps/desktop/e2e/acceptance.spec.ts`

- [ ] **Step 1: Add recommendation evidence panel to KnowledgeMap**

At the top of `KnowledgeMap`, derive the lowest-readiness area and current weak skill:

```tsx
  const weakestArea = Object.keys(areaGroups)
    .map((area) => ({ area, score: areaReadiness(state, area) }))
    .sort((a, b) => a.score - b.score)[0]
  const weakestSkill = Object.values(state.skills)
    .filter((skill) => state.mastery[skill.id]?.masteryScore < 0.45)
    .sort((a, b) => (state.mastery[a.id]?.masteryScore ?? 0) - (state.mastery[b.id]?.masteryScore ?? 0))[0]
```

Render this after the topbar:

```tsx
      <section className="map-evidence" aria-label="Recommendation evidence">
        <div>
          <p className="eyebrow">Recommendation evidence</p>
          <h2>{weakestSkill ? weakestSkill.name : 'Map calibration'}</h2>
          <p>
            {weakestArea
              ? `${weakestArea.area} is the lowest-readiness area at ${Math.round(weakestArea.score * 100)}%.`
              : 'Complete a session to sharpen the map.'}
          </p>
        </div>
        {weakestSkill && <MasteryBadge state={state.mastery[weakestSkill.id]?.masteryState ?? 'Unknown'} />}
      </section>
```

- [ ] **Step 2: Align legend labels with mastery states**

In the Knowledge Map legend, include labels for Unknown, Weak, Learning, Developing, Solid, Mastered, and Decayed. Use the same state strings supported by `MasteryBadge`.

```tsx
{(['Unknown', 'Weak', 'Learning', 'Developing', 'Solid', 'Mastered', 'Decayed'] as const).map((stateName) => (
  <MasteryBadge key={stateName} state={stateName} />
))}
```

- [ ] **Step 3: Improve wheel accessible description**

In `KnowledgeMapWheel.tsx`, add a text description before the SVG:

```tsx
<p className="sr-only" id="knowledge-map-wheel-description">
  Knowledge map wheel grouped by calculus area. Use the list or prerequisite tree view for full keyboard navigation.
</p>
```

Add `aria-describedby="knowledge-map-wheel-description"` to the SVG.

- [ ] **Step 4: Add map evidence CSS**

Add:

```css
.map-evidence {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px;
  margin-bottom: 18px;
  border: 1px solid var(--mp-border);
  border-radius: 16px;
  background: var(--mp-surface);
}

.map-evidence h2 {
  margin: 0 0 6px;
  font-size: 1.125rem;
}

.map-evidence p {
  margin: 0;
  color: var(--mp-text-secondary);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

- [ ] **Step 5: Run map acceptance**

Run:

```bash
pnpm --filter @mathpilot/desktop test:e2e -- acceptance.spec.ts
```

Expected: Knowledge Map assertions pass.

- [ ] **Step 6: Commit Map support**

```bash
git add apps/desktop/src/views/AppViews.tsx apps/desktop/src/components/KnowledgeMapWheel.tsx apps/desktop/src/app/app-shell.css apps/desktop/e2e/acceptance.spec.ts
git commit -m "feat: add map recommendation evidence"
```

## Task 6: Secondary Trust Surfaces

**Files:**
- Modify: `apps/desktop/src/views/AppViews.tsx`
- Modify: `apps/desktop/src/app/app-shell.css`
- Test: `pnpm --filter @mathpilot/desktop lint`

- [ ] **Step 1: Add Resources empty state**

In `Resources`, before rendering `resource-list`, add:

```tsx
      {resources.length === 0 && (
        <section className="resource-empty" aria-label="No resources">
          <BookOpen size={22} />
          <div>
            <h2>No ranked resources yet</h2>
            <p>Start a session or repair a skill. MathPilot will rank resources when they are useful for the current blocker.</p>
          </div>
        </section>
      )}
```

- [ ] **Step 2: Add explicit Settings labels**

For each Settings select/input, add an `id` and bind the visible label with `htmlFor`. Example pattern:

```tsx
<label htmlFor="theme-select">Theme</label>
<select
  id="theme-select"
  value={state.preferences?.theme ?? 'system'}
  onChange={(event) => update({ ...state, preferences: { ...state.preferences, theme: event.target.value as NonNullable<MathPilotState['preferences']>['theme'] } })}
>
```

Apply the same pattern to tone, active video mode, gamification, reports, and profile name.

- [ ] **Step 3: Add Developer mode confirmation**

In `SettingsView`, replace the direct developer enable button action with:

```tsx
onClick={() => {
  const ok = window.confirm(
    'Enable Developer mode? This exposes Codex packets, backups, restore controls, and future code-change workflows. Use it only when you want to inspect or change local app internals.',
  )
  if (ok) update({ ...state, developerModeEnabled: true })
}}
```

- [ ] **Step 4: Remove thick developer side stripes**

In `apps/desktop/src/app/app-shell.css`, replace developer selectors that use `border-left: 3px` or thicker with full-border panels:

```css
.developer-page {
  border: 1px solid color-mix(in srgb, var(--mp-accent-2) 24%, var(--mp-border));
  border-radius: 18px;
  padding: 20px;
  background: color-mix(in srgb, var(--mp-accent-2) 5%, var(--mp-bg));
}
```

- [ ] **Step 5: Refresh onboarding copy**

Change onboarding text to private desk language:

```tsx
<h1>Set up your calculus desk</h1>
<p className="lead">
  MathPilot keeps your progress local, finds the next useful problem, and updates the map from real work.
</p>
```

Keep the existing three-step flow and button behavior.

- [ ] **Step 6: Add secondary surface CSS**

Add:

```css
.resource-empty {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 18px;
  border: 1px solid var(--mp-border);
  border-radius: 16px;
  background: var(--mp-surface);
}

.resource-empty h2 {
  margin: 0 0 6px;
  font-size: 1rem;
}

.resource-empty p {
  margin: 0;
  color: var(--mp-text-secondary);
}
```

- [ ] **Step 7: Run lint**

Run:

```bash
pnpm --filter @mathpilot/desktop lint
```

Expected: PASS.

- [ ] **Step 8: Commit secondary surface trust fixes**

```bash
git add apps/desktop/src/views/AppViews.tsx apps/desktop/src/app/app-shell.css
git commit -m "feat: polish secondary trust surfaces"
```

## Task 7: Visual Regression And Responsive Polish

**Files:**
- Modify: `apps/desktop/e2e/visual.spec.ts`
- Modify: `apps/desktop/src/app/app-shell.css`
- Test: `apps/desktop/e2e/visual.spec.ts`

- [ ] **Step 1: Add mobile/narrow visual capture**

Append this test to `apps/desktop/e2e/visual.spec.ts`:

```ts
test('captures narrow coach desk and activity layouts', async ({ page }) => {
  await page.setViewportSize({ width: 860, height: 900 })
  await page.addInitScript(seedVisualState)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Coach desk' })).toBeVisible({ timeout: 15_000 })
  await attachViewport(page, 'today-narrow.png')
  await page.getByRole('button', { name: /Start session|Continue session|Resume diagnostic|Practice/i }).first().click()
  await expect(page.getByRole('complementary', { name: 'Teaching inspector' })).toBeVisible()
  await attachViewport(page, 'activity-narrow.png')
})
```

- [ ] **Step 2: Add responsive CSS for Coach desk and Activity**

Extend the existing `@media (max-width: 900px)` block:

```css
  .coach-desk,
  .desk-drawer,
  .activity-studio {
    grid-template-columns: 1fr;
  }

  .coach-desk {
    padding: 20px;
  }

  .coach-primary h2 {
    max-width: none;
    font-size: 1.55rem;
  }

  .teaching-inspector {
    order: 2;
  }
```

- [ ] **Step 3: Run visual tests**

Run:

```bash
pnpm --filter @mathpilot/desktop test:e2e -- visual.spec.ts
```

Expected: PASS and screenshots attached by Playwright.

- [ ] **Step 4: Commit visual coverage**

```bash
git add apps/desktop/e2e/visual.spec.ts apps/desktop/src/app/app-shell.css
git commit -m "test: cover redesigned visual surfaces"
```

## Task 8: Milestone Verification And Handoff

**Files:**
- Modify only if needed to fix failures discovered by verification.
- Test: full local verification.

- [ ] **Step 1: Run lint**

```bash
pnpm lint
```

Expected: PASS.

- [ ] **Step 2: Run unit tests**

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 3: Run web build**

```bash
pnpm build
```

Expected: PASS. Existing chunk warnings are acceptable only if unchanged from the baseline.

- [ ] **Step 4: Run E2E tests**

```bash
pnpm test:e2e
```

Expected: PASS. If browser dependencies are missing, install with the project-supported Playwright command and rerun.

- [ ] **Step 5: Run static stale-token check**

```bash
rg -n "var\\(--(accent|border-subtle|surface-raised|text-muted)" apps/desktop/src
```

Expected: no matches.

- [ ] **Step 6: Commit verification fixes**

If verification required code changes:

```bash
git add apps/desktop/src apps/desktop/e2e
git commit -m "fix: resolve milestone 1 verification issues"
```

If no files changed, do not create an empty commit.

- [ ] **Step 7: Report Milestone 1 status**

Summarize:

- changed screens and components
- test commands run and results
- remaining known gaps deferred to Milestone 2
- whether the tree is clean

Do not replace `/Applications/MathPilot.app` in Milestone 1 unless Tauri packaging work is also completed and verified in a separate plan.

## Self-Review Notes

- Spec coverage: This plan covers the approved Milestone 1 scope from the product elevation design: shared UI foundation, Coach desk, Activity, basic Map support, trust-breaking UI fixes, and visual regression coverage.
- Deferred scope: learning content scale, generated-problem validation, persistence completeness, Codex session management, packaged app data paths, and `/Applications/MathPilot.app` replacement remain in later implementation milestones.
- Red-flag scan: the task steps avoid vague edge-case instructions and unstated test commands.
- Type consistency: new `Panel`, `SegmentedControl`, and `Button` props are defined before usage; route/view names remain unchanged.
