---
id: teach_integration_by_parts
name: Teach Integration by Parts
category: teaching
version: 1
created_by: system
applies_to:
  - integration_by_parts
inputs:
  - user_attempt
  - skill_state
  - mistake_patterns
outputs:
  - explanation
  - guided_steps
  - next_problem_recommendation
verification:
  - u and dv choice are justified with LIATE or equivalent rule
---

# When to use

Use when the student is learning or repairing integration by parts.

# Procedure

1. Identify factors \(u\) and \(dv\) using LIATE (or explain why substitution fails).
2. Compute \(du\) and \(v\).
3. Apply \(\int u\,dv = uv - \int v\,du\).
4. Simplify the new integral; repeat parts only if it clearly reduces work.
5. Check by differentiating the antiderivative when feasible.

# Common pitfalls

- Choosing \(u\) that makes the new integral harder.
- Sign errors on the subtraction term.
- Dropping constants of integration.

# Output format

State the chosen \(u\) and \(dv\), show one line of work, then prompt for the next step.
