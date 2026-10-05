import { useRef, useState } from 'react'
import { useI18n } from '../hooks/useI18n'
import { useStore } from '../hooks/useStore'
import type { AppData, Lang, Settings as SettingsType } from '../types'
import {
  downloadBlob,
  membersToCsv,
  paymentsToCsv,
} from '../utils/format'

export function Settings() {
  const { t, lang, setLang } = useI18n()
  const {
    settings,
    updateSettings,
    exportData,
    importData,
    clearData,
    members,
    payments,
  } = useStore()
  const [form, setForm] = useState<SettingsType>({ ...settings })
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function patch<K extends keyof SettingsType>(key: K, value: SettingsType[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    await updateSettings(form)
    setLang(form.defaultLang)
    setMsg(t('settingsSaved'))
    setTimeout(() => setMsg(''), 2000)
  }

  async function handleExportJson() {
    const data = await exportData()
    downloadBlob(
      `mr28-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(data, null, 2),
      'application/json',
    )
  }

  async function handleExportCsv() {
    const mCsv = membersToCsv(members)
    const pCsv = paymentsToCsv(payments, members)
    downloadBlob(
      `mr28-members-${new Date().toISOString().slice(0, 10)}.csv`,
      mCsv,
      'text/csv',
    )
    downloadBlob(
      `mr28-payments-${new Date().toISOString().slice(0, 10)}.csv`,
      pCsv,
      'text/csv',
    )
  }

  async function handleImport(file: File) {
    try {
      const text = await file.text()
      const data = JSON.parse(text) as AppData
      await importData(data)
      setForm({ ...data.settings })
      setMsg(t('importSuccess'))
      setTimeout(() => setMsg(''), 2500)
    } catch {
      setMsg(t('importFail'))
      setTimeout(() => setMsg(''), 2500)
    }
  }

  async function handleClear() {
    if (!confirm(t('confirmClear'))) return
    await clearData()
    setForm({ ...settings, nextMemberCounter: 1, nextReceiptCounter: 1 })
    // reload form from cleared defaults
    window.location.reload()
  }

  const field =
    'w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-sm outline-none focus:border-saffron'
  const label = 'mb-1 block text-xs font-semibold text-navy/70'
  const section = 'rounded-xl border border-navy/10 bg-white p-3 shadow-sm'

  return (
    <div className="flex flex-col gap-4 pb-4">
      <h2 className="text-lg font-bold text-navy">{t('settingsTitle')}</h2>

      {msg && (
        <p className="rounded-lg bg-success/10 px-3 py-2 text-sm font-semibold text-success">
          {msg}
        </p>
      )}

      <section className={section}>
        <h3 className="mb-3 text-sm font-bold text-navy">{t('orgInfo')}</h3>
        <div className="flex flex-col gap-2.5">
          <div>
            <label className={label}>{t('orgNameGu')}</label>
            <input className={field} value={form.orgNameGu} onChange={(e) => patch('orgNameGu', e.target.value)} />
          </div>
          <div>
            <label className={label}>{t('orgNameEn')}</label>
            <input className={field} value={form.orgNameEn} onChange={(e) => patch('orgNameEn', e.target.value)} />
          </div>
          <div>
            <label className={label}>{t('orgSubtitleGu')}</label>
            <input className={field} value={form.orgSubtitleGu} onChange={(e) => patch('orgSubtitleGu', e.target.value)} />
          </div>
          <div>
            <label className={label}>{t('orgSubtitleEn')}</label>
            <input className={field} value={form.orgSubtitleEn} onChange={(e) => patch('orgSubtitleEn', e.target.value)} />
          </div>
        </div>
      </section>

      <section className={section}>
        <h3 className="mb-3 text-sm font-bold text-navy">{t('feeRates')}</h3>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className={label}>{t('monthlyFee')}</label>
            <input
              className={field}
              type="number"
              min={0}
              value={form.monthlyFee}
              onChange={(e) => patch('monthlyFee', Number(e.target.value))}
            />
          </div>
          <div>
            <label className={label}>{t('yearlyFee')}</label>
            <input
              className={field}
              type="number"
              min={0}
              value={form.yearlyFee}
              onChange={(e) => patch('yearlyFee', Number(e.target.value))}
            />
          </div>
        </div>
      </section>

      <section className={section}>
        <h3 className="mb-3 text-sm font-bold text-navy">{t('counters')}</h3>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className={label}>{t('nextMemberNo')}</label>
            <input
              className={field}
              type="number"
              min={1}
              value={form.nextMemberCounter}
              onChange={(e) => patch('nextMemberCounter', Number(e.target.value))}
            />
            <p className="mt-1 text-[10px] text-navy/40">
              → MR28-{String(form.nextMemberCounter).padStart(4, '0')}
            </p>
          </div>
          <div>
            <label className={label}>{t('nextReceiptNo')}</label>
            <input
              className={field}
              type="number"
              min={1}
              value={form.nextReceiptCounter}
              onChange={(e) => patch('nextReceiptCounter', Number(e.target.value))}
            />
            <p className="mt-1 text-[10px] text-navy/40">
              → MR28-R-{String(form.nextReceiptCounter).padStart(4, '0')}
            </p>
          </div>
        </div>
      </section>

      <section className={section}>
        <h3 className="mb-3 text-sm font-bold text-navy">{t('languageDefault')}</h3>
        <div className="flex gap-2">
          {(['gu', 'en'] as Lang[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => {
                patch('defaultLang', l)
                setLang(l)
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
                (form.defaultLang === l ? lang === l : false) || form.defaultLang === l
                  ? 'bg-navy text-white'
                  : 'border border-navy/15 bg-white text-navy'
              }`}
            >
              {l === 'gu' ? t('gujarati') : t('english')}
            </button>
          ))}
        </div>
      </section>

      <section className={section}>
        <h3 className="mb-3 text-sm font-bold text-navy">{t('paymentInfo')}</h3>
        <div className="flex flex-col gap-2.5">
          <div>
            <label className={label}>{t('upiId')}</label>
            <input className={field} value={form.upiId} onChange={(e) => patch('upiId', e.target.value)} placeholder="name@upi" />
          </div>
          <div>
            <label className={label}>{t('bankDetails')}</label>
            <textarea className={field} rows={2} value={form.bankDetails} onChange={(e) => patch('bankDetails', e.target.value)} />
          </div>
        </div>
      </section>

      <section className={section}>
        <h3 className="mb-3 text-sm font-bold text-navy">{t('whatsAppSection')}</h3>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-navy/10 bg-cream/50 p-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-saffron"
            checked={form.autoWhatsAppAfterPayment ?? true}
            onChange={(e) => patch('autoWhatsAppAfterPayment', e.target.checked)}
          />
          <span>
            <span className="block text-sm font-semibold text-navy">
              {t('autoWhatsAppAfterPayment')}
            </span>
            <span className="mt-0.5 block text-[11px] text-navy/50">
              {t('autoWhatsAppAfterPaymentHint')}
            </span>
          </span>
        </label>
        <div className="mt-3">
          <label className={label}>{t('whatsAppBatchDelay')}</label>
          <input
            className={field}
            type="number"
            min={1}
            max={30}
            step={1}
            value={Math.round((form.whatsAppBatchDelayMs || 2000) / 1000)}
            onChange={(e) => {
              const sec = Math.max(1, Math.min(30, Number(e.target.value) || 2))
              patch('whatsAppBatchDelayMs', sec * 1000)
            }}
          />
          <p className="mt-1 text-[10px] text-navy/40">{t('whatsAppBatchDelayHint')}</p>
        </div>
        <p className="mt-3 text-[11px] leading-snug text-navy/45">
          Phone-native via wa.me (prefilled). Full silent WhatsApp Business API
          can be added later with Meta credentials. / ફોન પર wa.me થી ખુલે છે;
          પૂર્ણ API પછીથી Meta સાથે ઉમેરી શકાય.
        </p>
      </section>

      <button
        type="button"
        onClick={() => void handleSave()}
        className="w-full rounded-xl bg-saffron py-3 text-sm font-bold text-white"
      >
        {t('saveSettings')}
      </button>

      <section className={section}>
        <h3 className="mb-3 text-sm font-bold text-navy">{t('dataBackup')}</h3>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void handleExportJson()}
            className="rounded-xl border border-navy/20 py-2.5 text-sm font-semibold text-navy"
          >
            {t('exportJson')}
          </button>
          <button
            type="button"
            onClick={() => void handleExportCsv()}
            className="rounded-xl border border-navy/20 py-2.5 text-sm font-semibold text-navy"
          >
            {t('exportCsv')}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-xl border border-navy/20 py-2.5 text-sm font-semibold text-navy"
          >
            {t('importJson')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleImport(f)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => void handleClear()}
            className="rounded-xl border border-danger/30 py-2.5 text-sm font-semibold text-danger"
          >
            {t('clearData')}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-navy/40">
          Data stays in this browser (IndexedDB). Export JSON regularly for backup.
          / ડેટા આ બ્રાઉઝરમાં સાચવાય છે. નિયમિત JSON બેકઅપ લો.
        </p>
      </section>
    </div>
  )
}
