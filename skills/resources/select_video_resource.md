---
id: select_video_resource
name: Select Video Resource
category: resources
version: 1
created_by: system
applies_to:
  - resource_watch
inputs:
  - skill_ids
  - resource_catalog
  - effectiveness_scores
outputs:
  - resource_id
  - rationale
verification:
  - chosen resource lists skill overlap and effectiveness above threshold
---

# When to use

Use when the session phase is resource_watch or the student asks for a video.

# Procedure

1. Filter resources by skill_ids and course focus.
2. Prefer trusted sources with effectiveness_score ≥ 0.5.
3. Match duration to session pace (shorter for short/low_energy).
4. Explain in one line why this video fits the current gap.

# Output format

Return resource_id and rationale; optional post_check problem hint.
