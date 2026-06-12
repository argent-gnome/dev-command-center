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
  function colIndex(key) { return COLUMNS.findIndex(c => c[0] === key); }
  function fmtMMDD(d) { return d ? String(d).slice(5) : ''; }            // 2026-06-12 -> 06-12
  function shortSlice(title) {
    const s = String(title == null ? '' : title).trim();
    const m = s.match(/^(slice\s+[\w.\-]+)/i);
    if (m) return m[1].replace(/\s+/g, ' ');
    return s.length <= 18 ? s : s.slice(0, 18).replace(/\s+\S*$/, '') + '…'; // cut at a word boundary
  }
  function laneTouched(cards) {
    return (cards || []).reduce((max, c) => (c.lastTouched && c.lastTouched > max ? c.lastTouched : max), '');
  }
  // Strip representative: the right-most card on the active FRONTIER (spec/build/verify/live). If the lane has
  // none there, fall back to the most-advanced of the rest — done over backlog (a lane with only a shipped
  // slice + future backlog chips the shipped one). Tie → most recently touched. Matches the approved mock.
  function representativeCard(cards) {
    const list = (cards || []).slice();
    if (!list.length) return null;
    const FRONTIER = ['spec', 'build', 'verify', 'live'];
    const inflight = list.filter(c => FRONTIER.indexOf(c.column) >= 0);
    const pool = inflight.length ? inflight : list;
    pool.sort((a, b) => (colIndex(b.column) - colIndex(a.column))
      || String(b.lastTouched || '').localeCompare(String(a.lastTouched || '')));
    return pool[0];
  }
  function stripHtml(p) {
    const cards = p.cards || [];
    const rep = representativeCard(cards);
    const repCol = rep ? rep.column : 'backlog';
    const repLabel = (COLUMNS.find(c => c[0] === repCol) || [, ''])[1];
    const chip = rep ? `<span class="chip ${esc(repCol)}">${esc(shortSlice(rep.title))} · ${esc(repLabel)}</span>` : '';
    const pips = COLUMNS.map(([key, label]) => {
      const n = cards.filter(c => c.column === key).length;
      const cls = n ? (['spec', 'verify', 'live', 'done'].indexOf(key) >= 0 ? key : 'has') : '';
      return `<span class="pip ${cls}" title="${esc(label)} ${n}">${n || '·'}</span>`;
    }).join('');
    const nBlocked = cards.filter(c => c.blockedOn).length;
    const blk = nBlocked ? `⛔ ${nBlocked}` : '';
    return `<span class="caret">▶</span>`
      + `<span class="lane-name">${esc(p.displayName || p.project)}</span>`
      + chip
      + `<span class="spacer"></span>`
      + `<span class="pips">${pips}</span>`
      + `<span class="blk-badge"${nBlocked ? ` title="${nBlocked} blocked"` : ''}>${blk}</span>`
      + `<span class="touched">${esc(fmtMMDD(laneTouched(cards)))}</span>`;
  }
  function laneHtml(p) {
    const cols = COLUMNS.map(([key, label]) => {
      const cards = (p.cards || []).filter(c => c.column === key).map(cardHtml).join('');
      return `<div class="col" data-col="${key}"><div class="col-h">${label}</div>${cards}</div>`;
    }).join('');
    // No `open` attribute → lanes render collapsed by default; recency (board.html) opens recent ones.
    return `<details class="lane" data-lane="${esc(p.project)}" data-touched="${esc(laneTouched(p.cards))}">
      <summary>${stripHtml(p)}</summary>
      <div class="cols">${cols}</div>
    </details>`;
  }
  function attentionHtml(a) {
    if (!a) return '';
    const items = [];
    (a.openAuditPRs || []).forEach(pr => items.push(
      `<li class="${pr.ageDays > 30 ? 'stale' : ''}">Audit PR #${esc(pr.number)} — ${esc(pr.title)} <span class="age">${esc(pr.ageDays)}d</span></li>`));
    if (a.pendingRetros && a.pendingRetros.count) {
      const pr = a.pendingRetros;
      const since = pr.sinceAudit ? ` (since ${esc(String(pr.sinceAudit).slice(0, 10))})` : '';
      const age = pr.oldestDays != null ? `, oldest ${esc(pr.oldestDays)}d` : '';
      items.push(`<li class="${pr.oldestDays > 30 ? 'stale' : ''}">${esc(pr.count)} retro(s) awaiting audit${since}${age}</li>`);
    }
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
  return { renderBoard, mergeProjects, COLUMNS, esc, representativeCard, laneTouched };
});
