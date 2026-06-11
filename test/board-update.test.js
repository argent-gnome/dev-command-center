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
const a = parseArgs(['--project', 'spanish-coach', '--slice', 'x', '--unblock', '--dry-run']);
assert.equal(a.project, 'spanish-coach'); assert.equal(a.unblock, true); assert.equal(a.dryRun, true);
console.log('PASS board-update');
