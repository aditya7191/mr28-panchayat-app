import { useCallback, useEffect, useRef, useState } from 'react'
import { DeveloperCredit } from '../components/DeveloperCredit'
import { LocalOnlyWarning } from '../components/LocalOnlyWarning'
import type { BackupSnapshot } from '../db'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'
import { useStore } from '../hooks/useStore'
import type { AppData, Lang, Settings as SettingsType } from '../types'
import {
  downloadBlob,
  membersToCsv,
  paymentsToCsv,
} from '../utils/format'
import {
  PAT_HELP_URL,
  canPush,
  getSyncToken,
  isCloudSyncEnabled,
  setCloudSyncEnabled,
  setSyncToken,
} from '../sync'

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
    syncStatus,
    syncError,
    lastSyncedAt,
    pullCloud,
    pushCloud,
    listBackups,
    restoreBackup,
  } = useStore()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<SettingsType>({ ...settings })
  const [msg, setMsg] = useState('')
  const [pwdConfirm, setPwdConfirm] = useState('')
  const [tokenInput, setTokenInput] = useState('')
  const [syncOn, setSyncOn] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)
  const [dirty, setDirty] = useState(false)
  const [backups, setBackups] = useState<BackupSnapshot[]>([])

  useEffect(() => {
    setTokenInput(getSyncToken())
    setSyncOn(isCloudSyncEnabled())
  }, [])

  // Keep the form in step with store settings (e.g. after a cloud merge) until the admin edits it.
  useEffect(() => {
    if (!dirty) setForm({ ...settings })
  }, [settings, dirty])

  const reloadBackups = useCallback(() => {
    void listBackups().then(setBackups).catch(() => setBackups([]))
  }, [listBackups])

  useEffect(() => {
    reloadBackups()
  }, [reloadBackups, members, payments])

  async function handleRestore(b: BackupSnapshot) {
    const total = b.data.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
    const ok = confirm(
      `બેકઅપ પાછો લાવવો છે?\n${new Date(b.at).toLocaleString()}\n` +
        `${b.data.members.length} સભ્યો / members · ${b.data.payments.length} રસીદ / receipts · ₹${total}\n\n` +
        'આ બેકઅપની એન્ટ્રી પાછી ઉમેરાશે; હાલની કોઈ એન્ટ્રી કાઢવામાં નહીં આવે.\n' +
        'Entries from this backup will be added back; nothing currently on this phone is removed.',
    )
    if (!ok) return
    const done = await restoreBackup(b.id)
    setMsg(done ? 'બેકઅપ પાછો લાવ્યો / Backup restored' : t('importFail'))
    setTimeout(() => setMsg(''), 3000)
    reloadBackups()
  }

  function patch<K extends keyof SettingsType>(key: K, value: SettingsType[K]) {
    setDirty(true)
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    const next = { ...form }
    if (!next.adminPassword?.trim()) {
      next.adminPassword = 'aditya@1989'
    }
    if (next.adminPassword !== (settings.adminPassword || 'aditya@1989')) {
      if (!pwdConfirm || pwdConfirm !== next.adminPassword) {
        setMsg(t('wrongPassword'))
        setTimeout(() => setMsg(''), 2500)
        return
      }
    }
    await updateSettings(next)
    setDirty(false)
    setPwdConfirm('')
    setLang(next.defaultLang)
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

  async function handleExportExcel() {
    const { downloadExcelBackup } = await import('../utils/backupExport')
    downloadExcelBackup(members, payments)
  }

  async function handleExportPdf() {
    const { downloadPdfBackup } = await import('../utils/backupExport')
    downloadPdfBackup(settings, members, payments)
  }

  async function handleImport(file: File) {
    try {
      const text = await file.text()
      const data = JSON.parse(text) as AppData
      await importData(data)
      setDirty(false)
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
    setDirty(false)
    reloadBackups()
  }

  const field =
    'w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-sm outline-none focus:border-saffron'
  const label = 'mb-1 block text-xs font-semibold text-navy/70'
  const section = 'rounded-xl border border-navy/10 bg-white p-3 shadow-sm'

  return (
    <div className="flex flex-col gap-4 pb-4">
      <h2 className="text-lg font-bold text-navy">{t('settingsTitle')}</h2>

      <LocalOnlyWarning showLink={false} />

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
          <div>
            <label className={label}>{t('receivedBy')}</label>
            <input
              className={field}
              value={form.receivedBy ?? ''}
              onChange={(e) => patch('receivedBy', e.target.value)}
              placeholder="Aditya Solanki (Vice Secretary)"
            />
            <p className="mt-1 text-[10px] text-navy/40">{t('receivedByHint')}</p>
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


      <section className={section}>
        <h3 className="mb-3 text-sm font-bold text-navy">{t('changeAdminPassword')}</h3>
        <div className="flex flex-col gap-2.5">
          <div>
            <label className={label}>{t('adminPassword')}</label>
            <input
              className={field}
              type="password"
              autoComplete="new-password"
              value={form.adminPassword ?? 'aditya@1989'}
              onChange={(e) => patch('adminPassword', e.target.value)}
            />
          </div>
          <div>
            <label className={label}>{t('adminPassword')} (confirm)</label>
            <input
              className={field}
              type="password"
              autoComplete="new-password"
              value={pwdConfirm}
              onChange={(e) => setPwdConfirm(e.target.value)}
              placeholder={form.adminPassword || 'aditya@1989'}
            />
          </div>
          <p className="text-[10px] text-navy/40">{t('adminPasswordHint')}</p>
          <button
            type="button"
            onClick={() => {
              logout()
              navigate('/gate', { replace: true })
            }}
            className="rounded-xl border border-navy/20 py-2.5 text-sm font-semibold text-navy"
          >
            {t('logout')}
          </button>
        </div>
      </section>

      <button
        type="button"
        onClick={() => void handleSave()}
        className="w-full rounded-xl bg-saffron py-3 text-sm font-bold text-white"
      >
        {t('saveSettings')}
      </button>


      <section className={section}>
        <h3 className="mb-3 text-sm font-bold text-navy">{t('cloudSync')}</h3>
        <p className="mb-3 text-[11px] leading-snug text-navy/55">{t('cloudSyncHint')}</p>

        <label className="mb-3 flex cursor-pointer items-start gap-3 rounded-lg border border-navy/10 bg-cream/50 p-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-saffron"
            checked={syncOn}
            onChange={(e) => {
              const on = e.target.checked
              setSyncOn(on)
              setCloudSyncEnabled(on)
            }}
          />
          <span className="block text-sm font-semibold text-navy">
            {t('cloudSyncEnable')}
          </span>
        </label>

        <div className="mb-3 rounded-lg border border-navy/10 bg-cream/40 px-3 py-2 text-[11px] text-navy/70">
          <span className="font-semibold">{t('cloudSyncStatus')}: </span>
          {syncStatus === 'pushing' && t('cloudSyncPushing')}
          {syncStatus === 'pulling' && t('cloudSyncPulling')}
          {syncStatus === 'ok' && t('cloudSyncOk')}
          {syncStatus === 'readonly' && t('cloudSyncReadonly')}
          {syncStatus === 'error' && (
            <span className="text-danger">
              {t('cloudSyncError')}: {syncError || '—'}
            </span>
          )}
          {(syncStatus === 'idle' || syncStatus === 'ok' || syncStatus === 'readonly') &&
            lastSyncedAt && (
              <span className="mt-0.5 block text-navy/45">
                {new Date(lastSyncedAt).toLocaleString()}
              </span>
            )}
          {syncError && syncStatus !== 'error' && (
            <span className="mt-0.5 block text-danger">{syncError}</span>
          )}
        </div>

        <div className="mb-2">
          <label className={label}>{t('cloudSyncToken')}</label>
          <input
            className={field}
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="ghp_… or github_pat_…"
          />
          <p className="mt-1 text-[10px] text-navy/40">{t('cloudSyncTokenHint')}</p>
        </div>

        <div className="mb-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              setSyncToken(tokenInput)
              setMsg(
                tokenInput.trim() ? t('cloudSyncSavedToken') : t('cloudSyncClearedToken'),
              )
              setTimeout(() => setMsg(''), 2000)
              if (tokenInput.trim()) void pushCloud()
            }}
            className="rounded-xl border border-navy/20 py-2.5 text-sm font-semibold text-navy"
          >
            {t('save')} — PAT
          </button>
          <a
            href={PAT_HELP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-saffron/40 bg-saffron/10 py-2.5 text-center text-sm font-semibold text-saffron-dark"
          >
            {t('cloudSyncCreateToken')} ↗
          </a>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void pullCloud().then(() => {
                setMsg(t('cloudSyncOk'))
                setTimeout(() => setMsg(''), 2000)
              })}
              className="rounded-xl border border-navy/20 py-2.5 text-sm font-semibold text-navy"
            >
              {t('cloudSyncPull')}
            </button>
            <button
              type="button"
              onClick={() => void pushCloud().then((ok) => {
                setMsg(ok ? t('cloudSyncOk') : t('cloudSyncError'))
                setTimeout(() => setMsg(''), 2500)
              })}
              className="rounded-xl border border-navy/20 py-2.5 text-sm font-semibold text-navy"
            >
              {t('cloudSyncPush')}
            </button>
          </div>
        </div>
        <p className="text-[10px] leading-snug text-navy/40">{t('cloudSyncPrivacy')}</p>
        {!canPush() && syncOn && (
          <p className="mt-2 rounded-lg bg-saffron/10 px-2 py-1.5 text-[11px] font-semibold text-saffron-dark">
            {t('cloudSyncReadonly')}
          </p>
        )}
      </section>

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
            onClick={() => void handleExportExcel()}
            className="rounded-xl border border-navy/20 py-2.5 text-sm font-semibold text-navy"
          >
            {t('exportExcel')}
          </button>
          <button
            type="button"
            onClick={() => void handleExportPdf()}
            className="rounded-xl border border-navy/20 py-2.5 text-sm font-semibold text-navy"
          >
            {t('exportPdf')}
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
          ડેટા આ ફોનમાં (IndexedDB) સચવાય છે અને ક્લાઉડ સાથે એન્ટ્રી-દર-એન્ટ્રી મર્જ થાય છે —
          ક્લાઉડમાં ન હોય તો પણ આ ફોનની એન્ટ્રી ક્યારેય કાઢવામાં આવતી નથી. JSON / Excel / PDF બેકઅપ પણ રાખો. /
          Data is stored on this phone (IndexedDB) and merged entry-by-entry with the cloud — entries
          on this phone are never removed just because the cloud lacks them. Still export JSON, Excel, or PDF as offline backup.
        </p>
      </section>

      <section className={section}>
        <h3 className="mb-1 text-sm font-bold text-navy">
          ઓટો બેકઅપ / Restore backup
        </h3>
        <p className="mb-3 text-[11px] leading-snug text-navy/55">
          ડેટા બદલાય (ક્લાઉડ મર્જ, ડિલીટ, ઇમ્પોર્ટ) તે પહેલાં અને રોજ એક વાર આ ફોનમાં આપમેળે
          બેકઅપ લેવાય છે (છેલ્લા 10). Restore કરવાથી બેકઅપની એન્ટ્રી પાછી ઉમેરાય છે; હાલની કંઈ કાઢતું નથી. /
          Automatic snapshots are saved on this phone before data changes (cloud merge, delete,
          import) and once a day (last 10). Restore adds the backup&apos;s entries back; it removes nothing.
        </p>
        {backups.length === 0 ? (
          <p className="rounded-lg border border-dashed border-navy/20 p-3 text-center text-[12px] text-navy/50">
            હજુ કોઈ બેકઅપ નથી / No backups yet
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {backups.map((b) => {
              const total = b.data.payments.reduce(
                (sum, p) => sum + (Number(p.amount) || 0),
                0,
              )
              return (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-navy/10 bg-cream/40 px-3 py-2"
                >
                  <div className="min-w-0 text-[11px] text-navy/70">
                    <p className="font-semibold text-navy">
                      {new Date(b.at).toLocaleString()}
                    </p>
                    <p>
                      {b.data.members.length} સભ્યો/members · {b.data.payments.length}{' '}
                      રસીદ/receipts · ₹{total}
                    </p>
                    <p className="text-navy/40">{b.reason}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRestore(b)}
                    className="shrink-0 rounded-lg border border-saffron/50 bg-saffron/10 px-3 py-1.5 text-[12px] font-semibold text-saffron-dark"
                  >
                    Restore
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <DeveloperCredit className="pt-1" />
    </div>
  )
}
