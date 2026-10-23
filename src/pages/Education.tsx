import { useEffect, useMemo, useState } from 'react'
import { Lock, Pencil, Plus, Trash2, Unlock } from 'lucide-react'
import { EduBoard, EDU_SECTION_SUB, EDU_SECTION_TITLE } from '../components/EduBoard'
import { Modal, ModalBody, ModalFooter } from '../components/Modal'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'
import { useStore } from '../hooks/useStore'
import type { EduStudent } from '../types'
import { decryptPrivate, encryptPrivate } from '../utils/eduCrypto'

const label = 'mb-1 block text-xs font-semibold text-navy/70'
const field =
  'w-full rounded-xl border border-navy/15 bg-white px-3 py-2.5 text-sm text-navy outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/30'

const DEFAULT_TITLE = 'Mira Road Education Support & Book Distribution Program 2026'

interface Draft {
  id?: string
  name: string
  school: string
  standard: string
  stream: string
  goal: string
  resultPct: string
  status: string
  mobile: string
  marksheet: string
  parents: string
  secret: string
}

const blank = (): Draft => ({
  name: '', school: '', standard: '', stream: '', goal: '', resultPct: '', status: 'Registered', mobile: '', marksheet: '', parents: '', secret: '',
})

export function Education() {
  const { lang } = useI18n()
  const L = (gu: string, en: string) => (lang === 'gu' ? gu : en)
  const { eduPrograms, eduStudents, saveEduProgram, deleteEduProgram, saveEduStudent, deleteEduStudent } = useStore()
  const { eduKey, unlockEdu } = useAuth()
  const programs = useMemo(() => [...eduPrograms].sort((a, b) => b.year.localeCompare(a.year)), [eduPrograms])
  const [pid, setPid] = useState<string>('')
  const program = programs.find((p) => p.id === pid) || programs[0]
  const students = useMemo(() => eduStudents.filter((s) => s.programId === program?.id), [eduStudents, program])

  const [draft, setDraft] = useState<Draft | null>(null)
  const [privState, setPrivState] = useState<'ok' | 'locked' | 'bad'>('ok')
  const [progEdit, setProgEdit] = useState<{ id?: string; title: string; year: string } | null>(null)
  const [pctEdit, setPctEdit] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const [unlockPw, setUnlockPw] = useState('')

  // Decrypt private fields when the editor opens / key changes
  useEffect(() => {
    if (!draft || !draft.id) return
    if (!draft.secret) return setPrivState('ok')
    if (!eduKey) return setPrivState('locked')
    let live = true
    void decryptPrivate(eduKey, draft.secret).then((p) => {
      if (!live) return
      if (!p) return setPrivState('bad')
      setPrivState('ok')
      setDraft((d) => (d && d.id === draft.id ? { ...d, mobile: p.mobile, marksheet: p.marksheet, parents: d.parents || p.parents || '' } : d))
    })
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id, draft?.secret, eduKey])

  function flash(m: string) {
    setMsg(m)
    setTimeout(() => setMsg(''), 2500)
  }

  function openEdit(s: EduStudent) {
    setPrivState(s.secret ? (eduKey ? 'ok' : 'locked') : 'ok')
    setDraft({ ...s, resultPct: s.resultPct === null ? '' : String(s.resultPct), mobile: '', marksheet: '', parents: s.parents || '' })
  }

  async function saveDraft() {
    if (!draft || !program) return
    if (!draft.name.trim()) return flash(L('નામ જરૂરી છે', 'Name is required'))
    let secret = draft.secret
    if (privState === 'ok') {
      if ((draft.mobile.trim() || draft.marksheet.trim()) && !eduKey) return flash(L('ખાનગી માહિતી માટે અનલૉક કરો', 'Unlock to save private fields'))
      secret = eduKey ? await encryptPrivate(eduKey, { mobile: draft.mobile, marksheet: draft.marksheet }) : ''
    } // locked / bad → keep existing ciphertext untouched
    const pctRaw = draft.resultPct.trim()
    const pct = pctRaw === '' ? null : Number(pctRaw)
    if (pct !== null && (!Number.isFinite(pct) || pct < 0 || pct > 100)) return flash(L('% 0–100 વચ્ચે', '% must be 0–100'))
    await saveEduStudent({
      id: draft.id,
      programId: program.id,
      name: draft.name,
      school: draft.school,
      standard: draft.standard,
      stream: draft.stream,
      goal: draft.goal,
      parents: draft.parents,
      resultPct: pct,
      status: draft.status || 'Registered',
      secret,
    })
    setDraft(null)
    flash(L('સાચવ્યું', 'Saved'))
  }

  async function savePct(s: EduStudent) {
    const raw = (pctEdit[s.id] ?? '').trim()
    const pct = raw === '' ? null : Number(raw)
    if (pct !== null && (!Number.isFinite(pct) || pct < 0 || pct > 100)) return flash(L('% 0–100 વચ્ચે', '% must be 0–100'))
    if (pct === s.resultPct) return
    await saveEduStudent({ ...s, resultPct: pct })
    setPctEdit((m) => {
      const n = { ...m }
      delete n[s.id]
      return n
    })
  }

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d))

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-3">
      <div className="rounded-2xl bg-gradient-to-br from-navy to-[#4a1220] p-4 text-cream shadow-md">
        <h2 className="font-display text-lg font-bold text-saffron-light">{EDU_SECTION_TITLE}</h2>
        <p className="text-xs text-cream/80">{EDU_SECTION_SUB}</p>
      </div>

      {msg && <p className="rounded-xl bg-success/10 px-3 py-2 text-center text-sm text-success">{msg}</p>}

      <section className="rounded-2xl border border-navy/10 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <select className={field} value={program?.id || ''} onChange={(e) => setPid(e.target.value)}>
            {programs.length === 0 && <option value="">{L('કોઈ કાર્યક્રમ નથી', 'No program yet')}</option>}
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.year} — {p.title}
              </option>
            ))}
          </select>
          {program && (
            <button aria-label="edit program" className="rounded-xl border border-navy/15 p-2.5 text-navy" onClick={() => setProgEdit({ ...program })}>
              <Pencil size={16} />
            </button>
          )}
          <button
            aria-label="add program"
            className="rounded-xl bg-navy p-2.5 text-saffron-light"
            onClick={() => setProgEdit({ title: DEFAULT_TITLE.replace('2026', String(new Date().getFullYear())), year: String(new Date().getFullYear()) })}
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-navy/60">
          <span>
            {eduKey ? <Unlock size={11} className="mr-1 inline text-success" /> : <Lock size={11} className="mr-1 inline" />}
            {eduKey
              ? L('ખાનગી માહિતી (મોબાઇલ/માર્કશીટ) અનલૉક', 'Private fields (mobile/marksheet) unlocked')
              : L('ખાનગી માહિતી લૉક — ફરી લૉગિન કરો', 'Private fields locked — log in again')}
          </span>
          <span>{L('ફક્ત એન્ક્રિપ્ટેડ સિંક થાય છે', 'Synced encrypted only')}</span>
        </div>
      </section>

      {program && (
        <section className="rounded-2xl border border-navy/10 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="border-l-4 border-saffron pl-2 text-sm font-bold text-navy">{program.title}</h3>
            <button className="flex items-center gap-1 rounded-full bg-saffron px-3 py-1.5 text-xs font-bold text-white" onClick={() => { setPrivState('ok'); setDraft(blank()) }}>
              <Plus size={14} /> {L('વિદ્યાર્થી', 'Student')}
            </button>
          </div>
          <EduBoard
            students={students}
            lang={lang}
            showPct={false}
            renderExtra={({ s }) => (
              <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <input
                  aria-label={`Result % ${s.name}`}
                  inputMode="decimal"
                  className="w-16 rounded-lg border border-navy/15 px-2 py-1 text-right text-sm font-bold text-navy"
                  placeholder="%"
                  value={pctEdit[s.id] ?? (s.resultPct === null ? '' : String(s.resultPct))}
                  onChange={(e) => setPctEdit((m) => ({ ...m, [s.id]: e.target.value }))}
                  onBlur={() => void savePct(s)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                />
                <button aria-label="edit" className="p-1 text-navy/50" onClick={() => openEdit(s)}>
                  <Pencil size={15} />
                </button>
              </div>
            )}
          />
        </section>
      )}

      <Modal open={!!draft} title={draft?.id ? L('વિદ્યાર્થી સુધારો', 'Edit student') : L('નવો વિદ્યાર્થી', 'New student')} onClose={() => setDraft(null)}>
        {draft && (
          <>
            <ModalBody>
              <div><label className={label}>{L('નામ', 'Name')} *</label><input className={field} value={draft.name} onChange={(e) => set('name', e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label}>{L('ધોરણ', 'Standard')}</label><input className={field} value={draft.standard} onChange={(e) => set('standard', e.target.value)} /></div>
                <div><label className={label}>{L('પ્રવાહ', 'Stream')}</label><input className={field} value={draft.stream} onChange={(e) => set('stream', e.target.value)} /></div>
              </div>
              <div><label className={label}>{L('શાળા / કૉલેજ', 'School / College')}</label><input className={field} value={draft.school} onChange={(e) => set('school', e.target.value)} /></div>
              <div><label className={label}>{L('માતા-પિતાનું નામ (જાહેર)', 'Mother & father name (public)')}</label><input className={field} value={draft.parents} onChange={(e) => set('parents', e.target.value)} /></div>
              <div><label className={label}>{L('ભવિષ્યનું લક્ષ્ય', 'Future goal')}</label><input className={field} value={draft.goal} onChange={(e) => set('goal', e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label}>{L('પરિણામ %', 'Result %')}</label><input className={field} inputMode="decimal" value={draft.resultPct} onChange={(e) => set('resultPct', e.target.value)} placeholder="—" /></div>
                <div><label className={label}>{L('સ્થિતિ', 'Status')}</label><input className={field} value={draft.status} onChange={(e) => set('status', e.target.value)} /></div>
              </div>
              <div className="rounded-xl border border-saffron/40 bg-saffron/5 p-3">
                <p className="mb-2 flex items-center gap-1 text-xs font-bold text-navy">
                  <Lock size={12} /> {L('ખાનગી: મોબાઇલ અને માર્કશીટ (એન્ક્રિપ્ટેડ)', 'Private: mobile & marksheet (encrypted)')}
                </p>
                {privState === 'ok' ? (
                  <>
                    <label className={label}>{L('મોબાઇલ', 'Mobile')}</label>
                    <input className={field} inputMode="tel" value={draft.mobile} onChange={(e) => set('mobile', e.target.value)} />
                    <label className={`${label} mt-2`}>{L('માર્કશીટ લિંક', 'Marksheet link')}</label>
                    <input className={field} value={draft.marksheet} onChange={(e) => set('marksheet', e.target.value)} />
                    {draft.marksheet.startsWith('http') && (
                      <a href={draft.marksheet} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-saffron-dark underline">
                        {L('માર્કશીટ ખોલો', 'Open marksheet')}
                      </a>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] text-navy/60">
                      {privState === 'locked'
                        ? L('લૉક છે. પાસવર્ડ લખી અનલૉક કરો.', 'Locked. Enter the password to unlock.')
                        : L('આ પાસવર્ડથી ખૂલતું નથી — જૂનો પાસવર્ડ અજમાવો.', 'Cannot decrypt with this password — try the older password.')}
                    </p>
                    <div className="flex gap-2">
                      <input className={field} type="password" value={unlockPw} onChange={(e) => setUnlockPw(e.target.value)} />
                      <button className="rounded-xl bg-navy px-3 text-xs font-bold text-saffron-light" onClick={() => void unlockEdu(unlockPw).then(() => setUnlockPw(''))}>
                        {L('અનલૉક', 'Unlock')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              <div className="flex gap-2 pb-3">
                {draft.id && (
                  <button
                    className="rounded-xl border border-danger/40 px-3 text-danger"
                    aria-label="delete"
                    onClick={() => {
                      if (confirm(L('આ વિદ્યાર્થી કાઢવો છે?', 'Delete this student?'))) void deleteEduStudent(draft.id!).then(() => setDraft(null))
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button className="flex-1 rounded-xl border border-navy/20 py-3 text-sm font-semibold text-navy" onClick={() => setDraft(null)}>{L('રદ', 'Cancel')}</button>
                <button className="flex-1 rounded-xl bg-navy py-3 text-sm font-bold text-saffron-light" onClick={() => void saveDraft()}>{L('સાચવો', 'Save')}</button>
              </div>
            </ModalFooter>
          </>
        )}
      </Modal>

      <Modal open={!!progEdit} title={progEdit?.id ? L('કાર્યક્રમ સુધારો', 'Edit program') : L('નવો કાર્યક્રમ', 'New program')} onClose={() => setProgEdit(null)}>
        {progEdit && (
          <>
            <ModalBody>
              <div><label className={label}>{L('શીર્ષક', 'Title')}</label><input className={field} value={progEdit.title} onChange={(e) => setProgEdit({ ...progEdit, title: e.target.value })} /></div>
              <div><label className={label}>{L('વર્ષ', 'Year')}</label><input className={field} value={progEdit.year} onChange={(e) => setProgEdit({ ...progEdit, year: e.target.value })} /></div>
            </ModalBody>
            <ModalFooter>
              <div className="flex gap-2 pb-3">
                {progEdit.id && (
                  <button
                    className="rounded-xl border border-danger/40 px-3 text-danger"
                    aria-label="delete program"
                    onClick={() => {
                      if (confirm(L('કાર્યક્રમ અને તેના બધા વિદ્યાર્થીઓ કાઢવા છે?', 'Delete program and all its students?')))
                        void deleteEduProgram(progEdit.id!).then(() => { setProgEdit(null); setPid('') })
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button className="flex-1 rounded-xl border border-navy/20 py-3 text-sm font-semibold text-navy" onClick={() => setProgEdit(null)}>{L('રદ', 'Cancel')}</button>
                <button
                  className="flex-1 rounded-xl bg-navy py-3 text-sm font-bold text-saffron-light"
                  onClick={() => {
                    if (!progEdit.title.trim()) return
                    void saveEduProgram(progEdit).then((p) => { setPid(p.id); setProgEdit(null) })
                  }}
                >
                  {L('સાચવો', 'Save')}
                </button>
              </div>
            </ModalFooter>
          </>
        )}
      </Modal>
    </div>
  )
}
