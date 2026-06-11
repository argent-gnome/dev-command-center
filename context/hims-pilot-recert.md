# SDLC Profile — hims-pilot-recert

> Source: user-pasted session rundown (pre-digested as a cross-comparison vs APEX). Web monorepo (FAA HIMS pilot recertification platform). Same methodology, different stack + execution topology.

## Build loop / cadence (phases, in order)
Same spine as APEX. Instantiated for a web monorepo:
1. **Spec anchor** — field-schema source of truth; cited `Finding` rules carrying `ruleId` / `sourceRef` / `because` (≈ APEX's numbered "spec §3.7" rules).
2. **Validate-then-proceed** — **fix-foundation-first**: audit the foundation (Slice 0.5) before letting Slice 1 build further. Refuses to build on unvalidated risk. Gate artifact = **audit report + locked D1/D2 decisions** (≈ APEX verdict doc).
3. **Plan per slice** — with explicit scope guards ("H2–H5 out of scope" ≈ APEX "NOT this slice").
4. **Mockup sign-off before code** — verbatim same.
5. **Execution: multi-session orchestrated** *(THE key divergence — see below)*.
6. **Review** — currently: executing session self-reviews + orchestrator reviews the PR. (Looser than APEX; see "borrow from APEX".)
7. **Carry-forwards** — done informally: Slice-0 entry criteria → Slice 1; audit's H2–H5 → Slice 1.
8. **Merge-gate** — currently relies on CI + orchestrator PR review (no formal adversarial per-slice pass yet).
9. **Memory/docs reconciliation at milestones** — verbatim same.

## Status vocabulary (observed)
slice scoped → foundation audited/validated (GO artifact) → plan w/ scope guards → mockup approved → per-unit session built (own branch+PR) → CI + orchestrator PR review → merged → memory/docs reconciled.

## THE structural difference: execution topology (stack-driven)
- **hims = multi-session orchestrated**: separate Claude Code windows per slice/unit, each on its own **branch + PR**, an **orchestrator** that writes kickoff prompts and reviews PRs. Justified by web monorepo: branch/PR/CI hygiene + parallelizable units pay off.
- **APEX/spanish-coach = single-session, subagent-driven**: fresh implementer subagent per task *inside one session*, worked **in-place on a branch** (`no-worktrees-for-live-iOS`).
- → This is the **#1 axis the unified skill must parameterize**, chosen by stack/project, not hardcoded.

## Non-negotiable gates
- Spec/field-schema cited rules (`ruleId`/`sourceRef`/`because`).
- Validate-then-proceed (fix-foundation-first; GO artifact).
- Mockup sign-off before code.
- **Deviations disclosed, not silently chosen** — live example: surfaced `submission_14d` over-scoping at the checkpoint instead of self-merging (= plan-deviation gate / unattended plan-gate).
- "Don't trust the report" — re-ran typecheck/tests/parity rather than trusting "done."
- CI green.

## Per-commit / deterministic-scaffolding gates
- **Fixtures + full-`rules.json`-against-fixtures masking test** = deterministic scaffolding catching flow/branch regressions (≈ APEX synthetic-sensor harness).

## Model tiering (Fable vs Opus)
- **Same canonical policy** as APEX now (consolidated `feedback_fable_opus_routing`): default Opus, Fable surgical bursts, per-task `model:` override, 5h window = binding constraint.

## What hims should BORROW from APEX (transferable refinements)
1. **Two-stage per-task review** (spec-compliance reviewer THEN code-quality reviewer, each re-running builds itself) — more rigorous than hims's self-review + orchestrator PR review. Formalize into hims kickoff convention.
2. **Explicit 4-state report contract** (DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT) — bake into hims kickoff template for clean handoffs.
3. **Formal once-per-slice adversarial merge-gate review** (Fable) — empirically justified: hims's Fable foundation audit just found the blocker + H1 that every per-unit review AND CI missed (exact reproduction of APEX's "2 criticals 7 reviews missed").

## One-line shape
Same intent-first-spec-anchored spine as APEX, instantiated for a web monorepo via a **multi-session orchestrator** (window-per-unit, branch+PR) instead of single-session subagent fan-out — and currently looser on per-task review + merge-gate, which it should tighten toward APEX.
