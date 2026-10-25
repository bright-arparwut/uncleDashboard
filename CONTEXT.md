# Procurement Dashboard

A read-only view over a Google Sheet that tracks government procurement (จัดซื้อ/จัดจ้าง) from planning through delivery and ledger entry.

## Language

**Procurement Item** (รายการ):
One thing being bought or contracted, tracked as one row in the sheet and named by its รายการ column.
_Avoid_: Product

**Fiscal Year** (ปีงบประมาณ):
The Thai government budget year (พ.ศ.) a Procurement Item is planned under, given by the first two digits of its Item Code (70… is 2570). All Fiscal Years share one tab.
_Avoid_: Year, period

**Item Code** (รหัสรายการ):
The identifier that names exactly one Procurement Item across all Fiscal Years (e.g. 70SA0010). It never changes when the sheet is edited or re-sorted.
_Avoid_: Row number, ID

**Budget** (วงเงิน):
The planned amount allocated to a Procurement Item.

**Approved Amount** (วงเงินอนุมัติซื้อ/จ้าง):
The amount actually approved for the purchase or contract; empty until approval.

**Savings** (ประหยัด):
Budget minus Approved Amount; only meaningful once an Approved Amount exists.

**Status** (สถานะ):
The current state of a Procurement Item, chosen from a fixed set maintained in the sheet.

**Procurement Step**:
One stage of the procurement process (คฉ. through ขึ้นบัญชีคุม); a Procurement Item has reached a step when that step's date is filled in.
_Avoid_: Milestone, phase

**Stage**:
What a Procurement Item is currently waiting on, read from its คฉ. → แผนจัดหา → อนุมัติ ซื้อ/จ้าง → ผูกพัน → ขึ้นบัญชีคุม dates. A date means that step is finished (any other text counts as empty), and the furthest dated step decides even if an earlier date is empty:
- no dates: อยู่ระหว่างจัดทำ คฉ.
- furthest is คฉ.: คฉ. อนุมัติ/จัดทำแผนจัดหา
- furthest is แผนจัดหา: อนุมัติแผนจัดหา/ดำเนินกรรมวิธี
- furthest is อนุมัติ ซื้อ/จ้าง: อนุมัติซื้อ/รอผูกพัน
- furthest is ผูกพัน: ผูกพันแล้ว/รอส่งของ
- ขึ้นบัญชีคุม dated: ขึ้นบัญชีคุม (completed)
Distinct from Status, which is maintained by hand in the sheet.
_Avoid_: Status, progress

**Delivery Deadline** (ส่งมอบภายใน):
The date by which a Procurement Item must be delivered; it is a due date, not a completed Procurement Step.
_Avoid_: Delivery date

**Approved** (อนุมัติแล้ว):
A Procurement Item whose อนุมัติ ซื้อ/จ้าง step has a date, regardless of its Status.

**Overdue** (เกินกำหนด):
A Procurement Item whose Delivery Deadline has passed while ขึ้นบัญชีคุม is still empty.
