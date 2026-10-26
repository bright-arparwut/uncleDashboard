// Run: node --test test/
// Loads the pure helpers from src/Code.gs (plain JS) without Apps Script globals.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/Code.gs'), 'utf8');
const gs = vm.runInNewContext(source + `
;({ fiscalYearFromCode, isHeaderRow, currentFiscalYear, parseTextDate, toCell, toRecord, findDuplicateCodes, labelsFrom, FIELDS })`, { Date }); // share Date so instanceof works

const blankRow = () => Array(28).fill('');
const col = letter => gs.FIELDS.indexOf(letter);

test('FIELDS covers columns A..AB', () => {
  assert.strictEqual(gs.FIELDS.length, 28);
  assert.strictEqual(col('unit'), 0); // A
  assert.strictEqual(col('project'), 1); // B
  assert.strictEqual(col('code'), 2); // C
  assert.strictEqual(col('name'), 7); // H
  assert.strictEqual(col('stepApproved'), 22); // W
  assert.strictEqual(col('deliveryDeadline'), 25); // Z
  assert.strictEqual(col('note'), 27); // AB
});

// Columns A..AB of the header row in the real 'รวมงบงานประจำปี 70' tab.
const REAL_HEADER = ['หน่วย', 'กลุ่มงาน/โครงการ', 'รหัสรายการ', 'ประเภทงาน', 'แผนงาน', 'สถาน คฉ.', 'กลุ่มงาน (หัวข้อหลัก-ย่อย)', 'รายการ',
  'วงเงิน', 'สถานะ', 'รายละเอียด (สรุปการดำเนินการ)', 'วงเงินอนุมัติซื้อ/จ้าง', 'วีธีจัดหา', 'อำนาจอนุมัติ', 'คฉ.',
  'แผนจัดหา', 'เผยแพร่แผน', 'TOR', 'ราคากลาง', 'รายงานขอซื้อ', 'วันที่เปิดซอง', 'ขออนุมัติ ซื้อ/จ้าง',
  'อนุมัติ ซื้อ/จ้าง', 'สั่งจ่าย งป.', 'ผูกพัน', 'ส่งมอบภายใน', 'ขึ้นบัญชีคุม', 'หมายเหตุ'];

test('header row is recognised and every field gets its real label', () => {
  assert.ok(gs.isHeaderRow(REAL_HEADER));
  assert.ok(!gs.isHeaderRow(blankRow()));
  const labels = gs.labelsFrom(REAL_HEADER);
  assert.strictEqual(labels.unit, 'หน่วย');
  assert.strictEqual(labels.project, 'กลุ่มงาน/โครงการ');
  assert.strictEqual(labels.name, 'รายการ');
  assert.strictEqual(labels.stepApproved, 'อนุมัติ ซื้อ/จ้าง');
  assert.strictEqual(labels.deliveryDeadline, 'ส่งมอบภายใน');
  assert.strictEqual(labels.note, 'หมายเหตุ');
});

test('Fiscal Year is the first two digits of the Item Code', () => {
  assert.strictEqual(gs.fiscalYearFromCode('70SA0010'), 2570);
  assert.strictEqual(gs.fiscalYearFromCode('69SB0001'), 2569);
  assert.strictEqual(gs.fiscalYearFromCode('SA0010'), null);
  assert.strictEqual(gs.fiscalYearFromCode(''), null);
});

test('fiscal year starts in October', () => {
  assert.strictEqual(gs.currentFiscalYear(new Date(2025, 8, 30)), 2568);
  assert.strictEqual(gs.currentFiscalYear(new Date(2025, 9, 1)), 2569);
});

test('text dates are read as Buddhist era', () => {
  assert.strictEqual(gs.parseTextDate('15/03/2568'), '2025-03-15');
  assert.strictEqual(gs.parseTextDate('5/3/68'), '2025-03-05');
  assert.strictEqual(gs.parseTextDate('31/02/2568'), null);
  assert.strictEqual(gs.parseTextDate('90 วัน'), null);
});

test('cells: blanks become null, Date objects become ISO, BE-year Dates are corrected', () => {
  assert.strictEqual(gs.toCell(''), null);
  assert.strictEqual(gs.toCell('  '), null);
  assert.strictEqual(gs.toCell(1500000), 1500000);
  assert.strictEqual(gs.toCell(new Date(2025, 2, 15)), '2025-03-15');
  assert.strictEqual(gs.toCell(new Date(2568, 2, 15)), '2025-03-15');
  assert.strictEqual(gs.toCell(' กห 0403/123 '), 'กห 0403/123');
});

test('record flags: approved needs a W date; overdue needs a past Z date and empty AA', () => {
  const cells = blankRow();
  cells[col('code')] = '70SA0010';
  cells[col('name')] = 'จ้างซ่อม';
  cells[col('stepApproved')] = new Date(2025, 0, 10);
  cells[col('deliveryDeadline')] = '30/09/2568';

  const overdue = gs.toRecord(cells, 7, '2025-10-01');
  assert.strictEqual(overdue.row, 7);
  assert.strictEqual(overdue.code, '70SA0010');
  assert.strictEqual(overdue.fiscalYear, 2570);
  assert.ok(overdue.isApproved);
  assert.ok(overdue.isOverdue);

  assert.ok(!gs.toRecord(cells, 7, '2025-09-30').isOverdue, 'deadline day itself is not overdue');

  const ledgered = [...cells];
  ledgered[col('stepLedger')] = new Date(2025, 9, 5);
  assert.ok(!gs.toRecord(ledgered, 7, '2025-10-10').isOverdue);

  const daysText = [...cells];
  daysText[col('deliveryDeadline')] = '90 วัน';
  assert.ok(!gs.toRecord(daysText, 7, '2030-01-01').isOverdue);
});

test('Stage is the step after the furthest dated one; a ขึ้นบัญชีคุม date means done', () => {
  const stageWith = dates => {
    const cells = blankRow();
    cells[col('code')] = '70SA0010';
    Object.entries(dates).forEach(([key, value]) => { cells[col(key)] = value; });
    return gs.toRecord(cells, 7, '2025-10-01').stage;
  };
  assert.strictEqual(stageWith({}), 'kc', 'no dates: still writing the spec');
  assert.strictEqual(stageWith({ kc: new Date(2025, 0, 1) }), 'stepPlan');
  assert.strictEqual(stageWith({ kc: '01/02/2568', stepPlan: '05/02/2568' }), 'stepApproved');
  assert.strictEqual(stageWith({ kc: new Date(2025, 0, 1), stepApproved: new Date(2025, 2, 1) }), 'stepCommit', 'gap: furthest date wins');
  assert.strictEqual(stageWith({ stepCommit: new Date(2025, 3, 1) }), 'stepLedger');
  assert.strictEqual(stageWith({ stepLedger: new Date(2025, 4, 1) }), 'done', 'ledgered is completed');
  assert.strictEqual(stageWith({ kc: 'รอ', stepPlan: '-' }), 'kc', 'text is not a date');
});

test('Stuck: next step of คฉ.→อนุมัติ ซื้อ/จ้าง still empty more than 10 days after the furthest dated one', () => {
  const recordWith = (dates, today) => {
    const cells = blankRow();
    cells[col('code')] = '70SA0010';
    Object.entries(dates).forEach(([key, value]) => { cells[col(key)] = value; });
    return gs.toRecord(cells, 7, today);
  };
  const kcOnly = { kc: new Date(2025, 0, 5) };
  assert.strictEqual(recordWith(kcOnly, '2025-01-15').waitingFor, 'stepPlan');
  assert.strictEqual(recordWith(kcOnly, '2025-01-15').waitingDays, 10);
  assert.ok(!recordWith(kcOnly, '2025-01-15').isStuck, 'exactly 10 days is not stuck');
  assert.ok(recordWith(kcOnly, '2025-01-16').isStuck);

  const published = { kc: new Date(2025, 0, 1), stepPlan: new Date(2025, 0, 2), stepPublish: new Date(2025, 0, 5) };
  assert.strictEqual(recordWith(published, '2025-01-20').waitingFor, 'stepTor');
  assert.ok(recordWith(published, '2025-01-20').isStuck);

  const gap = { kc: new Date(2025, 0, 1), stepTor: new Date(2025, 0, 5) };
  assert.strictEqual(recordWith(gap, '2025-01-20').waitingFor, 'stepMedianPrice', 'furthest dated step wins');

  assert.ok(!recordWith({}, '2030-01-01').isStuck, 'no dates: nothing to count from');
  assert.strictEqual(recordWith({}, '2030-01-01').waitingDays, null);
  const approved = recordWith({ ...published, stepApproved: new Date(2025, 0, 6) }, '2030-01-01');
  assert.ok(!approved.isStuck, 'approved: no longer watched');
  assert.strictEqual(approved.waitingFor, null);
});

test('duplicate Item Codes are reported once each', () => {
  const records = [{ code: '1' }, { code: '2' }, { code: '1' }, { code: '' }, { code: '' }];
  assert.deepStrictEqual([...gs.findDuplicateCodes(records)], ['1']);
});
