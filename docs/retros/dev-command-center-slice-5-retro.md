# Slice 5 Retro — dev-orchestrator conductor skill

**Date:** 2026-06-11 · **Branch:** `slice-5-dev-orchestrator-skill` → merged (PR #5) · **Mode:** inline

## What shipped
The real `dev-orchestrator` skill (plugin v0.3.0) — the conductor: `run` + `onboard` modes; reads the board,
walks the slice loop delegating every stage to existing `superpowers:*` skills, enforces the gates, and fires
`board-update` at every transition. Replaces the Slice-1 stub.

## The reserved Fable adversarial review — earned its cost
The one Fable merge-gate review of the governing artifact caught a **CRITICAL** my Opus authoring missed:
variation axis B (stack gate sets) was entirely dropped — **including the no-destructive-SwiftData rule** that
protects spanish-coach's on-device user data. A plausible-but-wrong data-destroying migration could have
slipped through. This is the third time the adversarial merge-gate has caught a critical that authoring +
self-review missed (cf. APEX 2-criticals, hims foundation audit) — the doctrine is empirically validated.

Also fixed from the review: CI gate ordering (PR run at stage 8; main re-checked at stage 11), onboard now
commits+pushes the hub (bulk seed wasn't reaching Pages), fully-qualified `superpowers:` skill names (a bare
`brainstorming` could resolve to the deprecated `superpowers:brainstorm`), the merge-gate rubric embedded in
the interim fallback, `board-update --title/--model/--link` for new cards, two-stage per-task review, and
"plan deviations" added to the retro contract. All criticals + should-fixes + cheap nits addressed.

## Decisions
- **Spec reconciled to implementation** (the review found real spec/skill drift): `hubPath` → `hub.repoPath`,
  §3.1b onboard = direct-write-then-push, §3.2 stage-8 = PR-run-then-main-at-11. Spec stays the source of truth.
- Stack gates encoded in the skill by `config.stack` (generic per-stack commands) rather than per-project
  command strings (which we don't have yet) — config can carry exact commands later.

## Friction
- None blocking. The Fable review took ~2.5 min and ~46k tokens — a worthwhile surgical burst for the artifact
  that governs every future build.

## Carry-forwards
- `attention-sync.js` still unbuilt (deferred since Slice 3); the skill documents the gap and falls back to
  manual `attention.json` correction at reconcile. Build it with/near Slice 8.
- `doc-keeper` + `merge-gate-reviewer` agents = **Slice 6**; the skill uses inline fallbacks until they exist.
- Minor: spec §3.2 stage-6 still doesn't spell out the two-stage reviewer order in the diagram (skill does).
