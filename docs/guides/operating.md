# Operating the Dev Command Center

Your day-to-day guide to running the house SDLC and the tracker.

## Install / update the tooling
The conductor skill + agents ship as a Claude Code plugin from this repo's marketplace:
```
/plugin marketplace add argent-gnome/dev-command-center   # one time
/plugin install dev-command-center@dev-command-center      # one time
/plugin marketplace update                                 # pull latest after a version bump
```
Installs the `dev-orchestrator` skill + the four agents `project-state-scanner`, `doc-keeper`,
`merge-gate-reviewer`, and `sdlc-auditor`, plus the review-spine Workflows under `workflows/`.

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
(scope → spec → plan → **plan-check** → build → verify → **merge-gate** → **health-sweep** → CI → live → reconcile)
delegating to your `superpowers:*` skills, and updates the board at every step. It **STOPS and asks you** at the gates:
spec review · mockup sign-off · live/device validation · CI red · any plan deviation · anything
irreversible (publish / prod / destructive).

## Reviews per slice (the spine)
Three Opus fan-out reviews, each at the cheapest point for its concern (ADR 0002):
- **4¼ plan-check** — reviews the *plan* vs the app + spec BEFORE code; **soft** (criticals must be folded in first).
- **7 merge-gate** — adversarial review of the *completed slice*; **hard** GO/NO-GO.
- **7½ health-sweep** — whole-app code-health; **advisory**, writes a ranked backlog to `<project>/docs/health/`.

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

## Model routing (profile-driven)
Routing is decided by the **active model profile** (`config.modelProfile` → `model-profiles/<name>.md`), not
hardcoded — the SDLC *practices* stay fixed, only the model layer swaps. **Active: `opus`** — every role on
Opus 4.8; the three reviews run as multi-lens Opus fan-outs. **`fable` is frozen/dormant** (Fable 5 suspended
2026-06-12 by a US-gov export-control directive; reactivate via a config flip if it returns). The binding
constraint is still the **5-hour usage window, not $** — with Fable gone there's more headroom, spent on the
fan-out reviews. See ADR 0001 (profiles) + ADR 0002 (review spine).
