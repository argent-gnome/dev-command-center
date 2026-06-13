const assert = require('assert');
const { renderBoard, mergeProjects, COLUMNS, representativeCard, laneTouched, doneChipHtml } = require('../board.render.js');

const projects = [
  { project: 'p1', displayName: 'Proj One', cards: [
    { id: 'p1__s1', title: 'Slice 1', column: 'build', phase: '5 · build',
      nextAction: 'do thing', blockedOn: null, branch: 'b', lastTouched: '2026-06-11', links: {} },
    { id: 'p1__s2', title: 'Slice 2', column: 'spec', phase: '2 · spec',
      nextAction: 'approve', blockedOn: 'CI red', branch: 'b2', lastTouched: '2026-06-10', links: {} }
  ] },
  { project: 'p2', displayName: 'Proj Two', cards: [
    { id: 'p2__s1', title: 'Slice 1', column: 'done', phase: 'merged',
      nextAction: '-', blockedOn: null, branch: null, lastTouched: '2026-06-09', links: {} }
  ] }
];

// --- collapsible-lane strip logic (Slice 9) ---
assert.equal(laneTouched(projects[0].cards), '2026-06-11', 'lane touched = newest card');
assert.equal(laneTouched([]), '');
assert.equal(representativeCard(projects[0].cards).column, 'build', 'rep = right-most non-done (build > spec)');
assert.equal(representativeCard(projects[1].cards).column, 'done', 'all-done lane → a done card represents it');
assert.equal(representativeCard([]), null);
// divergent cases (the frontier rule, matching the approved mock)
const cz = (col, t) => ({ id: 'x', title: 'Slice 9', column: col, lastTouched: t });
assert.equal(representativeCard([cz('backlog', '1'), cz('done', '2')]).column, 'done', 'no frontier: done beats backlog (mock HIMS case)');
assert.equal(representativeCard([cz('backlog', '1')]).column, 'backlog', 'backlog-only → backlog');
assert.equal(representativeCard([cz('spec', '1'), cz('live', '2'), cz('done', '3')]).column, 'live', 'frontier (live) beats done');
const attention = { refreshedAt: '2026-06-11', openAuditPRs: [{ number: 14, title: 'x', url: '#', ageDays: 41 }],
  pendingRetros: { count: 2, sinceAudit: '2026-04-20T12:00:00Z', oldestDays: 52, dir: 'docs/retros/' }, pluginUpdate: null,
  docDriftPatches: [], blockedCards: [] };

const html = renderBoard(projects, attention);
assert.ok(html.includes('Proj One'), 'shows project displayName');
assert.ok(html.includes('Slice 1') && html.includes('Slice 2'), 'shows both cards');
assert.ok(COLUMNS.length === 6, 'six columns');
assert.ok(html.includes('do thing'), 'shows nextAction');
assert.ok(html.includes('CI red'), 'shows blockedOn text');

// collapsible structure
assert.ok(html.includes('<details class="lane" data-lane="p1" data-touched="2026-06-11"'), 'lane is a <details> with data-touched');
assert.ok(!/<details[^>]*\sopen/.test(html), 'lanes render COLLAPSED by default — recency opens them client-side');
assert.ok(html.includes('Slice 1 · Build'), 'strip chip = right-most non-done card + its column');
assert.equal((html.match(/class="pip /g) || []).length, 12, 'six pips per lane (2 lanes)');
assert.equal((html.match(/class="blk-badge"/g) || []).length, 2, 'every lane reserves a blocked slot (alignment)');
assert.ok(html.includes('⛔ 1'), 'blocked count shown when present');
assert.ok(html.includes('>06-11<'), 'last-touched shown as MM-DD');
assert.ok(html.includes('41') && html.includes('Needs Attention'), 'attention pane with age');
assert.ok(html.includes('oldest 52d'), 'renders the oldest-retro age (spec §5.5)');
assert.ok(html.includes('since 2026-04-20') && !html.includes('2026-04-20T'), 'sinceAudit shown as date, not raw datetime');

// XSS escaping check
const evil = [{ project: 'x', displayName: '<script>alert(1)</script>', cards: [] }];
const safe = renderBoard(evil, null);
assert.ok(!safe.includes('<script>alert(1)</script>'), 'escapes user text');
assert.ok(safe.includes('&lt;script&gt;'), 'escaped form present');

// --- done column collapses to a chip (Slice 10, variant B) ---
const dproj = [{ project: 'd1', displayName: 'Done Heavy', cards: [
  { id: 'd__1', title: 'Slice 1', column: 'done', lastTouched: '2026-06-01' },
  { id: 'd__2', title: 'Slice 2', column: 'done', lastTouched: '2026-06-03' },
  { id: 'd__3', title: 'Slice 3', column: 'done', lastTouched: '2026-06-05' },
  { id: 'd__4', title: 'Slice 4', column: 'done', lastTouched: '2026-06-07' },
  { id: 'd__5', title: 'Slice 5', column: 'done', lastTouched: '2026-06-09' },
  { id: 'd__6', title: 'Slice 6', column: 'build', phase: '5 · build', nextAction: 'go', blockedOn: null, lastTouched: '2026-06-10' }
] }];
const dhtml = renderBoard(dproj, null);
assert.ok(dhtml.includes('done-collapsed'), 'done collapses to a chip');
assert.ok(dhtml.includes('✓ 5 shipped'), 'chip shows the shipped count');
assert.ok(dhtml.includes('latest Slice 5'), 'chip names the newest-shipped slice');
assert.ok(!/<details class="done-collapsed"[^>]*\sopen/.test(dhtml), 'done chip starts collapsed');
assert.equal((dhtml.match(/class="done-row"/g) || []).length, 5, '5 shipped → 5 compact rows (3 visible + 2 under "earlier")');
assert.ok(dhtml.includes('+2 earlier'), 'older shipped go behind a "+N earlier" expander');
assert.equal((dhtml.match(/class="card"/g) || []).length, 1, 'only the active build card is a full card — done is not');
assert.ok(dhtml.indexOf('Slice 5') < dhtml.indexOf('Slice 1'), 'done rows newest-shipped-first');
assert.equal(doneChipHtml([]), '', 'no done cards → no chip');

console.log('PASS board.render');
