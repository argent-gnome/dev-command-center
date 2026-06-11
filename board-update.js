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
function git(args) { return execFileSync('git', ['-C', HUB, ...args], { encoding: 'utf8' }); }
function main() {
  const a = parseArgs(process.argv.slice(2));
  if (!a.project || !a.slice) {
    console.error('usage: board-update --project <key> --slice <cardId> [--title --column --phase --next-action --blocked <s>|--unblock --branch --model --link kind=url] [--dry-run|--no-push]');
    process.exit(2);
  }
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
  try { try { git(['pull', '--rebase', '--autostash', '-q']); } catch (e) {} git(['push', '-q']); }
  catch (e) { try { git(['pull', '--rebase', '--autostash', '-q']); git(['push', '-q']); } catch (e2) { console.error('push failed (committed locally): ' + e2.message); process.exit(1); } }
  console.log(`board updated: ${a.project}/${a.slice} → ${card.column} (${today})`);
}
module.exports = { upsertCard, todayISO, parseArgs };
if (require.main === module) main();
