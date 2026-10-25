# uncleDashboard

Read-only Google Apps Script web app over the procurement sheet. Terms: [CONTEXT.md](CONTEXT.md). Decisions: [docs/adr/](docs/adr/).

## Files (`src/`) → Apps Script editor

| Repo file | Editor file |
|---|---|
| `Code.gs` | `Code.gs` |
| `Index.html` | `Index` (HTML) |
| `Styles.html` | `Styles` (HTML) |
| `App.html` | `App` (HTML) |
| `appsscript.json` | Project Settings → tick "Show appsscript.json", then paste |

## Deploy

1. Open the spreadsheet → **Extensions → Apps Script** (the script must be bound to the sheet).
2. Create the files above and paste each one's content.
3. **Deploy → New deployment → Web app**: Execute as *User accessing the web app*, Who has access *Anyone with Google account* (the manifest already says this).
4. Share the sheet (view access) with everyone who should see the dashboard — that is the access control ([ADR 0001](docs/adr/0001-access-via-sheet-sharing.md)).
5. After later edits: **Deploy → Manage deployments → Edit → Version: New version** so the `/exec` URL stays the same.

First visit shows a Google consent screen ("view and manage spreadsheets this app is installed in") — expected.

## Sheet requirements

- All data is in one tab, named in `SHEET_NAME` at the top of `Code.gs` (currently `รวมงบงานประจำปี 70`). If the tab is renamed, update it and deploy a new version.
- The header row (`รหัสรายการ` in column C, `รายการ` in column H) must be within the first 10 rows; data starts on the next row, columns A..AB.
- Each Item Code starts with its 2-digit Fiscal Year (`70SA0010` → 2570); the year dropdown filters on that.

## Sharing links in LINE

Use the **คัดลอกลิงก์** button on a detail page: the link carries `openExternalBrowser=1`, so LINE opens it in Chrome/Safari where Google sign-in works.

## Test

```bash
node --test test/
```

## Local preview (mock data)

```bash
node preview/serve.js
```

Open http://localhost:8080. It serves the real `src/` files with 10 mock Procurement Items and a fake `google.script.*`; edits to `src/` show on reload. Don't copy `preview/` into Apps Script.
