# Slice 1 Retro — Hub + Marketplace Setup

**Date:** 2026-06-11 · **Branch:** `slice-1-hub-marketplace` → merged (PR #1) · **Mode:** supervised-remote

## What shipped
Public repo `argent-gnome/dev-command-center` as a Claude Code plugin marketplace (`marketplace.json` + the
`dev-command-center` plugin with a stub `dev-orchestrator` skill) + a Pages-served placeholder board.
Live: https://argent-gnome.github.io/dev-command-center/board.html

## Manual interventions
- **Publish gate (user approval):** supervised-remote — parked before `gh repo create --public`; user approved
  explicitly. Correct call: the spec + context docs are now world-readable.
- **GitHub account mismatch:** `gh` is authed as `argent-gnome`, not the email handle `jakec714` the plan
  assumed. Corrected to `argent-gnome` in `plugin.json` homepage, README, and repo path.
- **Pages enable:** the `gh api -f "source[branch]=..."` nested-field form is unreliable; used `--input -`
  with an explicit JSON body instead — worked first try.

## Decisions
- Marketplace name `jakes-dev`, plugin name `dev-command-center` (install: `dev-command-center@jakes-dev`).
- Stub `dev-orchestrator` skill published so the plugin is installable from day one (real skill = Slice 5).
- Planning docs live on `main`; slice branches carry only that slice's code. Drafted the Slice 2 plan on
  `main` while parked at the publish gate (productive use of the away-window).
- No CI this slice (no testable logic yet); add GitHub Actions when `board-update.js` / `build-board.js` land.

## Friction
- Pages: first request 404, then 200 after ~20s — expected first-build delay; the retry loop handled it.
- Nothing blocking.

## Carry-forwards (for the sdlc-auditor + project.config)
- `projects.config.json` should record the gh login (`argent-gnome`), repo, and Pages URL.
- Operator guide: document the `--input` JSON form for enabling Pages.
- `board-update.js` (Slice 3) should backfill the Slice 1 board card — no tracker tooling existed yet.
- User-acceptance check still pending: `/plugin marketplace add argent-gnome/dev-command-center` +
  `/plugin install dev-command-center@jakes-dev`.
