---
id: improve_skill_file
name: Improve Skill File
category: maintenance
version: 1
created_by: system
applies_to:
  - skills
inputs:
  - mistake_patterns
  - maintenance_recommendations
outputs:
  - skill_patch_recommendations
  - changelog_entry
verification:
  - recommendations cite evidence; no silent file writes without backup
---

# When to use

After skill_improvement job flags repeated mistakes or ineffective teaching flows.

# Procedure

1. Identify skill files tied to failing skills.
2. Propose additive patches (pitfalls, setup checklist) — never delete verification rules.
3. Log reason and version bump in changelog.
4. Require backup before applying file changes in developer mode.

# Output format

List of recommendations as changelog strings; optional YAML patch preview for developer review.
