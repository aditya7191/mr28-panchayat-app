import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { t as translate, type StringKey } from '../i18n'
import type { Lang } from '../types'

interface I18nCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: StringKey) => string
  toggle: () => void
}

const Ctx = createContext<I18nCtx | null>(null)

export function I18nProvider({
  children,
  initial = 'gu',
}: {
  children: ReactNode
  initial?: Lang
}) {
  const [lang, setLang] = useState<Lang>(initial)
  const t = useCallback((key: StringKey) => translate(key, lang), [lang])
  const toggle = useCallback(
    () => setLang((l) => (l === 'gu' ? 'en' : 'gu')),
    [],
  )
  const value = useMemo(
    () => ({ lang, setLang, t, toggle }),
    [lang, t, toggle],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useI18n() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useI18n outside provider')
  return ctx
}
