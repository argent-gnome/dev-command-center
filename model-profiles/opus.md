# Model profile: `opus` — **ACTIVE**

> Selected by `projects.config.json → "modelProfile": "opus"`. Every SDLC role runs on **Opus 4.8**
> (`claude-opus-4-8`), the most capable model currently available. This profile became active **2026-06-12**,
> when Claude Fable 5 was suspended for all customers by a US-government export-control directive (national
> security) — https://www.anthropic.com/news/fable-mythos-access. The prior `fable` profile is frozen in
> `fable.md` and reactivates only if Fable is restored.

## How profiles work
The SDLC (the `dev-orchestrator` skill) defines **roles**; a profile maps each `role → (model, topology)`. The
*practices* — stages, gates, the slice loop, board lockstep, stack gates — never change with the model. To
switch the model layer: write a new `model-profiles/<name>.md`, point `config.modelProfile` at it, bump the
plugin `version`. The `/plugin marketplace update` flow propagates it.

## What changed vs the `fable` profile
The loss is **not capability** — Opus 4.8 is now the top tier. It's **cross-architecture independence** in the
adversarial reviews (a *different* model checking Opus's work). We replace it with **independence of
perspective**: where `fable` spent one dedicated Fable reviewer, `opus` spends multiple independent Opus
lenses — diversity-of-lens substituting for diversity-of-model. The 5-hour window has more headroom now (Fable
drained it ~2×), so the extra Opus passes are affordable. The window is still the governor, just with slack.

## Role → (model, topology)
| Role | Model | Topology |
|---|---|---|
| Driver / implementation | Opus 4.8 | single (the session main loop) |
| Spec / plan authoring | Opus 4.8 | single, with full repo context (the modeling judgment already lands in the approved spec) |
| Per-task verify (stage 6) | Opus 4.8 | spec-compliance reviewer THEN code-quality reviewer (already two independent passes) |
| **Merge-gate (stage 7)** | Opus 4.8 | **adversarial PANEL (BUILT)** — `workflows/merge-gate-panel.js`: 4 refute-biased lenses (correctness · data-safety · spec-compliance · cross-seam) → 3 independent refuters per critical/should-fix finding (majority-refute kills it) → GO/NO-GO. Independence-of-perspective replacing the lost independence-of-architecture. Every lens/refuter reuses the `merge-gate-reviewer` agent (read-only, refute-biased). |
| Process audit (`sdlc-auditor`) | Opus 4.8 | single (synthesis, not adversarial refutation — a panel buys little here) |
| `doc-keeper` / `project-state-scanner` | Opus 4.8 (inherited) | single |

## Notes
- Agents carry **no `model:` frontmatter** — they inherit the dispatching session's model (Opus). The profile,
  not the agent file, decides the model and whether a role fans out into a panel.
- The merge-gate panel is **BUILT** (`workflows/merge-gate-panel.js`) — this profile is fully realized. Its first real exercise is the next slice's stage-7; until then it is syntax-validated and logic-reviewed, not yet run against a live slice.
