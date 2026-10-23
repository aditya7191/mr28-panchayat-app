import type { AppData, EduStudent, Settings, Tombstones } from '../types'
import { normalizeTombstones } from './merge'
import { DEFAULT_SETTINGS } from '../types'
import {
  getSyncToken,
  gistApiUrl,
  gistRawUrl,
  isCloudSyncEnabled,
  repoRawUrl,
  SYNC_GIST_FILENAME,
  billFileName,
  billRawUrl,
  billsGistApiUrl,
} from './config'

export type SyncStatus =
  | 'idle'
  | 'pulling'
  | 'pushing'
  | 'ok'
  | 'readonly'
  | 'error'

export interface SyncResult {
  ok: boolean
  data?: AppData
  error?: string
  source?: 'gist' | 'repo' | 'none'
}

/** Copy only the allowed public keys of a student; `secret` must be ciphertext. */
export function publicEduStudent(s: EduStudent): EduStudent {
  const pct = s.resultPct === null || s.resultPct === undefined ? null : Number(s.resultPct)
  return {
    id: String(s.id),
    programId: String(s.programId || ''),
    name: String(s.name || ''),
    school: String(s.school || ''),
    standard: String(s.standard || ''),
    stream: String(s.stream || ''),
    goal: String(s.goal || ''),
    parents: String(s.parents || ''),
    resultPct: pct !== null && Number.isFinite(pct) ? pct : null,
    status: String(s.status || ''),
    secret: typeof s.secret === 'string' && s.secret.startsWith('v1.') ? s.secret : '',
    createdAt: String(s.createdAt || ''),
    updatedAt: String(s.updatedAt || ''),
  }
}

/** Strip secrets before uploading to a public gist. */
export function sanitizeForCloud(data: AppData): AppData {
  const settings: Settings = {
    ...data.settings,
    // Never publish admin password to the public gist/repo
    adminPassword: '',
  }
  return {
    version: data.version || 1,
    settings,
    members: Array.isArray(data.members) ? data.members : [],
    payments: Array.isArray(data.payments) ? data.payments : [],
    expenses: Array.isArray(data.expenses) ? data.expenses : [],
    eduPrograms: Array.isArray(data.eduPrograms) ? data.eduPrograms : [],
    // Whitelist public fields; private data only ever travels as ciphertext in `secret`.
    eduStudents: (Array.isArray(data.eduStudents) ? data.eduStudents : []).map(publicEduStudent),
    deleted: normalizeTombstones(data.deleted),
    exportedAt: data.exportedAt || new Date().toISOString(),
  }
}

export function parseAppData(json: unknown): AppData | null {
  if (!json || typeof json !== 'object') return null
  const o = json as Record<string, unknown>
  if (!o.settings && !Array.isArray(o.members)) return null
  return {
    version: typeof o.version === 'number' ? o.version : 1,
    settings: { ...DEFAULT_SETTINGS, ...((o.settings as Settings) || {}) },
    members: Array.isArray(o.members) ? (o.members as AppData['members']) : [],
    payments: Array.isArray(o.payments)
      ? (o.payments as AppData['payments'])
      : [],
    expenses: Array.isArray(o.expenses)
      ? (o.expenses as NonNullable<AppData['expenses']>)
      : [],
    eduPrograms: Array.isArray(o.eduPrograms)
      ? (o.eduPrograms as NonNullable<AppData['eduPrograms']>)
      : [],
    eduStudents: Array.isArray(o.eduStudents)
      ? (o.eduStudents as NonNullable<AppData['eduStudents']>).map(publicEduStudent)
      : [],
    exportedAt: typeof o.exportedAt === 'string' ? o.exportedAt : undefined,
    deleted: normalizeTombstones(o.deleted as Tombstones | undefined),
  }
}

const FETCH_TIMEOUT_MS = 8000

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error(`Timed out after ${timeoutMs}ms`)
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetchWithTimeout(url, {
    method: 'GET',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** Public pull — no token required. Tries gist raw, then repo raw. */
export async function pullCloudData(): Promise<SyncResult> {
  if (!isCloudSyncEnabled()) {
    return { ok: false, error: 'Cloud sync disabled', source: 'none' }
  }

  try {
    const json = await fetchJson(gistRawUrl(true))
    const data = parseAppData(json)
    if (data) return { ok: true, data, source: 'gist' }
  } catch {
    /* try repo */
  }

  try {
    const json = await fetchJson(repoRawUrl(true))
    const data = parseAppData(json)
    if (data) return { ok: true, data, source: 'repo' }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Pull failed',
      source: 'none',
    }
  }

  return { ok: false, error: 'Invalid cloud data', source: 'none' }
}

/**
 * Fresh read straight from the GitHub API (no CDN cache), using the admin token.
 * Used right before a push so we merge with the real latest cloud copy and never
 * overwrite entries that another phone just uploaded.
 */
export async function pullCloudDataFresh(): Promise<SyncResult> {
  const token = getSyncToken()
  if (!token) return pullCloudData()
  try {
    const res = await fetchWithTimeout(gistApiUrl(), {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        error:
          'Token rejected — create a classic PAT with the gist scope and paste it in Settings',
        source: 'gist',
      }
    }
    if (!res.ok) throw new Error(`GitHub ${res.status}`)
    const j = (await res.json()) as {
      files?: Record<string, { content?: string; truncated?: boolean; raw_url?: string }>
    }
    const f = j.files?.[SYNC_GIST_FILENAME]
    if (!f) return { ok: false, error: 'db.json missing in gist', source: 'gist' }
    let text = f.content || ''
    if (f.truncated && f.raw_url) {
      const r = await fetchWithTimeout(f.raw_url, { cache: 'no-store' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      text = await r.text()
    }
    const data = parseAppData(JSON.parse(text))
    if (!data) return { ok: false, error: 'Invalid cloud data', source: 'gist' }
    return { ok: true, data, source: 'gist' }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Pull failed',
      source: 'gist',
    }
  }
}

/**
 * Push to the public gist via GitHub API.
 * Requires a Personal Access Token with the `gist` scope, stored only in localStorage.
 */
export async function pushCloudData(data: AppData): Promise<SyncResult> {
  if (!isCloudSyncEnabled()) {
    return { ok: false, error: 'Cloud sync disabled', source: 'none' }
  }

  const token = getSyncToken()
  if (!token) {
    return {
      ok: false,
      error: 'No GitHub token — add one in Settings → Cloud Sync',
      source: 'gist',
    }
  }

  const payload = sanitizeForCloud({
    ...data,
    exportedAt: new Date().toISOString(),
  })
  const body = {
    files: {
      [SYNC_GIST_FILENAME]: {
        content: JSON.stringify(payload, null, 2),
      },
    },
  }

  try {
    const res = await fetchWithTimeout(gistApiUrl(), {
      method: 'PATCH',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify(body),
    }, 15000)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      let msg = `GitHub ${res.status}`
      if (res.status === 401 || res.status === 403) {
        msg =
          'Token rejected — create a classic PAT with the gist scope and paste it in Settings'
      } else if (text) {
        try {
          const j = JSON.parse(text) as { message?: string }
          if (j.message) msg = j.message
        } catch {
          /* keep msg */
        }
      }
      return { ok: false, error: msg, source: 'gist' }
    }
    return { ok: true, data: payload, source: 'gist' }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Push failed',
      source: 'gist',
    }
  }
}

export function canPush(): boolean {
  return isCloudSyncEnabled() && Boolean(getSyncToken())
}

// ---------- Bill images: one file per image (bill-<id>.txt) in a separate public gist ----------

export async function uploadBillFile(id: string, dataUrl: string): Promise<boolean> {
  const token = getSyncToken()
  if (!token) return false
  try {
    const res = await fetchWithTimeout(
      billsGistApiUrl(),
      {
        method: 'PATCH',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({ files: { [billFileName(id)]: { content: dataUrl } } }),
      },
      30000,
    )
    return res.ok
  } catch {
    return false
  }
}

export async function fetchBillFile(id: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(billRawUrl(id), { cache: 'no-store' }, 15000)
    if (!res.ok) return null
    const text = (await res.text()).trim()
    return text.startsWith('data:image/') ? text : null
  } catch {
    return null
  }
}
