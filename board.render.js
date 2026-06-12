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
  return { renderBoard, mergeProjects, COLUMNS, esc };
});
