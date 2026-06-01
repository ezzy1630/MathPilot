---
id: generate_quick_repair
name: Generate Quick Repair
category: planning
version: 1
created_by: system
applies_to:
  - weak_skills
inputs:
  - mastery_state
  - mistake_patterns
  - skill_id
outputs:
  - repair_plan
  - example_problems
  - recommended_next_action
verification:
  - plan includes explain, guided example, and mixed check phases
---

# When to use

Use when a skill is weak or a diagnostic/homework result recommends quick repair.

# Procedure

1. State the gap in one sentence tied to evidence.
2. Order phases: explain → example → practice → mixed check.
3. Pick one focal sub-skill (setup vs execution).
4. Avoid introducing new topics until the focal skill stabilizes.

# Output format

Return recommended_next_action quick_repair with skill_ids and a short reason string.
