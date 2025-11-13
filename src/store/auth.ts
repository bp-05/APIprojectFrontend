import { create } from 'zustand'
import axios from 'axios'
import http from '../lib/http'
import { apiBaseUrl, apiEnv } from '../lib/env'

type AuthState = {
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  role: UserRole | null
  user: MeResponse | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  hydrate: () => void
  loadMe: () => Promise<MeResponse>
}

export type UserRole = 'ADMIN' | 'VCM' | 'DAC' | 'DC' | 'DOC' | 'COORD'
export type MeResponse = {
  area: number | null
  career: number | null
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  full_name?: string
  role: UserRole
  is_staff: boolean
  is_superuser: boolean
  date_joined: string
}

export const useAuth = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  role: null,
  user: null,
  hydrate: () => {
    const access = localStorage.getItem('access_token')
    const refresh = localStorage.getItem('refresh_token')
    const role = (localStorage.getItem('user_role') as UserRole | null) || null
    set({ accessToken: access, refreshToken: refresh, isAuthenticated: !!access, role })
  },
  login: async (email: string, password: string) => {
    const { data } = await axios.post(
      `${apiBaseUrl()}${apiEnv.loginPath}`,
      { email, password },
      { headers: { 'Content-Type': 'application/json' }, timeout: apiEnv.timeout }
    )

    const access = data?.access as string | undefined
    const refresh = data?.refresh as string | undefined
    if (!access || !refresh) throw new Error('Respuesta de login inválida')

    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    set({ accessToken: access, refreshToken: refresh, isAuthenticated: true })
  },
  loadMe: async () => {
    const { data } = await http.get<MeResponse>('/users/me/')
    if (data?.role) localStorage.setItem('user_role', data.role)
    set({ user: data, role: data.role ?? null })
    return data
  },
  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_role')
    set({ accessToken: null, refreshToken: null, isAuthenticated: false, user: null, role: null })
  },
}))

