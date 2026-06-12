# dev-command-center Slice 7 Retro — Dogfood the conductor on a real slice (hims Task 8)

**Date:** 2026-06-12 · **Mode:** dogfood (ran `dev-orchestrator` in a fresh hims session, Opus driver / Fable merge-gate) · **Subject slice:** hims Slice 1 (pilot detail + intake write-path, PR #5, squash-merged, CI green).

This is the first end-to-end run of the conductor + full agent roster on a real project. Standing in for the not-yet-built `sdlc-auditor` (Slice 8), this retro captures what the dogfood surfaced and the conductor amendments it drove.

## What the dogfood validated (conductor working as designed)
- **Full agent roster exercised on hims for the first time:** build ×2, spec-compliance + `superpowers:code-reviewer` (parallel), an ESLint subagent, `doc-keeper` (author/reconcile — caught real doc drift), `merge-gate-reviewer` (Fable). All gates green (lint · typecheck · test +DB · parity · check:generated · build); PR + post-merge CI verified green via `gh run view --json conclusion`.
- **The Fable merge-gate earned its keep again — 4th critical caught.** It found a fixtures masking-seam bug that two independent reviews *and* CI all missed: fixtures double-seeded promoted fields as `field_value` rows and `assemble()` layers field_value over the promoted column, so intake writes were silently masked on read (worst case where `med_election` drives `appliesWhen` routing). Proven fixed headlessly. The reserved one-adversarial-review-per-slice doctrine holds.
- Code-review independently caught a silent-save bug (`z.enum().optional()` rejecting the `""` an empty `<select>` submits → partial saves wrote nothing). "Don't trust the report" paid: every subagent's gates were independently re-run.

## Conductor gaps the dogfood found → amendments made this slice
1. **Retro location was wrong for private projects.** SKILL said per-slice retros live in the public hub `docs/retros/`. For hims that leaks domain specifics. → **Fixed:** a tracked project's retro now lives in **its own repo** (`<repoPath>/docs/retros/`); only the hub's own retros stay in the hub. (The dogfood already did the right thing operationally; the *instruction* was the bug.)
2. **Public-board leak.** Card text carried hims specifics onto public Pages. The agent sanitized `data/hims.json` after the fact. → **Fixed systemically:** new `"private": true` config flag (set on hims) + a **Public-board privacy** rule — private projects' `title`/`phase`/`nextAction` stay generic, specifics go to the private repo ("see private ADR 0001").
3. **Mid-slice board updates didn't fire.** The card jumped backlog→done only at merge; the "update at every transition" instruction wasn't enforceable enough. → **Fixed:** explicit stage→column walk (`spec`→`build`→`verify`→`live`→`done`) with "run board-update the moment you ENTER a new column."
4. **Repo wasn't readied at run-start** (two faces of one gap): the session opened on a git tangle (stranded plan-patch + stale WIP + a branch predating a merge), *and* the operator had to manually add the missing ESLint/lint CI gate mid-slice. → **Fixed:** a single run-start step — **"Reconcile the starting state & ready the repo"** — that reconciles git reality vs the board *and* confirms the stack's CI gate set + docs scaffold exist (standing up what's missing) before any building. (First drafted as a separate Preflight section; merged into the one run-start step per operator feedback — one prep step, not two.)
5. **Destructive-migration gap.** Migration `0001`'s enum cast is destructive to a populated DB; the web stack gate didn't warn (iOS had the SwiftData rule; web had no twin). → **Fixed:** web stack gate now flags silently-destructive migrations (fresh CI DB passing ≠ safe against a populated one).

## Decisions / open items for the operator
- **Public git-history scrub (USER DECISION):** the live board is sanitized, but earlier hims card text remains in the public repo's git history. Recommendation: **leave as-is** — de-identified initials + percentages, pre-launch, no real PHI, now superseded; force-rewriting a public repo's history is disruptive for minimal residual risk. Scrub on request only.
- **Spec reconciliation (follow-up):** the design spec should absorb Preflight + the privacy rule to stay source-of-truth.
- **hims sequencing (project-level, not conductor):** Slice 2 (progress pane) is unblocked; consider scheduling the `hims__auth-org-context` auth slice early since it gates go-live for both read and write paths.

## Plugin
Bumped **0.4.0 → 0.5.0** (preflight + privacy + live-column-walk are behavior changes). Publish = push + version is already bumped → `/plugin marketplace update dev-command-center` then `/plugin install`.

## Process note
This retro is the manual version of what `sdlc-auditor` (Slice 8) will automate: read per-slice retros, propose conductor improvements via gated PR. Slice 7 proves the loop is worth automating — five conductor fixes came straight out of one dogfood.
