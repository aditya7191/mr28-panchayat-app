import type { AppData, Settings } from '../types'
import { DEFAULT_SETTINGS } from '../types'
import {
  getSyncToken,
  gistApiUrl,
  gistRawUrl,
  isCloudSyncEnabled,
  repoRawUrl,
  SYNC_GIST_FILENAME,
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
    exportedAt: data.exportedAt || new Date().toISOString(),
  }
}

export function mergeRemoteWithLocalPassword(
  remote: AppData,
  localPassword: string,
): AppData {
  const remotePwd = remote.settings?.adminPassword?.trim()
  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    ...remote.settings,
    adminPassword:
      localPassword || remotePwd || DEFAULT_SETTINGS.adminPassword,
  }
  return {
    version: remote.version || 1,
    settings,
    members: Array.isArray(remote.members) ? remote.members : [],
    payments: Array.isArray(remote.payments) ? remote.payments : [],
    exportedAt: remote.exportedAt,
  }
}

function parseAppData(json: unknown): AppData | null {
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
    exportedAt: typeof o.exportedAt === 'string' ? o.exportedAt : undefined,
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
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
    const res = await fetch(gistApiUrl(), {
      method: 'PATCH',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify(body),
    })
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

/** Prefer remote when it has a newer exportedAt, or when local has no members but remote does. */
export function shouldPreferRemote(local: AppData, remote: AppData): boolean {
  const localAt = local.exportedAt || ''
  const remoteAt = remote.exportedAt || ''
  if (remoteAt && remoteAt > localAt) return true
  if (
    (local.members?.length || 0) === 0 &&
    (remote.members?.length || 0) > 0
  ) {
    return true
  }
  if (!localAt && remoteAt) return true
  return false
}
