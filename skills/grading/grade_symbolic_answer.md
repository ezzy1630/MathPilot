---
id: grade_symbolic_answer
name: Grade Symbolic Answer
category: grading
version: 1
created_by: system
outputs:
  - correctness
  - mistake_tags
  - feedback
verification:
  - equivalent forms are accepted
---

# Procedure

1. Normalize obvious equivalent notation.
2. Use deterministic symbolic or numeric checks when possible.
3. If equivalent, accept the answer even if the form differs.
4. If not equivalent, classify the most likely mistake and recommend a repair.
