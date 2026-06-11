# Slice 3 Retro — board-update.js + projects.config.json

**Date:** 2026-06-11 · **Branch:** `slice-3-board-update-config` → merged (PR #3) · **Mode:** inline

## What shipped
- `board-update.js` — token-free CLI: pure `upsertCard()` (unit-tested) + git wrapper (add → commit-if-changed
  → pull --rebase → push, one retry). Operates on its own `__dirname`, so any session can update the hub by
  calling it via absolute path — zero manual commits. `--dry-run` / `--no-push` for safe testing.
- `projects.config.json` — the single project registry (hub info + per-project repoPath/stack/topology).
- `board.html` + `build-board.js` now derive the project list from the config (DRY; fallback to the 3).

## Manual interventions / decisions
- **hims data key standardized** to `hims` (key = filename = `project` field), so `board-update --project hims`
  maps cleanly to `data/hims.json`.
- **Merge-gate scaled to stakes:** unit test + dry-run smoke + deterministic build check + live Pages verify;
  no Fable pass (mechanical script, low blast radius). Consistent with the rigor dial.
- **First *real* board-update deferred to Slice 4 onboarding** — that's the natural first writer of real card
  data; the git/push path here is verified by construction + the dry-run proved the upsert. Avoided fabricating
  a stub change just to exercise push.
- `board-update` pretty-prints the JSON it writes (it owns the data files going forward).

## Friction
- None. Pages rebuild served `projects.config.json` (200) on the first post-merge poll.

## Carry-forwards
- Slice 4 (`project-state-scanner` + `onboard`) is the first real consumer — it will call `board-update` to
  replace the stub cards with each project's actual current status.
- Slice 5 orchestrator calls `board-update` at every stage transition (the tracker-keeps-pace hook).
