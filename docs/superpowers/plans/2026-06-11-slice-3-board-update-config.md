# Slice 3 — board-update.js + projects.config.json — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use `- [ ]`.

**Goal:** A token-free, deterministic CLI (`board-update.js`) that upserts a card into `data/<project>.json`, stamps `lastTouched`, and commits+pushes the hub — callable from any session with zero manual commits — plus `projects.config.json` as the single project registry that the board reads.

**Architecture:** Pure `upsertCard()` (unit-tested) + a thin git wrapper (add → commit-if-changed → pull --rebase → push, one retry). The script lives at hub root and operates on its own `__dirname`, so it works from any cwd. `board.html` + `build-board.js` read the project list from `projects.config.json` (config not code), with a fallback.

**Tech Stack:** Node (no deps), git, JSON.

**Spec:** §5.4 (update mechanism), §6.3 (board-update), §6.4 (projects.config).

---

## File Structure
- Create: `projects.config.json` — hub + per-project registry.
- Create: `board-update.js` — CLI; exports `upsertCard`, `todayISO`, `parseArgs` for tests.
- Create: `test/board-update.test.js` — unit tests for the pure core.
- Modify: `data/hims.json` — set `project` field to `hims` (match its key/filename).
- Modify: `board.html`, `build-board.js` — derive the project list from `projects.config.json` (fallback to the 3).

---

## Task 1: projects.config.json + data key fix

- [ ] **Step 1: Write `projects.config.json`**
```json
{
  "hub": {
    "repoPath": "/Users/jake-edwards/projects/dev-command-center",
    "repo": "argent-gnome/dev-command-center",
    "ghLogin": "argent-gnome",
    "marketplace": "jakes-dev",
    "pagesUrl": "https://argent-gnome.github.io/dev-command-center/board.html",
    "author": { "name": "Jake Edwards", "email": "jakec714@gmail.com" }
  },
  "projects": {
    "spanish-coach": { "displayName": "Spanish Coach", "repoPath": "/Users/jake-edwards/projects/spanish-coach", "stack": "ios", "topology": "single-session" },
    "apex": { "displayName": "APEX (moto-ride-stats)", "repoPath": "/Users/jake-edwards/projects/moto-ride-stats", "stack": "ios", "topology": "single-session" },
    "hims": { "displayName": "HIMS Pilot Recert", "repoPath": "/Users/jake-edwards/projects/hims-pilot-recert", "stack": "web", "topology": "multi-session" }
  }
}
```

- [ ] **Step 2: Fix `data/hims.json`** — change `"project": "hims-pilot-recert"` to `"project": "hims"` (key = filename = project field). displayName stays "HIMS Pilot Recert".

- [ ] **Step 3: Validate + commit**
```bash
jq empty projects.config.json && jq empty data/hims.json && echo OK
git add projects.config.json data/hims.json
git -c user.name="Jake Edwards" -c user.email="jakec714@gmail.com" commit -m "Slice 3: projects.config.json registry + hims data key fix"
```

---

## Task 2: board-update.js (TDD)

- [ ] **Step 1: Write the failing test** `test/board-update.test.js`
```js
const assert = require('assert');
const { upsertCard, todayISO, parseArgs } = require('../board-update.js');

const b = { project: 'p', cards: [] };
const c = upsertCard(b, { id: 'p__s1', title: 'S1', column: 'build', phase: '5', nextAction: 'go' }, '2026-06-11');
assert.equal(b.cards.length, 1); assert.equal(c.column, 'build');
assert.equal(c.lastTouched, '2026-06-11'); assert.equal(c.nextAction, 'go');

upsertCard(b, { id: 'p__s1', column: 'verify' }, '2026-06-12');
assert.equal(b.cards.length, 1, 'no dup');
assert.equal(b.cards[0].column, 'verify'); assert.equal(b.cards[0].title, 'S1', 'kept title');
assert.equal(b.cards[0].lastTouched, '2026-06-12');

upsertCard(b, { id: 'p__s1', blockedOn: 'CI red' }, '2026-06-12');
assert.equal(b.cards[0].blockedOn, 'CI red');
upsertCard(b, { id: 'p__s1', blockedOn: null }, '2026-06-12');
assert.equal(b.cards[0].blockedOn, null);

upsertCard(b, { id: 'p__s1', link: 'pr=http://x/1' }, '2026-06-12');
assert.equal(b.cards[0].links.pr, 'http://x/1');

assert.equal(todayISO(new Date('2026-06-11T15:00:00Z')), '2026-06-11');
const a = parseArgs(['--project','spanish-coach','--slice','x','--unblock','--dry-run']);
assert.equal(a.project,'spanish-coach'); assert.equal(a.unblock,true); assert.equal(a.dryRun,true);
console.log('PASS board-update');
```

- [ ] **Step 2: Run → expect FAIL** (`Cannot find module '../board-update.js'`): `node test/board-update.test.js`

- [ ] **Step 3: Implement `board-update.js`**
```js
#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const HUB = __dirname;

function loadConfig() { return JSON.parse(fs.readFileSync(path.join(HUB, 'projects.config.json'), 'utf8')); }
function todayISO(now) { return now.toISOString().slice(0, 10); }
function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--unblock') a.unblock = true;
    else if (t === '--dry-run') a.dryRun = true;
    else if (t === '--no-push') a.noPush = true;
    else if (t.startsWith('--')) a[t.slice(2)] = argv[++i];
  }
  return a;
}
function upsertCard(board, fields, today) {
  board.cards = board.cards || [];
  let card = board.cards.find(c => c.id === fields.id);
  if (!card) { card = { id: fields.id, links: {} }; board.cards.push(card); }
  ['title','column','phase','nextAction','branch','model'].forEach(k => { if (fields[k] !== undefined) card[k] = fields[k]; });
  if (fields.blockedOn !== undefined) card.blockedOn = fields.blockedOn;
  if (fields.link) { card.links = card.links || {}; const i = fields.link.indexOf('='); card.links[fields.link.slice(0,i)] = fields.link.slice(i+1); }
  card.lastTouched = today;
  return card;
}
function git(args) { return execFileSync('git', ['-C', HUB, ...args], { encoding: 'utf8' }); }
function main() {
  const a = parseArgs(process.argv.slice(2));
  if (!a.project || !a.slice) { console.error('usage: board-update --project <key> --slice <cardId> [--title --column --phase --next-action --blocked <s>|--unblock --branch --model --link kind=url] [--dry-run|--no-push]'); process.exit(2); }
  const cfg = loadConfig();
  const proj = (cfg.projects || {})[a.project];
  const dataFile = path.join(HUB, 'data', a.project + '.json');
  const board = fs.existsSync(dataFile)
    ? JSON.parse(fs.readFileSync(dataFile, 'utf8'))
    : { project: a.project, displayName: (proj && proj.displayName) || a.project, cards: [] };
  const fields = { id: a.slice, title: a.title, column: a.column, phase: a.phase, nextAction: a['next-action'], branch: a.branch, model: a.model, link: a.link };
  if (a.unblock) fields.blockedOn = null; else if (a.blocked !== undefined) fields.blockedOn = a.blocked;
  const today = todayISO(new Date());
  const card = upsertCard(board, fields, today);
  if (a.dryRun) { console.log(JSON.stringify(card, null, 2)); return; }
  fs.writeFileSync(dataFile, JSON.stringify(board, null, 2) + '\n');
  const author = (cfg.hub && cfg.hub.author) || { name: 'dev-orchestrator', email: 'noreply@local' };
  const ident = ['-c', `user.name=${author.name}`, '-c', `user.email=${author.email}`];
  git(['add', path.join('data', a.project + '.json')]);
  if (!git(['diff', '--cached', '--name-only']).trim()) { console.log('no change'); return; }
  git([...ident, 'commit', '-q', '-m', `tracker: ${a.project} ${a.slice} → ${a.column || card.column}`]);
  if (a.noPush) { console.log('committed (no push)'); return; }
  try { try { git(['pull','--rebase','--autostash','-q']); } catch (e) {} git(['push','-q']); }
  catch (e) { try { git(['pull','--rebase','--autostash','-q']); git(['push','-q']); } catch (e2) { console.error('push failed (committed locally): ' + e2.message); process.exit(1); } }
  console.log(`board updated: ${a.project}/${a.slice} → ${card.column} (${today})`);
}
module.exports = { upsertCard, todayISO, parseArgs };
if (require.main === module) main();
```

- [ ] **Step 4: Run → expect PASS** (`node test/board-update.test.js` → `PASS board-update`).

- [ ] **Step 5: Dry-run smoke** (no side effects):
```bash
node board-update.js --project spanish-coach --slice spanish-coach__slice-7 --column build --phase "5 · build" --next-action "smoke" --dry-run
```
Expected: prints the updated card JSON with `"column": "build"`, `"lastTouched"` = today.

- [ ] **Step 6: Commit**
```bash
git add board-update.js test/board-update.test.js
git -c user.name="Jake Edwards" -c user.email="jakec714@gmail.com" commit -m "Slice 3: board-update.js (upsert + git sync) + unit test"
```

---

## Task 3: Make board.html + build-board.js config-driven (DRY the project list)

- [ ] **Step 1:** In `board.html`, replace the hardcoded `PROJECT_FILES` load with: fetch `projects.config.json`, derive `Object.keys(config.projects)` → `data/<key>.json`; on any failure fall back to `['spanish-coach','apex','hims']`. (Keep the `window.__BOARD__` offline path unchanged.)
- [ ] **Step 2:** In `build-board.js`, read the project keys from `projects.config.json` instead of the hardcoded array.
- [ ] **Step 3:** Rebuild + verify offline render still contains all three lanes:
```bash
node build-board.js && for n in 'Spanish Coach' 'APEX' 'HIMS Pilot Recert' 'Needs Attention'; do grep -q "$n" board.local.html || { echo "MISSING $n"; exit 1; }; done && echo "BUILD OK"
```
- [ ] **Step 4: Commit**
```bash
git add board.html build-board.js
git -c user.name="Jake Edwards" -c user.email="jakec714@gmail.com" commit -m "Slice 3: board.html + build-board.js read project list from projects.config.json"
```

---

## Task 4: PR + reconcile
- [ ] **Step 1:** Push `slice-3-board-update-config`; `gh pr create`; `gh pr merge --merge --delete-branch`; pull main.
- [ ] **Step 2:** Verify live Pages still renders (curl board.render.js + a data file = 200 after rebuild).
- [ ] **Step 3:** Retro `docs/retros/dev-command-center-slice-3-retro.md`; commit + push main.

---

## Self-Review
- **Spec coverage:** §5.4 CLI shape → Task 2 (`parseArgs` + flags). §6.3 token-free deterministic + commit/push from any session via `__dirname` → Task 2 `git()`/`main()`. §6.4 config registry → Task 1. ✓
- **Placeholders:** none — full code in Task 1–2; Task 3 is a focused edit with explicit fallback. ✓
- **Type consistency:** `upsertCard/todayISO/parseArgs` exported and imported identically; data filename = project key = `data/<key>.json` (hims fixed in Task 1). ✓
- **Risks:** (1) `git pull --rebase` needs network — wrapped in try/catch, `--no-push`/`--dry-run` for offline/tests. (2) board-update reformats JSON (pretty-print) — acceptable, it owns the files now. (3) first real board-update runs in Slice 4 onboarding.
