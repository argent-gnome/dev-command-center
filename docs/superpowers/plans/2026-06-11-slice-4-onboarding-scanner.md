# Slice 4 — project-state-scanner agent + onboarding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or executing-plans. Steps use `- [ ]`.

**Goal:** Build the reusable `project-state-scanner` agent (shipped in the plugin) and use it to onboard the three in-progress projects — replacing the stub cards with each project's REAL current status via `board-update`, proving the scan → board-update → Pages loop end-to-end.

**Architecture:** `project-state-scanner` is a read-only subagent: given a project key + repoPath + memory file, it scans git (log/branches/PRs) + `docs/superpowers/specs/` + the project memory and returns STRICT JSON card(s) matching the board schema. Onboarding dispatches it per project (parallel, plain subagents — no ultracode needed), then feeds each returned card to `board-update --no-push` on the slice branch; one push + PR at the end.

**Tech Stack:** Claude Code subagent (markdown def in the plugin), Node (board-update), git.

**Spec:** §3.1b (onboard), §6.2a (project-state-scanner).

---

## Task 1: Author the agent + bump plugin version

- [ ] **Step 1:** Create `plugins/dev-command-center/agents/project-state-scanner.md` — read-only tools, strict-JSON output contract, memory-as-authoritative-source instructions (full content in the build).
- [ ] **Step 2:** Bump `plugins/dev-command-center/.claude-plugin/plugin.json` `version` 0.1.0 → 0.2.0 and the same plugin entry in `.claude-plugin/marketplace.json` (so `/plugin marketplace update` pulls the new agent).
- [ ] **Step 3:** Validate JSON (`jq empty`) + commit.

---

## Task 2: Onboard run (dispatch scanner → board-update)

For each project key in `projects.config.json` (`spanish-coach`, `apex`, `hims`):

- [ ] **Step 1:** Dispatch `project-state-scanner` (parallel) with: project key, `repoPath`, memory file path, the card schema, and the column enum (`backlog|spec|build|verify|live|done`). Require STRICT JSON: an array of cards `[{id,title,column,phase,nextAction,blockedOn,branch,model}]`.
- [ ] **Step 2:** Parse each agent's JSON. For every card, run:
  ```bash
  node board-update.js --project <key> --slice <id> --title "<title>" --column <col> \
    --phase "<phase>" --next-action "<next>" --branch "<branch>" --model "<model>" --no-push
  ```
  (`--no-push`: commit locally on the slice branch; one push at Task 4.) Use `--blocked "<text>"` when `blockedOn` is set.
- [ ] **Step 3:** Sanity: `git log --oneline` shows one `tracker:` commit per card; `data/<key>.json` reflects the real slice.

---

## Task 3: Verify real status on the board

- [ ] **Step 1:** `node build-board.js` and confirm the prerendered board shows the real slice titles (not the stubs):
  ```bash
  node build-board.js && grep -q 'Slice 7' board.local.html && echo "real status rendered"
  ```
  (Exact titles depend on the scan; assert at least that stub `nextAction` "Approve the Slice 7 spec" is replaced or the card reflects scanned reality.)

---

## Task 4: PR + reconcile

- [ ] **Step 1:** Push `slice-4-onboarding-scanner` (sets upstream); `gh pr create`; `gh pr merge --merge --delete-branch`; pull main.
- [ ] **Step 2:** Verify live Pages shows real status (curl a data file = 200, contains a scanned value).
- [ ] **Step 3:** Bump-driven: note `/plugin marketplace update` now serves the scanner agent.
- [ ] **Step 4:** Retro `docs/retros/dev-command-center-slice-4-retro.md`; commit + push main.

---

## Self-Review
- **Spec coverage:** §6.2a scanner (repo+memory → structured cards) → Task 1+2. §3.1b onboard (re-runnable seed via board-update) → Task 2. ✓
- **Placeholders:** agent body authored in the build (Task 1 Step 1); board-update CLI is concrete. ✓
- **Type consistency:** card fields = board schema; columns enum matches `board.render.js` COLUMNS + data files; board-update flags match Slice 3. ✓
- **Risks:** (1) scanner returns non-JSON/extra prose → mitigate with strict "JSON only" contract + defensive parse; if a scan fails, fall back to writing that project's card from known memory rather than blocking. (2) plain subagents (no ultracode) — fine, read-only. (3) board-update needs the data file present (it is, from Slice 2). (4) the scanner type isn't a registered subagent until the plugin is updated — for THIS run, dispatch a general-purpose subagent using the scanner's prompt; future runs use `subagent_type: project-state-scanner`.
