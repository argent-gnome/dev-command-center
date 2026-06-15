# ADR 0002 — Three-stage review spine (plan-check · merge-gate · code-health-sweep)

- **Status:** Accepted
- **Date:** 2026-06-15
- **Context:** Two new review workflows added across plugin 0.10.0 → 0.11.0 (commit `4463721`), completing a three-stage review structure with the existing merge-gate panel.

## Context

[ADR 0001](0001-swappable-model-profiles.md) re-architected the **stage-7 merge-gate** into an
Opus adversarial *panel* (`workflows/merge-gate-panel.js`) after Fable was suspended — trading
independence-of-architecture for independence-of-perspective (multiple Opus lenses + refuters). That
gave us one strong adversarial review, but it sat at a single point: **after the slice is built,
before merge.** That single point left two gaps the gate is structurally the wrong tool to close:

1. **Too late for design flaws.** A wrong approach — reinventing an abstraction the app already has,
   missing a spec rule, an unsafe migration ordering, a happy-path-only test plan — is fully formed
   in code by the time it reaches the gate. Catching it there means a NO-GO and a rebuild. The flaw
   existed in the **plan** (a markdown doc) long before any code was written; that is the cheapest
   place to catch it.
2. **Too narrow for whole-app erosion.** The gate is scoped to *the slice* — cross-task seams,
   spec-rule citation, regression/data-safety, gate compliance. It deliberately does not sweep the
   whole codebase for accumulating architecture/idiom/refactor debt. Without a counterweight, the app
   erodes one in-scope-but-suboptimal slice at a time, and there is no standing mechanism to notice.

A single review at one scope and one time cannot serve all three concerns (plan correctness, slice
defect-safety, app health) without being either too early, too late, too narrow, or too blocking for
some of them.

## Decision

Adopt a **three-stage review spine**: three Opus fan-outs at three scopes and three times, each
placed at the cheapest point for its concern, with **distinct blocking semantics** matched to the
cost of being wrong at that scope.

| Stage | Workflow | Scope | When | Verdict | Blocking |
|---|---|---|---|---|---|
| **4¼ plan-check** | `workflows/plan-check.js` | the implementation **plan** vs the existing app + spec | after the plan is written, **before any code** | REVISE / PROCEED | **soft** — fold must-fix into the plan, then build |
| **7 merge-gate** | `workflows/merge-gate-panel.js` | the completed **slice** (its diff) | after build, before merge | GO / NO-GO | **hard** — ≥1 confirmed critical = NO-GO |
| **7½ code-health-sweep** | `workflows/code-health-sweep.js` | the **whole app** (or slice blast-radius) | after the merge-gate returns GO | ranked health backlog | **advisory** — never blocks |

All three are reviewer roles in the active **`opus` model profile**
([`model-profiles/opus.md`](../../model-profiles/opus.md)) and are wired as standing Workflow opt-ins
in the conductor's stage table ([`plugins/dev-command-center/skills/dev-orchestrator/SKILL.md`](../../plugins/dev-command-center/skills/dev-orchestrator/SKILL.md),
stages 4¼ and 7½). They are **standard conductor stages for every project — not piloted.**

### 1. Three scopes × three times (the spine)

Each stage reviews a *different artifact* at the *cheapest moment* to fix what it finds:

- **Stage 4¼ — plan-check** (`workflows/plan-check.js`, NEW). A **pre-build design review** of the
  freshly-written implementation plan against the existing app and the slice spec. Five Opus lenses
  run in parallel, each on one dimension: **arch-fit** (does the plan fit the app's architecture /
  conventions, or reinvent / duplicate?), **spec-coverage** (every acceptance criterion covered; the
  "NOT this slice" guards correct?), **risk/sequencing** (compiles at every task boundary; no
  data-loss migration; gated irreversible steps?), **testability** (a *discriminating* test per spec
  rule — an input where the intended behavior and the nearest plausible-wrong implementation
  disagree?), and **simpler-path** (a materially simpler approach; flag premature abstraction /
  over-engineering *in the plan*). It returns **REVISE / PROCEED**, a **must-fix-before-build** list,
  and advisory recommendations. The rationale is **shift-left**: a design flaw caught here is still a
  markdown edit, not a rebuild.

- **Stage 7 — merge-gate panel** (`workflows/merge-gate-panel.js`, existing — see ADR 0001).
  Adversarial defect / seam / regression review of the *completed slice* diff. Unchanged by this ADR;
  it remains the hard gate.

- **Stage 7½ — code-health-sweep** (`workflows/code-health-sweep.js`, NEW). An **advisory whole-app
  code-health review** run *after* the merge-gate has already said GO (so it can never gate-block, by
  construction of its position in the loop). Stack-specific lenses sweep the codebase — **iOS:**
  architecture · swiftui · swiftdata · concurrency · refactor; **web:** architecture · quality · data
  · refactor — then a synthesis pass dedupes across lenses, drops anything in the suppression ledger,
  and ranks by value-to-effort. The output is a **health backlog** written under
  `<repoPath>/docs/health/`. It keeps the codebase clean slice-by-slice instead of eroding, and never
  blocks a merge.

### 2. Soft / hard / advisory blocking semantics

The three stages deliberately block differently, because the *cost of being wrong* differs by scope
and the spine should add friction only where friction pays:

- **4¼ is a SOFT checkpoint.** A REVISE verdict means: fold the must-fix items into the plan (re-run
  `superpowers:writing-plans` on the deltas), then proceed to build. It does not halt the slice or
  require the user the way a hard gate does — a plan edit is cheap and the author retains discretion
  over advisory recs. To keep the must-fix list trustworthy enough to act on without a human gate,
  **every critical is refute-verified** (a second adversarial Opus pass defaults to `refuted=true`
  unless convinced the plan genuinely must change before building); refuted criticals are downgraded
  to advisory rather than forcing a revision. A false flag therefore can't spiral the plan.
- **7 is a HARD gate.** GO / NO-GO; ≥1 confirmed critical blocks the merge. This is the floor the
  rigor dial may never down-rate (per SKILL §"Rigor dial"). Unchanged from ADR 0001.
- **7½ is ADVISORY and NEVER blocks.** It emits a backlog, full stop. It runs *after* the GO
  precisely so it is structurally incapable of holding a merge; its findings are triaged into future
  slices, not the current one. The codebase improving over time is worth a standing review; making
  that review blocking would tax every slice for debt that is, by definition, not a defect.

### 3. The suppression-ledger design (health-sweep)

A recurring whole-app review has a failure mode: it re-reports the same known-and-accepted issues
every slice, training the operator to ignore it. The health sweep solves this with a per-project
**suppression ledger** at `<repoPath>/docs/health/accepted.md` (the `ledgerPath` arg, default
`docs/health/accepted.md`):

- Each sweep **reads the ledger first** (both in every lens prompt and in the synthesis pass) and
  **drops anything already listed** — so a deliberately-deferred or won't-fix item never re-surfaces.
- This makes the sweep **idempotent against accepted debt**: triage is a one-time decision recorded in
  the ledger, not a recurring re-litigation. New findings stay signal; old decisions stay decided.
- The ledger lives in the *project's* repo (it is per-project policy), alongside the dated backlogs
  the sweep writes (`docs/health/<date>-<slice>.md`).

### 4. Over-engineering calibration

Both new workflows are explicitly calibrated **against** over-engineering, because a naive "make it
better" reviewer trends toward speculative redesign and premature abstraction — itself a source of
debt:

- **plan-check's `simpler-path` lens** is biased toward "do the simplest thing that works": flag
  premature abstraction, speculative generality, and over-engineering *in the plan*, and explicitly
  **do not invent new requirements or future-proofing.**
- **health-sweep's `refactor` lens** (both stacks) flags **only debt that is real or imminent** —
  not speculative redesigns or new abstractions — and its remit includes **premature abstraction to
  unwind.** Every lens prompt and the synthesis pass repeat "real or imminent debt, not theoretical
  perfection / do not pad the list."

The spine is meant to make the code *simpler and well-fitted*, not maximally abstract. Calibration is
a first-class design property here, not an afterthought.

### 5. Whole-app vs blast-radius scope knob (health-sweep)

The health sweep takes a `scope` argument: **`whole-app`** (default) or **`blast-radius`**.

- **`whole-app`** sweeps the entire codebase — correct while an app is small, when a full pass is
  cheap and maximally catches cross-cutting debt.
- **`blast-radius`** narrows to the files changed in the slice diff
  (`git -C <repo> diff <baseRef>...<headRef>`) plus their direct dependents/collaborators.

The knob exists so the sweep doesn't become a redundant, expensive full re-review as an app grows: as
codebases scale, the conductor shifts the sweep to `blast-radius` so each slice's health pass stays
proportional to what that slice actually touched. (SKILL stage 7½ records this guidance.)

### 6. All three are Opus fan-outs in the `opus` profile

Consistent with ADR 0001's profile model, all three reviews are **roles mapped to (Opus 4.8,
fan-out topology)** in [`model-profiles/opus.md`](../../model-profiles/opus.md), not hardcoded into
agents:

- **Plan review (4¼)** → fan-out panel: 5 lenses + refute-verify.
- **Merge-gate (7)** → adversarial panel: 4 lenses + 3-refuter verify (ADR 0001).
- **Code-health (7½)** → fan-out sweep: stack lenses + synthesis, advisory.

This means a future model swap (a new `model-profiles/<name>.md` + a `config.modelProfile` flip + a
`version` bump) re-routes all three together, with no edit to the workflows or the SKILL — exactly the
decoupling ADR 0001 established. The spine spends more of the 5-hour usage window per slice (three
fan-outs instead of one), which the post-Fable headroom (Fable drained the window ~2×) affords; the
window, not $, remains the binding constraint.

## Alternatives considered

- **One review at the merge-gate only (status quo before this ADR).** Rejected. It catches design
  flaws only after they are built (forcing rebuilds) and has no whole-app health remit. The single
  point is structurally too late for plan correctness and too narrow for app erosion.
- **Make the plan-check a HARD gate.** Rejected. A plan edit is cheap and reversible, and the refuted
  criticals are downgraded rather than forced; a hard halt + user round-trip on every plan would tax
  the common case where the plan is sound. Soft-checkpoint-with-refute-verify gives most of the value
  at a fraction of the friction. (The hard floor stays at stage 7, which is irreversible-adjacent —
  a bad merge.)
- **Make the health-sweep blocking (or a gate).** Rejected. Health debt is by definition not a defect
  for *this* slice; blocking on it would conflate "could be cleaner" with "is wrong," tax every slice,
  and pressure reviewers to under-report to avoid blocking. Advisory-plus-backlog keeps the signal
  honest and lets triage happen across future slices.
- **No suppression ledger — just re-report and let the operator filter.** Rejected. A review that
  re-emits known-accepted items every slice trains the operator to ignore it, destroying its signal.
  The ledger makes triage a durable, one-time decision.
- **Always whole-app (no blast-radius knob).** Rejected for scaling. A full whole-app sweep on every
  slice of a large app is largely redundant re-review and burns the usage window; the knob lets the
  sweep stay proportional.
- **A separate model / different agent per stage.** Rejected as inconsistent with ADR 0001. The
  model layer is owned by the profile, not the stage; all three are Opus fan-outs under `opus` and
  swap together when the profile swaps.

## Consequences

- The slice loop gains two standard stages: **4¼ (soft, pre-build)** and **7½ (advisory,
  post-merge)** — see the SKILL stage table and the design spec §3.2 loop. The merge-gate (7) is
  unchanged.
- Each project accrues a `docs/health/` directory: dated health backlogs
  (`docs/health/<date>-<slice>.md`) plus the **suppression ledger** `docs/health/accepted.md`. These
  live in the *project's* repo, not the hub.
- Per-slice review cost rises to **three Opus fan-outs** (plan + slice + app). Acceptable given the
  post-Fable usage-window headroom; the `blast-radius` knob caps the 7½ cost as apps grow.
- A model swap re-routes all three reviews at once (profile + version bump), with no workflow or SKILL
  edits — the ADR-0001 decoupling extends cleanly to the full spine.
- Both new workflows were **syntax-validated + logic-reviewed** as of 0.11.0 but had **not yet run
  against a live slice** at adoption; each gets its first real exercise at the corresponding stage of
  the next slice (mirroring the merge-gate panel's status in ADR 0001).
- The suppression ledger introduces a small standing obligation: deferred health findings must be
  *recorded* in `accepted.md` (not just mentally noted) or they re-surface every sweep. That recording
  step is the price of the sweep's idempotence.
