import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mergeAppData, restoreInto, dataFingerprint } from '../src/sync/merge'
import { accountSummary, monthlyBreakdown, parseAmountInput, formatPaise, makeVoucherNo } from '../src/utils/accounts'
import type { AppData, Expense, Payment } from '../src/types'
import { DEFAULT_SETTINGS } from '../src/types'

let pass = 0
const ok = (name: string, fn: () => void) => { fn(); pass++; console.log('PASS', name) }
const RESET = '2026-10-21T14:52:09.378Z'
const base = (): AppData => ({ version: 1, settings: { ...DEFAULT_SETTINGS, resetAt: RESET, settingsUpdatedAt: RESET }, members: [], payments: [], deleted: { members: {}, payments: {}, expenses: {} } })
const ex = (id: string, n: number, paise: number, upd = '2026-10-23T10:00:00.000Z', date = '2026-10-23'): Expense => ({ id, voucherNo: makeVoucherNo(n), date, amountPaise: paise, category: 'program', categoryOther: '', description: 'd' + id, paidTo: '', paidBy: '', method: 'cash', billIds: [], createdAt: upd, updatedAt: upd })
const pay = (id: string, amt: number, at: string): Payment => ({ id, receiptNo: 'MR28-R-0001', memberId: 'm', amount: amt, method: 'cash', periodFrom: '', periodTo: '', paidAt: at, notes: '', updatedAt: at })

// Real current cloud db.json (old format, no expenses) must stay identical for members/payments/settings
const gistFile = process.argv[2]
const cloudOld = JSON.parse(JSON.parse(readFileSync(gistFile, 'utf8')).files['db.json'].content) as AppData
ok('backward compat: old db.json without expenses', () => {
  const m = mergeAppData(cloudOld, cloudOld)
  assert.deepEqual(m.members, cloudOld.members)
  assert.deepEqual(m.payments, cloudOld.payments)
  assert.deepEqual(m.expenses, [])
  assert.equal(m.settings.nextMemberCounter, cloudOld.settings.nextMemberCounter)
  assert.equal(m.settings.nextReceiptCounter, cloudOld.settings.nextReceiptCounter)
  assert.equal(m.settings.nextExpenseCounter, 1)
  assert.equal(m.settings.receivedBy, cloudOld.settings.receivedBy)
  assert.equal(m.settings.resetAt, cloudOld.settings.resetAt)
  assert.deepEqual(m.deleted!.members, cloudOld.deleted!.members)
  assert.deepEqual(m.deleted!.payments, cloudOld.deleted!.payments)
  assert.deepEqual(m.deleted!.expenses, {})
  dataFingerprint(cloudOld)
})
ok('local-only expense kept when cloud is old format', () => {
  const l = { ...base(), expenses: [ex('a', 1, 50000)], settings: { ...base().settings, nextExpenseCounter: 2 } }
  const m = mergeAppData(l, cloudOld)
  assert.equal(m.expenses!.length, 1); assert.equal(m.settings.nextExpenseCounter, 2)
})
ok('cloud-only expense pulled', () => {
  const r = { ...base(), expenses: [ex('b', 1, 12345)] }
  const m = mergeAppData(base(), r)
  assert.equal(m.expenses![0].id, 'b'); assert.equal(m.settings.nextExpenseCounter, 2)
})
ok('edit conflict: newer updatedAt wins (both directions)', () => {
  const older = ex('c', 1, 100, '2026-10-23T10:00:00.000Z'); const newer = { ...ex('c', 1, 999, '2026-10-23T11:00:00.000Z') }
  assert.equal(mergeAppData({ ...base(), expenses: [older] }, { ...base(), expenses: [newer] }).expenses![0].amountPaise, 999)
  assert.equal(mergeAppData({ ...base(), expenses: [newer] }, { ...base(), expenses: [older] }).expenses![0].amountPaise, 999)
})
ok('delete tombstone removes on other phone; newer edit survives older tombstone', () => {
  const e = ex('d', 1, 100, '2026-10-23T10:00:00.000Z')
  const remote = { ...base(), expenses: [], deleted: { members: {}, payments: {}, expenses: { d: '2026-10-23T12:00:00.000Z' } } }
  const m = mergeAppData({ ...base(), expenses: [e] }, remote)
  assert.equal(m.expenses!.length, 0); assert.ok(m.deleted!.expenses.d)
  const e2 = ex('d', 1, 100, '2026-10-23T13:00:00.000Z')
  assert.equal(mergeAppData({ ...base(), expenses: [e2] }, remote).expenses!.length, 1)
})
ok('resetAt: expenses older than newest reset are dropped, counter reset', () => {
  const old = ex('e', 7, 100, '2026-10-01T00:00:00.000Z')
  const l = { ...base(), settings: { ...base().settings, resetAt: '2026-09-01T00:00:00.000Z', nextExpenseCounter: 8 }, expenses: [old] }
  const r = { ...base(), settings: { ...base().settings, resetAt: '2026-10-22T00:00:00.000Z', nextExpenseCounter: 1 } }
  const m = mergeAppData(l, r)
  assert.equal(m.expenses!.length, 0); assert.equal(m.settings.nextExpenseCounter, 1)
})
ok('counter never reuses a used voucher number', () => {
  const m = mergeAppData({ ...base(), expenses: [ex('f', 5, 1)] }, { ...base(), expenses: [ex('g', 9, 1)] })
  assert.equal(m.settings.nextExpenseCounter, 10)
})
ok('restoreInto brings expenses back', () => {
  const cur = { ...base(), deleted: { members: {}, payments: {}, expenses: { h: '2026-10-23T12:00:00.000Z' } } }
  const m = restoreInto(cur, { ...base(), expenses: [ex('h', 1, 100)] })
  assert.equal(m.expenses!.length, 1)
})
ok('totals math (paise exact, no float error)', () => {
  const ps = [pay('1', 50, '2026-10-05T10:00:00Z'), pay('2', 600, '2026-10-06T10:00:00Z'), pay('3', 50, '2026-11-01T10:00:00Z')]
  const es = [ex('x', 1, parseAmountInput('0.10')), ex('y', 2, parseAmountInput('0.20')), ex('z', 3, parseAmountInput('250.70'), undefined, '2026-11-02')]
  const s = accountSummary(ps, es)
  assert.equal(s.jama, 70000); assert.equal(s.kharcha, 25100); assert.equal(s.balance, 44900)
  assert.equal(formatPaise(s.balance), '449'); assert.equal(formatPaise(25100), '251')
  assert.equal(formatPaise(30), '0.30') // 0.1+0.2 exact
  const mb = monthlyBreakdown(ps, es)
  assert.deepEqual(mb.map((r) => [r.month, r.jama, r.kharcha, r.balance]), [['2026-11', 5000, 25070, -20070], ['2026-10', 65000, 30, 64970]])
  assert.equal(mb.reduce((a, r) => a + r.balance, 0), s.balance)
  assert.ok(Number.isNaN(parseAmountInput('12.345'))); assert.ok(Number.isNaN(parseAmountInput('-5'))); assert.ok(Number.isNaN(parseAmountInput('abc')))
  assert.equal(parseAmountInput('1,25,000'), 12500000)
  assert.equal(formatPaise(12500000), '1,25,000')
})
console.log(`\n${pass} tests passed`)
