# dev-command-center Slice 8 Retro — Self-improvement loop + bounded autonomy

**Date:** 2026-06-12 · **Model:** Opus (script + SKILL edits), Fable (the reserved merge-gate). **Plugin 0.5.0 → 0.6.0.** Final planned slice — the build phase of dev-command-center is complete.

## What shipped
1. **`attention-sync.js`** (deferred since Slice 3) — deterministic refresh of `data/attention.json`: blocked cards across all projects, retros awaiting audit (hub + every project repo), open `sdlc-audit` PRs (`gh`, with age badges), and a plugin-version-lag flag. Pure functions + thin IO/git wrapper, mirroring `board-update.js`. Unit-tested (`test/attention-sync.test.js`).
2. **`sdlc-auditor` agent** (Fable) — reads accumulated retros, clusters *recurring* friction, opens a **gated PR** proposing conductor/agent/flow changes with per-finding retro citations. Never commits to main, never self-merges. This automates exactly what the Slice 7 retro did by hand.
3. **Bounded autonomous / supervised-remote mode** in the conductor — a `run --autonomous --max-slices N` layer: hard gates (the "never cross silently" list) always stop + PushNotification; soft gates auto-advance **with a logged decision**; fail-closed; self-stop; decision log to `docs/autonomous/`. Plus a **Self-improvement** section wiring the auditor cadence.
4. Wiring: session-start now calls the real `attention-sync.js`; `self-improvement.md` guide updated; manifests bumped to 0.6.0.

## The merge-gate earned its keep again — REJECT with 2 criticals (its 5th critical)
The reserved Fable merge-gate **rejected** the first cut. Both criticals were real seam bugs that tests + a dry-run had *not* surfaced, and both were cheap to fix:
- **[CRITICAL] Watermark clock mismatch.** `attention-sync` dated retros by file **mtime** (not reproducible across clones; reset on re-clone) and filtered strict `>`; the auditor was told to set the watermark to a retro's "date" it couldn't reproduce. A same-day retro could be dropped from the count *forever* — defeating the pane's whole purpose (§5.5). → Fixed: both sides now read **git committer datetime** (`git log -1 --format=%cI`), stable + sub-day precise; added a same-day strict-`>` test; mtime kept only as an uncommitted-file fallback.
- **[CRITICAL] `sdlc-audit` label didn't exist.** `gh pr create --label` errors on a missing label → the audit-PR→pane wiring was dead on first use, silently. → Fixed: created the label on the repo (`#FBCA04`) + added an idempotent `gh label create --force` to the agent's procedure.

Should-fixes, all addressed: auditor now returns the hub clone to `main` after opening its PR (was stranding the live working copy on the audit branch); the **"oldest retro age"** §5.5 wanted is now rendered (`oldest Nd`, stale >30d) + tested; **commit pathspec** scoped in *both* `attention-sync.js` and `board-update.js` so a session-start refresh can never sweep unrelated staged work into the public repo (data-safety); `computePluginUpdate` now flags only when installed **lags** (numeric semver, not `!==`). Nits (garbled `--installed` prose, push-retry parity) fixed too.

Verification of the fixes: 3/3 node test files green; `gh label list` confirms the label; dry-run shows the git-datetime clock + correct `pluginUpdate` (0.5.0→0.6.0) + the 2 genuinely-blocked cards (APEX device validation, hims auth).

## Decisions / notes
- **Watermark lives in `attention.json`** (per spec) and the auditor sets only `sinceAudit` in its PR; `attention-sync` regenerates the rest deterministically. The merge-gate noted three writers now touch that file (attention-sync on main, auditor on its PR branch, doc-keeper for `docDriftPatches`) — a future cleanup could move the watermark to its own tiny file. Deferred; not blocking.
- Extending the commit-pathspec fix to `board-update.js` was slightly outside the slice surface but is a public-repo data-safety fix the merge-gate flagged — taken now.

## NOT this slice (remaining backlog)
- doc-keeper CI backstop (deferred opt-in, §6.2 — needs API billing); optional slash commands; auto-running the auditor on a schedule (stays on-demand by design); the watermark-own-file cleanup.

## Process note
This closes the planned build (Slices 1–8). The self-improvement loop is now real *and* dogfooded: Slice 7 ran it by hand, Slice 8 automated it — and the merge-gate that the loop relies on rejected Slice 8's own first cut, which is the doctrine working on itself.
