# Dev Command Center

One hub for building three concurrent software projects the same way every time — a unified house SDLC, a
Jira-style tracker, and the tooling that keeps them in sync. This repo is simultaneously:

- a **project tracker** (`board.html`, served via GitHub Pages),
- a **Claude Code plugin marketplace** (`.claude-plugin/marketplace.json`) distributing the `dev-orchestrator`
  skill + agents,
- and the **design source of truth** (`docs/superpowers/specs/`).

## Install the tooling (Claude Code)

```
/plugin marketplace add argent-gnome/dev-command-center
/plugin install dev-command-center@dev-command-center
```

## Status

Built in reviewable vertical slices (see `docs/superpowers/plans/` + `docs/retros/`). The hub, marketplace,
live board, and the `dev-orchestrator` conductor are all shipped. Model routing is **profile-driven**
(`model-profiles/`, `config.modelProfile`) so the model layer is swappable — active profile **`opus`** (Fable 5
suspended 2026-06-12). Each slice runs a **three-stage review spine** — plan-check (4¼) · merge-gate (7) ·
health-sweep (7½) — as Opus fan-out Workflows. Design: `docs/adr/` (0001 model profiles, 0002 review spine) +
`docs/superpowers/specs/`. Day-to-day: `docs/guides/operating.md`.
