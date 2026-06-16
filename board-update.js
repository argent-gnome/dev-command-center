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
  ['title', 'column', 'phase', 'nextAction', 'branch', 'model'].forEach(k => { if (fields[k] !== undefined) card[k] = fields[k]; });
  if (fields.blockedOn !== undefined) card.blockedOn = fields.blockedOn;
  if (fields.link) { card.links = card.links || {}; const i = fields.link.indexOf('='); card.links[fields.link.slice(0, i)] = fields.link.slice(i + 1); }
  card.lastTouched = today;
  return card;
}
// Onboard bulk-seed: upsert EACH scanner card by id, PRESERVING existing cards the scan didn't re-emit.
// project-state-scanner caps at ~1-3 cards, so a plain overwrite would delete slice history (onboard-databug retro).
function seedCards(board, cards, today) {
  board.cards = board.cards || [];
  const ids = [];
  for (const c of (cards || [])) {
    if (!c || !c.id) continue;
    let card = board.cards.find(x => x.id === c.id);
    if (!card) { card = { id: c.id, links: {} }; board.cards.push(card); }
    ['title', 'column', 'phase', 'nextAction', 'branch', 'model'].forEach(k => { if (c[k] !== undefined) card[k] = c[k]; });
    if (c.blockedOn !== undefined) card.blockedOn = c.blockedOn;
    if (c.links && typeof c.links === 'object') card.links = Object.assign(card.links || {}, c.links);
    card.lastTouched = c.lastTouched || today;
    ids.push(card.id);
  }
  return ids; // cards NOT in `cards` are preserved untouched — never dropped
}
function git(args) { return execFileSync('git', ['-C', HUB, ...args], { encoding: 'utf8' }); }
function main() {
  const a = parseArgs(process.argv.slice(2));
  const seedFile = a['seed-file'];
  if (!a.project || (!a.slice && !seedFile)) {
    console.error('usage: board-update --project <key> --slice <cardId> [--title --column --phase --next-action --blocked <s>|--unblock --branch --model --link kind=url]\n   or: board-update --project <key> --seed-file <cards.json>   (onboard: upsert each card by id, PRESERVES existing cards — never overwrites)\n   [--dry-run|--no-push]');
    process.exit(2);
  }
  const cfg = loadConfig();
  const proj = (cfg.projects || {})[a.project];
  const dataFile = path.join(HUB, 'data', a.project + '.json');
  const board = fs.existsSync(dataFile)
    ? JSON.parse(fs.readFileSync(dataFile, 'utf8'))
    : { project: a.project, displayName: (proj && proj.displayName) || a.project, cards: [] };
  const today = todayISO(new Date());
  let commitMsg, summary;
  if (seedFile) {
    const parsed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
    const cards = Array.isArray(parsed) ? parsed : (parsed.cards || []);
    const ids = seedCards(board, cards, today);
    if (a.dryRun) { console.log(JSON.stringify(board.cards, null, 2)); return; }
    commitMsg = `tracker: ${a.project} onboard seed (${ids.length} card(s) upserted by id; existing preserved)`;
    summary = `board seeded: ${a.project} (${ids.length} upserted, ${board.cards.length} total — none dropped)`;
  } else {
    const fields = { id: a.slice, title: a.title, column: a.column, phase: a.phase, nextAction: a['next-action'], branch: a.branch, model: a.model, link: a.link };
    if (a.unblock) fields.blockedOn = null; else if (a.blocked !== undefined) fields.blockedOn = a.blocked;
    const card = upsertCard(board, fields, today);
    if (a.dryRun) { console.log(JSON.stringify(card, null, 2)); return; }
    commitMsg = `tracker: ${a.project} ${a.slice} → ${a.column || card.column}`;
    summary = `board updated: ${a.project}/${a.slice} → ${card.column} (${today})`;
  }
  fs.writeFileSync(dataFile, JSON.stringify(board, null, 2) + '\n');
  const author = (cfg.hub && cfg.hub.author) || { name: 'dev-orchestrator', email: 'noreply@local' };
  const ident = ['-c', `user.name=${author.name}`, '-c', `user.email=${author.email}`];
  const rel = path.join('data', a.project + '.json');
  git(['add', rel]);
  if (!git(['diff', '--cached', '--name-only', '--', rel]).trim()) { console.log('no change'); return; }
  git([...ident, 'commit', '-q', '-m', commitMsg, '--', rel]);
  if (a.noPush) { console.log('committed (no push)'); return; }
  try { try { git(['pull', '--rebase', '--autostash', '-q']); } catch (e) {} git(['push', '-q']); }
  catch (e) { try { git(['pull', '--rebase', '--autostash', '-q']); git(['push', '-q']); } catch (e2) { console.error('push failed (committed locally): ' + e2.message); process.exit(1); } }
  console.log(summary);
}
module.exports = { upsertCard, seedCards, todayISO, parseArgs };
if (require.main === module) main();
