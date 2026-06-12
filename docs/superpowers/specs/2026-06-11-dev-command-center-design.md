# Dev Command Center — Design Spec

> **Status:** Draft for user review · **Date:** 2026-06-11
> A unified house SDLC + a personal Jira-style tracker, so three concurrent software projects are
> built the *same way* every time and can be resumed cold after days away.

---

## 1. Intent & outcomes (the *why*)

The user runs three concurrent software projects in different industries. They want:

1. **Develop the same way every time.** One house SDLC, applied identically across all three,
   so quality and process don't depend on which project (or which day) it is.
2. **Never lose the thread.** A single glanceable board that shows, per project, exactly where
   each piece of work sits and what the next action is — so a project can be dropped for days and
   picked back up in seconds.
3. **Leverage the full Claude ecosystem.** Reuse existing skills/agents rather than re-prompting
   bespoke copies; package repeatable jobs as reusable agents/scripts so execution is uniform and
   evolvable, not pigeonholed.
4. **Access it anywhere, and share it.** The hub lives in one public Git repo: published to a free GitHub
   Pages URL so the board is viewable on any device, *and* serving as a **Claude Code plugin marketplace**
   so the skill + agents install into any machine/repo from one source of truth and stay updated — a
   shareable, version-controlled statement of "how I build" for other developers.

This is **encoded intent** (per `intent-first-spec-anchored`): this spec is the durable source of
truth; the orchestrator skill, the agent, the script, and the board *realize* it.

## 2. Scope & non-goals

**In scope (the three active projects only):**
- `spanish-coach` — native SwiftUI iOS (live on device)
- `apex` / `moto-ride-stats` — native SwiftUI iOS (live device validation)
- `hims-pilot-recert` — web monorepo (FAA HIMS recertification platform)

**Non-goals (v1):**
- No drag-and-drop / click-to-edit board. The board is **read-mostly**; status changes flow from
  the SDLC (skill + script), not from the UI. (User will tweak the board's *visuals* live later.)
- No app backend, no auth, no database. The board is static files (HTML + per-project JSON) served free
  via GitHub Pages; status is written by the SDLC, not typed into a UI.
- No auto-discovery of projects. Projects are explicitly registered via `projects.config.json`.
- No other projects from the directory are included.
- doc-keeper CI/CD deployment is **documented but deferred** (see §6.2) — v1 runs it locally.
- No LLM/agent for board status writes — that's the deterministic `board-update` script by design (token-free,
  granular, reliable). Status *inference* from a cold repo is the one judgment case, handled by
  `project-state-scanner`.

## 3. The unified house SDLC (the model)

Synthesized from the three projects' practiced processes (see `context/*.md`). Split into a one-time
**Project Init** path and a repeating **Slice** path.

### 3.1 Project Init (once per project)

1. `git init` in the projects directory; default branch `main`.
2. Scaffold structure + a `docs/` skeleton (architecture, ADRs, features/flows, business-logic — see §4).
3. Stand up **CI/CD (GitHub Actions)** with the stack's gate set (§3.3-B). CI exists *before* feature
   code, so gates are enforced from slice 1.
4. Register the project as a **board swimlane** + create its `projects.config.json` entry.

For the three existing projects, Init reduces to: confirm CI exists (add if missing) + register them
on the board at their current state.

### 3.1b Onboard (one-time per already-started project)

The three projects are mid-flight, so they are *onboarded*, not initialized. Onboard is a distinct,
re-runnable path (a mode of the orchestrator, §6.1) that reconstructs current status from existing
evidence — `git log` / branches / open PRs, the specs in `docs/superpowers/specs/`, and (richest of all)
the project's memory entries — then writes the resulting card(s) to `data/<key>.json` (bulk seed, committed +
pushed); `board-update` handles incremental single-card updates thereafter. It runs once to seed a project,
and can re-run to reconcile drift from out-of-session changes. Powered by the
`project-state-scanner` agent (§6.2a).

### 3.2 The Slice loop (repeats)

Each slice is a small reviewable vertical slice on **its own branch** (all commits land there); the
slice ends with a **PR + description** and a merge. Stages and their delegated skills (§3.5):

```
 0  spike → verdict artifact     (risky/novel only; never build on unvalidated risk)
 1  scope                        short Q&A → slice + explicit "NOT this slice" guards
 2  spec            ⛔ GATE       behavior & rules, numbered + cited, durable markdown → user review
 3  mockup          ⛔ GATE       (UI slices only) HTML mockup sign-off before code
 4  plan                         success criteria · architecture · checkboxed tasks · model-routing note
 4½ DOCS: author/update          create/update project docs from spec + plan      [doc-keeper · author]
 5  build                        per execution topology (§3.3-A) + TDD + stack pro-skills
 6  verify (per-task)            spec-compliance reviewer ("don't trust the report") → code-quality reviewer;
                                 carry-forwards fold into later tasks
 7  merge-gate (adversarial)     ONE whole-slice review, cross-task seams         [merge-gate-reviewer · Fable]
 8  CI green ⛔                   PR run green via actual `gh run view --json conclusion` (post-merge main re-checked at stage 11); never piped exit codes
 9  live/device     ⛔ GATE       Simulator (iOS) / device / staging (web); reload app on UI change
 9½ DOCS: audit                  diff implementation vs docs → drift report → patch      [doc-keeper · audit]
 10 PR + description → merge
 11 reconcile                    memory + docs + board + write `slice-retro.md` (interventions · decisions · friction)
  ▸ board-update fires at EVERY transition: column · phase-chip · next-action · blocked-on · last-touched
```

### 3.3 Variation axes (parameterized per project, not hardcoded)

**A — Execution topology** (chosen by stack):
- **Single-session, subagent-driven** → live iOS (`spanish-coach`, `apex`). In place on a branch, no
  worktrees. Fresh implementer subagent per task, full context inline, **4-state report contract**
  (`DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT`).
- **Multi-session, orchestrated** → web monorepo (`hims`). Window-per-unit, each own branch + PR; an
  orchestrator writes kickoff prompts and reviews PRs.

**B — Stack gate sets:**
- **iOS:** `swift test` · SwiftLint · `xcodebuild` build (+ Release-build check when DEBUG-only code) ·
  XCUITest on a synthetic harness · **no destructive SwiftData changes** (additive/migrations only).
- **Web:** unit tests · typecheck · lint · build — via GitHub Actions / Vercel.

**C — Rigor dial = slice type** (the SDD↔IDSD dial; judge by *cost of a wrong-but-plausible decision*):
- *content / mechanical* → light: plain parallel fan-out, token-free checks, skip mockup.
- *feature / UI* → full ceremony: SDD + mockup sign-off + full review ladder.
- *risky / novel* → add the Stage-0 spike gate.

### 3.4 Cross-cutting policies (global)

- **Model routing** — *Fable where the judgment is, Opus where the volume is.* Default Opus
  (implementation, routine review, bulk, mechanical); Fable in **surgical bursts** (planning/architecture,
  the one merge-gate review, synthesis, vision). Decided **per task via the Agent `model:` override**, not
  per session. **Binding constraint = the 5-hour usage window, not $.** (Canonical: `feedback_fable_opus_routing`.)
- **Verification doctrine** — "don't trust the report"; cross-check with two independent reviewers; confirm
  with a token-free script where possible; one adversarial merge-gate per slice (empirically catches
  criticals that per-task review + CI miss).
- **Multi-agent opt-in** — plain parallel subagents are free; **Workflows require explicit "ultracode" opt-in.**
- **Plan-deviation gate** — stop and surface; never silently self-resolve.

### 3.5 Delegation map (do not reinvent)

The orchestrator is a **conductor**; each stage hands off to an existing skill. The only new logic is
sequencing, gating, and tracker updates.

| Stage | Delegates to |
|---|---|
| scope / spec | `superpowers:brainstorming` + `intent-first-spec-anchored` lens |
| mockup | brainstorming's mockup pattern |
| plan | `superpowers:writing-plans` |
| build — iOS | `superpowers:subagent-driven-development` + `superpowers:test-driven-development` + `swiftui/swiftdata/swift-testing/swift-concurrency-pro` |
| build — web | `superpowers:executing-plans` + `superpowers:test-driven-development` + `supabase` / `vercel:*` |
| per-task review | `superpowers:requesting-code-review` / `receiving-code-review` (+ `code-reviewer` agent); `systematic-debugging` on failures |
| merge-gate | `merge-gate-reviewer` agent (model: Fable) — fixed cross-seam rubric |
| CI / completion | `superpowers:verification-before-completion` |
| PR + merge | `superpowers:finishing-a-development-branch` |
| reconcile | memory update + `doc-keeper` + `board-update` |

### 3.6 Self-improvement loop (periodic, gated)
The process improves itself from real friction, without ever silently rewriting its own rules:
1. **Capture (every slice):** Stage 11 writes `docs/retros/<project>-<slice>-retro.md` — manual interventions,
   decisions made, plan deviations, gate friction. Deterministic; no agent.
2. **Audit/propose (periodic / on-demand):** the `sdlc-auditor` agent (model: Fable) ingests accumulated
   retros and opens a **PR** to the command-center repo proposing changes to the orchestrator skill, the
   agents, or the SDLC flow — with rationale. It **never self-merges to main.**
3. **Gate:** the user reviews the PR alongside the reserved Fable adversarial review of the orchestrator.
4. **Apply + re-pull:** merge → bump the plugin `version` → the next session's `/plugin marketplace update`
   pulls the improved tooling; the orchestrator surfaces "process vX is newer" at session start.

Open audit PRs also surface in the board's **Needs-Attention pane** (§5.5) with age badges, so a proposal
can't sit stale and forgotten.

Cadence: capture continuously (cheap); run the auditor every few slices or on demand — **not** per slice.

## 4. Documentation discipline

Each project keeps **living documentation** in its repo, separate from code so it can't silently drift:

- `docs/architecture.md` — how it's architected (components, data flow, boundaries).
- `docs/adr/NNNN-title.md` — Architecture Decision Records (the "ADRs").
- `docs/features-and-flows.md` — user features + user flows.
- `docs/business-logic.md` — business rules (may point to the spec docs that already hold them).

The exact doc set is **per-project configurable**; the above is the default. Discipline:

- **Author/update** when a plan is created (Stage 4½) — docs reflect the *intended* implementation.
- **Audit** after that plan's code lands (Stage 9½) — catch drift between implementation and docs;
  produce a drift report + proposed patches; fix before reconcile/merge.

### 4.1 Operator guides (dogfooding the command-center)
The command-center repo keeps its **own** living docs — and because it's the meta-tool, those include
**how-to / step-by-step operating guides** so the system is never opaque or forgotten:
- `docs/guides/operating.md` — run a session (installed `dev-orchestrator` `run` vs `onboard`), install/
  update the plugin, read the board, and where retros + audit PRs live and how to act on them.
- `docs/guides/new-project.md` — onboard a new project (config + swimlane + CI).
- `docs/guides/self-improvement.md` — run the `sdlc-auditor`, review its PRs, merge + version-bump + re-pull.

These are written *as each slice lands* (dogfooding), not after, and are themselves doc-audited (§3.6 / §9½).

## 5. The tracker (board)

### 5.1 Layout & columns
Three swimlanes (one per active project). Columns = the slice loop collapsed to 6 glanceable states:

| Column | Loop stages |
|---|---|
| **Backlog** | scoped / future slices (0–1, pre-spec) |
| **Spec** | spec writing · user-review gate · mockup sign-off (2–3) |
| **Build** | plan + implementation (4–5) |
| **Verify** | per-task review · merge-gate · CI (6–8) |
| **Live** | code-complete, awaiting live/device validation (9) |
| **Done** | merged + reconciled (10–11) |

### 5.2 Card schema (one slice)
```json
{
  "id": "spanish-coach__slice-7",
  "project": "spanish-coach",
  "title": "Slice 7 — conjugation-aware generation",
  "column": "spec",
  "phase": "2 · spec (user-review gate)",
  "nextAction": "Approve the Slice 7 spec",
  "blockedOn": null,
  "branch": "slice-7-conjugation",
  "model": "Opus build / Fable merge-gate",
  "lastTouched": "2026-06-11",
  "links": { "spec": "docs/...", "pr": null }
}
```
A `blockedOn` value keeps the card in its column but flags it red. The granular `phase` chip is what
"lines up with the UI as granularly as possible."

### 5.3 Persistence — per-project JSON + Pages
Board state is stored as **one JSON file per project** under `data/` (`data/spanish-coach.json`,
`data/apex.json`, `data/hims.json`). `board.html` fetches and merges them at load and renders the three
swimlanes. Two payoffs: (1) each session writes **only its own** project file, so concurrent multi-session
commits **never conflict**; (2) it's static, so it serves free from **GitHub Pages** (http, where `fetch`
works) and is viewable on any device. For offline double-click viewing, an optional tiny `build-board.js`
inlines the JSON into a `board.local.html`. Aesthetic matches the existing `claude-dev-process.html` family
(slate ink, indigo `#4f46e5` / teal `#0a7c66`, pill tags); the static process doc is linked as a "Process" tab.

### 5.4 Update mechanism
`board-update` (a token-free Node script in the hub) updates **one project's data file** and syncs:
```
node board-update.js --project <id> --slice <id> [--title <t>] \
  --column <c> --phase <p> --next-action <s> [--blocked <s> | --unblock] \
  [--branch <b>] [--link <kind>=<url>]
```
It upserts the card by `id` in `data/<project>.json`, stamps `lastTouched`, then **`git add` + commit +
push** the hub — with an automatic `pull --rebase` + retry so concurrent sessions can't collide. It's
invoked at the hub path (resolved from `hub.repoPath`), so **any project's session can update the hub** without the user committing
anything by hand. The orchestrator calls it at every stage transition, so the tracker never lags the SDLC.

### 5.5 "Needs Attention" side pane
Beyond the per-project swimlanes, the board shows a side pane aggregating **meta-actions that would
otherwise rot** — so stale items can't hide:
- **Open SDLC-audit PRs** (process-change proposals, §3.6) — with **age badges** (e.g. >30 days = red).
- **Pending retros** — count since the last audit + the oldest date ("6 retros, oldest 52 days").
- **Plugin update available** — "process v1.3 ready — `/plugin marketplace update`."
- **Pending doc-drift patches** (§9½) and a **cross-project blocked-cards** summary.

Backed by `data/attention.json`, refreshed **deterministically** by the orchestrator at session start +
reconcile (a small `attention-sync` step: `gh pr list` for audit PRs, a retro-dir scan, a plugin-version
check). No agent — it's aggregation, not judgment. The staleness badges are the point: the pane exists so
audit findings can't sit unseen for months.

## 6. Reusable architecture (skill + agents + script + config)

Mirrors the user's own Opus/Fable/token-free-script division, applied to tooling. The skill, all four agents,
and any commands **ship inside the `dev-command-center` plugin** (§6.5–6.6) and install via the marketplace
into every session — so "user-level" below means "available in every session once installed," with the
authoritative source in the plugin (not hand-placed in `~/.claude/`).

### 6.1 `dev-orchestrator` (a skill, user-level)
The conductor. On session start: read the board → pick project + slice + **execution topology by stack**
→ walk the loop (§3.2) delegating each stage (§3.5) → enforce gates → call `board-update` at every
transition. It is a **skill, not an agent**, because it must sit in the driver's seat and compose with the
other skills. Composes with (never duplicates) `intent-first-spec-anchored`, `brainstorming`,
`writing-plans`, `subagent-driven-development`/`executing-plans`, the review skills, and
`verification-before-completion`.

**Two entry modes:** `run` (drive the slice loop for an active project) and `onboard`
(one-time/re-runnable status seed for an already-started project, via `project-state-scanner` →
`board-update`).

### 6.2 `doc-keeper` (a reusable agent, user-level: `~/.claude/agents/doc-keeper.md`)
Two modes:
- **author** — after a plan exists, scaffold/update the project's doc set (§4) from spec + plan.
- **audit** — after that plan's code lands, diff implementation vs docs, report drift, propose patches.

**Deployment model:**
- **Defined once** at user level so all three projects call the identical agent.
- **Runs locally, in-session** by default — spawned by the orchestrator via the Agent tool; same model on
  the local CLI; bills to the 5-hour usage window.
- **author mode is always local** (it writes files; needs session context + user steering).
- **audit mode** is local by default (Stage 9½), with an **optional future CI backstop**: the *same audit
  prompt*, wrapped in Claude Code's **GitHub Action**, run headlessly on PRs to post a drift comment /
  failing check. That runs on GitHub's cloud runners and bills via an API key (separate $), and in CI it
  only flags/fails — it never authors. The prompt lives in one place so local and CI never diverge.
  **Deferred to a documented opt-in slice** (needs a GitHub remote + API billing).
- If a project's doc set grows large, audit may escalate to a fan-out Workflow ("ultracode" opt-in);
  defaults to a single subagent.

### 6.2a `project-state-scanner` (a reusable agent, user-level: `~/.claude/agents/project-state-scanner.md`)
Given a project (repo path + memory), scans `git log` / branches / `gh pr list` / specs / CI state and the
project's memory to infer current board state: active slice(s), phase chip, next action, blocked-on, branch.
Output is structured board card(s). Used by the orchestrator's `onboard` mode (seed) and, optionally, at
session start to reconcile the board with reality. Bounded input, structured output, identical across
projects — a textbook agent.

### 6.2b `merge-gate-reviewer` (a reusable agent, user-level, model: Fable)
The one adversarial whole-slice review (loop stage 7), as a named agent with a fixed rubric: cross-task
seams, spec-rule citation, regression risk, gate compliance. Tiny output (a findings/reject list) on
judgment-dense input — the canonical Fable use. Named (not ad-hoc) so every slice on every project gets the
*same* merge-gate scrutiny.

### 6.2c `sdlc-auditor` (a reusable agent, user-level, model: Fable)
Ingests accumulated `slice-retro.md` files and audits the *process itself* (orchestrator skill, agents, SDLC
flow). Output: a **proposal PR** to the command-center repo with rationale — never a direct commit to main
(§3.6). Periodic / on-demand, not per-slice. Judgment-dense, tiny output → Fable. May escalate to a fan-out
Workflow when auditing many retros at once (ultracode opt-in).

### 6.3 `board-update` (a deterministic script)
See §5.4. Token-free, deterministic, granular. Lives at the hub repo root and operates on the local clone
(writes `data/<project>.json`, commits + pushes). The orchestrator resolves the hub clone via `hub.repoPath` in
`projects.config.json`, so it works from any project's session without hardcoded paths (see §6.6 cache note).

### 6.4 `projects.config.json` (per-project descriptor — the flexibility lever)
Static per-project data the orchestrator reads, so behavior is config not code:
```jsonc
{
  "id": "hims-pilot-recert",
  "displayName": "HIMS Pilot Recert",
  "repoPath": "/Users/jake-edwards/projects/hims-pilot-recert",
  "stack": "web",                       // ios | web
  "topology": "multi-session",          // single-session | multi-session
  "gates": { "test": "...", "lint": "...", "build": "...", "typecheck": "..." },
  "docSet": ["architecture.md", "adr/", "features-and-flows.md", "business-logic.md"],
  "specDir": "docs/superpowers/specs"
}
```
Adding a 4th project, swapping the doc-keeper, or changing a gate = a config/agent edit. Nothing is
pigeonholed.

### 6.5 Where things live — the hub repo is also a plugin marketplace
One public repo plays three roles; Claude Code reads only the `.claude-plugin/` parts and ignores the rest,
so the Pages board + docs coexist with the marketplace without conflict.

```
dev-command-center/                         # public repo = hub + marketplace + GitHub Pages
├── .claude-plugin/
│   └── marketplace.json                    # catalog: lists the dev-command-center plugin
├── plugins/
│   └── dev-command-center/                 # the distributable plugin (tooling source of truth)
│       ├── .claude-plugin/plugin.json
│       ├── skills/dev-orchestrator/SKILL.md
│       ├── agents/{doc-keeper,project-state-scanner,merge-gate-reviewer,sdlc-auditor}.md
│       └── commands/{run,onboard,board}.md           # optional slash commands
├── board.html                              # live board, served by Pages
├── data/<project>.json                     # per-project board state (board-update writes these)
├── data/attention.json                     # aggregated action-items for the Needs-Attention pane
├── board-update.js  build-board.js  attention-sync.js   # board machinery (run in-place in the clone)
├── projects.config.json                    # per-project config + hub.repoPath
├── context/  docs/ (incl. docs/guides/ how-tos · docs/retros/)  README.md
```

Skills/agents/commands are **auto-discovered** from those dirs (no need to enumerate them in `plugin.json`).
Installed copies are cached under `~/.claude/plugins/cache/...` — see the §6.6 cache note.

### 6.6 Distribution, sync & hosting — marketplace + Pages
- **The repo is a Claude Code plugin marketplace** (`.claude-plugin/marketplace.json`) hosting one plugin,
  `dev-command-center` (the `dev-orchestrator` skill + the three agents + optional commands) — one source of
  truth for the tooling.
- **Install / update flow** (any machine, any of the other project repos):
  `/plugin marketplace add argent-gnome/dev-command-center` → `/plugin install dev-command-center@dev-command-center`
  (marketplace name `dev-command-center`, plugin name `dev-command-center`). Bumping the
  plugin's `version` (or any commit, if version is omitted → SHA-versioned) propagates on
  `/plugin marketplace update` and is auto-checked at session start. **This replaces** the earlier
  symlink/`install.sh` idea.
- **GitHub Pages** serves `board.html` from the same repo → stable URL, any device, $0 (free for public repos).
  Each `board-update` push redeploys Pages.
- **Auto-sync from every session, zero manual commits.** The user-level skill calls `board-update` (operating
  on the local hub clone at `hub.repoPath`), which writes `data/<project>.json` then commits + pushes the hub
  (with `pull --rebase` + retry). Every project session keeps the hub current by itself.
- **Plugin-cache constraint (known):** installed plugins are copied to `~/.claude/plugins/cache/...`, not run
  in-place, so bundled scripts must use `${CLAUDE_PLUGIN_ROOT}` rather than absolute repo paths, and the hub
  clone is resolved from config (`hub.repoPath`), never hardcoded. v1 keeps `board-update.js` at hub root (operated
  in the clone) to sidestep this; bundling it into the plugin for other users is a later slice.
- **Shareable & public-repo hygiene.** README + spec + context make it a coherent "how I build" artifact others
  can install. No secrets/keys committed; status text is intentionally shareable. Auth: public repos need none
  to install; push uses `gh` creds.

## 7. Proposed build order (vertical slices)

1. **Hub + marketplace setup** — create the public GitHub repo + remote; scaffold
   `.claude-plugin/marketplace.json` + the `plugins/dev-command-center/` plugin skeleton (`plugin.json`);
   push existing spec/context/docs; enable GitHub Pages.
2. **Board (read view)** — `board.html` fetches+merges `data/<project>.json`, renders the 3 swimlanes + the
   **Needs-Attention pane** (§5.5); works on Pages.
3. **board-update.js + attention-sync.js + projects.config.json** — per-project JSON upsert + auto
   add/commit/push (pull-rebase-retry); attention aggregation; `hub.repoPath` config.
4. **project-state-scanner agent + `onboard` mode** — scan memory+repo for all three; seed the data files
   with real status → pushed → live on Pages.
5. **dev-orchestrator skill (run mode)**, packaged in the plugin (includes per-slice `slice-retro` capture at
   reconcile); install via `/plugin install`; then the **one Fable adversarial review** of this skill.
6. **doc-keeper agent** (author + audit) + **merge-gate-reviewer agent** (Fable), in the plugin.
7. **Dogfood** — run one real slice of one project end-to-end through the orchestrator (installed from the
   marketplace); reconcile.
8. **Self-improvement loop** — `sdlc-auditor` agent (PR-proposing, Fable) over accumulated retros; built after
   dogfooding, once real retros exist.
9. *(future, opt-in)* doc-keeper CI backstop · bundle board machinery into the plugin for other users ·
   board visual polish · command-center as a self-referential 4th lane.

Throughout, the **operator guides (§4.1)** are written as each slice lands — dogfooding.

The detailed implementation plan comes from `superpowers:writing-plans` after this spec is approved.

## 8. Open questions / future

- Confirm the default doc set per project (architecture / ADR / features-flows / business-logic) — adjustable.
- Whether `hims` PRs should adopt the iOS-style two-stage per-task review (its own redline noted it's looser).
- doc-keeper CI backstop: defer until a GitHub remote + API budget are in place.
