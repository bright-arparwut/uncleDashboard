# Access follows the sheet's sharing list

The web app is deployed as "Execute as: user accessing" with "Anyone with a Google account", so each viewer reads the sheet with their own permissions and the sheet's sharing list is the only access control — no separate allow-list to maintain. The cost: every viewer must sign in to Google, which Google blocks inside in-app browsers (LINE, Facebook), and viewers see a one-time consent screen.

## Considered Options

- **Execute as owner, anyone with the link** — works inside LINE, but anyone holding the link sees budgets and approval details. Rejected.
- **Execute as owner + email allow-list tab** — a second access list to keep in sync, and still needs sign-in, so still blocked in LINE. Rejected.

## Consequences

The page detects in-app browsers and shows an "เปิดในเบราว์เซอร์" prompt; shared links carry `openExternalBrowser=1` so LINE opens the system browser.
