import { create } from 'zustand'
import { derivePeriodFromDate, makePeriodCode, normalizePeriodSeason, parsePeriodCode, type PeriodSeason } from '../lib/period'

const STORAGE_KEY = 'current_period'

type PeriodState = {
  season: PeriodSeason
  year: number
  periodCode: string
  hydrate: () => void
  setPeriod: (season: PeriodSeason, year: number) => void
  setPeriodFromCode: (code: string | null | undefined) => void
  syncFromServer: () => Promise<{ season: PeriodSeason; year: number } | null>
}

function fallbackPeriod(): { season: PeriodSeason; year: number; code: string } {
  const fallback = derivePeriodFromDate()
  const parsed = parsePeriodCode(fallback) || { season: 'P' as PeriodSeason, year: new Date().getFullYear() }
  const code = makePeriodCode(parsed.season, parsed.year) || fallback
  return { season: parsed.season, year: parsed.year, code }
}

export const usePeriodStore = create<PeriodState>((set) => {
  const initial = fallbackPeriod()
  return {
    season: initial.season,
    year: initial.year,
    periodCode: initial.code,
    hydrate: () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        const parsed = parsePeriodCode(stored)
        if (parsed) {
          set({
            season: parsed.season,
            year: parsed.year,
            periodCode: `${parsed.season}-${parsed.year}`,
          })
        }
      } catch {
        // ignore hydration errors
      }
    },
    setPeriod: (season, year) => {
      const normalized = normalizePeriodSeason(season)
      if (!normalized || Number.isNaN(year)) return
      const code = makePeriodCode(normalized, year)
      if (!code) return
      try {
        localStorage.setItem(STORAGE_KEY, code)
      } catch {
        // ignore persist errors
      }
      set({ season: normalized, year, periodCode: code })
    },
    setPeriodFromCode: (code) => {
      const parsed = parsePeriodCode(code)
      if (!parsed) return
      try {
        localStorage.setItem(STORAGE_KEY, `${parsed.season}-${parsed.year}`)
      } catch {
        // ignore persist errors
      }
      set({
        season: parsed.season,
        year: parsed.year,
        periodCode: `${parsed.season}-${parsed.year}`,
      })
    },
    syncFromServer: async () => {
      // Note: The /period-setting/ endpoint is not available in the current API
      // Period is managed through localStorage or derived from the current date
      // This function is kept for compatibility but returns null immediately
      return null
    },
  }
})
