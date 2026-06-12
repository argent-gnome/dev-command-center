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
  pendingRetros: { count: 2, sinceAudit: '2026-04-20T12:00:00Z', oldestDays: 52, dir: 'docs/retros/' }, pluginUpdate: null,
  docDriftPatches: [], blockedCards: [] };

const html = renderBoard(projects, attention);
assert.ok(html.includes('Proj One'), 'shows project displayName');
assert.ok(html.includes('Slice 1') && html.includes('Slice 2'), 'shows both cards');
assert.ok(COLUMNS.length === 6, 'six columns');
assert.ok(html.includes('do thing'), 'shows nextAction');
assert.ok(html.includes('CI red'), 'shows blockedOn text');
assert.ok(html.includes('41') && html.includes('Needs Attention'), 'attention pane with age');
assert.ok(html.includes('oldest 52d'), 'renders the oldest-retro age (spec §5.5)');
assert.ok(html.includes('since 2026-04-20') && !html.includes('2026-04-20T'), 'sinceAudit shown as date, not raw datetime');

// XSS escaping check
const evil = [{ project: 'x', displayName: '<script>alert(1)</script>', cards: [] }];
const safe = renderBoard(evil, null);
assert.ok(!safe.includes('<script>alert(1)</script>'), 'escapes user text');
assert.ok(safe.includes('&lt;script&gt;'), 'escaped form present');

console.log('PASS board.render');
