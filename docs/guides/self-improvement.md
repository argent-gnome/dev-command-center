# The Self-Improvement Loop

How the process improves itself from real friction — safely, without ever silently rewriting its own rules.

## 1. Capture (every slice — automatic)
At reconcile (stage 11) each slice writes `docs/retros/<key>-<slice>-retro.md`: manual interventions,
decisions, **plan deviations**, gate friction. This is just logging — no agent, no token cost.

## 2. Audit / propose (periodic — the `sdlc-auditor` agent)
Periodically (every few slices, or on demand — **not** every slice), dispatch the **`sdlc-auditor`** agent
(Fable). Give it the hub `repoPath` + `repo` slug; it reads the retros accumulated since the last audit
(`data/attention.json` → `pendingRetros.sinceAudit`) across the hub **and** every project repo, clusters the
**recurring** friction (a signal in ≥2 slices/projects), and opens a **gated PR** proposing changes to the
orchestrator skill, the agents, or the flow — each finding **citing the retro lines** that justify it. It
labels the PR `sdlc-audit` (so it rides the Needs-Attention pane), advances the watermark *in the PR*, and
**never commits to main or self-merges.** If nothing recurs it opens no PR and says so — a clean audit is a
valid result.

## 3. Gate (you)
Review the PR — with a Fable adversarial pass for substantial changes. Open audit PRs surface in the board's
**Needs-Attention pane** with **age badges**, so a proposal can't sit stale and forgotten for months.

## 4. Apply + re-pull
Merge the PR → bump the plugin `version` (in `plugins/dev-command-center/.claude-plugin/plugin.json` **and**
`.claude-plugin/marketplace.json`) → run `/plugin marketplace update` (also auto-checked at session start).
Your sessions now run the improved process.

## Running it by hand (still fine, any time)
The agent automates a loop you can always run yourself: skim `docs/retros/` for recurring friction, edit the
skill/agents, bump the version, update. The Slice 7 dogfood retro was authored exactly this way — the manual
proof that the loop is worth automating (six conductor fixes from one dogfood). The agent just makes it cheap
to run often.

## Keeping the pane honest (`attention-sync`)
The Needs-Attention pane is refreshed deterministically — `node attention-sync.js --installed <version>`
(the orchestrator runs it at session start). It counts retros awaiting audit, lists open `sdlc-audit` PRs
with age badges, surfaces blocked cards across all projects, and flags when your installed plugin lags the
marketplace. No agent, no tokens — just aggregation so nothing rots unseen.
