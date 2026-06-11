# Slice 1 — Hub + Marketplace Setup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the local `dev-command-center` repo into a published, public GitHub repo that is simultaneously a valid Claude Code plugin marketplace and a GitHub Pages site, with a stub plugin that installs cleanly.

**Architecture:** One public repo plays three roles. `.claude-plugin/marketplace.json` catalogs one plugin (`dev-command-center`) whose source lives under `plugins/dev-command-center/`. A placeholder `board.html` + `.nojekyll` at repo root make Pages serve immediately. Claude Code reads only `.claude-plugin/**`; Pages serves the static files; the two never collide. All slice work happens on branch `slice-1-hub-marketplace`, merged via PR (dogfooding the SDLC).

**Tech Stack:** git, GitHub CLI (`gh`), GitHub Pages, JSON (jq for validation), static HTML.

**Spec:** `docs/superpowers/specs/2026-06-11-dev-command-center-design.md` (§6.5, §6.6, §7 step 1).

---

## File Structure (created this slice)

- `.claude-plugin/marketplace.json` — marketplace catalog (lists the one plugin).
- `plugins/dev-command-center/.claude-plugin/plugin.json` — plugin manifest.
- `plugins/dev-command-center/skills/dev-orchestrator/SKILL.md` — stub skill so the plugin has a discoverable component (real implementation = Slice 5).
- `board.html` — placeholder board (real board = Slice 2), in the house aesthetic.
- `.nojekyll` — empty marker so Pages serves files verbatim (no Jekyll processing).
- `README.md` — what the repo is + install instructions.

External state created: a public GitHub repo `<GH_USER>/dev-command-center`, an `origin` remote, and an enabled GitHub Pages site.

---

## Task 0: Pre-flight + slice branch

**Files:** none (environment + branch only).

- [ ] **Step 1: Verify GitHub CLI auth and capture the username**

Run:
```bash
gh auth status && GH_USER=$(gh api user --jq .login) && echo "GH_USER=$GH_USER"
```
Expected: "Logged in to github.com account …" and a non-empty `GH_USER` (e.g. `jakec714`).
If not logged in: STOP and ask the user to run `! gh auth login` (this is the one human-action prerequisite).

- [ ] **Step 2: Confirm the outward-facing action with the user**

This slice creates a **public** repo. Before Task 3, confirm with the user: repo name `dev-command-center`, owner `<GH_USER>`, visibility **public**. Do not proceed to Task 3 without an explicit go-ahead.

- [ ] **Step 3: Create and switch to the slice branch**

Run:
```bash
git -C /Users/jake-edwards/projects/dev-command-center checkout -b slice-1-hub-marketplace
git -C /Users/jake-edwards/projects/dev-command-center branch --show-current
```
Expected: `slice-1-hub-marketplace`.

---

## Task 1: Marketplace + plugin manifests

**Files:**
- Create: `.claude-plugin/marketplace.json`
- Create: `plugins/dev-command-center/.claude-plugin/plugin.json`
- Create: `plugins/dev-command-center/skills/dev-orchestrator/SKILL.md`

- [ ] **Step 1: Write the marketplace catalog**

Create `.claude-plugin/marketplace.json`:
```json
{
  "name": "jakes-dev",
  "owner": { "name": "Jake Edwards", "email": "jakec714@gmail.com" },
  "metadata": { "pluginRoot": "./plugins" },
  "plugins": [
    {
      "name": "dev-command-center",
      "source": "dev-command-center",
      "description": "Unified house SDLC orchestrator + project tracker: dev-orchestrator skill and the doc-keeper / project-state-scanner / merge-gate-reviewer / sdlc-auditor agents.",
      "version": "0.1.0"
    }
  ]
}
```

- [ ] **Step 2: Write the plugin manifest**

Create `plugins/dev-command-center/.claude-plugin/plugin.json`:
```json
{
  "name": "dev-command-center",
  "description": "Unified house SDLC orchestrator + project tracker (scaffold; components land in later slices).",
  "version": "0.1.0",
  "author": { "name": "Jake Edwards", "email": "jakec714@gmail.com" },
  "homepage": "https://github.com/jakec714/dev-command-center",
  "keywords": ["sdlc", "orchestrator", "tracker", "kanban"]
}
```
> Note: if `<GH_USER>` is not `jakec714`, update the `homepage` value to `https://github.com/<GH_USER>/dev-command-center` before committing.

- [ ] **Step 3: Write the stub skill so the plugin has a discoverable component**

Create `plugins/dev-command-center/skills/dev-orchestrator/SKILL.md`:
```markdown
---
name: dev-orchestrator
description: Scaffold for the unified house SDLC conductor. Full implementation lands in Slice 5. When invoked now, point the user at the design spec and the build plan rather than attempting to run the loop.
---

# dev-orchestrator (scaffold)

This skill is a placeholder published so the `dev-command-center` plugin is installable and testable from
Slice 1. The real conductor — which reads the board, picks project + slice + execution topology, walks the
slice loop delegating to existing Superpowers skills, enforces gates, and updates the tracker — is built in
**Slice 5** per `docs/superpowers/specs/2026-06-11-dev-command-center-design.md`.

For now: direct the user to the spec (§3 the SDLC, §6 the architecture) and the plans in
`docs/superpowers/plans/`.
```

- [ ] **Step 4: Validate all three JSON/markdown files**

Run:
```bash
cd /Users/jake-edwards/projects/dev-command-center
jq empty .claude-plugin/marketplace.json && echo "marketplace.json OK"
jq empty plugins/dev-command-center/.claude-plugin/plugin.json && echo "plugin.json OK"
test -f plugins/dev-command-center/skills/dev-orchestrator/SKILL.md && echo "SKILL.md OK"
```
Expected: three "OK" lines, no jq parse errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/jake-edwards/projects/dev-command-center
git add .claude-plugin plugins
git commit -m "Slice 1: marketplace.json + plugin manifest + stub dev-orchestrator skill"
```

---

## Task 2: Placeholder board + Pages marker + README

**Files:**
- Create: `board.html`
- Create: `.nojekyll`
- Create: `README.md`

- [ ] **Step 1: Write the placeholder board**

Create `board.html` (house aesthetic from `claude-dev-process.html`; real board = Slice 2):
```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dev Command Center — Tracker</title>
<style>
  :root { --ink:#0f172a; --muted:#64748b; --line:#e2e8f0; --indigo:#4f46e5; --teal:#0a7c66; --bg:#f8fafc; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; color:var(--ink); background:var(--bg); }
  .wrap { max-width:880px; margin:0 auto; padding:64px 24px; }
  h1 { font-size:28px; margin:0 0 6px; }
  .sub { color:var(--muted); margin:0 0 28px; }
  .card { background:#fff; border:1px solid var(--line); border-radius:10px; padding:18px 20px; }
  .tag { display:inline-block; font-size:12px; font-weight:600; padding:2px 10px; border-radius:999px; background:#ede9fe; color:#6d28d9; }
  code { background:#f1f5f9; padding:1px 6px; border-radius:6px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>Dev Command Center</h1>
  <p class="sub">Unified SDLC tracker — three swimlanes, live status.</p>
  <div class="card">
    <span class="tag">Slice 1</span>
    <p>Hub published. The live board (swimlanes, cards, Needs-Attention pane) lands in <b>Slice 2</b>.</p>
    <p style="color:var(--muted);font-size:14px">Process &amp; design: see <code>docs/superpowers/specs/</code>.</p>
  </div>
</div>
</body>
</html>
```

- [ ] **Step 2: Create the Pages no-Jekyll marker**

Run:
```bash
cd /Users/jake-edwards/projects/dev-command-center && touch .nojekyll && ls -a .nojekyll
```
Expected: `.nojekyll` listed.

- [ ] **Step 3: Write the README**

Create `README.md`:
```markdown
# Dev Command Center

One hub for building three concurrent software projects the same way every time — a unified house SDLC, a
Jira-style tracker, and the tooling that keeps them in sync. This repo is simultaneously:

- a **project tracker** (`board.html`, served via GitHub Pages),
- a **Claude Code plugin marketplace** (`.claude-plugin/marketplace.json`) distributing the `dev-orchestrator`
  skill + agents,
- and the **design source of truth** (`docs/superpowers/specs/`).

## Install the tooling (Claude Code)

```
/plugin marketplace add <GH_USER>/dev-command-center
/plugin install dev-command-center@jakes-dev
```

## Status

Built in reviewable vertical slices — see `docs/superpowers/plans/`. Slice 1 publishes the hub + marketplace;
the live board and the orchestrator follow.
```
> Replace `<GH_USER>` with the value from Task 0 before committing.

- [ ] **Step 4: Commit**

```bash
cd /Users/jake-edwards/projects/dev-command-center
git add board.html .nojekyll README.md
git commit -m "Slice 1: placeholder board, .nojekyll, README with install instructions"
```

---

## Task 3: Publish — create the public repo, push, open PR

**Files:** none (remote + push only). Requires the user go-ahead from Task 0 Step 2.

- [ ] **Step 1: Create the public repo from the local repo and push `main`**

```bash
cd /Users/jake-edwards/projects/dev-command-center
git checkout main
gh repo create "$GH_USER/dev-command-center" --public --source=. --remote=origin --push
```
Expected: repo created at `https://github.com/$GH_USER/dev-command-center`; `main` pushed.

- [ ] **Step 2: Push the slice branch and open a PR**

```bash
cd /Users/jake-edwards/projects/dev-command-center
git push -u origin slice-1-hub-marketplace
gh pr create --base main --head slice-1-hub-marketplace \
  --title "Slice 1: hub + marketplace setup" \
  --body "Publishes the hub as a Claude Code plugin marketplace (marketplace.json + dev-command-center plugin with a stub dev-orchestrator skill) and a Pages-ready placeholder board. Spec: docs/superpowers/specs/2026-06-11-dev-command-center-design.md"
```
Expected: a PR URL is printed.

- [ ] **Step 3: Verify the PR exists and is mergeable**

```bash
gh pr view slice-1-hub-marketplace --json number,mergeable,state --jq '{number,mergeable,state}'
```
Expected: `state: OPEN`, `mergeable: MERGEABLE`.

---

## Task 4: Merge, enable Pages, verify

**Files:** none.

- [ ] **Step 1: Merge the PR**

```bash
cd /Users/jake-edwards/projects/dev-command-center
gh pr merge slice-1-hub-marketplace --merge --delete-branch
git checkout main && git pull --ff-only
```
Expected: PR merged; local `main` updated; `board.html`, manifests, README present on `main`.

- [ ] **Step 2: Enable GitHub Pages from `main` root**

```bash
gh api -X POST "repos/$GH_USER/dev-command-center/pages" \
  -f "source[branch]=main" -f "source[path]=/" && echo "pages requested"
```
Expected: a JSON response with the Pages config (or HTTP 201). If it returns 409 "already exists," that's fine. If the `-f source[branch]` nested form errors, fall back to enabling Pages in the repo's web UI (Settings → Pages → Deploy from branch → main / root).

- [ ] **Step 3: Verify the Pages site serves the board (allow ~1–2 min for first build)**

```bash
URL="https://$GH_USER.github.io/dev-command-center/board.html"
for i in 1 2 3 4 5 6; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
  echo "attempt $i: $code"; [ "$code" = "200" ] && break; sleep 20
done
curl -s "$URL" | grep -q "Dev Command Center" && echo "PAGES OK: $URL"
```
Expected: a `200` and `PAGES OK` with the URL.

- [ ] **Step 4: User acceptance — install from the marketplace**

Ask the user to run, in a Claude Code session:
```
/plugin marketplace add <GH_USER>/dev-command-center
/plugin install dev-command-center@jakes-dev
```
Expected: the marketplace adds without error and `dev-orchestrator` appears as an available (scaffold) skill. This confirms the manifests are valid end-to-end.

---

## Task 5: Reconcile

**Files:** none new (tracker tooling doesn't exist until Slice 3).

- [ ] **Step 1: Capture the slice retro**

Create `docs/retros/dev-command-center-slice-1-retro.md` with: what required manual intervention (gh auth, public-repo confirmation, any Pages-UI fallback), decisions made, and friction. Commit it to `main`.

- [ ] **Step 2: Note deferred board update**

`board-update.js` lands in Slice 3, so there is no automated tracker entry yet. Record in the retro that Slice 1's board card will be backfilled when the board + script exist (Slices 2–3).

- [ ] **Step 3: Commit the retro**

```bash
cd /Users/jake-edwards/projects/dev-command-center
git add docs/retros && git commit -m "Slice 1 retro" && git push
```

---

## Self-Review

**Spec coverage (§7 step 1 — "Hub + marketplace setup"):**
- Public GitHub repo + remote → Task 3 Step 1. ✓
- `.claude-plugin/marketplace.json` → Task 1 Step 1. ✓
- `plugins/dev-command-center/` plugin skeleton (`plugin.json`) → Task 1 Steps 2–3. ✓
- Push existing spec/context/docs → Task 3 Step 1 (pushes `main`, which already holds them). ✓
- Enable GitHub Pages → Task 4 Step 2. ✓
- Dogfooding (branch per slice + PR + retro) → Tasks 0, 3, 5. ✓

**Placeholder scan:** `<GH_USER>` appears where the GitHub username is environment-determined; Task 0 Step 1 captures it and Tasks 1–4 reference it via the `$GH_USER` shell var or call out the manual substitution (plugin.json homepage, README). No vague "TODO/handle errors" steps; every file has complete content. ✓

**Type/name consistency:** marketplace `name` = `jakes-dev`; plugin `name` = `dev-command-center`; install command `dev-command-center@jakes-dev` matches both (Task 1 Step 1, README, Task 4 Step 4). Plugin `source` = `dev-command-center` resolves against `metadata.pluginRoot` `./plugins` → `plugins/dev-command-center/`, which is where `plugin.json` lives. Consistent. ✓

**Known risks:** (1) Pages nested-field API form may need the web-UI fallback (noted in Task 4 Step 2). (2) First Pages build can take 1–2 min (handled by the retry loop). (3) `/plugin` acceptance is user-run (can't be scripted from Bash).
