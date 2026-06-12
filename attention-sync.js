#!/usr/bin/env node
'use strict';
// attention-sync — deterministically refresh data/attention.json (the Needs-Attention pane, spec §5.5).
// Aggregation, not judgment: blocked cards, pending retros, open sdlc-audit PRs, plugin-version lag.
// Mirrors board-update.js (pure functions + thin IO/git wrapper). No agent, no tokens.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const HUB = __dirname;

function loadConfig() { return JSON.parse(fs.readFileSync(path.join(HUB, 'projects.config.json'), 'utf8')); }
function todayISO(now) { return now.toISOString().slice(0, 10); }
function daysBetween(from, to) {
  const a = Date.parse(from), b = Date.parse(to); // accepts 'YYYY-MM-DD' (UTC) or a full ISO datetime
  return (isNaN(a) || isNaN(b)) ? 0 : Math.max(0, Math.round((b - a) / 86400000));
}
function cmpSemver(a, b) { // -1 if a<b, 0 eq, 1 if a>b (numeric, x.y.z; missing parts = 0)
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) { const x = pa[i] || 0, y = pb[i] || 0; if (x !== y) return x < y ? -1 : 1; }
  return 0;
}
function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--dry-run') a.dryRun = true;
    else if (t === '--no-push') a.noPush = true;
    else if (t.startsWith('--')) a[t.slice(2)] = argv[++i];
  }
  return a;
}

// --- pure functions (unit-tested) ---
function computeBlockedCards(boards) {
  const out = [];
  (boards || []).forEach(b => (b.cards || []).forEach(c => {
    if (c.blockedOn) out.push(`${b.displayName || b.project} · ${c.title || c.id} — ${c.blockedOn}`);
  }));
  return out;
}
function computePendingRetros(retroDates, sinceAudit, today) {
  const dates = (retroDates || []).filter(Boolean).filter(d => !sinceAudit || d > sinceAudit).sort();
  const oldest = dates.length ? dates[0] : null;
  return {
    count: dates.length,
    sinceAudit: sinceAudit || null,
    oldest,
    oldestDays: oldest && today ? daysBetween(oldest, today) : null,
    dir: 'docs/retros/'
  };
}
function computePluginUpdate(installed, latest) {
  // flag only when the installed version LAGS the marketplace (not merely differs)
  return installed && latest && cmpSemver(installed, latest) < 0 ? { from: installed, to: latest } : null;
}
function mapAuditPRs(prs, today) {
  return (prs || []).map(pr => ({
    number: pr.number,
    title: pr.title,
    url: pr.url,
    ageDays: pr.createdAt ? daysBetween(String(pr.createdAt).slice(0, 10), today) : 0
  }));
}
function buildAttention(prev, parts) {
  // owned fields are recomputed; fields this script doesn't own (docDriftPatches — doc-keeper's) are preserved.
  return {
    refreshedAt: parts.today,
    openAuditPRs: parts.openAuditPRs || [],
    pendingRetros: parts.pendingRetros,
    pluginUpdate: parts.pluginUpdate,
    docDriftPatches: (prev && prev.docDriftPatches) || [],
    blockedCards: parts.blockedCards || []
  };
}

// --- IO ---
function retroDate(dir, file) {
  // git committer datetime (%cI) is stable across clones + sub-day precise — the clock the auditor's
  // watermark also reads, so the strict "newer than" filter agrees. Fall back to mtime if uncommitted.
  try {
    const iso = execFileSync('git', ['-C', dir, 'log', '-1', '--format=%cI', '--', file], { encoding: 'utf8' }).trim();
    if (iso) return iso;
  } catch (e) { /* not a repo / git absent → fall through */ }
  try { return fs.statSync(path.join(dir, file)).mtime.toISOString(); } catch (e) { return null; }
}
function listRetroDates(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('-retro.md')).map(f => retroDate(dir, f)).filter(Boolean);
}
function ghAuditPRs(repo) {
  if (!repo) return [];
  try {
    return JSON.parse(execFileSync('gh', ['pr', 'list', '--repo', repo, '--state', 'open',
      '--label', 'sdlc-audit', '--json', 'number,title,url,createdAt'], { encoding: 'utf8' }));
  } catch (e) { return []; } // gh absent / headless / no label → empty, never throw
}
function readJSON(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; } }
function git(args) { return execFileSync('git', ['-C', HUB, ...args], { encoding: 'utf8' }); }

function main() {
  const a = parseArgs(process.argv.slice(2));
  const cfg = loadConfig();
  const today = todayISO(new Date());

  const boards = Object.keys(cfg.projects || {})
    .map(k => readJSON(path.join(HUB, 'data', k + '.json'))).filter(Boolean);

  let retroDates = listRetroDates(path.join(HUB, 'docs', 'retros'));
  Object.values(cfg.projects || {}).forEach(p => {
    if (p.repoPath) retroDates = retroDates.concat(listRetroDates(path.join(p.repoPath, 'docs', 'retros')));
  });

  const prev = readJSON(path.join(HUB, 'data', 'attention.json'));
  const sinceAudit = a.since || (prev && prev.pendingRetros && prev.pendingRetros.sinceAudit) || null;
  const mk = readJSON(path.join(HUB, '.claude-plugin', 'marketplace.json'));
  const latest = mk && mk.plugins && mk.plugins[0] && mk.plugins[0].version;

  const attention = buildAttention(prev, {
    today,
    openAuditPRs: mapAuditPRs(ghAuditPRs(cfg.hub && cfg.hub.repo), today),
    pendingRetros: computePendingRetros(retroDates, sinceAudit, today),
    pluginUpdate: computePluginUpdate(a.installed || null, latest),
    blockedCards: computeBlockedCards(boards)
  });

  const dataFile = path.join(HUB, 'data', 'attention.json');
  if (a.dryRun) { console.log(JSON.stringify(attention, null, 2)); return; }
  fs.writeFileSync(dataFile, JSON.stringify(attention, null, 2) + '\n');
  const author = (cfg.hub && cfg.hub.author) || { name: 'dev-orchestrator', email: 'noreply@local' };
  const ident = ['-c', `user.name=${author.name}`, '-c', `user.email=${author.email}`];
  const rel = path.join('data', 'attention.json');
  git(['add', rel]);
  // scope the change-check AND the commit to attention.json — never sweep unrelated staged work into the push
  if (!git(['diff', '--cached', '--name-only', '--', rel]).trim()) { console.log('no change'); return; }
  git([...ident, 'commit', '-q', '-m', `attention: refresh ${today}`, '--', rel]);
  if (a.noPush) { console.log('committed (no push)'); return; }
  try { try { git(['pull', '--rebase', '--autostash', '-q']); } catch (e) {} git(['push', '-q']); }
  catch (e) { try { git(['pull', '--rebase', '--autostash', '-q']); git(['push', '-q']); } catch (e2) { console.error('push failed (committed locally): ' + e2.message); process.exit(1); } }
  console.log(`attention refreshed (${today}): ${attention.blockedCards.length} blocked, ${attention.pendingRetros.count} retros, ${attention.openAuditPRs.length} audit PR(s)`);
}

module.exports = { parseArgs, todayISO, daysBetween, computeBlockedCards, computePendingRetros, computePluginUpdate, mapAuditPRs, buildAttention };
if (require.main === module) main();
