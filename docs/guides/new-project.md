# Onboarding a New Project

To add a fourth (or fifth) project to the tracker.

## 1. Register it in `projects.config.json`
Add an entry under `projects`:
```json
"my-project": {
  "displayName": "My Project",
  "repoPath": "/Users/jake-edwards/projects/my-project",
  "stack": "ios",                 // ios | web
  "topology": "single-session"    // single-session (live iOS) | multi-session (web monorepo)
}
```
The board and `build-board.js` read this list automatically — the new lane appears once it has a data file.

## 2a. Existing (in-progress) project → onboard
Run the conductor's onboard mode:
```
/dev-orchestrator onboard
```
The `project-state-scanner` agent reads the repo (git log / branches / PRs) + the project's memory, infers
the current cards, writes `data/my-project.json`, and pushes. Re-run any time to reconcile after
out-of-session changes.

## 2b. Brand-new project → init
Follow the Project Init path (spec §3.1):
1. `git init` in the projects dir.
2. Scaffold a `docs/` skeleton (architecture / ADRs / features-and-flows / business-logic).
3. Stand up CI (GitHub Actions) with the stack's gate set — **ios:** `swift test` · SwiftLint · `xcodebuild`
   build · XCUITest; **web:** unit tests · typecheck · lint · build.
4. Register it (step 1) and add an empty data file:
   `{ "project": "my-project", "displayName": "...", "cards": [] }`.

## 3. Run slices as normal
`/dev-orchestrator` in the project repo drives the loop and keeps the lane updated.
