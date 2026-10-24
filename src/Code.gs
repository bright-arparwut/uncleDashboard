/** @OnlyCurrentDoc */
// Read-only API over the procurement sheet. Terms follow CONTEXT.md.

// The one tab that holds every Fiscal Year's Procurement Items.
const SHEET_NAME = 'รวมงบงานประจำปี 70';

const HEADER_SEARCH_ROWS = 10; // the header row is found within the first rows of the tab
const FIRST_COL = 3; // C
const COL_COUNT = 26; // C..AB
const CODE_HEADER = 'รหัสรายการ';
const NAME_HEADER = 'รายการ';
const BUDDHIST_OFFSET = 543;
const BUDDHIST_CENTURY = 2500; // Item Code "70…" is Fiscal Year 2570
const FISCAL_YEAR_START_MONTH = 10; // October

// One key per column, C..AB in order.
const FIELDS = [
  'code', 'type', 'plan', 'station', 'group', 'name', 'budget', 'status', 'detail',
  'approvedAmount', 'method', 'authority', 'kc',
  'stepPlan', 'stepPublish', 'stepTor', 'stepMedianPrice', 'stepPurchaseReport', 'stepBidOpen',
  'stepApprovalRequest', 'stepApproved', 'stepDisburse', 'stepCommit', 'deliveryDeadline', 'stepLedger',
  'note',
];

function doGet() {
  const page = HtmlService.createTemplateFromFile('Index');
  page.appUrl = ScriptApp.getService().getUrl();
  return page.evaluate()
    .setTitle('ติดตามแผนจัดซื้อจัดจ้าง')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

// ---- API called from the page via google.script.run ----

function getList() {
  const tab = openSheet_();
  const records = readRecords_(tab);
  return {
    labels: tab.labels,
    sheetUrl: sheetUrl_(tab.sheet),
    items: records,
    duplicateCodes: findDuplicateCodes(records),
    currentFiscalYear: currentFiscalYear(new Date()),
  };
}

// Reads only the matching row, not the whole tab.
function getItem(code) {
  const tab = openSheet_();
  const lastRow = tab.sheet.getLastRow();
  if (lastRow < tab.firstDataRow) return null;
  const found = tab.sheet.getRange(tab.firstDataRow, FIRST_COL, lastRow - tab.firstDataRow + 1, 1)
    .createTextFinder(String(code).trim())
    .matchEntireCell(true)
    .findNext();
  if (!found) return null;
  const row = found.getRow();
  const range = tab.sheet.getRange(row, FIRST_COL, 1, COL_COUNT);
  const cells = range.getValues()[0];
  const item = toRecord([range.getDisplayValues()[0][0], ...cells.slice(1)], row, toIsoDate(new Date()));
  return { labels: tab.labels, item, sheetUrl: sheetUrl_(tab.sheet) };
}

// ---- Sheet access ----

function openSheet_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('ไม่พบแท็บ "' + SHEET_NAME + '"');
  const top = sheet.getRange(1, FIRST_COL, HEADER_SEARCH_ROWS, COL_COUNT).getDisplayValues();
  const headerIndex = top.findIndex(isHeaderRow);
  if (headerIndex < 0) {
    throw new Error('ไม่พบหัวตาราง (' + CODE_HEADER + ' ในคอลัมน์ C) ใน ' + HEADER_SEARCH_ROWS + ' แถวแรกของแท็บ "' + SHEET_NAME + '"');
  }
  return { sheet, firstDataRow: headerIndex + 2, labels: labelsFrom(top[headerIndex]) };
}

function sheetUrl_(sheet) {
  return SpreadsheetApp.getActive().getUrl() + '#gid=' + sheet.getSheetId();
}

function readRecords_(tab) {
  const lastRow = tab.sheet.getLastRow();
  if (lastRow < tab.firstDataRow) return [];
  const range = tab.sheet.getRange(tab.firstDataRow, FIRST_COL, lastRow - tab.firstDataRow + 1, COL_COUNT);
  const rows = range.getValues();
  // Item Code as displayed, so a code formatted "001" is not read as 1.
  const codes = range.offset(0, 0, rows.length, 1).getDisplayValues();
  const today = toIsoDate(new Date());
  return rows
    .map((cells, i) => toRecord([codes[i][0], ...cells.slice(1)], tab.firstDataRow + i, today))
    .filter(r => r.code || r.name); // trailing formatted-but-empty rows
}

// ---- Pure helpers (covered by test/code.test.js) ----

function isHeaderRow(header) {
  return String(header[0]).trim() === CODE_HEADER && String(header[5]).trim() === NAME_HEADER;
}

function fiscalYearFromCode(code) {
  const match = String(code).match(/^(\d{2})/);
  return match ? BUDDHIST_CENTURY + Number(match[1]) : null;
}

function currentFiscalYear(date) {
  const nextYear = date.getMonth() + 1 >= FISCAL_YEAR_START_MONTH ? 1 : 0;
  return date.getFullYear() + BUDDHIST_OFFSET + nextYear;
}

function labelsFrom(header) {
  return FIELDS.reduce((labels, key, i) => ({ ...labels, [key]: String(header[i]).trim() }), {});
}

function toIsoDate(date) {
  const year = date.getFullYear() > 2400 ? date.getFullYear() - BUDDHIST_OFFSET : date.getFullYear();
  return year + '-' + pad2_(date.getMonth() + 1) + '-' + pad2_(date.getDate());
}

function pad2_(n) {
  return (n < 10 ? '0' : '') + n;
}

// Text dates like 15/03/2568 or 15/3/68 are read as Buddhist-era years.
function parseTextDate(text) {
  const match = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const rawYear = Number(match[3]);
  const beYear = rawYear < 100 ? rawYear + BUDDHIST_CENTURY : rawYear;
  const year = beYear > 2400 ? beYear - BUDDHIST_OFFSET : beYear;
  const date = new Date(year, month - 1, day);
  if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return toIsoDate(date);
}

// Cells cross google.script.run, which cannot carry Date objects: dates become YYYY-MM-DD.
function toCell(value) {
  if (value === '' || value === null || value === undefined) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : toIsoDate(value);
  if (typeof value === 'number') return value;
  const text = String(value).trim();
  if (text === '') return null;
  return parseTextDate(text) || text;
}

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toRecord(cells, row, todayIso) {
  const record = FIELDS.reduce((r, key, i) => ({ ...r, [key]: toCell(cells[i]) }), { row });
  const code = record.code === null ? '' : String(record.code);
  return {
    ...record,
    code,
    fiscalYear: fiscalYearFromCode(code),
    isApproved: isIsoDate(record.stepApproved),
    isOverdue: isIsoDate(record.deliveryDeadline) && record.deliveryDeadline < todayIso && record.stepLedger === null,
  };
}

function findDuplicateCodes(records) {
  const counts = records.reduce((c, r) => ({ ...c, [r.code]: (c[r.code] || 0) + 1 }), {});
  return Object.keys(counts).filter(code => code && counts[code] > 1);
}
