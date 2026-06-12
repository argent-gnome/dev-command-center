# Slice 9 — Collapsible swim lanes (board/Pages only)

**Goal:** keep the board short as projects grow. Each lane collapses to an at-a-glance status strip; idle lanes auto-collapse so you never re-open active work by hand. **Design signed off** via `docs/mockups/board-collapsible-lanes.html` (v2). **No plugin change** — board.html / board.render.js are Pages assets, not the plugin; no version bump.

## Decisions (from sign-off)
- Strip content (approved): caret · project name · active-slice chip (colored by column) · 6-cell mini-board (per-column counts) · ⛔ blocked badge · last-touched (MM-DD).
- **Alignment:** every lane reserves the same trailing slots (pips · ⛔ · date) so they line up down the board whether or not a lane is blocked — the ⛔ slot is fixed-width and always rendered (empty when none).
- **Auto-collapse = pure recency (Option A):** on load, a lane is open iff its newest card was touched **≤ `IDLE_DAYS` (1)** ago; else collapsed. Re-derived every load (no persisted overrides) — active work, being recently touched, opens itself. Manual toggle works live (native `<details>`), not persisted.

## Build
- **`board.render.js`** — `laneHtml` emits `<details class="lane" data-lane data-touched>` + `<summary>`(strip) + `.cols`. No `open` attr in markup → **default collapsed**; recency opens recent lanes client-side (progressive enhancement; JS-off = all collapsed, still readable). New helpers: `representativeCard` (rightmost non-done card; tie → most recent), `laneTouched` (max card lastTouched), short-slice/MM-DD/pips/blocked formatting. Export `representativeCard` + `laneTouched` for direct tests.
- **`board.html`** — add the collapsible CSS (from the approved mock) + `--amber`/`--green` tokens; add `IDLE_DAYS` + `applyRecency()` called after each render in `load()` (live + offline `window.__BOARD__` paths).
- **`build-board.js`** — unchanged (copies board.html, which carries the recency script; prerendered #root is re-rendered + recency-applied on open).
- **`test/board.render.test.js`** — assert: `<details data-lane data-touched>`, **no `open` in server output** (default-collapsed), the chip = rightmost-non-done (`Slice 1 · Build`), 6 pips, every lane reserves a `blk-badge` slot (alignment), `⛔ 1` when blocked, MM-DD touched. Plus direct unit tests for `representativeCard` + `laneTouched`.

## Gates
Hub node tests green → **Fable merge-gate** (board render is shared infra + the recency logic is date math — exactly where the gate earns its keep) → land on main (Pages redeploys) → Slice 9 retro + memory.

## NOT this slice
Sticky manual overrides (Option B — rejected); per-project collapse config; the watermark-own-file cleanup; doc-keeper CI backstop.
