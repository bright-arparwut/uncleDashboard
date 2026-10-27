## Agent skills

### Issue tracker

Issues live in GitHub Issues (via `gh`); external PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Project notes

- **Stack:** plain Google Apps Script, no build step or clasp. The user copies `src/*` into the Apps Script editor by hand and deploys from `main`; commit and push straight to `main` when asked.
- **Deploy gotcha:** the `/exec` URL serves the last *deployed version*, not saved code. When the user reports the live page "still shows the old behaviour", first check they published **Deploy → Manage deployments → Edit → New version**, and which `src/` files they recopied (`Code.gs` too, if it changed).
- **Tests:** `node --test test/`. They load `src/Code.gs` through `vm`, so keep logic as pure helpers in `Code.gs` (no Apps Script globals) and test them there.
- **Local preview:** `node preview/serve.js` (or the `preview` entry in `.claude/launch.json`) serves the real `src/` files at http://localhost:8080 with 10 mock rows run through the real `toRecord`. `src/` edits show on reload; restart after editing `serve.js`. Mock dates are fixed, so day counts drift with today's date.
- **Sheet columns:** the app reads A..AB, and `FIELDS` in `Code.gs` has one key per column, in order. Changing the range shifts every index, and the tests assert the positions.
- **Sheet header quirk:** the header row holds merged group titles or blank cells over the step columns. Never take step names from sheet labels; use `STEP_NAMES` / `STAGE_NAMES` in `App.html`. Keep the mock `HEADER` in `preview/serve.js` blank in the same places so the preview reproduces it.
- **Stage vs Stuck:** two separate rules (see `CONTEXT.md`). Stage uses 5 columns and drives the donut; Stuck uses the 9-step chain คฉ.→อนุมัติ ซื้อ/จ้าง and drives the step badges and the ค้างเกิน 10 วัน section.
