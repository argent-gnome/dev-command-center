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

Built in reviewable vertical slices — see `docs/superpowers/plans/`. Slice 1 publishes the hub + marketplace;
the live board and the orchestrator follow.
