# Slice 2 Retro — Board Read-View

**Date:** 2026-06-11 · **Branch:** `slice-2-board-read-view` → merged (PR #2) · **Mode:** inline (user present)

## What shipped
Real `board.html`: fetches `data/<project>.json` + `attention.json`, renders 3 swimlanes × 6 columns of
slice cards + a Needs-Attention pane, in the house aesthetic. UMD `renderBoard` (browser + Node), a unit
test, and `build-board.js` (prerendered offline build).
Live: https://argent-gnome.github.io/dev-command-center/board.html

## Manual interventions / deviations
- **build-board.js improvement (surfaced deviation from plan):** the plan inlined only data
  (`window.__BOARD__`); my verification grep for "Needs Attention" exposed that `board.local.html` wasn't
  actually a *rendered* board (rendering happens in-browser). Improved `build-board.js` to **prerender into
  `#root`** → the offline file is fully static (works without JS) and the render is directly greppable.
  Render correctness is also covered by the unit test. Surfaced here rather than silently changed.
- No other manual intervention; automated gates (unit test + deterministic build check) green.

## Decisions
- **Merge-gate scaled to stakes:** unit test + build check + user live-review, rather than a Fable
  adversarial pass — personal internal tool, low blast radius, tested. Consistent with the rigor dial.
- Stub data this slice; real status arrives via Slice 4 onboarding (`project-state-scanner`).
- `board.local.html` gitignored (generated artifact).

## Friction
- Pages first request 404 then 200 (~15s) after merge — expected rebuild delay; the retry loop handled it.

## Carry-forwards
- `board-update.js` (Slice 3) will programmatically write `data/<project>.json` (currently hand-stubbed).
- Slice 4 onboarding overwrites the stub cards with scanner-derived real status.
- User visual review of the live board pending — tweaks expected (user said they'd adjust visuals live).
