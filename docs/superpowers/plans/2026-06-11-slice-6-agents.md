# Slice 6 — doc-keeper + merge-gate-reviewer agents — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: subagent-driven-development or executing-plans. Steps use `- [ ]`.

**Goal:** Add the two remaining reusable agents to the plugin — `doc-keeper` (author + audit) and `merge-gate-reviewer` (Fable, fixed rubric) — and update the `dev-orchestrator` skill so stages 4½ / 7 / 9½ reference the real agents instead of the inline fallbacks.

**Architecture:** Two agent definitions in `plugins/dev-command-center/agents/`. `merge-gate-reviewer` bakes `model: fable` + the §6.2b rubric into its frontmatter/body (read-only). `doc-keeper` runs two modes via the dispatch prompt — author (writes the project's doc set) and audit (diffs impl vs docs, proposes patches). Plugin → v0.4.0.

**Spec:** §4 (doc discipline), §6.2 (doc-keeper), §6.2b (merge-gate-reviewer), §3.5 (delegation).

---

## Task 1: Author the agents + bump version + rewire the skill

- [ ] **Step 1:** Create `plugins/dev-command-center/agents/doc-keeper.md` — two modes (author/audit), doc set
  (architecture / adr / features-and-flows / business-logic), tools incl. Write/Edit (author writes files).
- [ ] **Step 2:** Create `plugins/dev-command-center/agents/merge-gate-reviewer.md` — `model: fable`,
  read-only, the fixed rubric (cross-task seams · spec-rule citation · regression risk · gate compliance),
  refute-biased, tiny tagged-findings output.
- [ ] **Step 3:** In `SKILL.md`, replace the three "Slice 6; until then …" fallbacks at stages 4½ / 7 / 9½
  with direct delegation to `doc-keeper` (author) / `merge-gate-reviewer` / `doc-keeper` (audit).
- [ ] **Step 4:** Bump `plugin.json` 0.3.0 → 0.4.0 + the marketplace entry.
- [ ] **Step 5:** Validate frontmatter (`name:`/`description:` on each agent; `model: fable` on the reviewer)
  + `jq empty` manifests. Commit.

---

## Task 2: Smoke + reconcile

- [ ] **Step 1:** Smoke-validate `doc-keeper` (audit mode) by dispatching it against the dev-command-center
  repo (impl vs spec) — short drift report. Confirms the new agent runs and produces actionable output.
  (`merge-gate-reviewer` is the named version of the Slice-5 inline Fable review, already proven.)
- [ ] **Step 2:** PR + merge + pull main.
- [ ] **Step 3:** Retro `docs/retros/dev-command-center-slice-6-retro.md`. Commit + push. Note
  `/plugin marketplace update` now serves all four agents (v0.4.0).

---

## Self-Review
- **Spec coverage:** §6.2 doc-keeper (author+audit, deployment) · §6.2b merge-gate-reviewer (Fable, rubric) ·
  §3.5 delegation now points at the real agents. ✓
- **Placeholders:** agent bodies authored in the build; skill fallbacks removed. ✓
- **Risks:** (1) agents are definitions, not unit-testable — verify via frontmatter + the doc-keeper smoke +
  the proven merge-gate pattern. (2) Rigor dial = LIGHT (definitional, low blast radius) — no separate Fable
  review of this slice. (3) doc-keeper author mode writes files — scope it to the project's `docs/` only.
