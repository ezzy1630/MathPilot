# MathPilot `spec.md`

## 0. Product Summary

**MathPilot** is a private, local-first macOS desktop app for mastering Calculus 1 and Calculus 2. It is not a generic chatbot, not a normal school-style homework portal, and not just a video playlist. It is a personal calculus mastery engine that decides what the user should do next, teaches through high-quality external resources and targeted explanations, gives adaptive practice, diagnoses weak skills, schedules review, and continuously improves its own learning system over time.

The product should feel polished, native, smooth, and easy to use. The user should be able to open MathPilot and immediately understand what to do right now.

Core idea:

```text
Open MathPilot
→ see one clear recommended next action
→ learn only what is needed
→ solve problems actively
→ get useful feedback
→ weak skills and mistake patterns update automatically
→ spaced review queue updates automatically
→ knowledge map reflects real mastery
→ MathPilot becomes better at teaching this user over time
```

MathPilot should support two primary course focuses:

- Calculus 1
- Calculus 2

The user can switch the current focus in settings. Prerequisite repair, class/syllabus support, review, homework analysis, and formula recall are modules inside the same unified system, not separate courses.

---

## 1. Product Philosophy

### 1.1 What MathPilot is

MathPilot is a local personal learning operating system for calculus.

It should combine:

- adaptive diagnostics
- skill graph mastery tracking
- curated video/resource learning
- worked examples
- guided practice
- independent practice
- mixed cumulative review
- spaced repetition
- interleaving
- mistake classification
- homework/photo analysis
- formula/theorem recall
- personalized teaching memory
- Codex CLI-powered AI assistance
- self-improving local skills and maintenance

MathPilot should be strict about mastery but friendly when helping.

### 1.2 What MathPilot is not

MathPilot is not:

- a simple quiz app
- a clone of Khan Academy
- a generic ChatGPT wrapper
- a school LMS
- a normal “watch video then homework” app
- a gamified children’s app
- a system that relies on one giant chat context
- a system that moves on just because the user finished a chapter
- a system that marks equivalent math answers wrong due to exact-string mismatch

### 1.3 Learning philosophy

The system should optimize for durable, transferable calculus mastery, not same-day fluency.

Core principles:

- short input, long output
- active problem solving over passive video watching
- practice testing / retrieval
- spaced review
- interleaving similar-looking problem types
- worked examples for new skills
- faded guidance from examples to independent work
- multiple representations: symbolic, graphical, numerical, verbal
- mistake diagnosis
- metacognitive honesty
- clear feedback: what is wrong, why it is wrong, what to try next
- mastery requires delayed mixed proof, not just one correct same-day problem

The best default session model is:

```text
short retrieval warm-up
→ brief concept input
→ worked example or targeted explanation
→ guided practice
→ independent practice
→ mixed review
→ feedback/mistake logging
→ review schedule update
```

But the UI should not necessarily expose this as school-like categories. The user experience should be simple: “Continue” and “what to do now.”

---

## 2. Non-Negotiable Product Requirements

1. **Local-first macOS desktop app.**
   - No required cloud account.
   - Data stored locally.
   - Internet can be assumed available, but core progress storage must be local.

2. **Polished native-feeling UI.**
   - Prefer a desktop app over a browser-only app.
   - Use a modern interface that feels like an Apple-style productivity app mixed with a prettier ALEKS-like learning map and very light serious gamification.

3. **Codex CLI is the primary AI backend.**
   - Do not require OpenAI API keys.
   - Use the user’s locally authenticated Codex CLI.
   - Support manual ChatGPT/Gemini prompt-packet mode as an alternate AI path.
   - Do not rely on browser automation of ChatGPT or Gemini as the main architecture.

4. **MathPilot owns the learning state.**
   - Codex can reason, teach, grade, generate, and improve.
   - The app must still store structured truth locally: attempts, skill graph, mastery, review queue, mistake patterns, resources, and skills.

5. **No whiteboard-first design.**
   - The user does not have an iPad and does not want to draw on a trackpad.
   - Prioritize excellent typed math input, final answer input, step input when useful, and photo upload for handwritten work.

6. **Answer checking must not be exact-match only.**
   - Use symbolic equivalence, numeric spot-checking, and AI judgment when needed.
   - Equivalent correct forms should be accepted or recognized as basically correct.

7. **Homework/photo uploads should not permanently bloat storage.**
   - Extract necessary data and learning signals.
   - Store analysis, mistake tags, and relevant extracted text.
   - Delete raw images by default unless the user explicitly saves them.

8. **Self-improvement is allowed.**
   - Codex can update learning skills, memory, and even app code.
   - Code modification must be visible in developer mode and logged.
   - Backups must be taken before major changes.
   - Dangerous actions should require approval.

9. **No forced weekly report.**
   - Reports only when the user asks.

10. **No panic mode.**
   - Do not build a special “panic before exam” mode unless the user explicitly changes this later.

---

## 3. Technology Direction

### 3.1 Recommended stack

Use a single monorepo with clean packages/folders.

Recommended app stack:

```text
MathPilot/
  apps/
    desktop/          # Tauri desktop app
  packages/
    ui/               # shared UI components
    learning-engine/  # mastery, review, diagnostics, planning
    math-engine/      # checking, templates, graph helpers
    ai-adapter/       # Codex CLI and prompt packet modes
    content-engine/   # resource ranking, video search, trusted sources
    data/             # schema, migrations, repositories
  skills/
    teaching/
    grading/
    resources/
    maintenance/
  memory/
    profile.md
    learning_model.md
    durable_notes.md
  config/
    sources.json
    course_graphs/
    app_settings.json
  docs/
    spec.md
```

Recommended technologies:

- **Desktop shell:** Tauri
- **Frontend:** React + TypeScript
- **Styling:** Tailwind or equivalent modern component styling
- **Database:** SQLite
- **Math input:** MathLive or equivalent high-quality mathfield
- **Math checking:** Python/SymPy where useful, plus numeric checks
- **Graphing:** lightweight built-in graphing plus external Desmos/GeoGebra fallback
- **AI backend:** Codex CLI subprocess adapter
- **Optional AI alternate:** manual prompt-packet copy/paste mode
- **Data formats:** SQLite for event/history/progress; Markdown/JSON/YAML for skills, memory, config, and course graphs

### 3.2 Python usage

Python should be used if useful, especially for math checking through SymPy.

Acceptable design:

- TypeScript app and learning engine
- Python sidecar or local subprocess for symbolic math tasks
- Python used only where it improves correctness and speed of implementation
- Codex may decide implementation details, but the app should not avoid Python if it helps

Examples of Python/SymPy tasks:

- simplify expression
- check symbolic equivalence
- differentiate/integrate for verification
- numeric spot-checking
- solve equations
- generate validated problem instances
- produce graph data

### 3.3 Internet requirement

The user usually has Wi-Fi, so internet availability is not a serious constraint.

However:

- local data must persist offline
- progress and review should not depend on internet
- videos, resource search, Codex CLI, and manual ChatGPT/Gemini packet workflows may need internet

### 3.4 Data storage

Use both SQLite and files.

SQLite should store:

- attempts
- sessions
- mastery records
- review queue
- diagnostic history
- resource usage
- generated problem records
- homework upload analyses
- event logs
- changelog entries
- Codex call metadata
- maintenance records

Markdown/JSON/YAML should store:

- local learning skills
- profile memory
- learning model memory
- durable preferences
- course skill graph
- resource source lists
- app settings
- prompt templates
- maintenance policies

---

## 4. Core User Experience

### 4.1 First-time setup

Keep onboarding simple.

Initial setup flow:

```text
1. Welcome to MathPilot
2. Choose current focus:
   - Calculus 1
   - Calculus 2
3. Brief explanation:
   MathPilot will diagnose your current level, find holes, and guide what to do next.
4. Start adaptive diagnostic
```

Do not ask a long survey during onboarding. The app should learn from the diagnostic and later usage.

### 4.2 Home / Today screen

The home screen should hide complexity by default.

Default home screen should show:

```text
Continue

Today’s best next step:
[short explanation of recommended action]

Primary button:
Start

Secondary:
Adjust today
View why
Open knowledge map
Settings
```

Example:

```text
Continue

Recommended next:
Repair chain rule setup before moving into related rates.

Why:
Your recent work shows you can apply derivative rules, but nested functions are still unstable under mixed conditions.

Start
Adjust today
View knowledge map
```

The screen should not feel like a dashboard full of chores. It should answer: **what do I do right now?**

### 4.3 Complexity toggle

The app should support simple and advanced views.

Default: simple.

Advanced view can reveal:

- rough dynamic study plan
- knowledge map
- weak skills
- upcoming review items
- recent mistakes
- resource effectiveness
- detailed progress analytics

### 4.4 Navigation structure

Do not force the user to leave their current flow for common actions.

Avoid a rigid sidebar like:

```text
Today
Knowledge Map
Learn/Solve
Review
Homework Uploads
Resources
Settings
Developer Mode
```

Some of those sections can exist, but the interaction should be fluid.

Preferred structure:

- **Today / Continue** as the main landing page
- **Knowledge Map** accessible from Today
- **Current Activity** handles learning, solving, review, videos, and feedback in one flow
- **Upload homework** available contextually from Today, Current Activity, and command/search, not only as a separate tab
- **Resources** accessible when relevant, not a place the user has to manually browse constantly
- **Settings**
- **Developer Mode** hidden inside Settings
- Optional command palette only if easy and helpful

### 4.5 Command palette

Not required.

If easy, add a command palette with `Cmd+K` for:

- upload homework
- start review
- show weak skills
- open knowledge map
- start diagnostic
- run maintenance
- open developer mode
- search resources

If this complicates the app, skip it initially.

### 4.6 Local reminders

Use only gentle local reminders if enabled by the user.

Default: no annoying notifications.

Possible notification types:

- review reminder
- “you planned to study today”
- diagnostic continuation
- optional local reminder before a scheduled study block

No daily reminders by default unless user opts in.

### 4.7 Local profile

No cloud account.

Use a local profile:

```text
profile:
  name: Student
  current_focus: Calc 1 or Calc 2
  preferences:
    tone: serious, direct, research-backed
    gamification: tasteful/minimal
    reports: on demand only
```

---

## 5. Visual Design Requirements

### 5.1 Visual identity

MathPilot should feel like:

```text
Apple-style clean productivity app
+ ALEKS-like knowledge visualization
+ slight serious Duolingo-like motivation
```

It should not feel childish, tacky, or corny.

Avoid language like:

- Mission complete
- XP explosion
- Boss battle
- Streak fire
- Level up! unless tastefully framed

Acceptable motivational language:

- Continue
- Progress saved
- Skill strengthened
- Review ready
- Mastery improved
- Weak spot found
- Ready for next step

### 5.2 Knowledge map

Knowledge map should combine:

- ALEKS-style topic wheel/cards
- simple top-level mastery
- expandable full map
- optional graph/tree view if useful

Default map style:

```text
Calculus 1

Readiness        72%
Limits           65%
Derivatives      58%
Applications     34%
Integration      12%
```

Each area expands into micro-skills:

```text
Derivatives
  derivative definition
  power rule
  product rule
  quotient rule
  chain rule
  implicit differentiation
  logarithmic differentiation
  derivatives of trig functions
  derivatives of exponentials/logs
```

Skill states:

```text
Unknown
Weak
Learning
Developing
Solid
Mastered
Needs Review
Decayed
```

### 5.3 Current activity UI

The current activity page should support:

- problem prompt
- math input
- optional step input
- hint buttons
- feedback panel
- “I’m lost” button
- “show similar example”
- “check setup”
- “explain why”
- “upload work photo”
- resource/video embedding when needed
- graph/visual panel when needed

But keep visible controls minimal and contextual.

### 5.4 Math input

The math input must be excellent.

Required support:

- fractions
- exponents
- subscripts
- square roots
- nth roots
- limits
- derivatives
- integrals
- summation
- infinity
- Greek letters
- trig functions
- logarithms
- absolute value
- piecewise functions
- vectors/parametric notation if needed for Calc 2
- series notation

User should not have to fight the input box.

Implementation suggestions:

- use MathLive or equivalent
- allow keyboard shortcuts
- allow LaTeX input
- allow buttons for common symbols
- convert to LaTeX and parseable internal math representation
- show preview clearly
- allow plain text for conceptual explanations

---

## 6. Learning Engine

### 6.1 Unified course focus

MathPilot has one unified system with a current focus.

Visible choices:

- Calculus 1
- Calculus 2

Internal modules:

- prerequisite repair
- diagnostic
- review
- class/syllabus alignment
- homework analysis
- resource learning
- formula/theorem recall
- test-out
- maintenance

### 6.2 Skill graph

The skill graph is the backbone of MathPilot.

Each skill should include:

```yaml
id: chain_rule
name: Chain Rule
course_area: Calculus 1
type: procedural/conceptual/mixed
prerequisites:
  - derivative_rules_basic
  - function_composition
supports:
  - implicit_differentiation
  - related_rates
  - optimization
  - u_substitution
mastery_state: Learning
mastery_score: 0.62
last_practiced: 2026-05-28
review_due: 2026-05-31
common_mistakes:
  - differentiates outer function but forgets inner derivative
  - treats nested expression as linear
  - fails to identify composition structure
resources:
  - Khan Academy link
  - Organic Chemistry Tutor link
  - custom worked example
```

### 6.3 Initial skill graph scope

MathPilot should include Calc 1 and Calc 2, plus only the prerequisite skills that matter for calculus.

#### Prerequisite readiness

- algebraic manipulation
- solving equations
- factoring
- rational expressions
- exponents and radicals
- logarithms
- exponential functions
- function notation
- composition of functions
- inverse functions
- graph interpretation
- transformations
- trigonometric values/unit circle
- trig identities needed for calculus
- rates and units
- word-problem translation

#### Calculus 1

- functions and limits
- one-sided limits
- continuity
- infinite limits/asymptotes
- derivative definition
- tangent line and instantaneous rate
- derivative rules
- product rule
- quotient rule
- chain rule
- derivatives of trig functions
- derivatives of exponential/log functions
- implicit differentiation
- logarithmic differentiation
- inverse trig derivatives if in scope
- related rates
- linear approximation/differentials
- extrema
- first derivative test
- second derivative test
- concavity
- graphing with derivatives
- optimization
- L'Hopital's rule if in Calc 1 scope
- antiderivatives
- Riemann sums
- definite integrals
- Fundamental Theorem of Calculus
- substitution/basic u-substitution
- area/net change/average value

#### Calculus 2

- review of integration basics
- integration by parts
- trig integrals
- trig substitution
- partial fractions
- improper integrals
- numerical integration if needed
- applications of integration
- volumes
- arc length
- surface area if in scope
- work
- separable differential equations
- exponential/logistic growth if in scope
- sequences
- series
- geometric series
- telescoping series
- divergence test
- integral test
- comparison tests
- alternating series test
- ratio test
- root test
- absolute vs conditional convergence
- power series
- radius/interval of convergence
- Taylor and Maclaurin series
- Taylor polynomial approximation/error
- parametric equations
- polar coordinates
- polar area/arc length if in scope

### 6.4 Mastery model

Use both numeric score and level labels.

Track:

```text
mastery_score: 0.00-1.00
mastery_state:
  Unknown
  Weak
  Learning
  Developing
  Solid
  Mastered
  Needs Review
  Decayed
```

Mastery should incorporate:

- correctness
- difficulty
- problem type
- whether topic was blocked or mixed
- whether practice was same-day or delayed
- hint usage
- time/fluency
- number of attempts
- conceptual explanation quality when applicable
- performance on transfer problems
- performance on prerequisite-dependent problems
- retention after spacing
- confidence data when available

### 6.5 Mastery update rules

Correct but slow:

- count as correct
- smaller mastery gain
- fluency remains lower

Correct with hints:

- count as partially independent
- smaller mastery gain
- schedule near-term review

Correct on delayed mixed problem:

- high mastery gain
- strong evidence

Wrong on delayed mixed problem:

- bigger mastery drop than wrong during first exposure
- schedule repair or review

Wrong due to prerequisite:

- update prerequisite skill
- do not over-penalize current topic if the issue is clearly upstream

### 6.6 Strict mode and override

MathPilot should be strict but not imprison the user.

When a prerequisite is weak:

```text
This is not recommended yet.

You are weak in [skill], which this topic depends on.
Continuing now may make the next topic harder.

Recommended:
Start quick repair

Other options:
Take test-out quiz
Override anyway
```

If user chooses test-out:

- give short adaptive 5–8 question test
- if passed, allow continuation
- still schedule spaced review
- if failed, recommend quick repair

If user overrides:

- allow it
- show clear warning
- log override
- adapt if user struggles later

### 6.7 Dynamic study plan

Maintain a rough dynamic plan, but next action matters most.

The plan should update based on:

- current course focus
- diagnostic results
- recent performance
- review queue
- weak prerequisites
- resources used
- syllabus upload if present
- user overrides
- time since last study
- maintenance summaries

Plan should not be rigid. It should feel like a living route, not a fixed class calendar.

---

## 7. Diagnostic System

### 7.1 First diagnostic

After choosing Calc 1 or Calc 2, run an adaptive diagnostic.

Target: around 25 questions, but adapt.

The diagnostic should:

- start broad
- include selected course topics
- include prerequisite checks when needed
- narrow quickly toward suspected holes
- confirm weaknesses before marking them serious
- avoid being overly long
- track time silently if useful
- avoid pressure from visible timer
- produce initial knowledge map
- create first recommended plan

### 7.2 Diagnostic question types

Include a mix:

- final answer calculation
- conceptual multiple choice
- graph interpretation
- method selection
- short explanation
- prerequisite check
- error identification
- simple application problem
- optional show-work request when setup matters

### 7.3 Diagnostic feedback

During diagnostic:

- avoid full tutoring after every question
- do not derail into long explanations
- maybe show minimal feedback
- after diagnostic, summarize results clearly

Post-diagnostic output:

```text
Initial map created.

Strong:
- basic derivative rules
- simple limits

Weak:
- chain rule with nested functions
- interpreting derivative sign charts
- related rates setup

Recommended next:
Quick repair: chain rule and setup practice
```

### 7.4 Continuing diagnostics

Diagnostics do not only happen once.

MathPilot should constantly diagnose through normal work:

- repeated mistake patterns
- response time
- hint dependency
- wrong method selection
- skipped prerequisites
- review failures
- homework uploads
- confidence mismatch when available

---

## 8. Daily Session / Activity Engine

### 8.1 Continue button behavior

The main button should start the best next activity.

The app decides automatically but allows modification.

Possible activity types:

- quick repair
- concept input
- worked example
- guided practice
- independent practice
- mixed review
- formula/theorem recall
- diagnostic continuation
- homework review
- syllabus-aligned task
- resource watch
- test-out quiz

### 8.2 Adjust today

Do not ask energy every session by default.

Provide optional “Adjust today”:

```text
Short
Normal
Deep
Low energy
High focus
Custom
```

The app can adjust:

- number of problems
- difficulty
- amount of video/input
- review intensity
- whether to introduce new material
- how much explanation is shown
- how much repair vs challenge

### 8.3 Energy integrations

Do not build core around energy data.

Optional module:

- manual energy selection
- possible Apple Health/HealthKit integration if practical
- possible manual Bevel score import if easy
- no dependency on Bevel
- no health data required

### 8.4 Quick repair mode

Quick repair is central.

Triggered by:

- weak prerequisite
- repeated mistake
- failed test-out
- review failure
- homework mistake pattern
- user clicking “fix this”

Example repair:

```text
Quick Repair: Chain Rule Setup

1. One short explanation
2. Two worked examples
3. Four targeted problems
4. One mixed check
5. Update mastery/review queue
```

Repair should be short, focused, and satisfying.

### 8.5 No panic mode

Do not implement a special panic mode.

Exam/class support can exist only through optional syllabus planning, but no separate “panic” feature.

---

## 9. Problem Solving System

### 9.1 Problem sources

MathPilot should use a mix:

- deterministic templates
- verified generated problems
- curated problems
- AI-generated problems
- adapted homework-style problems
- user-uploaded homework
- formula/theorem recall prompts
- conceptual explanation prompts

### 9.2 Problem generation

Default approach:

- Codex may generate problems
- deterministic engine verifies when easy
- SymPy/numeric checking used when useful
- conceptual questions do not require symbolic verification
- generated questions should include metadata

Problem metadata:

```yaml
id: generated_derivative_chain_2026_05_28_001
skill_ids:
  - chain_rule
difficulty: 0.45
problem_type: procedural
requires_show_work: false
answer_type: expression
expected_answer: "..."
verification:
  symbolic: passed
  numeric: passed
source: codex_generated
created_at: ...
```

### 9.3 Verification philosophy

Do not overbuild verification if Codex can handle it intelligently, but use easy verification when available.

Rule:

```text
Trust Codex by default for explanations and concept-level work.
Use SymPy/numeric checks for symbolic/math-answer validation when easy.
If Codex and deterministic checks disagree, ask Codex to inspect the discrepancy and decide or regenerate.
```

### 9.4 Saving generated problems

Save verified generated questions into a local problem bank.

Also save all attempts.

If a generated problem is unverified but used successfully, save it with status:

```text
unverified_used
```

If later found flawed:

- mark deprecated
- remove from active use
- preserve attempt history
- log issue

### 9.5 Problem bank

Problem bank should store:

- verified generated problems
- curated problems
- user-attempted problems
- saved worked examples
- deprecated/bad problem flags
- performance statistics
- source metadata

Do not save every random generated draft. Save useful/verified/attempted items.

### 9.6 Input types

Support:

1. final answer input
2. typed math steps when useful
3. conceptual short text answer
4. multiple choice when useful
5. photo upload for handwritten homework or show-work analysis

Do not force show-work constantly.

### 9.7 Show-work policy

Show work is required or requested only when useful:

- application problems
- repeated wrong answer
- diagnostic setup questions
- suspicious correct answer after many misses
- homework analysis
- method-selection confusion
- user asks for step feedback

Otherwise final answer is enough.

### 9.8 Step-by-step checking

Use:

- deterministic checks where possible
- AI judgment where needed
- mistake classification
- learning memory updates

For typed steps:

- parse math if possible
- check equivalence between steps when possible
- identify likely invalid transformations
- ask Codex for reasoning when unclear

For photos:

- extract relevant math/work
- identify wrong step
- classify mistake
- update skill graph
- delete raw image by default after extraction/analysis

---

## 10. Feedback / Help Layer

### 10.1 Context-aware help, not generic chatbot

MathPilot should not make the main experience a blank chatbot.

Instead, provide contextual help actions:

```text
I'm lost
Give me a hint
Check my setup
Explain this step
Show a similar example
Why is my answer wrong?
Show the concept
Show graph/visual
Upload my work
```

The AI help layer should receive context:

- current course
- current skill
- current problem
- user attempt
- hints already used
- mode: diagnostic/practice/review/homework
- mistake patterns
- relevant learning profile
- current resource history

### 10.2 “I’m lost” flow

When user clicks “I’m lost,” MathPilot should ask what part they are lost on.

Example:

```text
What feels stuck?

- I don't know what method to use
- I don't understand the question
- I don't know the first step
- I made progress but got stuck
- I don't understand the concept
- I'm not sure
```

Then provide targeted help.

### 10.3 Wrong answer behavior

Depends on activity type.

Diagnostic:

- minimal immediate feedback
- log data
- avoid long teaching unless diagnostic is over

Guided practice:

- targeted hint first
- then another hint if needed
- then partial solution
- then full explanation if needed

Independent practice:

- encourage retry
- classify likely mistake
- do not instantly reveal final solution unless requested

Review:

- mark wrong
- classify mistake
- schedule review/repair
- explain after attempt

Homework:

- analyze steps
- identify exact wrong move if possible
- classify underlying issue
- update learning plan

### 10.4 Mistake tags

Show simple feedback while solving.

Show detailed tags in review/dashboard.

During solving:

```text
Your setup has an issue. Check the relationship between the variables.
```

Later:

```text
Mistake tag:
Related Rates → variable setup → missing relationship equation
```

### 10.5 Explain-in-words prompts

Use sometimes, not constantly.

Best times:

- diagnostics
- reviews
- conceptual checkpoints
- when the user seems procedural-only
- after correct answer to a concept-heavy problem
- after repeated method confusion

Examples:

```text
Explain what f'(3) means in this context.
Why is this integral negative even though it represents area-looking geometry?
How do you know the ratio test is inconclusive here?
```

### 10.6 Confidence tracking

Use lightweight optional confidence tracking.

Default:

- diagnostics
- reviews
- occasional calibration checks
- not on every problem

Options:

- user can disable
- user can enable more frequent confidence prompts

---

## 11. Resource / Video System

### 11.1 Teaching resource philosophy

MathPilot should primarily teach through high-quality videos and explanations, not through OpenStax as the main user experience.

Trusted sources should include or be discoverable from:

- Khan Academy
- Organic Chemistry Tutor
- 3Blue1Brown
- Professor Leonard
- Paul’s Online Math Notes
- MIT OpenCourseWare
- PatrickJMT if useful
- other vetted sources discovered later

The user knows Khan Academy, Organic Chemistry Tutor, and 3Blue1Brown. Other sources can be used if helpful, but the app should not assume the user likes them until performance or feedback supports it.

### 11.2 Resource strategy

Use all of these, in priority order:

1. curated trusted source list
2. app-learned source effectiveness
3. dynamic search when needed
4. Codex-assisted resource selection
5. user feedback

Do not scrape Khan Academy as a content database. Linking/embedding where allowed is fine.

### 11.3 Embedded vs external videos

Default:

- embed when allowed
- fallback to external browser/YouTube/Khan page
- user can choose preference

Videos should be integrated into the activity flow, not a separate library the user must browse manually.

### 11.4 Active video mode

Default setting:

- interrupt/check only for longer videos

User setting:

```text
Never interrupt
Sometimes interrupt
Active video mode
```

Active video examples:

- pause after a key concept
- ask one check question
- ask prediction before solution
- ask user to try a related problem

### 11.5 Resource effectiveness learning

MathPilot should learn source effectiveness from performance.

Example:

```text
Khan Academy improves conceptual understanding for derivatives.
Organic Chemistry Tutor improves procedural integration performance.
3Blue1Brown improves intuition but needs follow-up practice.
```

Signals:

- user ratings, asked rarely
- performance after resource
- reduced hint usage
- faster correct answers
- better review retention
- fewer repeated mistakes

### 11.6 Manual source feedback

Ask rarely:

```text
Was this helpful?
Yes / Kind of / No
```

Do not annoy the user after every resource.

### 11.7 Resource records

Store:

```yaml
resource_id:
title:
source:
url:
topic_tags:
skill_ids:
duration:
format: video/article/notes/problem_set
trusted: true/false
user_rating:
effectiveness_score:
last_used:
post_resource_performance:
notes:
```

---

## 12. Formula / Theorem / Recall System

### 12.1 Purpose

MathPilot should include formula/theorem memory, but not as random flashcards.

Use recall for:

- derivative rules
- integral families
- trig identities
- theorem conditions
- convergence test triggers
- definitions
- common mistake patterns
- method-selection cues

### 12.2 Recall prompts

Examples:

```text
When is the ratio test useful?
What does it mean if the ratio test gives L = 1?
What is the derivative of ln(x)?
What conditions are needed to use the Mean Value Theorem?
When should you consider integration by parts instead of substitution?
```

### 12.3 Flashcards

Generate flashcards only for:

- formulas
- definitions
- theorem conditions
- common mistake patterns
- method-selection cues

No random problem flashcards.

### 12.4 Anki

Anki export is not important.

MathPilot should have its own built-in review system.

---

## 13. Review Scheduler

### 13.1 Scheduling model

Use a smarter FSRS-style adaptive scheduler.

The scheduler should consider:

- skill difficulty
- prior retention
- recent performance
- hint usage
- fluency
- whether skill was tested in isolation or mixed
- importance to current course path
- upcoming plan
- user overrides
- decay patterns

### 13.2 Review intervals

It can start from rough intervals like:

```text
1 day
3 days
7 days
14 days
30 days
```

But should adapt.

### 13.3 Review item types

Review is not only flashcards.

Types:

- quick calculation
- concept question
- method selection
- graph interpretation
- short explanation
- mixed problem
- mistake correction
- theorem/formula recall
- transfer problem

### 13.4 Review priority

Prioritize:

- skills that are due
- skills that block next recommended topic
- skills that decayed
- skills with repeated mistake patterns
- formulas/theorems needed soon
- skills weak in mixed contexts

---

## 14. Homework / Photo Analysis

### 14.1 Upload flow

The user should be able to upload homework from anywhere relevant:

- Today screen
- current activity
- command/search if implemented
- drag/drop into app
- paste image from clipboard

Do not force the user to navigate to a separate “Homework Uploads” section first.

### 14.2 Analysis goals

When homework is uploaded, MathPilot should:

- identify the problem(s)
- extract relevant work
- determine final answer when possible
- analyze step-by-step work
- identify exact wrong step if possible
- classify mistake
- explain what happened
- teach or suggest repair when useful
- update skill graph
- update mistake patterns
- update review queue
- optionally save corrected problem as worked example

### 14.3 Storage policy

Default:

- extract analysis
- store structured data
- delete raw image unless user saves it

Stored data:

```yaml
homework_analysis_id:
created_at:
course_focus:
detected_topic:
problem_text:
extracted_work_summary:
final_answer:
correctness:
mistake_tags:
skills_affected:
feedback_summary:
repair_recommendation:
raw_image_saved: false
```

### 14.4 Privacy

All homework analysis is local unless Codex CLI or manual AI packet is used.

When AI is used, make it clear in developer logs what was sent.

---

## 15. Memory System

### 15.1 Hermes-inspired layers

MathPilot should use a layered memory architecture inspired by Hermes-style agents.

The key idea:

```text
small durable profile memory
+ structured local database
+ searchable session/attempt history
+ procedural skills
+ maintenance/curation
+ Codex reasoning when needed
```

### 15.2 Memory files

Use local memory files:

```text
memory/profile.md
memory/learning_model.md
memory/durable_notes.md
memory/preferences.md
```

#### `profile.md`

Stores stable user preferences:

```text
- Learner prefers serious, direct, research-backed explanations.
- Learner wants strict mastery with supportive tutoring.
- Learner benefits from clear step-by-step explanations and visible final answers.
```

#### `learning_model.md`

Stores evolving learning patterns:

```text
- Learner may need visual or setup-focused explanations for application problems.
- Learner may know procedures but struggle with method selection in mixed contexts.
- Learner should receive delayed mixed review before mastery is trusted.
```

#### `durable_notes.md`

Stores durable facts about the app/course state that are not already in DB.

#### `preferences.md`

Stores UI/resource/behavior preferences.

### 15.3 Searchable history

Store full recent attempt/session history in SQLite.

Support search over:

- problem text
- attempt text
- mistake tags
- feedback
- skills
- resource usage
- Codex summaries
- maintenance notes

Use FTS if practical.

### 15.4 Memory compression

Keep detailed recent history, summarize old history.

Policy:

```text
Recent:
  preserve full attempts, answers, hints, timing, feedback

Older:
  compact into summaries and patterns

Durable:
  write important stable patterns to memory files
```

Example compressed memory:

```text
Across 18 related-rates problems, user repeatedly missed the relationship equation setup. Diagram-first repair improved performance. Continue using setup-before-calculation prompts.
```

### 15.5 Mistake memory

Mistake memory should track:

- mistake category
- subtype
- affected skills
- frequency
- context
- examples
- successful repair strategies
- last occurrence
- decay status

Mistake categories:

```text
algebra
trigonometry
notation
conceptual meaning
method selection
setup/modeling
calculation
graph interpretation
theorem condition
answer form
units/rates
sign error
chain rule
implicit differentiation
integration technique selection
series test selection
```

### 15.6 Profile updates

Profile/memory updates can be proposed by:

- deterministic learning engine
- Codex maintenance pass
- user explicit correction
- repeated performance pattern

Updates should be logged.

---

## 16. Local Skills System

### 16.1 Purpose

MathPilot should have local skills similar in spirit to Hermes skills.

Skills are procedural memory: reusable instructions for how MathPilot should teach, grade, select resources, generate practice, and maintain itself.

Example folders:

```text
skills/
  teaching/
    teach_chain_rule.md
    teach_related_rates.md
    teach_integration_by_parts.md
  grading/
    grade_symbolic_answer.md
    diagnose_homework_photo.md
    classify_mistake.md
  resources/
    select_video_resource.md
    rank_trusted_source.md
  planning/
    choose_next_action.md
    generate_quick_repair.md
    schedule_review.md
  maintenance/
    compress_attempt_history.md
    improve_skill_file.md
    audit_problem_bank.md
```

### 16.2 Skill file format

Each skill should have frontmatter:

```yaml
---
id: teach_related_rates
name: Teach Related Rates
category: teaching
version: 1
created_by: system/codex/user
last_updated:
applies_to:
  - related_rates
inputs:
  - user_attempt
  - skill_state
  - mistake_patterns
outputs:
  - explanation
  - guided_steps
  - next_problem_recommendation
verification:
  - feedback should identify setup equation before derivative manipulation
---
```

Then body:

```markdown
# When to use

# Procedure

# Common pitfalls

# User-specific notes

# Output format

# Verification/checks

# Examples
```

### 16.3 Skill updates

Codex can update skills.

Requirements:

- changes logged
- reversible
- old version stored or backed up
- reason for change recorded
- no silent destructive edits

Example changelog:

```text
Updated skill: teach_related_rates
Reason: User repeatedly missed relationship equation setup.
Change: Added diagram-first setup strategy and variable table step.
```

### 16.4 Progressive disclosure

Do not dump all skills into every AI prompt.

AI adapter should include:

- current activity context
- relevant skill index
- only relevant full skill files
- relevant memory snippets
- current problem/attempt
- constraints and output schema

### 16.5 Self-improvement skill triggers

Trigger skill review/update when:

- repeated similar mistakes occur
- user explicitly says an explanation helped or did not help
- resource effectiveness changes
- a generated problem is flawed
- maintenance detects duplicate/conflicting skills
- a repair strategy works
- Codex finds a better workflow

---

## 17. Maintenance / Curator System

### 17.1 Purpose

MathPilot should have a maintenance layer inspired by agent curator systems.

It should not run after every tiny action. Run when enough data accumulates.

Triggers:

- after 3–5 study sessions
- after diagnostic
- after major review
- after many similar mistakes
- after multiple generated problems are saved
- after skill bloat/conflict is detected
- manual trigger in developer mode

### 17.2 Maintenance jobs

Jobs:

1. **Memory compression**
   - summarize old detailed attempts into durable patterns

2. **Skill audit**
   - detect outdated, duplicated, or conflicting skill files

3. **Skill improvement**
   - patch teaching/grading/resource skills based on evidence

4. **Problem bank audit**
   - identify flawed generated questions
   - mark deprecated problems
   - promote useful verified problems

5. **Resource effectiveness audit**
   - update trusted source rankings by topic

6. **Review schedule audit**
   - check whether scheduler is over/under-reviewing certain skills

7. **Mastery consistency audit**
   - check contradictions like “mastered chain rule but failing every related-rates derivative step”

8. **Changelog generation**
   - record what changed and why

### 17.3 Maintenance outputs

Each maintenance run should produce:

```yaml
maintenance_run_id:
started_at:
ended_at:
trigger:
jobs_run:
changes_made:
backups_created:
skills_updated:
memories_updated:
problem_bank_changes:
resource_rank_changes:
review_schedule_changes:
warnings:
```

### 17.4 User visibility

No popups.

Show changes in a changelog accessible from settings/developer mode.

The user chose: show in changelog, not as interruptions.

---

## 18. AI Adapter / Codex CLI

### 18.1 Primary AI path

Use Codex CLI as the default AI backend.

MathPilot should call Codex locally through a subprocess or CLI wrapper.

The app should not require direct API keys.

### 18.2 Manual prompt-packet mode

Also support manual packet mode for ChatGPT/Gemini.

Flow:

```text
MathPilot creates prompt packet
User copies into ChatGPT/Gemini
User pastes response back
MathPilot parses response and updates state
```

This is useful if Codex CLI integration is temporarily unavailable or if the user wants a second model opinion.

### 18.3 Codex tasks

Codex should be used for:

- explanations
- hints
- homework analysis
- step reasoning
- problem generation
- conceptual question generation
- resource selection
- maintenance summaries
- skill updates
- memory compression
- app code self-improvement in developer mode or allowed flows
- resolving disagreement between deterministic checker and AI reasoning

### 18.4 Codex session management

Do not use one giant forever chat.

Use task-specific sessions:

```text
tutor_session_<skill_or_topic>
grading_session_<homework_id>
question_generation_session_<skill_id>
resource_search_session_<topic>
maintenance_session
code_improvement_session
```

Session policy:

```text
Need continuity? Resume relevant session.
Need clean reasoning? Start new session.
Need exploration without polluting main context? Use side/fork if available.
Need deterministic one-shot? Use non-interactive exec style call if available.
```

### 18.5 Prompt construction

Each Codex prompt should include:

- task type
- exact output schema
- current course focus
- current skill(s)
- relevant mastery state
- relevant mistake patterns
- relevant local skill file(s)
- current problem/attempt/resource
- constraints
- verification expectations
- safety/sandbox boundaries
- desired tone

Do not include unnecessary full history. Use retrieval/compression.

### 18.6 AI output schemas

Prefer structured outputs when MathPilot needs to update state.

Example for mistake classification:

```json
{
  "correctness": "incorrect",
  "mistake_tags": [
    {
      "category": "method_selection",
      "skill_id": "integration_by_parts",
      "description": "User attempted substitution when integration by parts was more appropriate."
    }
  ],
  "feedback_to_user": "...",
  "state_updates": {
    "skills_to_decrease": ["integration_technique_selection"],
    "skills_to_review": ["u_substitution", "integration_by_parts"]
  },
  "recommended_next_action": "quick_repair"
}
```

### 18.7 AI trust policy

The user prefers to mostly trust Codex.

Policy:

- Trust Codex for explanations, teaching, conceptual feedback, and maintenance reasoning.
- Verify symbolic/math answers with SymPy/numeric checks when easy.
- If verification disagrees, have Codex inspect and resolve.
- Do not block useful functionality because perfect deterministic verification is hard.
- Log uncertain or unverified generated content.

### 18.8 Sandbox and permissions

Codex can do almost anything locally inside MathPilot, including code modification.

But implement guardrails:

- default working directory limited to MathPilot repo/data directory
- all file changes logged
- backups before code, skill, memory, schema, or large data changes
- developer mode shows prompts and file changes
- destructive operations require approval
- external commands outside app folder require approval
- credentials/API keys are never stored in plain prompts or logs

---

## 19. Self-Modifying App Code

### 19.1 Allowed

MathPilot can allow Codex to modify the app code after installation.

This is a user-chosen feature.

### 19.2 Requirements

Code self-improvement must have:

- developer mode visibility
- changelog
- diff preview if practical
- automatic local backup
- ability to rollback
- tests/checks if available
- no silent destructive changes
- clear scope of change

### 19.3 Code improvement triggers

Possible triggers:

- user requests a feature
- user reports bug
- maintenance detects broken workflow
- generated issue in developer mode
- app fails internal tests
- Codex proposes improvement and user accepts

### 19.4 Code changes vs learning changes

Separate:

```text
learning changes:
  skills, memory, problem bank, resource ranking, plans

code changes:
  app source code, database schema, UI behavior, engine implementation
```

Learning changes can happen automatically with logs.

Code changes should be more carefully controlled, preferably with developer-mode visibility.

---

## 20. Class / Syllabus Support

### 20.1 Optional only

Class/syllabus mode is optional and should not dominate.

The user may not use it.

### 20.2 Syllabus upload

If user uploads syllabus:

- extract topics
- extract dates if present
- extract exams if present
- extract textbook sections if present
- map syllabus topics to skill graph
- suggest plan alignment
- ask user to accept/ignore

### 20.3 Behavior

Syllabus alignment should influence:

- priority of upcoming topics
- review timing
- resource recommendations
- quick repairs
- rough dynamic plan

But it should not override the mastery engine blindly.

If syllabus says move forward but prerequisites are weak, MathPilot should say so clearly.

---

## 21. Graphing and Visual Tools

### 21.1 Built-in visuals

Use built-in simple visuals where helpful:

- function graphs
- derivative sign charts
- concavity charts
- tangent/secant visualization
- area under curve
- accumulation function
- slope fields if needed
- sequence/series partial sums
- Taylor polynomial approximation overlays

### 21.2 External fallback

Offer external links/opening for:

- Desmos
- GeoGebra
- WolframAlpha if user wants

### 21.3 Visual design rule

Visuals must clarify, not decorate.

Use visuals for:

- limits
- derivatives as slope/rate
- integrals as accumulation
- graphing with first/second derivatives
- related rates diagrams
- optimization setup
- polar/parametric graphs
- convergence/series intuition
- Taylor approximations

---

## 22. Reports and Analytics

### 22.1 Weekly report

No automatic weekly report.

Reports only when user asks.

### 22.2 On-demand report

Possible report:

```text
Current status:
- Strongest skills
- Weakest skills
- Most repeated mistakes
- Review due
- Recommended next focus
- Resource effectiveness
- Recent progress
```

### 22.3 Dashboard analytics

Advanced dashboard can show:

- mastery by area
- current weak spots
- improvement trends
- review backlog
- mistake patterns
- resource effectiveness
- attempts over time
- skill decay
- class/syllabus alignment if enabled

Do not make dashboard the default experience.

---

## 23. Data Model Sketch

### 23.1 Tables

Recommended SQLite tables:

```sql
users
settings
course_focus
skills
skill_edges
skill_mastery
attempts
problems
problem_variants
problem_sources
review_items
review_events
diagnostics
diagnostic_items
sessions
session_events
mistake_tags
mistake_patterns
resources
resource_events
homework_analyses
ai_calls
maintenance_runs
changelog_entries
backups
syllabi
generated_flashcards
```

### 23.2 Attempts

Attempt record:

```yaml
attempt_id:
problem_id:
session_id:
created_at:
skill_ids:
answer_raw:
answer_latex:
answer_parsed:
correctness:
partial_credit:
time_spent_seconds:
hint_count:
attempt_number:
mode: diagnostic/guided/independent/review/homework
confidence:
feedback_summary:
mistake_tags:
mastery_delta:
review_updates:
```

### 23.3 Skill mastery

```yaml
skill_id:
mastery_score:
mastery_state:
fluency_score:
retention_score:
conceptual_score:
procedural_score:
transfer_score:
last_practiced:
last_mastered:
review_due:
evidence_count:
recent_failures:
prereq_blocking:
```

### 23.4 Resource effectiveness

```yaml
resource_id:
skill_id:
times_used:
user_rating:
performance_before:
performance_after:
effectiveness_score:
preferred_for:
  - concept
  - procedure
  - intuition
notes:
```

### 23.5 Changelog

```yaml
entry_id:
created_at:
type: memory_update/skill_update/code_change/problem_audit/resource_update/schema_change
actor: system/codex/user
summary:
details:
files_changed:
backup_id:
reversible: true/false
```

---

## 24. Security / Privacy / Locality

### 24.1 Local first

All data stored locally by default.

No cloud account required.

### 24.2 AI privacy

If Codex CLI or manual prompt-packet mode sends data to an AI service, log:

- what kind of data was sent
- which task
- timestamp
- prompt hash or prompt content in developer mode, depending user setting

### 24.3 Sensitive images

Raw homework images deleted by default after extraction/analysis unless saved manually.

### 24.4 Backups

Automatic local backups:

- before major maintenance
- before skill updates
- before memory compaction
- before code changes
- before schema migrations
- manual export option

### 24.5 Rollback

Support rollback for:

- skills
- memory files
- config
- problem bank changes
- code changes if practical
- database via backup restore

---

## 25. Developer Mode

### 25.1 Access

Hidden under Settings.

### 25.2 Developer mode should show

- Codex prompts
- Codex responses
- AI call logs
- memory changes
- skill updates
- database logs
- maintenance runs
- backups
- generated problem verification
- resource ranking changes
- app code self-improvement logs
- errors
- debug controls

### 25.3 Developer controls

Developer mode may allow:

- run maintenance
- inspect/edit memory
- inspect/edit skills
- re-run verification
- restore backup
- export data
- import resource list
- test Codex CLI connection
- run code self-improvement
- view app logs

---

## 26. Build Order Guidance

This is not an MVP-vs-eventual split. The product spec describes the full system. However, Codex should build in a sane order to avoid creating a broken giant app.

Recommended build order:

1. **Project skeleton**
   - Tauri app
   - React UI
   - SQLite storage
   - settings/local profile
   - basic navigation

2. **Math input and problem activity**
   - high-quality math input
   - problem display
   - answer submission
   - attempts saved

3. **Skill graph and mastery state**
   - Calc 1/Calc 2 graph files
   - skill mastery records
   - knowledge map basic view

4. **Diagnostic engine**
   - adaptive diagnostic around 25 questions
   - initial map creation
   - first next-action recommendation

5. **Problem generation/checking**
   - templates
   - SymPy/numeric checking where useful
   - save verified generated problems

6. **Codex CLI adapter**
   - call Codex from app
   - task-specific prompt packets
   - logs
   - manual prompt-packet fallback

7. **Feedback/help layer**
   - hints
   - I’m lost flow
   - check setup
   - similar example
   - wrong-answer behavior

8. **Review scheduler**
   - adaptive review queue
   - spaced/interleaved review
   - formula/theorem recall

9. **Resource engine**
   - trusted sources
   - video/resource cards
   - embedded/external fallback
   - source effectiveness tracking

10. **Homework upload analysis**
    - image upload
    - AI analysis
    - structured data extraction
    - delete raw image by default

11. **Local skills and memory**
    - skill files
    - memory files
    - progressive prompt assembly
    - changelog

12. **Maintenance/curator**
    - compression
    - skill audits
    - problem bank audit
    - resource audit
    - backups

13. **Developer mode**
    - logs
    - prompt inspection
    - maintenance controls
    - backup restore
    - code self-improvement controls

14. **Polish**
    - native feel
    - animations
    - knowledge map improvements
    - smooth activity transitions
    - subtle tasteful motivation

---

## 27. Acceptance Criteria

### 27.1 Core experience

MathPilot is successful if the user can:

- open the app
- choose Calc 1 or Calc 2
- take an adaptive diagnostic
- receive a clear recommended next step
- solve problems with good math input
- get useful adaptive feedback
- see weak skills update
- see knowledge map update
- get spaced review automatically
- upload homework and receive step-level feedback
- use Codex CLI without API keys
- continue across sessions with saved progress

### 27.2 Learning quality

The system should:

- not advance based only on same-day blocked practice
- require delayed/mixed evidence for mastery
- identify prerequisites
- recommend quick repair when needed
- allow test-out/override
- classify mistakes
- adapt review schedule
- learn which resources help
- use visuals when beneficial
- avoid passive video overconsumption

### 27.3 UI quality

The app should:

- feel polished and native
- be simple on open
- show one clear next action
- avoid clutter
- have a useful knowledge map
- make math input easy
- avoid childish gamification
- keep advanced analytics available but not forced

### 27.4 AI quality

Codex integration should:

- use local Codex CLI
- support task-specific sessions
- use structured prompts/outputs
- log calls
- allow manual prompt packet fallback
- verify math when easy
- update skills/memory when useful
- respect local sandbox/backups

### 27.5 Data quality

The app should:

- store attempts
- store mastery
- store review queue
- store resources
- store mistake patterns
- store generated verified problems
- summarize old history
- back up before major changes
- delete raw homework images by default

---

## 28. Tone and Teaching Style

MathPilot should speak seriously, clearly, and directly.

Preferred style:

- research-backed but not academic
- strict but not harsh
- friendly when helping
- no slang unless user initiates
- no childish gamification
- no overexplaining unless user is confused
- final answers clearly visible when teaching
- visual explanations when helpful
- step-by-step for hard math

Example tone:

```text
You got the derivative rule right, but the setup is unstable. The issue is not computation yet; it is identifying the relationship between the variables. Do the setup repair first, then we will return to the full related-rates problem.
```

Avoid:

```text
Awesome job, pilot! Mission complete! You leveled up your calculus powers!
```

---

## 29. Open Implementation Decisions Codex May Choose

Codex may decide:

- exact Tauri project structure
- exact UI component library
- exact SQLite migration system
- whether Python is a persistent sidecar or subprocess
- exact math parser
- exact review scheduler implementation
- exact graphing library
- exact Codex CLI invocation style
- exact problem template format
- exact syntax for local skills
- exact maintenance schedule thresholds

But Codex must preserve the product requirements and UX philosophy in this spec.

---

## 30. Final Product Definition

MathPilot is a self-imving local calculus tutor and mastery engine.

The essence:

```text
MathPilot knows what you are trying to learn.
MathPilot knows what you actually know.
MathPilot knows what you are weak at.
MathPilot knows what helped before.
MathPilot tells you what to do next.
MathPilot teaches only what is needed.
MathPilot makes you actively prove mastery.
MathPilot remembers mistakes and repairs them.
MathPilot improves its own teaching procedures over time.
```

The user should not have to manually decide:

- what topic to study
- which video to watch
- which problems to do
- when to review
- whether a weakness matters
- whether to move on
- what a mistake means

MathPilot should handle that and make the next action clear.
