import { useMemo, useState, type ReactNode } from 'react'
import { Award, GraduationCap, Trophy } from 'lucide-react'
import type { EduStudent } from '../types'
import { BAND_LABEL, BAND_ORDER, rankStudents, standardBand, type EduBand, type Ranked } from '../utils/eduRank'

export const EDU_SECTION_TITLE = 'મીરા રોડ ના તેજસ્વી તારલા'
export const EDU_SECTION_SUB = 'Mira Road ke Tejasvi Taarle (Shining Stars)'

const MEDAL = [
  { cls: 'metal-shine bg-gradient-to-br from-[#f7d774] to-[#c9971c] text-[#4a1220] ring-[#c9971c]', en: 'Gold', gu: 'સુવર્ણ' },
  { cls: 'metal-shine bg-gradient-to-br from-[#eef0f3] to-[#9aa3ad] text-[#2b2f36] ring-[#9aa3ad]', en: 'Silver', gu: 'રજત' },
  { cls: 'metal-shine bg-gradient-to-br from-[#f1c08f] to-[#a8632a] text-white ring-[#a8632a]', en: 'Bronze', gu: 'કાંસ્ય' },
]

export function RankBadge({ rank }: { rank: number | null }) {
  if (rank === null) return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy/5 text-[11px] text-navy/35">—</span>
  const m = MEDAL[rank - 1]
  if (m)
    return (
      <span title={m.en} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold shadow ring-2 ${m.cls}`}>
        {rank}
      </span>
    )
  return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy/10 text-xs font-bold text-navy">{rank}</span>
}

type Filter = 'all' | EduBand

/**
 * Ranked student list with All / Toppers tabs and band chips.
 * `showPct` = false on the public page (name, parents, school, standard, stream, goal).
 */
export function EduBoard({
  students,
  lang,
  showPct,
  renderExtra,
  onRowClick,
}: {
  students: EduStudent[]
  lang: 'gu' | 'en'
  showPct: boolean
  renderExtra?: (r: Ranked) => ReactNode
  onRowClick?: (s: EduStudent) => void
}) {
  const [tab, setTab] = useState<'all' | 'toppers'>('all')
  const [band, setBand] = useState<Filter>('all')
  const L = (gu: string, en: string) => (lang === 'gu' ? gu : en)

  const bands = useMemo(() => {
    const m = new Map<EduBand, EduStudent[]>()
    for (const s of students) {
      const b = standardBand(s.standard)
      m.set(b, [...(m.get(b) || []), s])
    }
    return m
  }, [students])

  const rankedAll = useMemo(() => rankStudents(students), [students])
  const ranked = useMemo(
    () => (band === 'all' ? rankedAll : rankStudents(bands.get(band) || [])),
    [band, bands, rankedAll],
  )
  const anyPct = rankedAll.some((r) => r.rank !== null)

  const toppers = useMemo(() => {
    const out: { band: EduBand | 'all'; list: Ranked[] }[] = [
      { band: 'all', list: rankedAll.filter((r) => r.rank !== null && r.rank <= 3) },
    ]
    for (const b of BAND_ORDER) {
      const l = rankStudents(bands.get(b) || []).filter((r) => r.rank !== null && r.rank <= 3)
      if (l.length) out.push({ band: b, list: l })
    }
    return out
  }, [bands, rankedAll])

  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${active ? 'border-navy bg-navy text-saffron-light' : 'border-navy/15 bg-white text-navy/70'}`

  const Row = ({ r }: { r: Ranked }) => (
    <li
      className={`flex items-start gap-3 py-2.5 ${onRowClick ? 'cursor-pointer' : ''}`}
      onClick={onRowClick ? () => onRowClick(r.s) : undefined}
    >
      <RankBadge rank={r.rank} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-navy">{r.s.name}</p>
        <p className="text-xs text-navy/60">
          {[r.s.standard && `${L('ધો.', 'Std')} ${r.s.standard}`, r.s.stream, r.s.school].filter(Boolean).join(' · ')}
        </p>
        {r.s.parents && (
          <p className="text-xs text-navy/70">
            <span className="font-semibold text-navy/50">માતા-પિતા / Mata-Pita:</span> {r.s.parents}
          </p>
        )}
        {r.s.goal && (
          <p className="mt-0.5 text-xs text-saffron-dark">
            🎯 {r.s.goal}
          </p>
        )}
      </div>
      {showPct && (
        <span className={`shrink-0 text-sm font-bold ${r.s.resultPct === null ? 'text-navy/30' : 'text-navy'}`}>
          {r.s.resultPct === null ? '—' : `${r.s.resultPct}%`}
        </span>
      )}
      {renderExtra?.(r)}
    </li>
  )

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <button className={chip(tab === 'all')} onClick={() => setTab('all')}>
          <GraduationCap size={12} className="mr-1 inline" />
          {L('બધા', 'All')} ({students.length})
        </button>
        <button className={chip(tab === 'toppers')} onClick={() => setTab('toppers')}>
          <Trophy size={12} className="mr-1 inline" />
          {L('ટોપર્સ', 'Toppers')}
        </button>
      </div>

      {tab === 'all' && (
        <>
          <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
            <button className={chip(band === 'all')} onClick={() => setBand('all')}>
              {L('કુલ', 'Overall')}
            </button>
            {BAND_ORDER.filter((b) => bands.has(b)).map((b) => (
              <button key={b} className={chip(band === b)} onClick={() => setBand(b)}>
                {BAND_LABEL[b][lang]} ({bands.get(b)!.length})
              </button>
            ))}
          </div>
          {!anyPct && (
            <p className="mb-2 rounded-lg bg-saffron/10 px-3 py-2 text-[11px] text-navy/70">
              {L(
                'પરિણામ (%) હજી દાખલ થયા નથી — દાખલ થતાં ક્રમ આપમેળે બનશે.',
                'Results (%) not entered yet — ranking updates automatically once entered.',
              )}
            </p>
          )}
          <ul className="divide-y divide-navy/5">
            {ranked.map((r) => (
              <Row key={r.s.id} r={r} />
            ))}
          </ul>
        </>
      )}

      {tab === 'toppers' && (
        <div className="space-y-4">
          {toppers.every((g) => g.list.length === 0) ? (
            <p className="py-6 text-center text-xs text-navy/50">
              <Award className="mx-auto mb-1 text-saffron" />
              {L('પરિણામ આવ્યા પછી ટોપર્સ અહીં દેખાશે.', 'Toppers will appear here once results are entered.')}
            </p>
          ) : (
            toppers
              .filter((g) => g.list.length)
              .map((g) => (
                <div key={g.band}>
                  <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-saffron-dark">
                    {g.band === 'all' ? L('કુલ ટોપર્સ', 'Overall Toppers') : BAND_LABEL[g.band][lang]}
                  </h4>
                  <ul className="divide-y divide-navy/5">
                    {g.list.map((r) => (
                      <Row key={r.s.id} r={r} />
                    ))}
                  </ul>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  )
}
