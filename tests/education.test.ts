import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mergeAppData, restoreInto, dataFingerprint } from '../src/sync/merge'
import { sanitizeForCloud, parseAppData } from '../src/sync/githubSync'
import { deriveEduKey, encryptPrivate, decryptPrivate } from '../src/utils/eduCrypto'
import { rankStudents, standardBand } from '../src/utils/eduRank'
import { checkAdminPassword, sha256Hex } from '../src/utils/password'
import type { AppData, EduProgram, EduStudent } from '../src/types'
import { DEFAULT_SETTINGS } from '../src/types'

let pass = 0
const ok = async (name: string, fn: () => void | Promise<void>) => { await fn(); pass++; console.log('PASS', name) }
const RESET = '2026-10-21T14:52:09.378Z'
const T1 = '2026-10-23T10:00:00.000Z'
const T2 = '2026-10-23T11:00:00.000Z'
const base = (): AppData => ({ version: 1, settings: { ...DEFAULT_SETTINGS, resetAt: RESET, settingsUpdatedAt: RESET }, members: [], payments: [], deleted: { members: {}, payments: {}, expenses: {}, eduPrograms: {}, eduStudents: {} } })
const prog = (id: string, upd = T1): EduProgram => ({ id, title: 'P ' + id, year: '2026', createdAt: upd, updatedAt: upd })
const stu = (id: string, o: Partial<EduStudent> = {}): EduStudent => ({ id, programId: 'p1', name: 'S ' + id, school: 'sch', standard: '10', stream: '', goal: '', resultPct: null, status: 'Registered', secret: '', createdAt: T1, updatedAt: T1, ...o })

const gistFile = process.argv[2]
const cloudOld = JSON.parse(JSON.parse(readFileSync(gistFile, 'utf8')).files['db.json'].content) as AppData

async function main() {
  await ok('backward compat: db.json without edu', () => {
    const m = mergeAppData(cloudOld, cloudOld)
    assert.deepEqual(m.eduPrograms, [])
    assert.deepEqual(m.eduStudents, [])
    assert.deepEqual(m.members, cloudOld.members)
    assert.deepEqual(m.payments, cloudOld.payments)
    assert.deepEqual(m.deleted!.eduStudents, {})
  })
  await ok('merge: union of students from both sides', () => {
    const a = { ...base(), eduPrograms: [prog('p1')], eduStudents: [stu('a')] }
    const b = { ...base(), eduPrograms: [prog('p1')], eduStudents: [stu('b')] }
    const m = mergeAppData(a, b)
    assert.deepEqual(m.eduStudents!.map((s) => s.id).sort(), ['a', 'b'])
    assert.equal(m.eduPrograms!.length, 1)
  })
  await ok('merge: newer updatedAt wins (result % edit)', () => {
    const a = { ...base(), eduStudents: [stu('a', { resultPct: 88, updatedAt: T2 })] }
    const b = { ...base(), eduStudents: [stu('a', { resultPct: null })] }
    assert.equal(mergeAppData(a, b).eduStudents![0].resultPct, 88)
    assert.equal(mergeAppData(b, a).eduStudents![0].resultPct, 88)
  })
  await ok('merge: tombstone deletes student on other device', () => {
    const a = { ...base(), eduStudents: [] as EduStudent[] }
    a.deleted!.eduStudents = { a: T2 }
    const b = { ...base(), eduStudents: [stu('a')] }
    const m = mergeAppData(b, a)
    assert.equal(m.eduStudents!.length, 0)
    assert.equal(m.deleted!.eduStudents.a, T2)
  })
  await ok('merge: records older than resetAt are dropped', () => {
    const b = { ...base(), eduStudents: [stu('old', { createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z' })] }
    assert.equal(mergeAppData(base(), b).eduStudents!.length, 0)
  })
  await ok('fingerprint changes with edu + restore keeps edu', () => {
    const a = { ...base(), eduStudents: [stu('a')] }
    assert.notEqual(dataFingerprint(a), dataFingerprint(base()))
    const r = restoreInto(base(), a)
    assert.equal(r.eduStudents!.length, 1)
  })
  await ok('sanitize: only whitelisted fields + ciphertext reach the cloud', () => {
    const dirty = { ...stu('a', { secret: 'v1.aaa.bbb' }), mobile: '9876543210', marksheet: 'https://drive.google.com/x' } as unknown as EduStudent
    const plain = stu('b', { secret: '9876543210' })
    dirty.parents = 'Rekha & Ramesh Musadia'
    const out = sanitizeForCloud({ ...base(), eduPrograms: [prog('p1')], eduStudents: [dirty, plain] })
    const json = JSON.stringify(out)
    assert.ok(!json.includes('9876543210'))
    assert.ok(!json.includes('drive.google.com'))
    assert.equal(out.eduStudents![0].secret, 'v1.aaa.bbb')
    assert.equal(out.eduStudents![0].parents, 'Rekha & Ramesh Musadia') // parents are public
    assert.equal(out.eduStudents![1].parents, '')
    assert.ok(!('mobile' in out.eduStudents![0]) && !('marksheet' in out.eduStudents![0]))
    assert.equal(out.eduStudents![1].secret, '')
    const back = parseAppData(JSON.parse(json))
    assert.ok(back && !JSON.stringify(back).includes('drive.google.com'))
  })
  await ok('crypto: roundtrip, random IV, wrong password fails', async () => {
    const k = await deriveEduKey('aditya@1989')
    const p = { mobile: '9876543210', marksheet: 'https://drive.google.com/open?id=abc', parents: '' }
    const c1 = await encryptPrivate(k, p)
    const c2 = await encryptPrivate(k, p)
    assert.ok(c1.startsWith('v1.'))
    assert.notEqual(c1, c2)
    assert.ok(!c1.includes('9876543210') && !c1.includes('drive'))
    assert.deepEqual(await decryptPrivate(k, c1), p)
    assert.deepEqual(await decryptPrivate(await deriveEduKey('aditya@1989'), c1), p)
    assert.equal(await decryptPrivate(await deriveEduKey('wrong'), c1), null)
    assert.equal(await encryptPrivate(k, { mobile: '', marksheet: '' }), '')
    assert.deepEqual(await decryptPrivate(k, ''), { mobile: '', marksheet: '', parents: '' })
    const tampered = c1.slice(0, -4) + (c1.endsWith('AAAA') ? 'BBBB' : 'AAAA')
    assert.equal(await decryptPrivate(k, tampered), null)
  })
  await ok('ranking: highest first, ties share rank, blanks last A–Z', () => {
    const r = rankStudents([stu('a', { name: 'Zed', resultPct: 80 }), stu('b', { name: 'Amy', resultPct: 95 }), stu('c', { name: 'Bob', resultPct: 95 }), stu('d', { name: 'Cy', resultPct: null }), stu('e', { name: 'Al', resultPct: null })])
    assert.deepEqual(r.map((x) => [x.s.name, x.rank]), [['Amy', 1], ['Bob', 1], ['Zed', 3], ['Al', null], ['Cy', null]])
  })
  await ok('bands from free-text standards', () => {
    const cases: [string, string][] = [['Jr.kg', 'pre'], ['Sr. KG', 'pre'], ['Nursery', 'pre'], ['3', '1-4'], ['6th', '5-7'], ['Vlll std', '8-10'], ['SSC 10', '8-10'], ['12th Science', '11-12'], ['SyBpharm', 'college'], ['Degree', 'college'], ['13', 'college'], ['First year', 'college'], ['', 'other']]
    for (const [s, b] of cases) assert.equal(standardBand(s), b, s)
  })
  await ok('password: default checked by hash, custom by value', () => {
    assert.equal(sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    assert.equal(sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    assert.ok(checkAdminPassword('aditya@1989', ''))
    assert.ok(!checkAdminPassword('nope', ''))
    assert.ok(checkAdminPassword('x1', 'x1'))
    assert.ok(!checkAdminPassword('aditya@1989', 'x1'))
  })
  console.log(`${pass} passed`)
}
void main().catch((e) => { console.error(e); process.exit(1) })
