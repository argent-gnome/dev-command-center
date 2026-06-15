# Model profiles — the swappable model layer

The `dev-orchestrator` SDLC separates **practices** (invariant) from the **model layer** (swappable). This
directory holds **one small doc per *implementation*** — the only place that records which model + topology
fills each SDLC role. Everything else (the skill, ADRs, spec, guides) is **profile-agnostic**: it describes
*roles*, never a model.

## Do we need separate docs per implementation? — yes, but only *these*
Each implementation differs only in *how roles are filled* (e.g. a single Fable reviewer vs an Opus fan-out
panel), so each gets a small profile doc here. We do **not** duplicate the SDLC docs per model — that would
create drift and defeat the whole point of swappability. The rule:

- **ONE practices set** — the skill, `docs/adr/`, `docs/superpowers/specs/`, `docs/guides/` — profile-agnostic,
  describes roles and stages, never names a model.
- **ONE small profile doc per implementation** — here in `model-profiles/<name>.md` — the role → (model,
  topology) map, plus what differs from the other profiles.

Switching the model layer = write/point at a profile, flip `projects.config.json → "modelProfile"`, bump the
plugin `version`. `/plugin marketplace update` propagates it.

## Profiles
- **[`opus.md`](opus.md)** — **ACTIVE.** Every role on Opus 4.8; the three reviews run as multi-lens Opus
  fan-outs (independence-of-perspective replacing the lost cross-architecture independence).
- **[`fable.md`](fable.md)** — **FROZEN / DORMANT.** The pre-2026-06-12 routing (Fable for the adversarial /
  spec-authoring roles), kept for cheap reactivation if Claude Fable 5 is un-suspended.

## The roles a profile maps
driver / implementation · spec & plan authoring · **plan review (4¼)** · per-task verify (6) ·
**merge-gate (7)** · **code-health (7½)** · process audit (`sdlc-auditor`) · `doc-keeper` /
`project-state-scanner`. See each profile file for the per-role model + topology.

See [`../docs/adr/0001-swappable-model-profiles.md`](../docs/adr/0001-swappable-model-profiles.md) (the pattern)
and [`../docs/adr/0002-three-stage-review-spine.md`](../docs/adr/0002-three-stage-review-spine.md).
