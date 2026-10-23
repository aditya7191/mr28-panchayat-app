import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Watermark } from '../components/Watermark'
import { RoyalFooter } from '../components/RoyalFooter'
import { EduBoard, EDU_SECTION_SUB, EDU_SECTION_TITLE } from '../components/EduBoard'
import { useI18n } from '../hooks/useI18n'
import { useStore } from '../hooks/useStore'

/** Separate public page for the education list (no phones, no %, no private data). */
export function PublicTaarle() {
  const { lang, toggle } = useI18n()
  const { eduPrograms, eduStudents } = useStore()
  const eduProgram = useMemo(
    () => [...eduPrograms].sort((a, b) => b.year.localeCompare(a.year))[0],
    [eduPrograms],
  )
  const eduPublic = useMemo(
    () => eduStudents.filter((s) => s.programId === eduProgram?.id).map((s) => ({ ...s, secret: '' })),
    [eduStudents, eduProgram],
  )
  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col bg-cream">
      <Watermark />
      <header className="relative z-30 flex items-center gap-2 royal-pattern px-3 py-3 shadow-md text-white">
        <Link to="/public" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10" aria-label="Back">
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold">🌟 {EDU_SECTION_TITLE}</h1>
          <p className="truncate text-[10px] text-white/60">{EDU_SECTION_SUB}</p>
        </div>
        <button type="button" onClick={toggle} className="rounded-full border border-white/30 px-3 py-1.5 text-xs font-semibold">
          {lang === 'gu' ? 'EN' : 'ગુ'}
        </button>
      </header>
      <main className="relative z-10 flex flex-1 flex-col gap-4 p-4">
        <section id="education" className="rounded-2xl border border-saffron/40 bg-white p-4 shadow-sm">
          <h3 className="border-l-4 border-saffron pl-2 font-display text-base font-bold text-navy">🌟 {EDU_SECTION_TITLE}</h3>
          <p className="mb-1 pl-3 text-xs text-navy/60">{EDU_SECTION_SUB}</p>
          {eduProgram && <p className="mb-3 pl-3 text-[11px] font-semibold text-saffron-dark">{eduProgram.title}</p>}
          {eduPublic.length > 0 ? (
            <EduBoard students={eduPublic} lang={lang} showPct={false} />
          ) : (
            <p className="text-xs text-navy/50">—</p>
          )}
        </section>
        <Link to="/public" className="mt-auto rounded-2xl border-2 border-navy/20 bg-white py-3.5 text-center text-sm font-semibold text-navy">
          ← {lang === 'gu' ? 'પાછા જાઓ' : 'Back'}
        </Link>
        <RoyalFooter className="mt-2" />
      </main>
    </div>
  )
}
