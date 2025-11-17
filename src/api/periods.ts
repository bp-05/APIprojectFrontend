import http from '../lib/http'
import { makePeriodCode, normalizePeriodSeason, PeriodSeason } from '../lib/period'

export type PeriodPhaseSchedule = {
  id: number
  period_year: number
  period_season: PeriodSeason | string
  phase: string
  days_allocated: number
  start_date: string | null
  end_date: string | null
}

export async function listPeriodPhaseSchedules(params?: {
  period_year?: number
  period_season?: PeriodSeason
  ordering?: string
}) {
  const { data } = await http.get<PeriodPhaseSchedule[]>(`/period-phase-schedules/`, {
    params,
  })
  return data
}

export async function fetchLatestPeriodCode(): Promise<string | null> {
  const { data } = await http.get<PeriodPhaseSchedule[]>(`/period-phase-schedules/`, {
    params: { ordering: '-period_year,-period_season,-id' },
  })
  const candidate = data?.find(
    (entry) =>
      typeof entry?.period_year === 'number' && normalizePeriodSeason(entry?.period_season) !== null
  )
  return candidate ? makePeriodCode(candidate.period_season, candidate.period_year) : null
}
