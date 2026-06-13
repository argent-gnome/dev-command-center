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
Refresh the **Needs-Attention** pane (deterministic — aggregation, not judgment):
```
node <hub>/attention-sync.js --installed <this-plugin's-version>
```
It scans `data/*.json` for blocked cards, counts retros awaiting audit across the hub + every project repo,
lists open `sdlc-audit` PRs (`gh`), and sets `pluginUpdate` when the installed version lags the marketplace.
Pass your running version to `--installed` (read it from `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`);
surface "process vX is newer — `/plugin marketplace update`" if it flags. (`<hub>` = `config.hub.repoPath`.)

## run — the procedure

1. **Read the board.** Load `projects.config.json` and the project's `data/<key>.json`. Identify the active
   card (in-flight slice), its `column`/`phase`, `nextAction`, and any `blockedOn`.
2. **Reconcile the starting state & ready the repo** (the "resume cold after days away" promise, and the
   "make the repo ready before slice dev" intent). Two things, before any building:
   - **Git reality vs the board** — current branch vs `main`, uncommitted/stashed WIP, a branch that predates
     a merge, a stranded plan-patch, open PRs — plus any plan-referenced artifacts that live OUTSIDE git (an
     untracked sibling/content repo): check the disk, not just the log. Surface any tangle and resolve it
     *before* building (board narratives understate drift — the hims dogfood opened on exactly this).
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
   | 4 plan | `superpowers:writing-plans` — ensure the plan carries a **model-routing note** + "NOT this slice" scope guards; **order tasks so the build/test target compiles at every task boundary** (a signature change to a shared type updates its call sites in the SAME task — never leave the app target uncompilable for a later test task) and **merge compile-coupled tasks into one implementer unit** ("mostly independent" is an assumption, not a guarantee — APEX's nav trio only compiled together; a required-arg change there broke the app target two tasks before its fix) | — |
   | 4½ docs author | `doc-keeper` agent (author mode) | — |
   | 5 build | `superpowers:subagent-driven-development` \| `superpowers:executing-plans` + `superpowers:test-driven-development` + stack pro-skills (`swiftui-pro`/`swiftdata-pro`/`swift-testing-pro`/`swift-concurrency-pro` or `supabase`/`vercel:*`) — enforce the stack gates below | — |
   | 6 verify (per-task) | spec-compliance reviewer THEN code-quality reviewer (`superpowers:requesting-code-review` / `superpowers:receiving-code-review` + `superpowers:code-reviewer`); fold review findings forward as later-task prerequisites; **require a discriminating test per spec rule** — at least one input where the spec's rule and the nearest plausible-wrong implementation *disagree* (non-monotone / divergent / boundary cases); a suite that only exercises inputs where right and wrong agree is a coverage gap, not coverage (APEX's elevation tests covered only monotone climbs and a 2× undercount sailed through per-task review; the hub's chip-rule tests only covered cases where the buggy and correct rules agree — both CRITICALs survived to the merge-gate); `superpowers:systematic-debugging` on failures | — |
   | 7 merge-gate | `merge-gate-reviewer` agent (Fable; rubric: cross-task seams · spec-rule citation · regression risk · gate compliance) | — |
   | 8 CI | `superpowers:verification-before-completion` — the **PR run** green via actual `gh run view --json conclusion` (never piped exit codes) | ⛔ PR CI green |
   | 9 live/device | Simulator (iOS) / device / staging (web); **reload the app after any UI change** | ⛔ validation |
   | 9½ docs audit | `doc-keeper` agent (audit mode) | — |
   | 10 PR + merge | `superpowers:finishing-a-development-branch`; `board-update --link pr=<url>`; **the slice's spec, plan, and any approved mockup ship IN the slice PR** — they are the cited design authority (spec-anchored audit trail), never "throwaway"; commit them deliberately, not via a stray `git add -A` | — |
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
   Two lag cases the column-walk alone does NOT cover (spanish-coach Phase-A artifacts sat invisible for a
   whole session on both):
   - **No-commit-trail artifacts.** When a stage's artifacts land OUTSIDE the project's git (an untracked
     sibling/content repo, a generated canon), run board-update with a `--phase` bump the moment they land —
     git can't witness them, so the board is the only signal a later session has.
   - **Session end.** Never end a session — slice finished or not — without board-update reflecting
     everything that landed; the run-start reconcile (step 2) is git-based and blind to non-git work.
7. **Reconcile (stage 11).** Update the project's memory, run the docs audit, **verify the post-merge main CI
   run is green** (`gh run view --json conclusion`), set the card to its resting column (done / live / blocked)
   with the next action via board-update, and write the slice retro **to the project's own repo**
   (`<repoPath>/docs/retros/<key>-<slice>-retro.md` — only the hub's *own* retros live in the hub)
   (manual interventions · decisions · **plan deviations** · gate friction).

## Stack gates (by `config.stack` — enforce at stages 5 & 8)
- **ios** — `swift test` · SwiftLint · `xcodebuild` build (+ a Release-build check when DEBUG-only code is
  involved) · XCUITest against the synthetic harness · **the `xcodebuild` destination simulator must exist**
  (`xcrun simctl list devices available`; derive the device from what's installed, never hardcode a device
  generation in the plan/test commands — verify at the readiness gate, step 2, not at test time; APEX's plan
  named an iPhone 16 the machine didn't have) · **CI must EXECUTE the app-target test bundle, not merely
  build it** — assert tests actually ran (a real test count), and keep the test-target's deployment target ≤
  the runner's installed-simulator OS ceiling, else the bundle silently never launches and the job exits 0 on
  untested code (spanish-coach S8: app-target tests had never run in CI — test-target deployment target 26.5
  over the runner's 17.6 ceiling) · **NO DESTRUCTIVE SwiftData changes** — additive /
  migrations only. The iOS apps run on the user's real device; never drop, reset, or rewrite a store in a way
  that loses data. **The prohibition needs verification teeth:** when any `@Model` schema changes, the stage-9
  live gate MUST include launching against a store populated under the *previous* schema — a fresh
  install / CI passing is *not* proof the migration is safe (twin of the web rule below; a mandatory-new-field
  change hard-crashed a real on-device store that CI, which never runs the app, could not see). The
  live-repro runbook's named previous-schema commit must be a **known-good merge commit, verified to build
  before relying on it — never a mid-refactor intermediate** (same class as the sim-existence rule above:
  every concrete artifact a plan/runbook names gets verified resolvable before dispatch; spanish-coach S8's
  runbook named a mid-rename commit that didn't compile and the live-gate agent had to substitute).
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

## Autonomous / supervised-remote mode (`run --autonomous --max-slices N`)
A bounded layer over the loop for running while the user is away. It changes **only who clears _soft_
gates** — the loop, the stack gates, the Fable merge-gate, and the verification doctrine are unchanged.
- **HARD gates — always stop, even autonomous** = the entire "never cross silently" list above. At each,
  **PushNotification the user** and halt for approval.
- **SOFT gates — auto-advance, WITH a logged decision** = routine stage transitions, per-task
  review→fix→re-review cycles, equivalent-option choices that have a sensible default, board-update calls.
- **Fail closed.** Unsure whether a gate is hard or soft → treat it as hard and stop. Ambiguity *is* a hard gate.
- **Self-stop** when `--max-slices N` is reached · at the first hard gate · on any unrecoverable error. On
  stop, post a summary: what advanced, the decision log, where it halted, what it needs.
- **Decision log.** Append every soft auto-advance to `<repoPath>/docs/autonomous/<date>-<key>-run.md`
  ({stage · decision · why · alternatives}) so no silent correction is invisible at review.
- **Supervised-remote setup:** `claude` remote-control + the Claude phone app + `/config` "Push when Claude
  decides" + `caffeinate -i`; reversible work proceeds, irreversible waits for the phone approval.

## Self-improvement (periodic, gated)
Every few slices — or on demand, **not** per slice — dispatch the **`sdlc-auditor`** agent (Fable) over the
retros accumulated since the last audit. It opens a **gated PR** proposing conductor/agent/flow changes, each
citing the retro lines that justify it; it never commits to main. Review it alongside the reserved merge-gate,
merge, bump the plugin `version`, and the next session's `/plugin marketplace update` pulls the improvement.
Open `sdlc-audit` PRs + pending-retro counts ride the Needs-Attention pane (via `attention-sync`) with age
badges, so a proposal can't rot unseen.

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

## Rigor dial (stakes, not file type)
Scale ceremony to the cost of a wrong-but-plausible decision — the *stakes*, never the slice's file type:
*content / mechanical* → light (plain fan-out, token-free checks, skip the mockup); *feature / UI* → full
ceremony + mockup sign-off; *risky / novel* → add the stage-0 spike gate.
**Floor: the dial never down-rates the Fable merge-gate.** When the spec flags a high-stakes rule (e.g.
spanish-coach BR-10) or the slice touches user data, the one adversarial merge-gate runs no matter how
"light" the slice looks — it has repeatedly caught criticals that every other check passed (a "content-only"
slice shipped an out-of-canon noun + cross-lesson duplicates that only the gate saw). Proposing to skip it is
itself a hard gate: surface it to the user; never decide it from the dial.

## Compose, don't reinvent
Every stage hands off to an existing skill. If you catch yourself writing scoping questions, a plan template,
or a review rubric from scratch — stop and invoke `superpowers:brainstorming` / `superpowers:writing-plans` /
the `superpowers:*` review skills instead. Yours is only: sequencing, gates, model routing, and `board-update`.
