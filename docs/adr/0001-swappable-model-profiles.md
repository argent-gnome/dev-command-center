# ADR 0001 — Swappable model profiles + Opus merge-gate panel

- **Status:** Accepted
- **Date:** 2026-06-12
- **Context:** Claude Fable 5 suspended for all customers; SDLC re-architected across plugin 0.9.0 → 0.10.0

## Context

The house SDLC routed two adversarial roles to a *different* model than the driver:
`merge-gate-reviewer` (stage-7 whole-slice review) and `sdlc-auditor` (process audit) both
carried `model: fable` frontmatter. That model diversity was deliberate — a *different*
architecture checking Opus's work (**independence-of-architecture**) was the merge-gate's
distinctive value, empirically catching 7+ criticals that per-task review + CI missed.

On **2026-06-12** Claude Fable 5 was suspended for all customers by a US-government
export-control directive (national security) — https://www.anthropic.com/news/fable-mythos-access.
Verified directly: a forced `model: fable` dispatch now returns an instant
"Claude Fable 5 is currently unavailable". The conductor's two Fable-routed dispatches were
therefore guaranteed to break. This is a **categorical, indefinite outage** (a government order),
not an intermittent refusal.

Two things were tangled in the old design and had to be separated:
1. The model string (`model: fable`) was hardcoded **in the agent files**, so a model swap meant
   editing every agent — and the routing rationale lived only in memory notes, not in the repo.
2. The merge-gate's value was expressed *only* as "use a different model". With no second model
   available, that rule had no realizable form.

## Decision

Introduce **swappable model profiles** (a Strategy / policy-injection pattern) and realize the
new active profile's merge-gate as an **Opus adversarial panel**.

**1. Roles vs. profile.** The `dev-orchestrator` skill defines the *practices* — the stages,
gates, the slice loop, board lockstep, stack gates — and a fixed set of **roles** (driver ·
spec/plan author · per-task verifier · merge-gate reviewer · process auditor). A **model profile**
at `model-profiles/<name>.md` maps each `role → (model, topology)`. `projects.config.json →
"modelProfile"` names the active one. The practices never change with the model; only the model
layer swaps. Switching models = write a new profile doc + flip the config key + bump the plugin
`version`; `/plugin marketplace update` propagates it.

- `model-profiles/opus.md` — **ACTIVE**: every role on Opus 4.8 (`claude-opus-4-8`), the top tier.
- `model-profiles/fable.md` — **FROZEN / DORMANT** snapshot of the pre-suspension routing, kept so
  reactivation is cheap if Fable returns (flip the key, restore `model: fable` on the two agents,
  bump version).

The `merge-gate-reviewer`, `sdlc-auditor`, and `project-state-scanner` agents dropped their
`model:` frontmatter and are now model-agnostic — they inherit the dispatching session's model.
The profile, not the agent file, decides the model and whether a role fans out into a panel.

**2. Merge-gate adversarial panel.** `workflows/merge-gate-panel.js` realizes the `opus` profile's
stage-7 topology. What's lost is not capability (Opus 4.8 *is* the top tier) but
**independence-of-architecture**. We replace it with **independence-of-perspective**: instead of
one Fable reviewer, the panel runs **4 refute-biased Opus lenses** (correctness · data-safety ·
spec-compliance · cross-seam), each reusing the read-only `merge-gate-reviewer` agent on one rubric
dimension so the reviewers cannot see each other's blind spots. Every critical/should-fix candidate
then faces **3 independent Opus refuters**; a candidate survives only if a **majority did not
refute** it (≥2 of 3 refute → killed; all-refuters-error → fail-closed to not-confirmed). Verdict:
**NO-GO iff ≥1 confirmed critical, else GO** — matching the old gate's reject-on-critical rule;
should-fixes and nits are reported but never block.

`SKILL.md` stage-7 invokes the panel as the **standing Workflow opt-in** for the `opus` profile,
and **degrades to a single `merge-gate-reviewer` dispatch** only if a Workflow can't run.

The 5-hour usage window (not $) remains the binding constraint, but with Fable gone (it drained the
window ~2×) there is more headroom — affording the extra Opus passes the panel spends.

## Alternatives considered

- **Runtime "try Fable → fall back to Opus".** Rejected. This is a *categorical* outage (a
  government order), not an intermittent refusal, so a Fable probe is **guaranteed to fail** — a
  pure cost with no upside. Worse, a model-string fallback **cannot express the panel topology**
  (it only swaps one model for another, not one-reviewer for a fan-out-of-lenses-plus-refuters).
  Runtime fallback is the right tool only for *intermittent* refusals, which this is not.
- **Hardcode Opus into every agent and delete the Fable references.** Rejected. It throws away the
  ability to reactivate Fable cheaply, buries the routing rationale back inside agent files, and
  leaves no single place that documents the active model layer.
- **Drop the merge-gate's adversarial nature** (single Opus reviewer, same as the driver). Rejected
  as the end state — it surrenders all independence. A single-Opus reviewer survives only as the
  **degraded fallback** when a Workflow can't run.

## Consequences

- Model swaps are now a **config + version-bump** operation, not an edit across agent files. A
  future post-Fable model is a new `model-profiles/<name>.md` + flip `modelProfile` + bump version.
- The two adversarial agents are **model-agnostic**; routing and topology live in the profile docs,
  which are the single source of truth for the model layer (and are read by the skill at runtime).
- The merge-gate keeps its adversarial teeth via lens + refuter fan-out instead of a second model.
  This spends more of the usage window per gate — acceptable given the post-Fable headroom.
- The panel was **syntax-validated and logic-reviewed** as of 0.10.0 but had **not yet run against a
  live slice**; its first real exercise is the next slice's stage-7. Until then the single-reviewer
  degrade path is the proven fallback.
- If Fable is restored, the `fable` profile reactivates with a config flip + restoring `model: fable`
  on the two agents + a version bump; no practice changes.
