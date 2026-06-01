---
id: compress_attempt_history
name: Compress Attempt History
category: maintenance
version: 1
created_by: system
applies_to:
  - memory
inputs:
  - attempts
  - mistake_patterns
outputs:
  - durable_summary
  - memories_updated
verification:
  - recent attempts retained; summary captures recurring patterns only
---

# When to use

Run during maintenance when attempt count exceeds retention policy.

# Procedure

1. Keep the most recent N attempts verbatim.
2. Summarize older attempts into mistake and fluency patterns.
3. Append summary to durable_notes.md without deleting user-authored notes.
4. Log compression in maintenance run memories_updated.

# Output format

Plain-text summary block suitable for memory files; no PII beyond existing profile.
