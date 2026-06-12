# dev-command-center Slice 9 Retro — Collapsible swim lanes

**Date:** 2026-06-12 · **Scope:** board/Pages only (no plugin/skill/agent change, no version bump). **Model:** Opus (build), Fable (merge-gate).

## What shipped
Each swimlane is now a `<details>` that collapses to an at-a-glance **status strip** (caret · project · active-slice chip colored by column · 6-cell mini-board of per-column counts · ⛔ blocked badge · MM-DD last-touched). Lanes render **collapsed by default**; a client-side **pure-recency** rule (`applyRecency`, board.html) opens a lane iff its newest card was touched within `IDLE_DAYS` (1), re-derived every load — so active work opens itself and the board stays short as projects grow. `board.render.js` gained `representativeCard` + `laneTouched` (exported + unit-tested); `build-board.js` unchanged (the prerender carries the recency script).

## Design sign-off (mockup-first, per house rule)
Built a live mock (`docs/mockups/board-collapsible-lanes.html`), iterated to v2 on user feedback: (1) reserve a fixed-width ⛔ slot so pips + date align down the board whether or not a lane is blocked; (2) auto-collapse by recency. User chose **Option A (pure recency, no sticky overrides)** over Option B. The mock is committed as the slice's cited design authority.

## The merge-gate earned its keep again — REJECT (its 7th catch)
The reserved Fable merge-gate **rejected** the first cut on a real bug tests didn't cover:
- **[CRITICAL] Chip rule contradicted the approved mock.** `representativeCard` treated *backlog* as in-flight (`column !== 'done'`), so a backlog card out-ranked a shipped (done) one — wrong on **2 of 3 live lanes** (Spanish Coach would chip "RepEventRecord… · Backlog" instead of "Slice 7 · Done"; HIMS "Slice 2 · Backlog" instead of "Slice 1 · Done"). The mock's rule is: right-most on the **frontier** (spec/build/verify/live); if none, done-over-backlog. → Fixed (frontier filter) + the divergent backlog+done / backlog-only / frontier-beats-done cases now tested. Verified on real data: chips render Slice 7 · Done / Slice 2 · Live / Slice 1 · Done.
- **[SHOULD-FIX]** `shortSlice` truncated mid-word ("RepEventRecord S") → now cuts at a word boundary + ellipsis.
- **[SHOULD-FIX]** Commit the plan + mock with the slice (spec-anchored audit trail) → done (reversed my earlier "throwaway" call; the gate's reasoning is sound — the mock is the approved design authority).
- **[NIT]** UTC-stamp vs local-compare skew in recency — verified it only ever errs toward *open* (never collapses fresh work); documented with a comment. **[NIT]** landed on `main` per the hub's board-machinery convention (the hub auto-pushes board state to main); acknowledged.

## Notes
- The chip-rule bug is a textbook merge-gate catch: tests passed (they only covered cases where the buggy and correct rules agree), CI would've been green, and it was visible on the majority of live lanes — exactly the cross-seam, against-the-spec class the adversarial gate exists for.
- No plugin version bump: board.html / board.render.js are Pages assets, not the distributed plugin. Pages redeploys on push.
