---
id: classify_mistake
name: Classify Mistake
category: grading
version: 1
created_by: system
applies_to:
  - all_calculus_skills
inputs:
  - user_attempt
  - expected_answer
  - skill_ids
outputs:
  - mistake_tags
  - feedback_to_user
  - state_updates
verification:
  - each mistake tag includes category and skill_id when known
---

# When to use

Use after an incorrect or partially correct attempt when tags are needed for mastery updates.

# Procedure

1. Compare setup, method, algebra, and arithmetic layers separately.
2. Assign one primary mistake category (setup, method_selection, execution, notation, conceptual).
3. Map to skill_ids from the problem context.
4. Suggest the smallest next action that addresses the primary gap.

# Common pitfalls

- Over-tagging with every minor slip.
- Blaming arithmetic when the method was wrong.

# Output format

JSON with mistake_tags array and brief feedback_to_user; optional state_updates for review scheduling.
