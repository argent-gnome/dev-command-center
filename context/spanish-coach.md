# SDLC Profile — spanish-coach

> Source: user-pasted session rundown (Slice 6 → Slice 7 scoping). Native SwiftUI iOS app, live on user's device.

## Build loop / cadence (phases, in order)
1. **scope** — pick/define the next vertical slice
2. **design spec** — committed spec doc
3. **user review** (gate) — human sign-off on spec
4. **implementation plan** — committed plan
5. **build** — subagent-driven, often parallel fan-out
6. **mechanical verification** — token-free scripts (e.g. byte-fidelity `verify_answers.py`)
7. **adversarial verification** — independent reviewer(s), cross-referenced
8. **CI** — verified by actual `gh run view --json conclusion` (PR run AND post-merge main run)
9. **live-in-Simulator** — eyes-on; reload app after content/UI change
10. **merge** — PR-based
11. **docs + memory reconciliation** — ADR + roadmap + memory update

Unit of work = **small reviewable vertical slice on its own branch**, worked **in place (no worktrees)** because it's a live iOS app.

## Status vocabulary (observed)
slice scoped → spec committed → spec approved (gate) → plan committed → built → verified (mechanical+adversarial) → CI green (JSON-confirmed) → live-validated → merged → docs/memory reconciled.
Cross-session resumability mentioned explicitly (drop & return after days).

## Non-negotiable gates
- **CI by JSON conclusion**, never piped exit codes; both PR run + main post-merge run.
- **Human content/correctness gate** before baking/merging (redlined pools, sentences, content samples).
- **Tests updated to reflect new reality**, not just made green.
- **No destructive SwiftData schema changes** (device-safe, additive/migrations only).
- **Unattended plan-gate**: stop on deviation, don't self-resolve.

## Model tiering (Fable vs Opus)
- Governing rule: **"Fable where the judgment is, Opus where the volume is."**
- Constraint: Fable output tokens ~2×; a whole-slice Fable review once burned ~18% of the 5-hour window → the **5h usage window is the binding constraint, not $**.
- Opus: all volume — extraction subagents, fixer, bulk Swift authoring, routine reviews of simpler work.
- Fable: surgical only — adversarial review of highest-stakes correctness (conjugation lessons), Workflow verify lenses, milestone deep-reviews.
- Spec/plan writing is Fable-endorsed but was done on Opus this session as a deliberate token-conservation call.
- Per-task override via Agent tool `model:` param; session model switchable mid-session via `/model`; mixed-model subagents dispatched under either session model.

## Multi-agent patterns + opt-in rules
- **Plain parallel subagents (Agent tool)** — extraction fan-out, multi-lens review. **No opt-in required.**
- **Workflows (scripted multi-agent)** — find→verify, generate→multi-lens-verify. **Require explicit "ultracode" opt-in.** None ran this session.
- Verification doctrine: **two independent reviewers cross-referenced** (caught a Fable false-positive on `ver`), then **token-free script** confirmed byte-identical.

## Skills / methodology applied
- **intent-first-spec-anchored** (auto-loaded, preferred): lead with outcomes, auditable spec as source of truth, delegate "how" to AI, **scale rigor to stakes**.
- Standing prefs: iterative reviewable slices, no worktrees for live iOS, reload app on UI change, no destructive SwiftData changes, unattended plan-gate.
- SwiftUI/SwiftData/swift-testing-pro/brainstorming NOT invoked this session (content slice reusing locked patterns). New capability (Slice 7 conjugation-aware generation) flagged as possibly warranting brainstorming.

## One-line shape
Opus does labor + routine review; Fable spent in surgical bursts on highest-stakes judgment; everything moves spec → plan → build → adversarial-verify → CI-JSON → live → merge → docs, with Workflows gated behind explicit opt-in.
