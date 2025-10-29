const BASE = (import.meta.env.VITE_API_BASE_URL || '').trim()
const PREFIX = (import.meta.env.VITE_API_PREFIX || '').trim()
const LOGIN_PATH = (import.meta.env.VITE_AUTH_LOGIN_PATH || '/token/').trim()
const REFRESH_PATH = (import.meta.env.VITE_AUTH_REFRESH_PATH || '/token/refresh/').trim()
const TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000)

function trimSlashEnd(s: string) {
  return s.endsWith('/') ? s.slice(0, -1) : s
}

function ensureLeading(path: string) {
  return path.startsWith('/') ? path : `/${path}`
}

export const apiEnv = {
  baseUrl: trimSlashEnd(BASE),
  prefix: PREFIX ? ensureLeading(trimSlashEnd(PREFIX)) : '',
  loginPath: ensureLeading(LOGIN_PATH),
  refreshPath: ensureLeading(REFRESH_PATH),
  timeout: TIMEOUT,
}

export function apiBaseUrl() {
  return `${apiEnv.baseUrl}${apiEnv.prefix}`
}

