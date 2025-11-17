export type PeriodSeason = 'O' | 'P'

export function normalizePeriodSeason(value?: string | null): PeriodSeason | null {
  if (!value) return null
  const token = value.toString().trim().toUpperCase()
  if (token === 'O' || token === 'P') return token
  if (token.startsWith('O')) return 'O'
  if (token.startsWith('P')) return 'P'
  return null
}

export function makePeriodCode(
  season: string | null | undefined,
  year: number | string | null | undefined
): string | null {
  const normalized = normalizePeriodSeason(season)
  const numericYear =
    typeof year === 'number'
      ? year
      : year === null || year === undefined || year === ''
        ? NaN
        : Number.parseInt(String(year), 10)
  if (!normalized || Number.isNaN(numericYear)) return null
  return `${normalized}-${numericYear}`
}

export function derivePeriodFromDate(date = new Date()): string {
  const month = date.getMonth() + 1
  const season: PeriodSeason = month <= 6 ? 'O' : 'P'
  return `${season}-${date.getFullYear()}`
}

export function parsePeriodCode(code?: string | null) {
  if (!code) return null
  const [seasonToken, yearToken] = code.split('-', 2)
  const season = normalizePeriodSeason(seasonToken)
  const year = Number.parseInt(yearToken, 10)
  if (!season || Number.isNaN(year)) return null
  return { season, year }
}
