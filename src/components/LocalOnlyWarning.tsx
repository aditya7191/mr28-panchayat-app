import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useStore } from '../hooks/useStore'
import { canPush, isCloudSyncEnabled } from '../sync'

/**
 * Admin-only banner: tells the officer when entries live ONLY on this phone
 * (no cloud token, or the last upload failed). Always bilingual (GU + EN).
 */
export function LocalOnlyWarning({ showLink = true }: { showLink?: boolean }) {
  const { unsyncedCount, syncStatus, syncError } = useStore()
  const noToken = !canPush()
  const syncOff = !isCloudSyncEnabled()
  const failing = !noToken && syncStatus === 'error'
  const pending = unsyncedCount ?? 0

  if (!noToken && !syncOff && !failing) return null

  return (
    <div className="rounded-xl border-2 border-danger/40 bg-danger/5 p-3 text-[12px] leading-snug text-navy">
      <div className="mb-1 flex items-center gap-1.5 font-bold text-danger">
        <AlertTriangle size={16} />
        {noToken || syncOff
          ? 'ધ્યાન આપો: એન્ટ્રી ફક્ત આ ફોનમાં છે / Warning: entries are only on this phone'
          : 'ક્લાઉડ સિંક નિષ્ફળ / Cloud sync failed'}
      </div>
      {noToken || syncOff ? (
        <>
          <p>
            આ ફોનમાં ક્લાઉડ ટોકન (GitHub PAT) સેટ નથી. તમે નોંધેલા સભ્યો અને ચુકવણી
            ફક્ત આ ફોનમાં જ સચવાય છે — બીજા ફોન કે પબ્લિક પેજ પર નહીં દેખાય, અને
            ટોકન સેટ ન થાય ત્યાં સુધી ક્લાઉડમાં સિંક નહીં થાય.
          </p>
          <p className="mt-1 text-navy/70">
            No cloud token (GitHub PAT) is set on this phone. Members and payments you
            record are saved ONLY on this phone — they will not appear on other phones or
            the public page, and will not sync until the token is set.
          </p>
        </>
      ) : (
        <p>
          છેલ્લું અપલોડ નિષ્ફળ ગયું — ડેટા આ ફોનમાં સુરક્ષિત છે, ફરી પ્રયાસ થશે. / Last upload
          failed — data is safe on this phone and will retry. {syncError ? `(${syncError})` : ''}
        </p>
      )}
      {pending > 0 && (
        <p className="mt-1 font-semibold text-danger">
          ક્લાઉડમાં ન ગયેલી એન્ટ્રી: {pending} / Entries not yet in cloud: {pending}
        </p>
      )}
      <p className="mt-1 text-navy/60">
        સલામતી માટે Settings → “JSON એક્સપોર્ટ” થી બેકઅપ રાખો. / For safety, keep a backup via
        Settings → Export JSON.
      </p>
      {showLink && (
        <Link
          to="/settings"
          className="mt-2 inline-block rounded-lg bg-danger px-3 py-1.5 text-[12px] font-semibold text-white"
        >
          ટોકન સેટ કરો / Set token →
        </Link>
      )}
    </div>
  )
}
