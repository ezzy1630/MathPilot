# MathPilot Product Elevation Design

Date: 2026-05-31

## Purpose

MathPilot needs to move from a capable beta into a distinctive, premium calculus learning environment. The app should feel adult, native to macOS, smooth, motivating, and immediately useful. Opening MathPilot should answer one question: what should I do now to improve at calculus?

This design covers the next full product elevation effort. It is based on `MathPilot_spec.md`, `PRODUCT.md`, the current repository, and four parallel audits covering UI/UX, feature gaps, learning/content quality, and data/AI/deployment readiness.

This is an umbrella design, not a request to merge every workstream in one patch. Implementation planning starts with Milestone 1: design foundation, Coach desk, focused Activity, basic Map support, trust-breaking UI fixes, and visual regression coverage. Later workstreams get their own implementation checkpoints so code changes stay reviewable and file overlap stays controlled.

## Product Direction

MathPilot should become a Coach desk, not a dashboard. The first screen should prioritize one recommended action, a concise diagnosis, session time/pace controls, and quiet evidence for why that action matters. Secondary modules should be available, but they should not compete with the recommendation.

The visual target is a distinctive premium learning environment with native macOS discipline. It should be calmer and more structured than a game, warmer and more engaging than a database tool, and more memorable than a generic Apple-blue productivity app. The product should use familiarity for controls and originality for the learning model: the desk, activity workspace, map evidence, and teaching feedback.

## Primary Experience Model

### Today: Coach Desk

Today becomes the main desk surface.

The first viewport should contain:

- a short coach note naming the current learning constraint
- one recommended action with a clear primary button
- a short reason based on mastery, review, homework, or diagnostic evidence
- a time/pace selector that feels like session setup, not settings
- a compact preview of the evidence behind the recommendation

Homework, formula recall, resources, progress reports, settings, and map inspection move into a quieter desk drawer or secondary strip. They remain one step away, but they no longer appear as equal dashboard cards.

The copy should feel like a trusted calculus coach: specific, direct, and strict without being cold. Prefer “Your current blocker is implicit differentiation setup” over generic labels like “Weak spots.”

### Activity: Focused Solving Workspace

Activity becomes the place where math work happens.

The visible workspace should prioritize:

- problem statement
- math input
- step input only when required or requested
- confidence or show-work controls only when useful
- submit action
- hint and lost actions

The current collection of help buttons should collapse into a contextual teaching inspector. The inspector state changes based on what is happening: before answer, wrong answer, correct answer, lost flow, homework repair, resource check, or diagnostic mode.

Feedback should read as one teaching response with a next move, not a grid of separate cards. Similar examples, repair, why-wrong explanations, and Codex help can still exist, but they should be staged as follow-up actions inside the inspector.

Math symbol controls should be adaptive. Common symbols stay close to the input, while advanced categories move into a compact popover or mode-specific palette.

Visual tools should appear when they clarify the current problem. Desmos, sign charts, and future built-in visuals should not occupy the inspector by default for skills where they add little value.

### Knowledge Map: Evidence Layer

The Knowledge Map should support trust in the recommendation. It should show:

- current blocker
- prerequisite chain
- weak or decayed skills
- mastery evidence
- skills affected by the current session
- why a recommended action was selected

The current wheel is a starting point, but it hides too much structure. The next map should move toward an ALEKS-like mastery structure with fuller node coverage, area grouping, prerequisite context, and clear state labels. It must keep an accessible list/tree alternative with keyboard navigation and equivalent information.

### Secondary Surfaces

Resources become a contextual support system first and a browse page second. The dedicated Resources screen should have a good empty state, but the highest-value resource recommendations should appear in Activity and Today when relevant.

Settings should use explicit labels, standard controls, and grouped native-feeling rows. Developer mode should require a deliberate confirmation that explains logs, backups, code modification, privacy, and rollback.

Onboarding should feel like setting up a private calculus desk, not a generic SaaS wizard. It should establish local-first operation, course focus, diagnostic purpose, and the expected learning loop.

## Implementation Workstreams

### 1. Design Foundation And Shell

Create a stable design foundation before deeper screen work.

Scope:

- clean `--mp-*` token usage and remove stale undefined token references
- refine light and dark themes
- create consistent panel, row, button, segmented control, form field, modal, toast, and empty-state vocabulary
- replace thick side-stripe treatments with full-border, icon, or semantic panel treatments
- improve modal focus trap and focus restoration
- tighten responsive behavior for narrow Tauri windows and long math/skill text
- keep motion short, purposeful, and reduced-motion safe

### 2. Primary UI Flows

Redesign the surfaces the user lives in every day.

Scope:

- Today Coach desk
- Activity focused solving workspace
- contextual teaching inspector
- Knowledge Map recommendation support
- onboarding
- Resources empty and contextual states
- Settings and Developer mode trust improvements
- visual regression coverage for Today, Activity, Map, Settings, feedback, and empty states

### 3. Learning And Content Depth

Raise the learning engine from scaffold to mastery engine.

Scope:

- filter course graph extensions by course focus
- add missing prerequisite/topic nodes from the spec
- expand problem packs per skill with diagnostic, practice, repair, mixed, transfer, and misconception-tagged items
- replace generated-problem self-verification with independent validation
- upgrade diagnostic branching and evidence thresholds
- deepen feedback, mistake taxonomy, step grading, formula recall, interleaving, and review selection
- separate procedural, conceptual, transfer, and delayed mastery evidence where practical

### 4. AI And Homework Intelligence

Make Codex and homework help trustworthy and inspectable.

Scope:

- task-specific Codex sessions with timeout, cancel, cwd, and logging policy
- prompt/response viewer with privacy controls
- stronger manual ChatGPT/Gemini prompt-packet workflow
- schema validation and disagreement handling
- OCR-backed or multimodal homework analysis that passes usable content, not only file metadata
- wrong-step extraction and mistake tags from homework
- resource effectiveness updates from post-resource attempts

### 5. Data And Local-First Reliability

Make local state durable and production-safe.

Scope:

- load/save completeness for normalized SQLite tables
- migration tests and idempotent migration behavior
- move runtime data paths out of the repo for packaged app usage
- validate backup writes before recording maintenance success
- validate restore payloads and require clear confirmation
- enforce image retention policy in app data paths
- build rollback foundations for data, skills, memory, and future code changes

### 6. Build, Install, And Verification

The final app must update the real installed app, not only the dev build.

Scope:

- add a reliable Tauri desktop build path
- add an install/update command or script that replaces `/Applications/MathPilot.app`
- build and replace the installed app after successful verification
- launch `/Applications/MathPilot.app`
- inspect the real app visually with Computer Use
- iterate on issues found in the installed app

## Sequencing

Use parallel agents for independent analysis and bounded patches, but sequence edits when files overlap.

Recommended order:

1. Design foundation and shared components.
2. Today Coach desk and Activity workspace.
3. Knowledge Map support and secondary screen polish.
4. Course graph scope, content packs, diagnostics, generated-problem validation.
5. Codex, homework, memory, skills, and maintenance workflows.
6. SQLite completeness, migration tests, packaged data paths, backup/restore hardening.
7. Tauri build, `/Applications/MathPilot.app` replacement, installed-app visual QA.

The first implementation milestone should focus on design foundation, Today, Activity, basic Map support, trust-breaking UI fixes, and visual regression coverage. In parallel, bounded non-overlapping work can prepare course graph leakage fixes, generated-problem validation tests, persistence load gap tests, and install/update scripts.

## Acceptance Criteria

The elevation effort is not complete until:

- opening MathPilot shows one clear next action
- Today feels like a Coach desk, not a dashboard
- Activity feels focused and teaching-oriented
- Knowledge Map explains recommendations and weak spots
- core controls are consistent, labeled, keyboard-accessible, and responsive
- content and diagnostics can produce varied evidence beyond one prompt per skill
- generated problems are validated independently
- homework image/text analysis passes usable learning content to AI or OCR-backed analysis
- Codex use is logged, cancellable or bounded, and privacy-aware
- local state reloads from normalized SQLite without losing key learning data
- packaged app data no longer depends on the repo checkout
- `/Applications/MathPilot.app` is replaced with the built app
- the installed app is launched and visually inspected before final delivery

## Verification Plan

Run the strongest practical verification at each stage:

- `pnpm lint`
- `pnpm test`
- `pnpm build`
- relevant Playwright and visual tests
- Tauri desktop build when packaging changes are touched
- Rust tests once migration/data tests are added
- installed-app launch from `/Applications/MathPilot.app`
- Computer Use visual QA on the installed app

Any skipped verification must be reported with the reason.
