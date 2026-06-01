---
id: audit_problem_bank
name: Audit Problem Bank
category: maintenance
version: 1
created_by: system
applies_to:
  - problems
inputs:
  - problems
  - attempt_counts
outputs:
  - problem_bank_changes
  - deprecated_problem_ids
verification:
  - deprecated problems include reason and were heavily used unverified
---

# When to use

During maintenance problem_bank_audit job.

# Procedure

1. Flag problems with verificationStatus unverified_used and high attempt counts.
2. Deprecate flawed generated items; keep verified exemplars.
3. Log each change in problem_bank_changes.
4. Never delete attempts referencing deprecated problems.

# Output format

Maintenance changelog entries listing problem ids and deprecation reasons.
