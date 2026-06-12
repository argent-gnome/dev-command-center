# Slice 8 — Self-improvement loop + bounded autonomy

**Goal:** close the SDLC's feedback + unattended-run gaps. Three deliverables, one slice (final planned slice).
**Model routing:** Opus for the script + SKILL edits (implementation); the `sdlc-auditor` agent itself runs on **Fable** (judgment-dense synthesis, tiny output); the reserved **Fable merge-gate** reviews the slice.

## Deliverables

### 1. `attention-sync.js` (deterministic — deferred since Slice 3)
Refresh `data/attention.json` (the Needs-Attention pane, spec §5.5) from real state — *aggregation, not judgment*. Mirror `board-update.js`: pure functions (exported + unit-tested) + a thin IO/git wrapper.
- **Owns** these fields: `refreshedAt`, `openAuditPRs` (from `gh pr list`, label `sdlc-audit`, with `ageDays`), `pendingRetros` ({count, sinceAudit, oldest} over hub + each project's `docs/retros/`), `blockedCards` (scan every `data/<key>.json` for `blockedOn`), `pluginUpdate` (only when `--installed <ver>` is passed vs marketplace `latest`).
- **Preserves** fields it doesn't own (`docDriftPatches`, set by doc-keeper).
- Output shape must match `board.render.js#attentionHtml` exactly. Commit + push like board-update (`--dry-run`/`--no-push` escape hatches).
- Tests: `test/attention-sync.test.js` (assert-based, `PASS` line) covering each pure function + the merge/preserve behavior.

### 2. `agents/sdlc-auditor.md` (reusable agent, model: Fable — spec §6.2c / §3.6)
Ingests accumulated retros (hub + project repos, since the `sinceAudit` watermark) and audits the **process itself**. Opens a **gated PR** with proposed conductor/agent/flow edits + per-finding rationale — **never commits to main, never self-merges**. Every proposal must quote the retro line(s) that justify it (mirror merge-gate's citation discipline). Bias to recurring friction (≥2 slices/projects) over one-offs. Tools: Read/Grep/Glob/Bash + Write/Edit (drafts the change on a branch `sdlc-audit/<date>`); writes confined to the hub repo. Periodic/on-demand (not per slice); may escalate to a Workflow on many retros (ultracode opt-in).

### 3. Bounded autonomous / supervised-remote mode (SKILL.md)
A `run --autonomous --max-slices N` layer over the existing loop. Does **not** change the loop, stack gates, merge-gate, or verification doctrine — only *who clears soft gates*.
- **HARD gates (always stop + PushNotification, even autonomous):** the existing "never cross silently" list — spec review · mockup sign-off · live/device validation · CI red · **plan deviation / ambiguity** · any irreversible/outward-facing/destructive action. Plan deviation is hard ([[feedback_unattended_session_plan_gate]]).
- **SOFT gates (auto-advance WITH a logged decision):** routine stage transitions, per-task review→fix→re-review, equivalent-option choices with a sensible default, board-update calls.
- **Fail closed:** unsure hard-vs-soft → treat as hard, stop.
- **Self-stop:** max-slices reached · first hard gate · any unrecoverable error → post a summary (advanced / decision log / where halted / what's needed).
- **Decision log:** append every soft auto-advance to `docs/autonomous/<date>-<project>-run.md` ({stage, decision, why, alternatives}) so silent corrections are auditable.
- **Supervised-remote:** PushNotification to phone at each hard gate; setup = remote-control + Claude app + "Push when Claude decides" + `caffeinate -i`.

## Wiring
- SKILL session-start: replace the "attention-sync not built yet" caveat with the real `node <hub>/attention-sync.js` call; add a short **Self-improvement** note (dispatch `sdlc-auditor` every few slices → gated PR).
- `plugin.json` description: drop "(sdlc-auditor next)" — now shipped. Bump **0.5.0 → 0.6.0**.
- `docs/guides/self-improvement.md`: confirm the run-the-auditor steps match the shipped agent.

## Gates
Stack = the hub's own node tests (`test/*.test.js`) — all green. Then the **Fable merge-gate** over the whole slice. Then reconcile: version bump, Slice 8 retro (hub's own), memory, commit + push. Publishing (push + marketplace bump) lands the slice — consistent with prior slices.

## NOT this slice
- CI backstop for doc-keeper audit (deferred opt-in, §6.2 — needs API billing).
- Optional slash commands (`commands/{run,onboard,board}.md`).
- Auto-running the auditor on a schedule (it stays on-demand/gated by design).
