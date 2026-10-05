/** Cloud sync config — GitHub Gist (public read, token write). */

export const SYNC_GIST_ID = '4e7214d56f96f251037fdaf8307f7697'
export const SYNC_GIST_FILENAME = 'db.json'
export const SYNC_GIST_OWNER = 'aditya7191'

/** Raw URL (CORS-enabled). Append ?t= for cache bust. */
export function gistRawUrl(cacheBust = true): string {
  const base = `https://gist.githubusercontent.com/${SYNC_GIST_OWNER}/${SYNC_GIST_ID}/raw/${SYNC_GIST_FILENAME}`
  return cacheBust ? `${base}?t=${Date.now()}` : base
}

export function gistApiUrl(): string {
  return `https://api.github.com/gists/${SYNC_GIST_ID}`
}

/** Fallback: repo file on main (public read). */
export const SYNC_REPO = {
  owner: 'aditya7191',
  repo: 'mr28-panchayat-app',
  path: 'data/db.json',
  branch: 'main',
} as const

export function repoRawUrl(cacheBust = true): string {
  const base = `https://raw.githubusercontent.com/${SYNC_REPO.owner}/${SYNC_REPO.repo}/${SYNC_REPO.branch}/${SYNC_REPO.path}`
  return cacheBust ? `${base}?t=${Date.now()}` : base
}

const TOKEN_KEY = 'mr28-gh-sync-token'
const ENABLED_KEY = 'mr28-cloud-sync-enabled'

export function getSyncToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY)?.trim() || ''
  } catch {
    return ''
  }
}

export function setSyncToken(token: string): void {
  try {
    const t = token.trim()
    if (t) localStorage.setItem(TOKEN_KEY, t)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

/** Cloud sync on by default so public/admin devices pull shared data. */
export function isCloudSyncEnabled(): boolean {
  try {
    const v = localStorage.getItem(ENABLED_KEY)
    if (v === null) return true
    return v === '1'
  } catch {
    return true
  }
}

export function setCloudSyncEnabled(on: boolean): void {
  try {
    localStorage.setItem(ENABLED_KEY, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export const PAT_HELP_URL =
  'https://github.com/settings/tokens/new?scopes=gist&description=MR28%20Panchayat%20cloud%20sync'
