export const meta = {
  name: 'merge-gate-panel',
  description: 'The opus-profile stage-7 merge-gate: N refute-biased Opus lens reviewers → independent multi-refuter verification → GO/NO-GO. Replaces the single-Fable reviewer with independence-of-PERSPECTIVE (diverse lenses) standing in for the lost independence-of-ARCHITECTURE.',
  phases: [
    { title: 'Review', detail: 'one refute-biased Opus reviewer per rubric lens, in parallel' },
    { title: 'Verify', detail: 'three independent Opus refuters per critical/should-fix finding; majority-refute kills it' },
  ],
}

// args (passed by the orchestrator at stage 7):
//   { project, repoPath, baseRef='main', headRef='HEAD', sliceId, specGlobs, stack, highStakes, notes }
const a = args || {}
const repo = a.repoPath || '.'
const base = a.baseRef || 'main'
const head = a.headRef || 'HEAD'
const diffCmd = `git -C "${repo}" diff ${base}...${head}`

const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'title', 'rationale'],
        properties: {
          severity: { type: 'string', enum: ['critical', 'should-fix', 'nit'] },
          title: { type: 'string' },
          file: { type: 'string' },
          line: { type: 'integer' },
          rationale: { type: 'string' },
          evidence: { type: 'string' },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['refuted', 'reason'],
  properties: {
    refuted: { type: 'boolean' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    reason: { type: 'string' },
  },
}

// Each lens is one rubric dimension. Splitting the rubric across independent agents is what buys
// independence-of-perspective: four reviewers that cannot see each other's blind spots.
const LENSES = [
  { key: 'correctness', focus: 'Logic & algorithm correctness. Wrong results, broken invariants, off-by-one, state that diverges across the slice. Demand a DISCRIMINATING test for each spec rule — at least one input where the intended behavior and the nearest plausible-wrong implementation DISAGREE (non-monotone / boundary / divergent cases). A suite that only exercises inputs where right==wrong is a coverage gap, not coverage.' },
  { key: 'data-safety', focus: 'Regression & data safety. Destructive migrations or schema changes (SwiftData @Model / SQL), data loss against a POPULATED store, silently-destructive casts. A fresh CI DB or fresh install passing is NOT proof against a populated store; a @Model/schema change must be exercised against a previous-schema store.' },
  { key: 'spec-compliance', focus: 'Spec-rule compliance. Every change should cite the spec rule it satisfies; flag drift from the approved spec/mockup. High-stakes rules flagged in the spec are never down-rated (rigor floor).' },
  { key: 'cross-seam', focus: 'Cross-task seams & gate compliance. Integration points BETWEEN the slice\'s tasks that no single-task review could see; stack-gate compliance — lint clean, the app-target tests actually RUN in CI (not merely build), the xcodebuild destination simulator exists.' },
]

phase('Review')
const reviews = (await parallel(LENSES.map(L => () =>
  agent(
    `You are the merge-gate's **${L.key}** lens for slice "${a.sliceId || '?'}" of project "${a.project || '?'}".\n\n` +
    `Review the completed slice ONLY through this lens, and be REFUTE-BIASED — assume a critical is hiding and hunt for it:\n${L.focus}\n\n` +
    `Inspect the diff with \`${diffCmd}\` (run it), then read the changed files and the spec under "${repo}".\n` +
    (a.specGlobs ? `Spec / source-of-truth: ${a.specGlobs}.\n` : '') +
    (a.stack ? `Stack: ${a.stack}.\n` : '') +
    (a.highStakes ? `HIGH-STAKES slice (${a.highStakes}) — the rigor floor applies; do NOT down-rate findings.\n` : '') +
    (a.notes ? `Context: ${a.notes}\n` : '') +
    `\nReturn findings for THIS lens only. Severity: critical = must BLOCK the merge; should-fix = real but non-blocking; nit = cosmetic. If the lens is clean, return an empty findings array.`,
    { label: `lens:${L.key}`, phase: 'Review', agentType: 'dev-command-center:merge-gate-reviewer', schema: FINDINGS_SCHEMA }
  ).then(r => ({ lens: L.key, findings: (r && r.findings) || [] }))
))).filter(Boolean)

// Only critical/should-fix go to verification; nits are reported but never block.
const candidates = reviews.flatMap(r =>
  r.findings
    .filter(f => f.severity === 'critical' || f.severity === 'should-fix')
    .map((f, i) => ({ ...f, lens: r.lens, id: `${r.lens}-${i}` })))

phase('Verify')
// Three independent refuters per candidate; a candidate survives only if a MAJORITY did not refute it.
const verified = (await parallel(candidates.map(c => () =>
  parallel([0, 1, 2].map(k => () =>
    agent(
      `Adversarially REFUTE this merge-gate finding. Default to refuted=true unless you become convinced it is a real, correctly-severity-rated issue.\n\n` +
      `Lens: ${c.lens}\nSeverity claimed: ${c.severity}\nTitle: ${c.title}\nLocation: ${c.file || '?'}${c.line ? ':' + c.line : ''}\nClaim: ${c.rationale}\nEvidence cited: ${c.evidence || '(none)'}\n\n` +
      `Independently verify against the actual diff (\`${diffCmd}\`) and code under "${repo}". Is it real and correctly rated, or a false positive / over-rated?`,
      { label: `refute:${c.id}#${k}`, phase: 'Verify', agentType: 'dev-command-center:merge-gate-reviewer', schema: VERDICT_SCHEMA }
    )
  )).then(votes => {
    const v = votes.filter(Boolean)
    const refutes = v.filter(x => x.refuted).length
    // refuted if a majority of the refuters (>=2 of 3) reject it, OR all refuters errored (no signal → fail closed to NOT-confirmed)
    return { ...c, refuted: v.length === 0 ? true : refutes >= 2, votes: v.length }
  })
))).filter(Boolean)

const confirmed = verified.filter(c => !c.refuted)
const criticals = confirmed.filter(c => c.severity === 'critical')
const shouldFixes = confirmed.filter(c => c.severity === 'should-fix')
const verdict = criticals.length === 0 ? 'GO' : 'NO-GO'

log(`merge-gate panel → ${verdict}: ${criticals.length} confirmed critical(s), ${shouldFixes.length} should-fix, from ${candidates.length} candidate(s) across ${LENSES.length} lenses`)

return {
  verdict,
  criticals: criticals.map(c => ({ lens: c.lens, title: c.title, file: c.file, rationale: c.rationale, refuters: c.votes })),
  shouldFixes: shouldFixes.map(c => ({ lens: c.lens, title: c.title, file: c.file })),
  nits: reviews.flatMap(r => r.findings.filter(f => f.severity === 'nit').map(f => ({ lens: r.lens, title: f.title }))),
  panel: { lenses: LENSES.map(l => l.key), candidates: candidates.length, refutersPerFinding: 3 },
}
