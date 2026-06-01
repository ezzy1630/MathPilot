---
id: schedule_review
name: Schedule Review
category: planning
version: 1
created_by: system
applies_to:
  - review_queue
inputs:
  - mastery_state
  - review_queue
  - session_pace
outputs:
  - review_updates
  - recommended_next_action
verification:
  - overdue items receive higher priority without duplicating queue entries
---

# When to use

Use when reprioritizing review after sessions, diagnostics, or maintenance.

# Procedure

1. List skills due today or overdue; bump priority modestly.
2. Cap daily review load by session pace.
3. Interleave procedural and conceptual tags when both are weak.
4. Defer mastered skills unless decay signals appear.

# Output format

state_updates with skills_to_review and optional review interval hints in JSON.
