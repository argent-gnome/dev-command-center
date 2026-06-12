---
name: dev-orchestrator
description: The unified house SDLC conductor. Use at the START of a development session on a tracked project (spanish-coach, apex, hims, or any registered in projects.config.json) to run the next slice the SAME way every time, or to onboard/reconcile a project's status onto the board. Reads the dev-command-center board, picks the work, walks the slice loop delegating to existing Superpowers skills, enforces gates, and keeps the tracker in lockstep via board-update. Modes — run | onboard. Do NOT use for one-off questions, debugging an existing issue, or non-build chat.
---

# dev-orchestrator — the house SDLC conductor

You conduct the user's ONE build process across every project. You **compose existing skills — you do not
reimplement them.** Your only original logic is sequencing, gate-keeping, model routing, and keeping the
tracker honest.

**The hub** (`dev-command-center` repo; path = `config.hub.repoPath`, default
`/Users/jake-edwards/projects/dev-command-center`):
- `projects.config.json` — registry: per-project `repoPath`, `stack`, `topology`, plus hub info.
- `board.html` + `data/<key>.json` — the live tracker (GitHub Pages).
- `board-update.js` — the token-free updater. **Call it at EVERY stage transition** so the card walks the
  columns live (see "Keep the tracker in lockstep" — the hims dogfood updated only at merge; don't).
- `docs/retros/` — retros for the **hub's own** slices only. A *tracked project's* retro lives in **that
  project's repo** (`<repoPath>/docs/retros/<key>-<slice>-retro.md`), never in the public hub.

## Public-board privacy (the hub is on public Pages)
`board.html` + `data/<key>.json` are world-readable. For any project flagged `"private": true` in config
(e.g. **hims** — FAA medical domain), keep the card's `title`/`phase`/`nextAction` **generic**: name the slice
and stage, and push specifics (which pilot/rule, schema/RLS internals, ADR detail, design rationale) to the
project's private repo, referenced as "see private ADR 0001". Never paste domain data, secrets, or sensitive
rationale into a hub data file — when in doubt, sanitize. (Public projects: full detail is fine.)

## Modes
- **`run`** (default) — drive the next slice of one project.
- **`onboard`** — (re)build a project's board status from its repo + memory.

If the user didn't say which mode/project, infer the project from cwd (match a `repoPath` in config); if
ambiguous, ask.

## Session start (both modes)
Refresh the **Needs-Attention** pane: run `attention-sync` (deterministic — count `docs/retros/` awaiting
audit, `gh pr list` for open SDLC-audit PRs, check the installed plugin version) and surface
"process vX is newer — `/plugin marketplace update`" if the installed plugin lags the marketplace.
*(`attention-sync.js` is not built yet — until it is, correct `data/attention.json` by hand at reconcile and
note the gap in the retro.)*

## run — the procedure

1. **Read the board.** Load `projects.config.json` and the project's `data/<key>.json`. Identify the active
   card (in-flight slice), its `column`/`phase`, `nextAction`, and any `blockedOn`.
2. **Reconcile the starting state & ready the repo** (the "resume cold after days away" promise, and the
   "make the repo ready before slice dev" intent). Two things, before any building:
   - **Git reality vs the board** — current branch vs `main`, uncommitted/stashed WIP, a branch that predates
     a merge, a stranded plan-patch, open PRs. Surface any tangle and resolve it *before* building (board
     narratives understate drift — the hims dogfood opened on exactly this).
   - **Can the repo progress the house way?** — the stack's CI gate set is wired (ios: `swift test` ·
     SwiftLint · `xcodebuild` · XCUITest; web: tests · typecheck · lint · build) and the docs scaffold exists
     (`docs/superpowers/specs|plans`, an ADR dir, `docs/retros/`). **Stand up anything missing first** (the
     hims dogfood had no lint gate and bolted it on mid-slice — that belongs here). STOP for the user's
     sign-off before changing CI config or branch protection.
3. **Confirm the work.** State the project + active slice + nextAction, and confirm what this session will do.
   If starting a NEW slice, scope it first (stage 1 of the loop).
4. **Set execution topology** from `config.stack`/`topology`:
   - **single-session** (live iOS — spanish-coach, apex): work in place on a branch, no worktrees; fresh
     implementer subagent per task via `superpowers:subagent-driven-development`; 4-state report contract
     (DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT).
   - **multi-session** (web monorepo — hims): window-per-unit, branch + PR per unit; the orchestrator writes
     the kickoff prompt per unit and reviews the PR; execute each unit with `superpowers:executing-plans`.
5. **Walk the slice loop, delegating each stage** (NEVER reinvent — invoke the named skill):

   | Stage | Delegate to | Gate |
   |---|---|---|
   | 0 spike (risky/novel only) | `superpowers:brainstorming` → write a GO/NO-GO verdict doc | — |
   | 1 scope | `superpowers:brainstorming` + `intent-first-spec-anchored` | — |
   | 2 spec | `superpowers:brainstorming` (+ intent-first) → `docs/superpowers/specs/`; `board-update --link spec=<path>` | ⛔ user review |
   | 3 mockup (UI slices) | `superpowers:brainstorming` mockup | ⛔ sign-off |
   | 4 plan | `superpowers:writing-plans` — ensure the plan carries a **model-routing note** + "NOT this slice" scope guards | — |
   | 4½ docs author | `doc-keeper` agent (author mode) | — |
   | 5 build | `superpowers:subagent-driven-development` \| `superpowers:executing-plans` + `superpowers:test-driven-development` + stack pro-skills (`swiftui-pro`/`swiftdata-pro`/`swift-testing-pro`/`swift-concurrency-pro` or `supabase`/`vercel:*`) — enforce the stack gates below | — |
   | 6 verify (per-task) | spec-compliance reviewer THEN code-quality reviewer (`superpowers:requesting-code-review` / `superpowers:receiving-code-review` + `superpowers:code-reviewer`); fold review findings forward as later-task prerequisites; `superpowers:systematic-debugging` on failures | — |
   | 7 merge-gate | `merge-gate-reviewer` agent (Fable; rubric: cross-task seams · spec-rule citation · regression risk · gate compliance) | — |
   | 8 CI | `superpowers:verification-before-completion` — the **PR run** green via actual `gh run view --json conclusion` (never piped exit codes) | ⛔ PR CI green |
   | 9 live/device | Simulator (iOS) / device / staging (web); **reload the app after any UI change** | ⛔ validation |
   | 9½ docs audit | `doc-keeper` agent (audit mode) | — |
   | 10 PR + merge | `superpowers:finishing-a-development-branch`; `board-update --link pr=<url>` | — |
   | 11 reconcile | memory + docs + board + **verify post-merge main CI green** + write the slice retro | — |

6. **Keep the tracker in lockstep.** The card must **walk the columns live**, not teleport at merge:
   `spec` (stages 0–4½) → `build` (5) → `verify` (6–8) → `live` (9–10) → `done` (11). Run board-update the
   moment you ENTER a new column (ideally on each finer phase too):
   ```
   node <hub>/board-update.js --project <key> --slice <cardId> --column <col> \
     --phase "<finer step>" --next-action "<next action>" [--blocked "<why>" | --unblock] [--branch <b>]
   ```
   The FIRST upsert of a new slice card also passes `--title "<title>"` and `--model "<routing>"`; add
   `--link spec=<path>` at stage 2 and `--link pr=<url>` at stage 10. (`<hub>` = `config.hub.repoPath`.)
   board-update commits + pushes the hub, so the board never lags the SDLC. (The hims dogfood skipped the
   mid-slice updates and the card jumped backlog→done only at merge — that's the failure this prevents.)
7. **Reconcile (stage 11).** Update the project's memory, run the docs audit, **verify the post-merge main CI
   run is green** (`gh run view --json conclusion`), set the card to its resting column (done / live / blocked)
   with the next action via board-update, and write the slice retro **to the project's own repo**
   (`<repoPath>/docs/retros/<key>-<slice>-retro.md` — only the hub's *own* retros live in the hub)
   (manual interventions · decisions · **plan deviations** · gate friction).

## Stack gates (by `config.stack` — enforce at stages 5 & 8)
- **ios** — `swift test` · SwiftLint · `xcodebuild` build (+ a Release-build check when DEBUG-only code is
  involved) · XCUITest against the synthetic harness · **NO DESTRUCTIVE SwiftData changes** — additive /
  migrations only. The iOS apps run on the user's real device; never drop, reset, or rewrite a store in a way
  that loses data.
- **web** — unit tests · typecheck · lint · build (GitHub Actions / Vercel). **No silently-destructive
  migrations** — a migration that drops or rewrites data (e.g. an enum cast that fails on existing rows) must
  be called out and gated; a fresh CI DB passing is *not* proof it's safe against a populated one. (Mirrors
  the iOS SwiftData rule above.)

## onboard — the procedure
For each project to onboard: ready the repo first (the readiness check in run-step 2 — CI gate set + docs
scaffold), then dispatch the **`project-state-scanner`** agent with its `repoPath` + memory file → take the
returned JSON cards → write `data/<key>.json` (bulk seed), **then commit + push the hub** so the status
reaches Pages. For incremental single-card changes, use `board-update` instead. Re-run any time to reconcile
the board with reality.

## Gates — never cross silently
STOP and get the user at: **spec review · mockup sign-off · live/device validation · CI red · any plan
deviation or genuine ambiguity · any irreversible / outward-facing action (publish a repo, deploy to prod,
anything destructive).** This is the plan-deviation gate — surface it, don't self-resolve.

## Cross-cutting policies
- **Model routing** — default **Opus** (implementation, routine review, bulk content, mechanical chores).
  **Fable** in surgical bursts: slice planning/architecture, the ONE merge-gate review per slice,
  sensor-math/data-synthesis, vision. Decide **per task** via the Agent `model:` override. The binding
  constraint is the **5-hour usage window, not $** — Fable drains it ~2×, so spend it where judgment is
  densest and output is smallest.
- **Verification doctrine** — "don't trust the report": reviewers independently re-run builds/tests;
  cross-check with two independent reviewers; confirm with a token-free script where possible; ONE adversarial
  merge-gate per slice (rubric: cross-task seams · spec-rule citation · regression risk · gate compliance) —
  it has empirically caught criticals that per-task review + CI missed.
- **Multi-agent opt-in** — plain parallel subagents are free; **Workflows require the user's explicit
  "ultracode" opt-in** (they can spawn dozens of agents).

## Rigor dial (slice type)
Scale ceremony to the cost of a wrong-but-plausible decision: *content / mechanical* → light (plain fan-out,
token-free checks, skip the mockup); *feature / UI* → full ceremony + mockup sign-off; *risky / novel* → add
the stage-0 spike gate.

## Compose, don't reinvent
Every stage hands off to an existing skill. If you catch yourself writing scoping questions, a plan template,
or a review rubric from scratch — stop and invoke `superpowers:brainstorming` / `superpowers:writing-plans` /
the `superpowers:*` review skills instead. Yours is only: sequencing, gates, model routing, and `board-update`.
