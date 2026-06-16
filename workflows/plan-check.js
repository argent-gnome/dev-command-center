export const meta = {
  name: 'plan-check',
  description: 'Stage-4¼ pre-build review of the implementation plan. N Opus lenses critique the freshly-written plan against the EXISTING app + the spec; each must-fix is then refute-verified so the block-list is trustworthy. Returns recommended plan revisions + must-fix-before-build flags. Soft checkpoint — catches design flaws while they are still a doc edit, the cheapest place to catch them.',
  phases: [
    { title: 'Review', detail: 'one Opus lens per plan-review dimension, in parallel' },
    { title: 'Verify', detail: 'refute each must-fix so a false flag does not spiral the plan' },
  ],
}

// args (passed by the orchestrator at stage 4¼): { project, repoPath, planPath, specGlobs, stack, sliceId }
// Defensive parse: args can arrive JSON-stringified (same class of bug fixed in merge-gate-panel.js c97ea90).
const a = (typeof args === 'string' ? JSON.parse(args) : args) || {}
const repo = a.repoPath || '.'

const FINDINGS_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['findings'],
  properties: { findings: { type: 'array', items: {
    type: 'object', additionalProperties: false, required: ['severity', 'title', 'why'],
    properties: {
      severity: { type: 'string', enum: ['critical', 'should-fix', 'nit'] },
      title: { type: 'string' },
      where: { type: 'string' },              // which plan task / section
      why: { type: 'string' },
      recommendedChange: { type: 'string' },
    },
  } } },
}
const VERDICT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['refuted', 'reason'],
  properties: { refuted: { type: 'boolean' }, confidence: { type: 'string', enum: ['high', 'medium', 'low'] }, reason: { type: 'string' } },
}

const LENSES = [
  { key: 'arch-fit', focus: 'Does the plan FIT the existing app — its architecture, layering, conventions, and established patterns? Flag anything that reinvents code/abstractions that already exist, violates a convention, or adds a second way of doing something the app already does one way.' },
  { key: 'spec-coverage', focus: 'Does the plan cover EVERY acceptance criterion / rule in the spec for this slice? Flag missing tasks, partial coverage, and whether the "NOT this slice" scope guards are correct (neither over- nor under-scoped).' },
  { key: 'risk-sequencing', focus: 'Task ordering and risk. Will the build/test target compile at every task boundary (a shared-type signature change must update its call sites in the SAME task; merge compile-coupled tasks)? Any destructive migration / data-loss risk (SwiftData @Model / SQL — must be exercised against a populated store)? Any irreversible or outward-facing step that needs a gate?' },
  { key: 'testability', focus: 'Does the plan call for a DISCRIMINATING test per spec rule — at least one input where the intended behavior and the nearest plausible-wrong implementation DISAGREE (non-monotone / boundary / divergent)? A plan that only plans happy-path tests has a built-in coverage gap.' },
  { key: 'simpler-path', focus: 'Is there a materially SIMPLER approach that meets the same intent with less code/abstraction? Flag premature abstraction, speculative generality, and over-engineering IN THE PLAN. Bias toward "do the simplest thing that works"; do NOT invent new requirements or future-proofing.' },
]

phase('Review')
const reviews = (await parallel(LENSES.map(L => () =>
  agent(
    `You are reviewing an IMPLEMENTATION PLAN before any code is written, through the **${L.key}** lens, for slice "${a.sliceId || '?'}" of "${a.project || '?'}".\n\n` +
    `Read the plan at "${a.planPath || '(newest under docs/superpowers/plans/)'}", the spec (${a.specGlobs || 'docs/superpowers/specs/'}), and enough of the EXISTING app under "${repo}" to judge fit. Confine all reading to "${repo}" and its docs — the workspace holds OTHER repos; never read or critique them.\n\n` +
    `Critique ONLY this dimension:\n${L.focus}\n\n` +
    (a.stack ? `Stack: ${a.stack}. ` : '') +
    `For iOS, apply the swiftui-pro / swiftdata-pro / swift-concurrency-pro best-practice guidance where relevant.\n\n` +
    `Return findings. severity: critical = the plan should be REVISED before building (wrong approach, contradicts spec, unsafe migration, reinvents existing, missing a required task); should-fix = worth folding in; nit = minor. Give a concrete recommendedChange and the plan location (where). If the plan is sound on this dimension, return an empty findings array.`,
    { label: `plan:${L.key}`, phase: 'Review', schema: FINDINGS_SCHEMA }
  ).then(r => ({ lens: L.key, findings: (r && r.findings) || [] }))
))).filter(Boolean)

const all = reviews.flatMap(r => r.findings.map((f, i) => ({ ...f, lens: r.lens, id: `${r.lens}-${i}` })))
const criticals = all.filter(f => f.severity === 'critical')

phase('Verify')
// Refute each critical so the must-fix-before-build list is trustworthy — a false flag would spiral the plan.
const verified = (await parallel(criticals.map(c => () =>
  agent(
    `Adversarially REFUTE this plan-review must-fix. Default to refuted=true unless you are convinced the plan genuinely must change BEFORE building.\n\n` +
    `Lens: ${c.lens}\nTitle: ${c.title}\nWhere in plan: ${c.where || '?'}\nClaim: ${c.why}\nRecommended change: ${c.recommendedChange || '?'}\n\n` +
    `Check against the plan ("${a.planPath || ''}"), the spec, and the app under "${repo}". Is it a real pre-build must-fix, or is it advisory / a false positive?`,
    { label: `verify:${c.id}`, phase: 'Verify', schema: VERDICT_SCHEMA }
  ).then(v => ({ ...c, refuted: v ? !!v.refuted : true }))
))).filter(Boolean)

const mustFix = verified.filter(c => !c.refuted);
const downgraded = verified.filter(c => c.refuted).map(c => ({ ...c, severity: 'should-fix' }));
const advisory = all.filter(f => f.severity !== 'critical').concat(downgraded);
const verdict = mustFix.length ? 'REVISE' : 'PROCEED';

log(`plan-check → ${verdict}: ${mustFix.length} must-fix-before-build, ${advisory.length} advisory, across ${LENSES.length} lenses`);

return {
  verdict,
  mustFix: mustFix.map(c => ({ lens: c.lens, title: c.title, where: c.where, why: c.why, recommendedChange: c.recommendedChange })),
  advisory: advisory.map(c => ({ lens: c.lens, severity: c.severity, title: c.title, recommendedChange: c.recommendedChange })),
  lenses: LENSES.map(l => l.key),
};
