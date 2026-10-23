import type { EduStudent } from '../types'

export type EduBand = 'pre' | '1-4' | '5-7' | '8-10' | '11-12' | 'college' | 'other'

export const BAND_ORDER: EduBand[] = ['pre', '1-4', '5-7', '8-10', '11-12', 'college', 'other']

export const BAND_LABEL: Record<EduBand, { gu: string; en: string }> = {
  pre: { gu: 'પ્રી-પ્રાઇમરી', en: 'Pre-primary' },
  '1-4': { gu: 'ધો. ૧–૪', en: 'Std 1–4' },
  '5-7': { gu: 'ધો. ૫–૭', en: 'Std 5–7' },
  '8-10': { gu: 'ધો. ૮–૧૦', en: 'Std 8–10' },
  '11-12': { gu: 'ધો. ૧૧–૧૨', en: 'Std 11–12' },
  college: { gu: 'કૉલેજ', en: 'College' },
  other: { gu: 'અન્ય', en: 'Other' },
}

const ROMAN: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 }

/** Map a free-text standard ("Jr.kg", "Vlll std", "SSC 10", "SyBpharm", "13") to a band. */
export function standardBand(std: string): EduBand {
  const s = (std || '').toLowerCase().trim()
  if (!s) return 'other'
  if (/\b(jr|sr|senior|junior)?\.?\s*k\.?\s*g\b|nursery|pre[\s-]?school|play/.test(s)) return 'pre'
  if (/degree|graduat|master|college|b\.?\s*com|b\.?\s*sc|b\.?\s*a\b|pharm|bpharm|engineer|diploma|fy|sy|ty|mba/.test(s)) return 'college'
  let n: number | null = null
  const d = /(\d{1,2})/.exec(s)
  if (d) n = Number(d[1])
  else {
    const r = /\b([ivxl]{1,5})\b/.exec(s)
    if (r) n = ROMAN[r[1].replace(/l/g, 'i')] ?? null
  }
  if (n === null) {
    if (/first/.test(s)) return 'college'
    else return 'other'
  }
  if (n >= 13) return 'college'
  if (n >= 11) return '11-12'
  if (n >= 8) return '8-10'
  if (n >= 5) return '5-7'
  if (n >= 1) return '1-4'
  return 'other'
}

export interface Ranked {
  s: EduStudent
  rank: number | null
}

/** Highest Result % first. Equal % share a rank (1,1,3). Students without % come last, unranked, A–Z. */
export function rankStudents(list: EduStudent[]): Ranked[] {
  const withPct = list
    .filter((s) => typeof s.resultPct === 'number' && Number.isFinite(s.resultPct))
    .sort((a, b) => (b.resultPct as number) - (a.resultPct as number) || a.name.localeCompare(b.name))
  const without = list
    .filter((s) => !(typeof s.resultPct === 'number' && Number.isFinite(s.resultPct)))
    .sort((a, b) => a.name.localeCompare(b.name))
  const out: Ranked[] = []
  withPct.forEach((s, i) => {
    const prev = out[i - 1]
    const rank = prev && prev.s.resultPct === s.resultPct ? prev.rank : i + 1
    out.push({ s, rank })
  })
  for (const s of without) out.push({ s, rank: null })
  return out
}
