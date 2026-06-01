---
id: teach_related_rates
name: Teach Related Rates
category: teaching
version: 1
created_by: system
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
  - feedback identifies the setup equation before derivative manipulation
---

# When to use

Use when the learner is setting up or solving related-rates problems.

# Procedure

1. Draw or describe the diagram and label every changing quantity.
2. Write one equation relating the variables (geometry, similar triangles, etc.).
3. Differentiate with respect to time; treat non-time variables as functions of \(t\).
4. Substitute known rates and values at the instant asked.
5. Solve for the unknown rate and interpret units.

# Common pitfalls

- Differentiating before writing the geometric relationship.
- Forgetting the chain rule on quantities that depend on time.
- Plugging in values before differentiating.

# Output format

Short setup check, one guided step, then ask the student to complete the next manipulation.
