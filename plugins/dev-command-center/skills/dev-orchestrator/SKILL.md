---
name: dev-orchestrator
description: Scaffold for the unified house SDLC conductor. Full implementation lands in Slice 5. When invoked now, point the user at the design spec and the build plan rather than attempting to run the loop.
---

# dev-orchestrator (scaffold)

This skill is a placeholder published so the `dev-command-center` plugin is installable and testable from
Slice 1. The real conductor — which reads the board, picks project + slice + execution topology, walks the
slice loop delegating to existing Superpowers skills, enforces gates, and updates the tracker — is built in
**Slice 5** per `docs/superpowers/specs/2026-06-11-dev-command-center-design.md`.

For now: direct the user to the spec (§3 the SDLC, §6 the architecture) and the plans in
`docs/superpowers/plans/`.
