# SDLC Profile — apex-moto-stats (APEX)

> Source: user-pasted session rundown. Native SwiftUI motorcycle ride-stats app, live device validation. More execution-engine detail than spanish-coach.

## Build loop / cadence (phases, in order)
1. **Spec anchor** — v1 design spec (`docs/superpowers/specs/`) = source of truth; behavior rules **numbered and cited in reviews** (e.g. "spec §3.7").
2. **Validation gate before building on risk** — risky slices start as a spike; nothing merges until real-world validation. Verdict written as a **gate-output doc** with explicit GO decisions.
3. **Plan per slice** — written **only after prior slice validates** (validate-then-proceed). Plan contains: success criteria, architecture decisions, checkboxed task list, model-routing note, and explicit **"NOT this slice" scope guards**. Scope additions appended as **numbered task addenda** (auditable trail).
4. **UI mockup sign-off before code** — screens built only to brainstorm-approved HTML mocks; deviations **disclosed, not silently chosen**.
5. **Execution: subagent-driven development** — one fresh implementer subagent per task, **full task text + curated context inline** (never "go read the plan"), explicit **report contract: DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT**.
6. **Two-stage review per task** — (a) **spec-compliance reviewer first, "do not trust the report"** — re-runs builds/tests itself; (b) **code-quality reviewer**. Findings loop back to fixes; trivial one-liners applied directly instead of spawning a subagent.
7. **Carry-forwards** — findings belonging to a later task baked into that task's dispatch brief (Task-3 findings → Task-4 prerequisites).
8. **One adversarial merge-gate review per slice** — whole-slice, cross-task seams. Earned its cost: caught 2 criticals all 7 per-task reviews missed.
9. **Device validation before merge** — user's ride is a **formal task (T8)**; branch stays unmerged until it passes.
10. **Memory + docs reconciliation** — memory updated every milestone; docs audited against code on drift (Fable doc-audit workflow).

## Status vocabulary (observed)
slice scoped → (spike validated w/ verdict doc, if risky) → plan written → mockup approved → per-task built (report contract) → per-task two-stage reviewed → carry-forwards folded → merge-gate adversarial review → device-validated → merged → memory/docs reconciled.

## Non-negotiable gates
- **Spec rules numbered + cited** in code reviews.
- **Validate-then-proceed**: no plan/build on unvalidated risk; GO decision documented.
- **Mockup sign-off** before UI code.
- **"Do not trust the report"** — reviewers independently re-run builds/tests.
- **One adversarial merge-gate review per slice** (cross-task seams).
- **Device validation before merge** (formal task).
- Per-commit quality gates (below) all green.

## Per-commit quality gates
`swift test` (package) · `xcodebuild` build · **simulator screenshot-vs-mock** for UI · **Release-build check** when DEBUG-only code involved · **XCUITests against a synthetic sensor harness** for flow regressions.

## Model tiering (Fable vs Opus) — canonical policy, refined here
- **Default Opus**: all implementation subagents, routine per-task spec + quality reviews, mechanical fixes.
- **Fable surgical bursts only**: slice planning/architecture, sensor-math/data analysis (CSV ranking), the **one merge-gate review per slice**, vision-heavy work.
- Decided **per task via Agent `model:` override**, not per session.
- Binding constraint = **5-hour usage window**, not $; Fable drains ~2×.
- Verification discipline: subagent claims independently re-checked — caught a **falsely-claimed UI-test pass** this session.

## Multi-agent patterns + opt-in rules
- **subagent-driven-development** is the execution engine (implementer + spec-reviewer + code-quality-reviewer prompt templates; `superpowers:code-reviewer` agent type).
- **Workflow tool** used once — parallel multi-agent **doc audit**. (Consistent w/ spanish-coach: Workflows = heavyweight, occasional.)

## Skills / methodology applied
- `superpowers:subagent-driven-development` (+ its templates), `superpowers:code-reviewer`.
- House methodology: `intent-first-spec-anchored`, iterative slicing, **mockup sign-off**, no-worktrees-for-live-iOS (work in place on branch), **TDD via Swift Testing for all pure logic**.

## One-line shape
Validate-then-proceed per slice; spec-anchored with numbered rules; subagent-driven execution with a strict report contract and two-stage "don't trust the report" review per task; one adversarial merge-gate review per slice; device validation before merge; same Opus-volume / Fable-surgical routing.
