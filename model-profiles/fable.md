# Model profile: `fable` — **FROZEN / DORMANT**

> ⛔ **Not active. Do not select.** Claude Fable 5 was suspended for all customers on **2026-06-12** by a
> US-government export-control directive (national security) — verified unavailable (a forced dispatch returns
> an instant "Claude Fable 5 is currently unavailable"). https://www.anthropic.com/news/fable-mythos-access
>
> This file is a frozen snapshot of the routing used *before* the suspension, preserved so we can reactivate it
> cheaply **if Fable returns**: flip `config.modelProfile` back to `fable`, restore `model: fable` on the
> `merge-gate-reviewer` and `sdlc-auditor` agents, bump the plugin `version`. Until then the active profile is
> `opus.md`.

## Role → (model, topology) — as of 2026-06-12, pre-suspension
| Role | Model | Topology |
|---|---|---|
| Driver / implementation | Opus | single (session main loop) |
| Spec / plan authoring | Fable burst | single — modeling-judgment layer (where catches like "decisions-aren't-states" and the AW-fixture contradiction lived) |
| Per-task verify (stage 6) | Opus | two independent passes |
| Merge-gate (stage 7) | **Fable** | single — the ONE adversarial reviewer; a *different* architecture checking Opus's work (caught 7+ criticals that per-task review + CI missed) |
| Process audit (`sdlc-auditor`) | Fable | single |
| `doc-keeper` / `project-state-scanner` | Opus | single |

## Rationale (preserved)
Default Opus; spend Fable in **surgical bursts** only where a subtle slip compounds silently — rule/algorithm/
schema design, first-pass spec + plan authoring, the one merge-gate review per slice, sensor-math/vision. The
binding constraint was the **5-hour usage window** (Fable drained it ~2×), not dollars — so Fable being free on
the plan did *not* relieve window-maxing. The merge-gate's distinctive value was **cross-architecture
independence**, which the `opus` profile replaces with multi-lens fan-out.
