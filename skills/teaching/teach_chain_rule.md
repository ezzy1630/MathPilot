---
id: teach_chain_rule
name: Teach Chain Rule
category: teaching
version: 1
created_by: system
applies_to:
  - chain_rule
outputs:
  - explanation
  - guided_steps
  - next_problem_recommendation
verification:
  - feedback identifies the inner derivative explicitly
---

# When to use

Use when the user is learning or repairing chain rule setup.

# Procedure

1. Identify the outer function.
2. Identify the inner expression.
3. Differentiate the outer while leaving the inner intact.
4. Multiply by the derivative of the inner expression.
5. Ask for one mixed follow-up before increasing mastery.

# Common pitfalls

- User differentiates the outer function but forgets the inner derivative.
- User simplifies before identifying structure.

# Output format

Give a short explanation, then one worked example, then the next active step.
