# Finding-retro — `onboard` overwrites a populated board file (data-loss) + merge-gate panel scope-escape

**Type:** cross-project finding (not a hub slice). **Surfaced:** 2026-06-15, by the **maintenance-mode Slice-1 merge-gate panel** (`workflows/merge-gate-panel.js`, data-safety lens, 3/3 refuters on finding #1). **For:** the `sdlc-auditor` / next dev-command-center session. **Severity:** 1 critical (data-loss) + 1 process observation.

---

## Finding 1 (CRITICAL, data-safety) — `onboard` overwrites a populated `data/<key>.json` instead of upserting by id

**Where:** `skills/dev-orchestrator/SKILL.md` — the `onboard` procedure; interacts with `agents/project-state-scanner.md` and the `data/<key>.json` board files.

**Current behavior:** onboard says — *"dispatch the `project-state-scanner` agent → take the returned JSON cards → write `data/<key>.json` (bulk seed), then commit + push the hub."* There is **no read-merge-by-id step**; the whole file is replaced.

**The bug:** `project-state-scanner` is explicitly capped at **1–3 cards** (active slice + a couple relevant backlog/live items — `project-state-scanner.md` ~line 37). The skill/spec also makes `onboard` **re-runnable** to "reconcile drift from out-of-session changes." So re-running onboard against an **already-populated** board overwrites the full multi-card slice history with ≤3 cards, then **commits + pushes to GitHub Pages** — irreversible against the live board.

**Repro:** an 11-card `hims.json` re-onboarded → 1 card; slices 1–10 lost. Data files already hold 2+ cards each and grow per slice → spanish-coach / apex / hims / maintenance-mode all at risk if onboard is re-run on a populated board.

**Why latent:** onboard is normally used to seed an **empty** board (fresh-seed is fine). The loss only triggers on a **re-run against a populated file** — which the spec explicitly invites.

**Recommended fix:** onboard must **read** the existing `data/<key>.json` and **upsert the scanner's cards by `id`** — never replace. Reuse the exact read-merge-by-id (`upsertCard`) logic `board-update.js` already implements correctly; cards the scanner doesn't re-emit must be **preserved** (or only updated/closed, never silently dropped). Cleanest: have onboard call `board-update.js` per card, or factor board-update's merge into a shared helper both use. (Bonus, separate nit the same lens raised: `build-board.js` `readFileSync` crashes if a registered project's data file is missing — guard it.)

---

## Finding 2 (process observation) — merge-gate panel reviewers escape `repoPath` scope

**Where:** `workflows/merge-gate-panel.js` lens-reviewer prompts (`agentType: dev-command-center:merge-gate-reviewer`).

**Observed:** on the maintenance-mode Slice-1 re-gate, the **data-safety lens reviewer wandered out of the slice diff/`repoPath` into the dev-command-center hub repo** (which shares the `/Users/jake-edwards/projects/` workspace) and returned Finding 1 above as the slice's blocking "critical." It is a real bug — but **out of scope for the slice under review**, producing a false NO-GO for that slice that required human adjudication.

**Why it happens:** the lens prompts say "inspect the diff with `git -C "${repo}" diff …`, then read the changed files and the spec under `${repo}`," but nothing **forbids** reading outside `${repo}`, and the reviewer agents have filesystem access to the whole workspace.

**Recommended fix:** constrain the panel to its blast radius — e.g. add to each lens prompt: *"Review ONLY files within `${repo}` that appear in this diff; if you notice an issue outside `${repo}`/the diff, do NOT report it as a finding for this slice (note it separately at most)."* Optionally have the workflow pass the explicit changed-file list and instruct reviewers to stay within it. (Net: the escape DID surface a valuable real bug — so the desired behavior is "report out-of-scope issues in a separate bucket," not "suppress them.")

---

## Disposition
- Both are **dev-command-center** issues, not maintenance-mode. The maintenance-mode slice proceeded correctly (its own code was clean; Finding 1 was adjudicated out-of-scope, the in-scope nits were fixed, the slice merged on local verification).
- Suggested: the `sdlc-auditor` opens a gated PR fixing Finding 1 (data-loss — highest priority; affects live boards) and Finding 2 (panel scope guard). Cross-reference: `maintenance-mode/docs/retros/maintenance-mode-slice-1-retro.md` (gate-friction section).
