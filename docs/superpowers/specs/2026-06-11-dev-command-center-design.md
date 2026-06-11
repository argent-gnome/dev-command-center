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
- No hosted server, no auth, no database. The board is a single local HTML file opened from `file://`.
- No auto-discovery of projects. Projects are explicitly registered via `project.config`.
- No other projects from the directory are included.
- doc-keeper CI/CD deployment is **documented but deferred** (see §6.2) — v1 runs it locally.

## 3. The unified house SDLC (the model)

Synthesized from the three projects' practiced processes (see `context/*.md`). Split into a one-time
**Project Init** path and a repeating **Slice** path.

### 3.1 Project Init (once per project)

1. `git init` in the projects directory; default branch `main`.
2. Scaffold structure + a `docs/` skeleton (architecture, ADRs, features/flows, business-logic — see §4).
3. Stand up **CI/CD (GitHub Actions)** with the stack's gate set (§3.3-B). CI exists *before* feature
   code, so gates are enforced from slice 1.
4. Register the project as a **board swimlane** + create its `project.config` entry.

For the three existing projects, Init reduces to: confirm CI exists (add if missing) + register them
on the board at their current state.

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
 7  merge-gate (adversarial)     ONE whole-slice review, cross-task seams                 [Fable subagent]
 8  CI green                     verified by actual `gh run view --json conclusion` (PR run AND main); never piped exit codes
 9  live/device     ⛔ GATE       Simulator (iOS) / device / staging (web); reload app on UI change
 9½ DOCS: audit                  diff implementation vs docs → drift report → patch      [doc-keeper · audit]
 10 PR + description → merge
 11 reconcile                    memory + docs + board
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
| merge-gate | `superpowers:requesting-code-review` (slice scope) + a **Fable adversarial subagent** |
| CI / completion | `superpowers:verification-before-completion` |
| PR + merge | `superpowers:finishing-a-development-branch` |
| reconcile | memory update + `doc-keeper` + `board-update` |

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

### 5.3 Persistence
A single self-contained **`board.html`** with an embedded JSON data island:
```html
<script type="application/json" id="board-data">{ ...projects, cards... }</script>
```
The board's JS reads the island and renders. Opens by double-click from `file://` — no server, no build,
no dependencies. Aesthetic matches the existing `claude-dev-process.html` family (slate ink, indigo
`#4f46e5` / teal `#0a7c66`, pill tags, card layout). The static reference doc is linked as a "Process" tab.

### 5.4 Update mechanism
`board-update` (a token-free Node script) rewrites the data island deterministically:
```
node board-update.js --project <id> --slice <id> [--title <t>] \
  --column <c> --phase <p> --next-action <s> [--blocked <s> | --unblock] \
  [--branch <b>] [--link <kind>=<url>]
```
It upserts a card by `id`, stamps `lastTouched`, and writes `board.html` back. The orchestrator calls it
at every stage transition, so the tracker never lags the SDLC.

## 6. Reusable architecture (3 pieces + config)

Mirrors the user's own Opus/Fable/token-free-script division, applied to tooling.

### 6.1 `dev-orchestrator` (a skill, user-level)
The conductor. On session start: read the board → pick project + slice + **execution topology by stack**
→ walk the loop (§3.2) delegating each stage (§3.5) → enforce gates → call `board-update` at every
transition. It is a **skill, not an agent**, because it must sit in the driver's seat and compose with the
other skills. Composes with (never duplicates) `intent-first-spec-anchored`, `brainstorming`,
`writing-plans`, `subagent-driven-development`/`executing-plans`, the review skills, and
`verification-before-completion`.

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

### 6.3 `board-update` (a deterministic script)
See §5.4. Token-free, deterministic, granular. Lives in `dev-command-center/`.

### 6.4 `project.config` (per-project descriptor — the flexibility lever)
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

### 6.5 Where things live
- `dev-command-center/board.html` + `board-update.js` + `projects.config.json` + `context/` + `docs/`.
- `~/.claude/skills/dev-orchestrator/` (the skill).
- `~/.claude/agents/doc-keeper.md` (the agent).

## 7. Proposed build order (vertical slices)

1. **Board** — `board.html` + data island + render, seeded with the three projects' *real* current state
   (this is the live-tweakable mockup made real).
2. **board-update script + `projects.config.json`** — deterministic island rewrites.
3. **dev-orchestrator skill** — conductor + delegation map + tracker hooks; then the **one Fable
   adversarial review** of this skill (the governing artifact).
4. **doc-keeper agent** (author + audit), local.
5. **Dogfood** — run one real slice of one project end-to-end through the orchestrator; reconcile.
6. *(future, opt-in)* doc-keeper CI backstop · board visual polish · 4th-project onboarding.

The detailed implementation plan comes from `superpowers:writing-plans` after this spec is approved.

## 8. Open questions / future

- Confirm the default doc set per project (architecture / ADR / features-flows / business-logic) — adjustable.
- Whether `hims` PRs should adopt the iOS-style two-stage per-task review (its own redline noted it's looser).
- doc-keeper CI backstop: defer until a GitHub remote + API budget are in place.
