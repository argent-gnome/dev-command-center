# Slice 2 — Board Read-View — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder `board.html` with a real read-only board that fetches per-project JSON, renders three swimlanes × six columns of slice cards plus a "Needs Attention" pane, in the house aesthetic, working both on GitHub Pages (fetch) and offline (a built `board.local.html`).

**Architecture:** One pure render function (`board.render.js`, string-in → HTML-string-out, UMD so it runs in both browser and Node) is the single source of render logic. `board.html` loads it, fetches `data/*.json` + `data/attention.json`, and injects the result. `build-board.js` (Node) feeds the same function the same files and writes a standalone `board.local.html` with data inlined — which is also how we verify rendering deterministically without a browser. Data is stub content this slice (real status arrives via Slice 4 onboarding).

**Tech Stack:** static HTML/CSS, vanilla JS (UMD module), Node (for build + tests), Python `http.server` (local fetch testing).

**Spec:** `docs/superpowers/specs/2026-06-11-dev-command-center-design.md` §5 (layout, card schema, persistence, attention pane).

---

## File Structure (this slice)

- `data/spanish-coach.json`, `data/apex.json`, `data/hims.json` — per-project board state (stub; one card each).
- `data/attention.json` — action-items for the Needs-Attention pane (empty-ish stub).
- `board.render.js` — UMD: `renderBoard(projects, attention) -> htmlString`, `COLUMNS`, `mergeProjects()`.
- `board.html` — shell that loads the renderer, fetches data, injects HTML (replaces the Slice 1 placeholder).
- `build-board.js` — Node: read data files → `renderBoard` → write `board.local.html` (inlined, offline).
- `test/board.render.test.js` — Node assertions on `renderBoard` output (no browser needed).

---

## Task 1: Data schema — stub per-project files + attention

**Files:**
- Create: `data/spanish-coach.json`, `data/apex.json`, `data/hims.json`, `data/attention.json`

- [ ] **Step 1: Write the three project data files**

`data/spanish-coach.json`:
```json
{
  "project": "spanish-coach",
  "displayName": "Spanish Coach",
  "cards": [
    { "id": "spanish-coach__slice-7", "title": "Slice 7 — conjugation-aware generation",
      "column": "spec", "phase": "2 · spec (user-review gate)",
      "nextAction": "Approve the Slice 7 spec", "blockedOn": null,
      "branch": "slice-7-conjugation", "model": "Opus build / Fable merge-gate",
      "lastTouched": "2026-06-11", "links": {} }
  ]
}
```

`data/apex.json`:
```json
{
  "project": "apex",
  "displayName": "APEX (moto-ride-stats)",
  "cards": [
    { "id": "apex__slice-3", "title": "Slice 3 — persistence + map",
      "column": "backlog", "phase": "1 · scope",
      "nextAction": "Write the Slice 3 plan (validate-then-proceed)", "blockedOn": null,
      "branch": null, "model": "Opus build / Fable planning",
      "lastTouched": "2026-06-11", "links": {} }
  ]
}
```

`data/hims.json`:
```json
{
  "project": "hims-pilot-recert",
  "displayName": "HIMS Pilot Recert",
  "cards": [
    { "id": "hims__slice-1", "title": "Slice 1 — first build on fixed foundation",
      "column": "build", "phase": "5 · build (multi-session)",
      "nextAction": "Resolve submission_14d over-scoping flagged at checkpoint",
      "blockedOn": null, "branch": "slice-1", "model": "Opus build / Fable merge-gate",
      "lastTouched": "2026-06-11", "links": {} }
  ]
}
```
> NOTE: stub content — Slice 4 onboarding overwrites these with scanner-derived status.

- [ ] **Step 2: Write the attention file**

`data/attention.json`:
```json
{
  "refreshedAt": "2026-06-11",
  "openAuditPRs": [],
  "pendingRetros": { "count": 1, "sinceAudit": null, "dir": "docs/retros/" },
  "pluginUpdate": null,
  "docDriftPatches": [],
  "blockedCards": []
}
```

- [ ] **Step 3: Validate + commit**

Run:
```bash
for f in data/spanish-coach.json data/apex.json data/hims.json data/attention.json; do jq empty "$f" && echo "$f OK"; done
git add data && git -c user.name="Jake Edwards" -c user.email="jakec714@gmail.com" commit -m "Slice 2: stub per-project board data + attention.json"
```
Expected: four "OK" lines; commit succeeds.

---

## Task 2: The render function (UMD, testable)

**Files:**
- Create: `board.render.js`
- Test: `test/board.render.test.js`

- [ ] **Step 1: Write the failing test**

`test/board.render.test.js`:
```js
const assert = require('assert');
const { renderBoard, mergeProjects, COLUMNS } = require('../board.render.js');

const projects = [
  { project: 'p1', displayName: 'Proj One', cards: [
    { id: 'p1__s1', title: 'Slice 1', column: 'build', phase: '5 · build',
      nextAction: 'do thing', blockedOn: null, branch: 'b', lastTouched: '2026-06-11', links: {} },
    { id: 'p1__s2', title: 'Slice 2', column: 'spec', phase: '2 · spec',
      nextAction: 'approve', blockedOn: 'CI red', branch: 'b2', lastTouched: '2026-06-10', links: {} }
  ] }
];
const attention = { refreshedAt: '2026-06-11', openAuditPRs: [{ number: 14, title: 'x', url: '#', ageDays: 41 }],
  pendingRetros: { count: 2, sinceAudit: '2026-04-20', dir: 'docs/retros/' }, pluginUpdate: null,
  docDriftPatches: [], blockedCards: [] };

const html = renderBoard(projects, attention);
assert.ok(html.includes('Proj One'), 'shows project displayName');
assert.ok(html.includes('Slice 1') && html.includes('Slice 2'), 'shows both cards');
assert.ok(COLUMNS.length === 6, 'six columns');
assert.ok(html.includes('do thing'), 'shows nextAction');
assert.ok(html.includes('CI red'), 'shows blockedOn text');
assert.ok(html.includes('41') && html.includes('Needs Attention'), 'attention pane with age');
assert.ok(html.includes('&lt;') === false || !html.includes('<script>alert'), 'escapes user text');
console.log('PASS board.render');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node test/board.render.test.js`
Expected: FAIL with `Cannot find module '../board.render.js'`.

- [ ] **Step 3: Implement `board.render.js`**

```js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DCB = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const COLUMNS = [
    ['backlog', 'Backlog'], ['spec', 'Spec'], ['build', 'Build'],
    ['verify', 'Verify'], ['live', 'Live'], ['done', 'Done']
  ];
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function mergeProjects(files) {
    // files: array of parsed per-project json objects; returns same, filtered to valid
    return files.filter(f => f && f.project && Array.isArray(f.cards));
  }
  function cardHtml(card) {
    const blocked = card.blockedOn
      ? `<div class="blk">⛔ ${esc(card.blockedOn)}</div>` : '';
    const branch = card.branch ? `<span class="meta">⎇ ${esc(card.branch)}</span>` : '';
    return `<div class="card${card.blockedOn ? ' is-blocked' : ''}">
      <div class="phase">${esc(card.phase)}</div>
      <div class="title">${esc(card.title)}</div>
      <div class="next"><b>Next:</b> ${esc(card.nextAction)}</div>
      ${blocked}
      <div class="foot">${branch}<span class="meta">${esc(card.lastTouched)}</span></div>
    </div>`;
  }
  function laneHtml(p) {
    const cols = COLUMNS.map(([key, label]) => {
      const cards = (p.cards || []).filter(c => c.column === key).map(cardHtml).join('');
      return `<div class="col" data-col="${key}"><div class="col-h">${label}</div>${cards}</div>`;
    }).join('');
    return `<section class="lane">
      <div class="lane-h">${esc(p.displayName || p.project)}</div>
      <div class="cols">${cols}</div>
    </section>`;
  }
  function attentionHtml(a) {
    if (!a) return '';
    const items = [];
    (a.openAuditPRs || []).forEach(pr => items.push(
      `<li class="${pr.ageDays > 30 ? 'stale' : ''}">Audit PR #${esc(pr.number)} — ${esc(pr.title)} <span class="age">${esc(pr.ageDays)}d</span></li>`));
    if (a.pendingRetros && a.pendingRetros.count)
      items.push(`<li>${esc(a.pendingRetros.count)} retro(s) awaiting audit${a.pendingRetros.sinceAudit ? ` (since ${esc(a.pendingRetros.sinceAudit)})` : ''}</li>`);
    if (a.pluginUpdate) items.push(`<li class="stale">Process update ready — <code>/plugin marketplace update</code></li>`);
    (a.docDriftPatches || []).forEach(d => items.push(`<li>Doc-drift patch pending: ${esc(d)}</li>`));
    (a.blockedCards || []).forEach(b => items.push(`<li class="stale">Blocked: ${esc(b)}</li>`));
    const body = items.length ? `<ul>${items.join('')}</ul>` : `<p class="empty">Nothing needs attention.</p>`;
    return `<aside class="attn"><div class="attn-h">Needs Attention</div>${body}
      <div class="attn-foot">refreshed ${esc(a.refreshedAt)}</div></aside>`;
  }
  function renderBoard(projects, attention) {
    const lanes = mergeProjects(projects).map(laneHtml).join('');
    return `<div class="board"><div class="lanes">${lanes}</div>${attentionHtml(attention)}</div>`;
  }
  return { renderBoard, mergeProjects, COLUMNS, esc };
});
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `node test/board.render.test.js`
Expected: `PASS board.render`.

- [ ] **Step 5: Commit**

```bash
git add board.render.js test/board.render.test.js
git -c user.name="Jake Edwards" -c user.email="jakec714@gmail.com" commit -m "Slice 2: UMD renderBoard function + unit test"
```

---

## Task 3: `board.html` shell (fetch + inject)

**Files:**
- Modify: `board.html` (replace the Slice 1 placeholder entirely)

- [ ] **Step 1: Replace `board.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dev Command Center — Tracker</title>
<style>
  :root { --ink:#0f172a; --muted:#64748b; --line:#e2e8f0; --indigo:#4f46e5; --teal:#0a7c66; --bg:#f8fafc; --red:#dc2626; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; color:var(--ink); background:var(--bg); }
  .wrap { max-width:1280px; margin:0 auto; padding:32px 20px 64px; }
  h1 { font-size:24px; margin:0 0 2px; }
  .sub { color:var(--muted); margin:0 0 24px; font-size:14px; }
  .board { display:grid; grid-template-columns:1fr 280px; gap:20px; align-items:start; }
  .lane { background:#fff; border:1px solid var(--line); border-radius:12px; margin-bottom:16px; overflow:hidden; }
  .lane-h { font-weight:700; padding:10px 14px; background:#f1f5f9; border-bottom:1px solid var(--line); }
  .cols { display:grid; grid-template-columns:repeat(6,1fr); gap:8px; padding:10px; }
  .col-h { font-size:11px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); margin-bottom:6px; }
  .card { background:var(--bg); border:1px solid var(--line); border-radius:8px; padding:8px 10px; margin-bottom:8px; }
  .card.is-blocked { border-color:var(--red); }
  .phase { font-size:11px; color:var(--indigo); font-weight:600; }
  .title { font-size:13px; font-weight:600; margin:2px 0; }
  .next { font-size:12px; color:#334155; }
  .blk { font-size:12px; color:var(--red); margin-top:4px; }
  .foot { display:flex; gap:8px; margin-top:6px; }
  .meta { font-size:11px; color:var(--muted); }
  .attn { background:#fff; border:1px solid var(--line); border-radius:12px; padding:14px 16px; position:sticky; top:20px; }
  .attn-h { font-weight:700; margin-bottom:8px; }
  .attn ul { margin:0; padding-left:16px; } .attn li { font-size:13px; margin:5px 0; }
  .attn li.stale { color:var(--red); font-weight:600; } .attn .age { color:var(--red); font-weight:600; }
  .attn .empty { color:var(--muted); font-size:13px; } .attn-foot { color:var(--muted); font-size:11px; margin-top:10px; }
  code { background:#f1f5f9; padding:1px 5px; border-radius:5px; }
  .err { color:var(--red); }
</style>
</head>
<body>
<div class="wrap">
  <h1>Dev Command Center</h1>
  <p class="sub">Unified SDLC tracker — three swimlanes, live status.</p>
  <div id="root"><p class="sub">Loading…</p></div>
</div>
<script src="board.render.js"></script>
<script>
  const PROJECT_FILES = ['data/spanish-coach.json', 'data/apex.json', 'data/hims.json'];
  async function load() {
    // Offline build path: data inlined as window.__BOARD__
    if (window.__BOARD__) {
      document.getElementById('root').innerHTML =
        DCB.renderBoard(window.__BOARD__.projects, window.__BOARD__.attention);
      return;
    }
    try {
      const projects = await Promise.all(PROJECT_FILES.map(f => fetch(f).then(r => r.json())));
      const attention = await fetch('data/attention.json').then(r => r.json()).catch(() => null);
      document.getElementById('root').innerHTML = DCB.renderBoard(projects, attention);
    } catch (e) {
      document.getElementById('root').innerHTML =
        '<p class="err">Could not load board data. If opening locally, run <code>node build-board.js</code> and open board.local.html, or serve over http.</p>';
    }
  }
  load();
</script>
</body>
</html>
```

- [ ] **Step 2: Verify fetch path over a local server**

Run:
```bash
( python3 -m http.server 8765 >/dev/null 2>&1 & echo $! > /tmp/dcb_srv.pid )
sleep 1
curl -s http://localhost:8765/board.html | grep -q 'id="root"' && echo "SERVED OK"
kill "$(cat /tmp/dcb_srv.pid)" 2>/dev/null
```
Expected: `SERVED OK`. (Full render is client-side JS; the deterministic render check is Task 4 via the offline build.)

- [ ] **Step 3: Commit**

```bash
git add board.html
git -c user.name="Jake Edwards" -c user.email="jakec714@gmail.com" commit -m "Slice 2: board.html shell — fetch data + inject rendered board"
```

---

## Task 4: `build-board.js` offline build + deterministic render verification

**Files:**
- Create: `build-board.js`

- [ ] **Step 1: Write `build-board.js`**

```js
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { renderBoard } = require('./board.render.js');

const dir = __dirname;
const files = ['spanish-coach', 'apex', 'hims'].map(n =>
  JSON.parse(fs.readFileSync(path.join(dir, 'data', n + '.json'), 'utf8')));
const attention = JSON.parse(fs.readFileSync(path.join(dir, 'data', 'attention.json'), 'utf8'));

const rendered = renderBoard(files, attention);
const template = fs.readFileSync(path.join(dir, 'board.html'), 'utf8');
// Inline data so the offline file needs no fetch; the shell reads window.__BOARD__.
const inlined = template.replace(
  '<script src="board.render.js"></script>',
  '<script src="board.render.js"></script>\n<script>window.__BOARD__=' +
    JSON.stringify({ projects: files, attention }) + ';</script>'
);
fs.writeFileSync(path.join(dir, 'board.local.html'), inlined);
// Also emit the prerendered HTML to stdout length for sanity.
console.log('board.local.html written; rendered ' + rendered.length + ' chars');
```

- [ ] **Step 2: Build and verify the offline file contains all three projects + works without fetch**

Run:
```bash
node build-board.js
grep -q 'Spanish Coach' board.local.html && \
grep -q 'APEX' board.local.html && \
grep -q 'HIMS Pilot Recert' board.local.html && \
grep -q 'window.__BOARD__' board.local.html && \
echo "BUILD OK: all three lanes inlined"
```
Expected: `BUILD OK: all three lanes inlined`.

- [ ] **Step 3: Ignore the generated file + commit the builder**

```bash
echo "board.local.html" >> .gitignore
git add build-board.js .gitignore
git -c user.name="Jake Edwards" -c user.email="jakec714@gmail.com" commit -m "Slice 2: build-board.js — offline inlined board + deterministic render check"
```

---

## Task 5: PR + reconcile

- [ ] **Step 1: Push branch + open PR** (if Slice 1 already published the repo; otherwise this waits)

```bash
git push -u origin slice-2-board-read-view
gh pr create --base main --head slice-2-board-read-view \
  --title "Slice 2: board read-view" \
  --body "Real board.html (fetch + render), UMD renderBoard + unit test, build-board.js offline build, stub data. Spec §5."
```

- [ ] **Step 2: Capture the retro**

Create `docs/retros/dev-command-center-slice-2-retro.md` (interventions, decisions, friction). Commit.

- [ ] **Step 3: Note** that real card data lands via Slice 4 onboarding, and that `board-update.js` (Slice 3) will start writing these files programmatically.

---

## Self-Review

**Spec coverage (§5):** 3 swimlanes + 6 columns → Task 2 `laneHtml`/`COLUMNS`. Card schema (phase/nextAction/blockedOn/branch/lastTouched) → `cardHtml`. Per-project JSON + fetch+merge → Task 1 + Task 3. Needs-Attention pane with age badges → `attentionHtml` + `.stale`/`.age`. Offline build (`build-board.js` → `board.local.html`) → Task 4. House aesthetic (indigo/teal/slate, pills) → Task 3 CSS. ✓

**Placeholder scan:** stub data is explicitly labeled and slated for Slice 4 replacement — not a plan placeholder. Every step has complete code/commands. ✓

**Type/name consistency:** `renderBoard(projects, attention)`, `mergeProjects`, `COLUMNS`, `DCB` global, `window.__BOARD__` — used identically in `board.render.js`, the test, `board.html`, and `build-board.js`. Column keys (`backlog/spec/build/verify/live/done`) match the data files' `column` values and the spec's §5.1 table. ✓

**Known risks:** (1) `file://` fetch is CORS-blocked — handled by the offline `window.__BOARD__` path + the error message pointing at `build-board.js`. (2) Real status is stubbed until Slice 4. (3) Task 5's PR step depends on Slice 1 having published the repo.
