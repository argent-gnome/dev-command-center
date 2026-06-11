# The Self-Improvement Loop

How the process improves itself from real friction — safely, without ever silently rewriting its own rules.

## 1. Capture (every slice — automatic)
At reconcile (stage 11) each slice writes `docs/retros/<key>-<slice>-retro.md`: manual interventions,
decisions, **plan deviations**, gate friction. This is just logging — no agent, no token cost.

## 2. Audit / propose (periodic — the `sdlc-auditor` agent, *planned, Slice 8*)
Periodically (every few slices, or on demand — **not** every slice), the `sdlc-auditor` (Fable) reads the
accumulated retros and opens a **PR** proposing changes to the orchestrator skill, the agents, or the SDLC
flow, with rationale. **It never self-merges to main.**

## 3. Gate (you)
Review the PR — with a Fable adversarial pass for substantial changes. Open audit PRs surface in the board's
**Needs-Attention pane** with **age badges**, so a proposal can't sit stale and forgotten for months.

## 4. Apply + re-pull
Merge the PR → bump the plugin `version` (in `plugins/dev-command-center/.claude-plugin/plugin.json` **and**
`.claude-plugin/marketplace.json`) → run `/plugin marketplace update` (also auto-checked at session start).
Your sessions now run the improved process.

## Until `sdlc-auditor` exists
Run the loop by hand: skim `docs/retros/` for recurring friction, edit the skill/agents, bump the version,
update. The retros are written and waiting — that's the whole point of capturing them now.
