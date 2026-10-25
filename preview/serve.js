// Local preview with mock data: node preview/serve.js, then open http://localhost:8080
// Renders src/Index.html like Apps Script does and fakes google.script.* in the browser.
// Mock rows go through the real toRecord in src/Code.gs, so Stage etc. are computed for real.
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const vm = require('node:vm');

const PORT = 8080;
const SRC = path.join(__dirname, '../src');
const read = name => fs.readFileSync(path.join(SRC, name), 'utf8');

const HEADER = ['หน่วย', 'กลุ่มงาน/โครงการ', 'รหัสรายการ', 'ประเภทงาน', 'แผนงาน', 'สถาน คฉ.', 'กลุ่มงาน (หัวข้อหลัก-ย่อย)', 'รายการ',
  'วงเงิน', 'สถานะ', 'รายละเอียด (สรุปการดำเนินการ)', 'วงเงินอนุมัติซื้อ/จ้าง', 'วีธีจัดหา', 'อำนาจอนุมัติ', 'คฉ.',
  'แผนจัดหา', 'เผยแพร่แผน', 'TOR', 'ราคากลาง', 'รายงานขอซื้อ', 'วันที่เปิดซอง', 'ขออนุมัติ ซื้อ/จ้าง',
  'อนุมัติ ซื้อ/จ้าง', 'สั่งจ่าย งป.', 'ผูกพัน', 'ส่งมอบภายใน', 'ขึ้นบัญชีคุม', 'หมายเหตุ'];

// [name, budget, status, { field: date text (Buddhist era) }]
const MOCK = [
  ['ชุดเครื่องมือซ่อมบำรุงอากาศยาน', 2500000, 'ร่าง คฉ.', {}],
  ['แบตเตอรี่รถยนต์ทางทหาร', 850000, 'ร่าง คฉ.', { kc: 'รอ' }],
  ['ยางรถบรรทุก 10 ล้อ', 1200000, 'จัดทำแผน', { kc: '15/10/2569' }],
  ['อะไหล่เครื่องยนต์ดีเซล', 3400000, 'จัดทำแผน', { kc: '20/10/2569' }],
  ['น้ำมันหล่อลื่น', 640000, 'รออนุมัติ', { kc: '01/10/2569', stepPlan: '10/10/2569' }],
  ['เครื่องกำเนิดไฟฟ้า 50 kVA', 1980000, 'รออนุมัติ', { kc: '02/10/2569', stepPlan: '12/10/2569' }],
  ['วิทยุสื่อสาร VHF', 4750000, 'ทำสัญญา', { kc: '05/10/2569', stepApproved: '18/10/2569' }],
  ['เต็นท์สนาม', 520000, 'ส่งมอบ', { kc: '03/10/2569', stepPlan: '08/10/2569', stepApproved: '14/10/2569', stepCommit: '20/10/2569', deliveryDeadline: '22/10/2569' }],
  ['กล้องตรวจการณ์กลางคืน', 6100000, 'ส่งมอบ', { kc: '01/10/2569', stepPlan: '04/10/2569', stepApproved: '09/10/2569', stepCommit: '16/10/2569', deliveryDeadline: '30/11/2569' }],
  ['คอมพิวเตอร์สำนักงาน', 900000, 'เสร็จสิ้น', { kc: '01/10/2569', stepPlan: '03/10/2569', stepApproved: '07/10/2569', stepCommit: '12/10/2569', stepLedger: '21/10/2569' }],
];

function mockList() {
  const gs = vm.runInNewContext(read('Code.gs') + ';({ FIELDS, STAGES, toRecord, toIsoDate, labelsFrom, currentFiscalYear })', { Date });
  const today = gs.toIsoDate(new Date());
  const items = MOCK.map(([name, budget, status, dates], i) => {
    const cells = Array(gs.FIELDS.length).fill('');
    const set = (key, value) => { cells[gs.FIELDS.indexOf(key)] = value; };
    set('code', '70SA' + String(i + 1).padStart(4, '0'));
    set('unit', ['05 กคย.', '06 กซบ.', '07 กสก.'][i % 3]);
    set('project', i < 6 ? '01 งบส่ง' : '02 งบซ่อม');
    set('type', i % 3 ? '02 ชสซ.' : '01 ชสพ.');
    set('group', i % 2 ? 'สป.สาย พธ.' : 'สป.สาย ส.');
    set('name', name);
    set('budget', budget);
    set('status', status);
    Object.entries(dates).forEach(([key, value]) => set(key, value));
    return gs.toRecord(cells, i + 3, today);
  });
  return {
    labels: gs.labelsFrom(HEADER),
    sheetUrl: 'https://docs.google.com/spreadsheets/d/mock/edit',
    items,
    duplicateCodes: [],
    stages: [...gs.STAGES],
    currentFiscalYear: gs.currentFiscalYear(new Date()),
  };
}

// Stands in for google.script.run / history / url inside the page.
const fakeGoogle = list => `<script>
  const LIST = ${JSON.stringify(list)};
  const api = {
    getList: () => LIST,
    getItem: code => {
      const item = LIST.items.find(i => i.code === code);
      return item ? { labels: LIST.labels, item, sheetUrl: LIST.sheetUrl } : null;
    },
  };
  const runner = (ok, fail) => new Proxy({}, { get: (_, fn) =>
    fn === 'withSuccessHandler' ? h => runner(h, fail)
    : fn === 'withFailureHandler' ? h => runner(ok, h)
    : (...args) => setTimeout(() => { try { ok(api[fn](...args)); } catch (e) { fail(e); } }, 150) });
  const params = () => Object.fromEntries(new URLSearchParams(location.search));
  window.google = { script: {
    run: runner(() => {}, () => {}),
    history: {
      push: (_, p) => history.pushState(null, '', '?' + new URLSearchParams(p)),
      setChangeHandler: fn => addEventListener('popstate', () => fn({ location: { parameter: params() } })),
    },
    url: { getLocation: cb => cb({ parameter: params() }) },
  } };
</script>`;

function renderPage() {
  return read('Index.html')
    .replace(/<\?!= include\('(\w+)'\) \?>/g, (_, name) =>
      (name === 'App' ? fakeGoogle(mockList()) : '') + read(name + '.html'))
    .replace('<?= appUrl ?>', `http://localhost:${PORT}/`)
    // doGet adds this via addMetaTag
    .replace('<head>', '<head><meta name="viewport" content="width=device-width, initial-scale=1">');
}

http.createServer((req, res) => {
  try {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderPage());
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(String(err.stack || err));
  }
}).listen(PORT, () => console.log(`Preview: http://localhost:${PORT}`));
