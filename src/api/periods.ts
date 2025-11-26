import http from '../lib/http'
import { makePeriodCode, normalizePeriodSeason, type PeriodSeason } from '../lib/period'

export type PeriodPhaseSchedule = {
  id: number
  period_year: number
  period_season: PeriodSeason | string
  phase: string
  days_allocated: number
  start_date: string | null
  end_date: string | null
}

export type PeriodPhaseSchedulePayload = {
  period_year: number
  period_season: PeriodSeason
  phase: string
  start_date?: string | null
  end_date?: string | null
  days_allocated?: number | null
}

export type PeriodSetting = {
  period_year: number
  period_season: PeriodSeason
  updated_at?: string
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

export async function createPeriodPhaseSchedule(payload: PeriodPhaseSchedulePayload) {
  const { data } = await http.post<PeriodPhaseSchedule>(`/period-phase-schedules/`, payload)
  return data
}

export async function updatePeriodPhaseSchedule(id: number, payload: Partial<PeriodPhaseSchedulePayload>) {
  const { data } = await http.patch<PeriodPhaseSchedule>(`/period-phase-schedules/${id}/`, payload)
  return data
}

export async function deletePeriodPhaseSchedule(id: number) {
  await http.delete(`/period-phase-schedules/${id}/`)
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

export async function getPeriodSetting() {
  const { data } = await http.get<PeriodSetting>(`/period-setting/`)
  return data
}

export async function updatePeriodSetting(payload: PeriodSetting) {
  const { data } = await http.put<PeriodSetting>(`/period-setting/`, payload)
  return data
}
