---
id: diagnose_homework_photo
name: Diagnose Homework Photo
category: grading
version: 1
created_by: system
applies_to:
  - homework_review
inputs:
  - image_or_text
  - problem_context
outputs:
  - problem_text
  - extracted_work_summary
  - correctness
  - mistake_tags
  - step_feedback
verification:
  - each step_feedback entry references a visible step in the work
---

# When to use

Use when analyzing uploaded homework photos or pasted work.

# Procedure

1. Transcribe the problem statement if visible; note ambiguity.
2. Summarize student work in order (setup, method, execution).
3. Tag mistakes by category and affected skills.
4. Provide step-level feedback without rewriting the entire solution unless asked.
5. Recommend next action (quick repair, practice, or review).

# Common pitfalls

- Hallucinating steps not present in the image.
- Grading arithmetic before checking method choice.

# Output format

Return structured JSON with problem_text, extracted_work_summary, correctness, mistake_tags, skills_affected, step_feedback.
