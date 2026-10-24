# One data tab; items addressed by Item Code; Fiscal Year read from the code

Every Fiscal Year's Procurement Items live in one tab, named in `SHEET_NAME` in `Code.gs` (`รวมงบงานประจำปี 70`); the header row is found by looking for `รหัสรายการ` in column C within the first 10 rows. An item is addressed as `?item=<รหัสรายการ>` — never by row number (breaks on insert/sort) or รายการ text (not unique) — and its Fiscal Year is the first two digits of the code (`70SA0010` → 2570), which the page uses as a filter defaulting to the current year.

## Considered Options

- **Detect year tabs automatically** (4-digit year in tab name + header check) — the first version. Rejected: the real spreadsheet has many tabs, so scanning them made every request slow, and the data is not split by year at all.
- **No year concept** — simpler, but summary totals would mix budgets across years.

## Consequences

If an Item Code ever stops starting with its two-digit year, that item only appears under "ทุกปี" and the year filter undercounts.
