# Slice 4 Retro — project-state-scanner + onboarding

**Date:** 2026-06-11 · **Branch:** `slice-4-onboarding-scanner` → merged (PR #4) · **Mode:** inline

## What shipped
- `project-state-scanner` agent (read-only; repo + memory → strict-JSON cards) shipped in the plugin (v0.2.0).
- Onboarded all three projects to **real current status** — board now reflects reality, live on Pages.

## Manual interventions / decisions
- **Scanner dispatched as `general-purpose` subagents** (3 parallel) using the agent's prompt, because the
  plugin agent type isn't a registered `subagent_type` until `/plugin marketplace update`. Future runs use
  `subagent_type: project-state-scanner` directly. All three returned clean strict JSON.
- **The scanner beat the stubs:** it found status *more current* than my memory-derived stubs (spanish-coach
  is past spec into Slice-7 build prep; APEX S2 merged → "live, awaiting ride"; hims S1 Checkpoint A done,
  Task 8 ready). Validates reading live git, not just memory.
- **Surfaced deviation — onboard seeds via direct write, not `board-update` per card.** Spec §3.1b said
  "via board-update," but board-update *upserts by id* (the scanner chose new ids → stubs would linger) and
  bulk-seeding 6 cards through the CLI is brittle. board-update is designed for **incremental** per-transition
  updates (its real purpose); bulk onboard = one clean file write + one commit. → Carry-forward below.
- Omitted `done` cards to keep the board on active+next work; Done populates as slices merge.

## Friction
- None blocking. Pages served real status on the 2nd post-merge poll (~15s).

## Carry-forwards (for sdlc-auditor / Slice 5)
- Reconcile spec §3.1b: either add a `board-update --seed/--replace` mode, or document that onboard
  bulk-seeds directly while board-update handles incremental updates. (Recommend the latter — simpler.)
- Slice 5 orchestrator calls `board-update` at each stage transition (incremental), now proven the board
  renders whatever it writes.
- `/plugin marketplace update` now serves the scanner agent for future onboarding/reconcile runs.
