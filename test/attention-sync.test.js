const assert = require('assert');
const {
  computeBlockedCards, computePendingRetros, computePluginUpdate,
  mapAuditPRs, buildAttention, daysBetween, parseArgs
} = require('../attention-sync.js');

// daysBetween
assert.equal(daysBetween('2026-06-01', '2026-06-12'), 11);
assert.equal(daysBetween('2026-06-12', '2026-06-12'), 0);
assert.equal(daysBetween('bogus', '2026-06-12'), 0, 'unparseable → 0, never NaN/throw');

// blockedCards — across boards, skips unblocked, formats display·title — reason
const boards = [
  { project: 'p', displayName: 'Proj', cards: [
    { id: 'p__s1', title: 'S1', blockedOn: null },
    { id: 'p__s2', title: 'S2', blockedOn: 'needs auth slice' }
  ] },
  { project: 'q', cards: [{ id: 'q__s1', title: 'Q1', blockedOn: 'CI red' }] }
];
assert.deepEqual(computeBlockedCards(boards),
  ['Proj · S2 — needs auth slice', 'q · Q1 — CI red']);
assert.deepEqual(computeBlockedCards([]), []);

// pendingRetros — count, oldest + oldestDays, watermark filter
const r = computePendingRetros(['2026-05-01', '2026-06-10', '2026-04-20'], null, '2026-06-12');
assert.equal(r.count, 3);
assert.equal(r.oldest, '2026-04-20');
assert.equal(r.oldestDays, 53);
const r2 = computePendingRetros(['2026-05-01', '2026-06-10', '2026-04-20'], '2026-05-15', '2026-06-12');
assert.equal(r2.count, 1, 'only retros after the watermark');
assert.equal(r2.oldest, '2026-06-10');
// datetime-precision watermark (the real seam): same-day distinct commits are distinguishable;
// a retro committed exactly at the watermark is already-audited → excluded, strictly-newer → kept.
const dt = computePendingRetros(['2026-06-12T09:00:00Z', '2026-06-12T15:00:00Z'], '2026-06-12T09:00:00Z', '2026-06-12');
assert.equal(dt.count, 1, 'same-day: only strictly-newer datetime counts (no permanent drop)');
assert.equal(dt.oldest, '2026-06-12T15:00:00Z');

// pluginUpdate — only when installed LAGS latest (not merely differs)
assert.equal(computePluginUpdate(null, '0.6.0'), null, 'no installed → null');
assert.equal(computePluginUpdate('0.6.0', '0.6.0'), null, 'same → null');
assert.equal(computePluginUpdate('0.7.0', '0.6.0'), null, 'installed ahead of a stale local clone → null');
assert.deepEqual(computePluginUpdate('0.5.0', '0.6.0'), { from: '0.5.0', to: '0.6.0' });
assert.deepEqual(computePluginUpdate('0.9.0', '0.10.0'), { from: '0.9.0', to: '0.10.0' }, 'numeric, not lexical');

// mapAuditPRs — ageDays from createdAt
const prs = mapAuditPRs([{ number: 7, title: 'process: x', url: '#', createdAt: '2026-05-12T10:00:00Z' }], '2026-06-12');
assert.equal(prs[0].ageDays, 31);
assert.equal(prs[0].number, 7);
assert.deepEqual(mapAuditPRs([], '2026-06-12'), []);

// buildAttention — sets owned fields, PRESERVES docDriftPatches (doc-keeper's)
const prev = { docDriftPatches: ['stale architecture.md'], blockedCards: ['old'] };
const att = buildAttention(prev, {
  today: '2026-06-12', openAuditPRs: prs, pendingRetros: r, pluginUpdate: null,
  blockedCards: computeBlockedCards(boards)
});
assert.equal(att.refreshedAt, '2026-06-12');
assert.deepEqual(att.docDriftPatches, ['stale architecture.md'], 'preserves unowned field');
assert.deepEqual(att.blockedCards, ['Proj · S2 — needs auth slice', 'q · Q1 — CI red'], 'overwrites owned field');
assert.equal(att.pluginUpdate, null);
// fresh state (no prev) → docDriftPatches defaults to []
assert.deepEqual(buildAttention(null, { today: 't', pendingRetros: r }).docDriftPatches, []);

// parseArgs
const pa = parseArgs(['--installed', '0.5.0', '--dry-run', '--since', '2026-05-01']);
assert.equal(pa.installed, '0.5.0');
assert.equal(pa.dryRun, true);
assert.equal(pa.since, '2026-05-01');

console.log('PASS attention-sync');
