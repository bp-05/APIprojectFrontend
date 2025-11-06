import axios from 'axios'
import { apiBaseUrl, apiEnv } from './env'

const http = axios.create({
  baseURL: apiBaseUrl(),
  timeout: apiEnv.timeout,
  withCredentials: false,
})

let isRefreshing = false
let pendingQueue: Array<{ resolve: (t: string) => void; reject: (e: any) => void }> = []
let loggingOut = false

function getAccess() {
  return localStorage.getItem('access_token') || ''
}

function getRefresh() {
  return localStorage.getItem('refresh_token') || ''
}

function setAccess(token: string) {
  localStorage.setItem('access_token', token)
}

function handleAuthFailure() {
  if (loggingOut) return
  loggingOut = true
  try {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_role')
  } catch {}
  // Redirigir al login para reautenticar cuando backend se reinicia o el token vence
  try {
    if (typeof window !== 'undefined' && window.location) {
      window.location.assign('/login')
    }
  } catch {}
}

http.interceptors.request.use((config) => {
  const token = getAccess()
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (!original || error.response?.status !== 401) return Promise.reject(error)

    if (original.__isRetry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject })
      })
        .then((newToken) => {
          original.headers = original.headers || {}
          original.headers.Authorization = `Bearer ${newToken}`
          original.__isRetry = true
          return http(original)
        })
        .catch((e) => Promise.reject(e))
    }

    isRefreshing = true
    try {
      const refresh = getRefresh()
      if (!refresh) {
        handleAuthFailure()
        throw error
      }
      const { data } = await axios.post(
        `${apiBaseUrl()}${apiEnv.refreshPath}`,
        { refresh },
        { timeout: apiEnv.timeout }
      )
      const newAccess = data?.access as string
      if (!newAccess) {
        handleAuthFailure()
        throw error
      }
      setAccess(newAccess)
      pendingQueue.forEach(({ resolve }) => resolve(newAccess))
      pendingQueue = []

      original.headers = original.headers || {}
      original.headers.Authorization = `Bearer ${newAccess}`
      original.__isRetry = true
      return http(original)
    } catch (e) {
      pendingQueue.forEach(({ reject }) => reject(e))
      pendingQueue = []
      handleAuthFailure()
      return Promise.reject(e)
    } finally {
      isRefreshing = false
    }
  }
)

export default http

