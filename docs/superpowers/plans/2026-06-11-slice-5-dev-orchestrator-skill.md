# Slice 5 — dev-orchestrator skill (the conductor) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: subagent-driven-development or executing-plans. Steps use `- [ ]`.

**Goal:** Replace the stub `dev-orchestrator` skill with the real conductor — `run` + `onboard` modes — that reads the board, walks the slice loop delegating every stage to existing Superpowers skills, enforces the gates, and fires `board-update` at every transition. Subject it to the ONE Fable adversarial review (this is the governing artifact).

**Architecture:** `dev-orchestrator` is a SKILL (a prose process doc), shipped in the plugin. It **composes — never reimplements** — `intent-first-spec-anchored`, `brainstorming`, `writing-plans`, `subagent-driven-development`/`executing-plans`, the review skills, `verification-before-completion`, `finishing-a-development-branch`. It calls `board-update.js` (Slice 3) at transitions and `project-state-scanner` (Slice 4) for onboard. It references `doc-keeper` + `merge-gate-reviewer` as "when available (Slice 6)". No autonomous mode yet (Slice 8).

**Tech Stack:** Claude Code skill (markdown), the existing Node tooling, the four Superpowers process skills.

**Spec:** §3 (loop), §3.3 (axes), §3.4 (policies), §3.5 (delegation), §3.6 (retro capture), §6.1 (skill, run+onboard).

---

## Task 1: Write the conductor skill + bump version

- [ ] **Step 1:** Replace `plugins/dev-command-center/skills/dev-orchestrator/SKILL.md` with the real conductor. Required sections (full content in the build):
  - **Frontmatter** name/description (triggers at the start of a dev session on a tracked project).
  - **The hub** — paths (board, `projects.config.json`, `board-update.js`, `docs/retros/`).
  - **Modes** — `run` and `onboard`.
  - **run procedure** — read board → identify project + active card + topology → confirm with user → walk the slice loop delegating each stage (the §3.5 map) → fire `board-update` at every transition → reconcile (memory + docs + slice-retro).
  - **onboard procedure** — dispatch `project-state-scanner` per project → seed board.
  - **Gates** (stop points): spec, mockup, live/device, CI-red, ambiguity/plan-deviation — never silently cross.
  - **Cross-cutting policies** — model routing (Opus volume / Fable judgment), verification doctrine, Workflows=ultracode opt-in.
  - **board-update reference** — the exact CLI.
  - **Compose, don't reinvent** — explicit list of which skill owns which stage.
- [ ] **Step 2:** Bump `plugin.json` 0.2.0 → 0.3.0 and the marketplace entry to 0.3.0.
- [ ] **Step 3:** Validate frontmatter (`name:` + `description:` present) + `jq empty` the manifests. Commit.

---

## Task 2: Fable adversarial review (the governing-artifact gate)

- [ ] **Step 1:** Dispatch a subagent with `model: fable` to adversarially review the skill against the spec. It must check: (a) does it faithfully encode the slice loop + the three variation axes (topology/stack-gates/rigor-dial)? (b) the delegation map — does any stage reinvent a skill instead of delegating? (c) are the gates (spec/mockup/live/CI/deviation) all present and fail-closed? (d) are the board-update hooks at every transition? (e) any internal contradiction or ambiguity that would degrade a real build session? Output: a short findings list (critical / should-fix / nit), refute-biased.
- [ ] **Step 2:** Address every critical + reasonable should-fix inline. Re-commit. (Nits optional.)

---

## Task 3: Verify

- [ ] **Step 1:** Frontmatter well-formed; manifests valid JSON.
- [ ] **Step 2:** Smoke trace — read `projects.config.json` + `data/*.json` and confirm the skill's run-procedure yields the correct "next action" for one project (e.g. apex → "awaiting validation ride", matching the board). This proves read-board → propose-next works.

---

## Task 4: PR + reconcile

- [ ] **Step 1:** Push `slice-5-dev-orchestrator-skill`; PR; merge; pull main.
- [ ] **Step 2:** Retro `docs/retros/dev-command-center-slice-5-retro.md` (incl. the Fable findings + what changed). Commit + push.
- [ ] **Step 3:** Note `/plugin marketplace update` now serves the working conductor (v0.3.0).

---

## Self-Review
- **Spec coverage:** loop §3 → run procedure; axes §3.3 → topology/stack/rigor handling; policies §3.4 → cross-cutting section; delegation §3.5 → "compose don't reinvent"; retro §3.6 → reconcile step; skill+modes §6.1 → frontmatter + run/onboard. ✓
- **Placeholders:** skill body authored in the build; references to doc-keeper/merge-gate-reviewer are explicitly "Slice 6 — when available," not vague TODOs. ✓
- **Risks:** (1) a skill is prose, not unit-testable — mitigated by the Fable adversarial review + the smoke trace. (2) merge-gate-reviewer/doc-keeper not built yet — skill degrades gracefully (does the review inline / notes the agent is pending). (3) Don't let the skill duplicate brainstorming/writing-plans — the review explicitly checks this.
