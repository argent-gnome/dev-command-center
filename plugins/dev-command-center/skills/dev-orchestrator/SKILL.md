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
- `board-update.js` — the token-free updater. **Call it at EVERY stage transition.**
- `docs/retros/` — per-slice retros.

## Modes
- **`run`** (default) — drive the next slice of one project.
- **`onboard`** — (re)build a project's board status from its repo + memory.

If the user didn't say which mode/project, infer the project from cwd (match a `repoPath` in config); if
ambiguous, ask.

## run — the procedure

1. **Read the board.** Load `projects.config.json` and the project's `data/<key>.json`. Identify the active
   card (in-flight slice), its `column`/`phase`, `nextAction`, and any `blockedOn`.
2. **Confirm the work.** State the project + active slice + nextAction, and confirm what this session will do.
   If starting a NEW slice, scope it first (stage 1).
3. **Set execution topology** from `config.stack`/`topology`:
   - **single-session** (live iOS — spanish-coach, apex): work in place on a branch, no worktrees; fresh
     implementer subagent per task via `subagent-driven-development`; 4-state report contract
     (DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT).
   - **multi-session** (web monorepo — hims): window-per-unit, branch + PR per unit; `executing-plans` with
     review checkpoints.
4. **Walk the slice loop, delegating each stage** (NEVER reinvent — invoke the named skill):

   | Stage | Delegate to | Gate |
   |---|---|---|
   | 0 spike (risky/novel only) | `brainstorming` → write a GO/NO-GO verdict doc | — |
   | 1 scope | `brainstorming` + `intent-first-spec-anchored` | — |
   | 2 spec | `brainstorming` (+ intent-first) → `docs/superpowers/specs/` | ⛔ user review |
   | 3 mockup (UI slices) | `brainstorming` mockup | ⛔ sign-off |
   | 4 plan | `writing-plans` | — |
   | 4½ docs author | `doc-keeper` (author) — *Slice 6; until then author inline* | — |
   | 5 build | `subagent-driven-development` \| `executing-plans` + `test-driven-development` + stack pro-skills (`swiftui/swiftdata/swift-testing/swift-concurrency-pro` or `supabase`/`vercel:*`) | — |
   | 6 verify (per-task) | `requesting-code-review` / `receiving-code-review` (+ `code-reviewer`); `systematic-debugging` on failures | — |
   | 7 merge-gate | `merge-gate-reviewer` (Fable) — *Slice 6; until then dispatch a Fable subagent inline* | — |
   | 8 CI | `verification-before-completion` — actual `gh run view --json conclusion`, PR run AND post-merge main | ⛔ CI green |
   | 9 live/device | Simulator (iOS) / device / staging (web); reload app on UI change | ⛔ validation |
   | 9½ docs audit | `doc-keeper` (audit) — *Slice 6; until then diff impl-vs-docs inline* | — |
   | 10 PR + merge | `finishing-a-development-branch` | — |
   | 11 reconcile | memory + docs + board + write the slice retro | — |

5. **Keep the tracker in lockstep.** At EVERY stage transition, run:
   ```
   node <hub>/board-update.js --project <key> --slice <cardId> --column <col> \
     --phase "<finer step>" --next-action "<next action>" [--blocked "<why>" | --unblock] [--branch <b>]
   ```
   It commits + pushes the hub, so the board never lags the SDLC.
6. **Reconcile (stage 11).** Update the project's memory, run the docs audit, set the card to its resting
   column (done / live / blocked) with the next action via board-update, and write
   `docs/retros/<key>-<slice>-retro.md` (manual interventions · decisions · friction).

## onboard — the procedure
For each project to onboard: dispatch the **`project-state-scanner`** agent with its `repoPath` + memory file
→ take the returned JSON cards → write `data/<key>.json` (bulk seed = direct write; `board-update` is for
incremental per-transition updates). Re-run any time to reconcile the board with reality.

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
  cross-check with two independent reviewers; confirm with a token-free script where possible; one
  adversarial merge-gate per slice (it has empirically caught criticals per-task review + CI missed).
- **Multi-agent opt-in** — plain parallel subagents are free; **Workflows require the user's explicit
  "ultracode" opt-in** (they can spawn dozens of agents).

## Rigor dial (slice type)
Scale ceremony to the cost of a wrong-but-plausible decision: *content / mechanical* → light (plain fan-out,
token-free checks, skip the mockup); *feature / UI* → full ceremony + mockup sign-off; *risky / novel* → add
the stage-0 spike gate.

## Compose, don't reinvent
Every stage hands off to an existing skill. If you catch yourself writing scoping questions, a plan template,
or a review rubric from scratch — stop and invoke `brainstorming` / `writing-plans` / the review skills
instead. Yours is only: sequencing, gates, model routing, and `board-update`.
