# Operating the Dev Command Center

Your day-to-day guide to running the house SDLC and the tracker.

## Install / update the tooling
The conductor skill + agents ship as a Claude Code plugin from this repo's marketplace:
```
/plugin marketplace add argent-gnome/dev-command-center   # one time
/plugin install dev-command-center@dev-command-center      # one time
/plugin marketplace update                                 # pull latest after a version bump
```
Installs the `dev-orchestrator` skill + the agents `project-state-scanner`, `doc-keeper`,
`merge-gate-reviewer` (`sdlc-auditor` planned).

## View the board
- **Live, any device:** https://argent-gnome.github.io/dev-command-center/board.html
- **Offline:** run `node build-board.js` in the hub, then open `board.local.html`.

Three swimlanes (spanish-coach · APEX · hims), six columns **Backlog → Spec → Build → Verify → Live → Done**.
Each card shows the slice, a phase chip, the next action, branch, and last-touched. A red border + ⛔ means
**blocked** (reason shown). The right **Needs Attention** pane lists open audit PRs, pending retros, and
"process update available."

## Run a slice
In a tracked project's repo, invoke the conductor:
```
/dev-orchestrator            # run mode (default) — drives the next slice
/dev-orchestrator onboard    # rebuild this project's board status from repo + memory
```
It reads the board, picks the active slice, sets the execution topology by stack, walks the loop
(scope → spec → plan → build → verify → merge-gate → CI → live → reconcile) delegating to your
`superpowers:*` skills, and updates the board at every step. It **STOPS and asks you** at the gates:
spec review · mockup sign-off · live/device validation · CI red · any plan deviation · anything
irreversible (publish / prod / destructive).

## Update a card by hand (rarely needed — the conductor does this)
```
node board-update.js --project <key> --slice <cardId> --column <col> \
  --phase "..." --next-action "..." [--blocked "..." | --unblock] [--branch <b>] \
  [--title "..."] [--model "..."] [--link spec=<path> | --link pr=<url>]
```
It commits + pushes the hub; Pages redeploys automatically. Keys: `spanish-coach`, `apex`, `hims`.

## Where things live
- Board data: `data/<key>.json` · attention pane: `data/attention.json`
- Specs / plans: `docs/superpowers/{specs,plans}/` · retros: `docs/retros/`
- Open audit PRs (process-change proposals): `gh pr list` in the hub
- The conductor: `plugins/dev-command-center/skills/dev-orchestrator/SKILL.md`

## Model routing (the budget reminder)
Default **Opus** for implementation/volume; **Fable** in surgical bursts (planning/architecture, the one
merge-gate review per slice, synthesis, vision). The binding constraint is the **5-hour usage window, not $**.
