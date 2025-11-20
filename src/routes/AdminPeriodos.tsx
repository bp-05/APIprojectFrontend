import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import {
  createPeriodPhaseSchedule,
  listPeriodPhaseSchedules,
  updatePeriodPhaseSchedule,
  type PeriodPhaseSchedule,
} from '../api/periods'
import { PeriodSeason, normalizePeriodSeason } from '../lib/period'
import { usePeriodStore } from '../store/period'

const PHASES: Array<{ value: string; label: string }> = [
  { value: 'inicio', label: 'Inicio' },
  { value: 'formulacion', label: 'Formulación de requerimientos' },
  { value: 'gestion', label: 'Gestión de requerimientos' },
  { value: 'validacion', label: 'Validación de requerimientos' },
  { value: 'completado', label: 'Completado' },
]

type PhaseStateEntry = { id?: number; start: string; end: string }
type PhaseState = Record<string, PhaseStateEntry>

const defaultPhaseState = (): PhaseState =>
  PHASES.reduce((acc, phase) => {
    acc[phase.value] = { start: '', end: '' }
    return acc
  }, {} as PhaseState)

function toInputDate(value: string | null) {
  return value ?? ''
}

function parseSeasonToken(value: string | PeriodSeason | null | undefined): PeriodSeason | null {
  return normalizePeriodSeason(value || undefined)
}

export default function AdminPeriodos() {
  const [items, setItems] = useState<PeriodPhaseSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phaseState, setPhaseState] = useState<PhaseState>(() => defaultPhaseState())
  const season = usePeriodStore((s) => s.season)
  const year = usePeriodStore((s) => s.year)
  const periodCode = usePeriodStore((s) => s.periodCode)
  const setPeriod = usePeriodStore((s) => s.setPeriod)
  const syncPeriodFromServer = usePeriodStore((s) => s.syncFromServer)
  const [yearInput, setYearInput] = useState(() => String(year))

  async function loadSchedules() {
    setLoading(true)
    setError(null)
    try {
      const data = await listPeriodPhaseSchedules()
      setItems(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo cargar la configuración de periodos'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchedules()
  }, [])

  useEffect(() => {
    syncPeriodFromServer().catch(() => null)
  }, [syncPeriodFromServer])

  useEffect(() => {
    setYearInput(String(year))
  }, [year])

  useEffect(() => {
    const filtered = items.filter(
      (entry) => entry.period_year === year && parseSeasonToken(entry.period_season) === season
    )
    const nextState = defaultPhaseState()
    filtered.forEach((entry) => {
      nextState[entry.phase] = {
        id: entry.id,
        start: toInputDate(entry.start_date),
        end: toInputDate(entry.end_date),
      }
    })
    setPhaseState(nextState)
  }, [items, season, year])

  function handleFieldChange(phase: string, field: 'start' | 'end', value: string) {
    setPhaseState((prev) => ({
      ...prev,
      [phase]: {
        ...prev[phase],
        [field]: value,
      },
    }))
  }

  function handleSemesterChange(next: PeriodSeason) {
    if (next === season) return
    setPeriod(next, year)
  }

  function handleYearInput(value: string) {
    const digitsOnly = value.replace(/[^0-9]/g, '')
    setYearInput(digitsOnly)
    if (/^\d{4}$/.test(digitsOnly)) {
      const parsed = Number.parseInt(digitsOnly, 10)
      setPeriod(season, parsed)
    }
  }

  function handleYearBlur() {
    if (!/^\d{4}$/.test(yearInput.trim())) {
      setYearInput(String(year))
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      // Note: updatePeriodSetting endpoint is not available in backend
      // The PeriodSetting singleton must be managed through Django admin
      // Only update the phase schedules
      const promises = PHASES.map(({ value }) => {
        const record = phaseState[value] ?? { start: '', end: '' }
        const payload = {
          period_year: year,
          period_season: season,
          phase: value,
          start_date: record.start || null,
          end_date: record.end || null,
        }
        if (record.id) {
          return updatePeriodPhaseSchedule(record.id, payload)
        }
        return createPeriodPhaseSchedule(payload)
      })
      await Promise.all(promises)
      toast.success('Periodo actualizado correctamente')
      await loadSchedules()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo guardar el periodo'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Gestionar periodos</h1>
        <p className="text-sm text-zinc-600">
          Define el periodo académico vigente y registra las fechas de inicio y término de cada fase del proceso.
        </p>
      </div>

      <div className="mb-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-zinc-900">Determinar el periodo actual</h2>
          <p className="text-sm text-zinc-600">
            Selecciona el semestre y el año que se considerarán como periodo vigente. Este valor se refleja en el encabezado y en las consultas globales.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-600">Semestre actual</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleSemesterChange('O')}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition ${
                  season === 'O'
                    ? 'border-red-600 bg-red-50 text-red-700'
                    : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                Otoño
              </button>
              <button
                type="button"
                onClick={() => handleSemesterChange('P')}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition ${
                  season === 'P'
                    ? 'border-red-600 bg-red-50 text-red-700'
                    : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                Primavera
              </button>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-600">Año</label>
            <input
              type="text"
              inputMode="numeric"
              value={yearInput}
              onChange={(e) => handleYearInput(e.target.value)}
              onBlur={handleYearBlur}
              maxLength={4}
              placeholder="2025"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
            <p className="mt-1 text-xs text-zinc-500">Debe contener 4 dígitos.</p>
          </div>
          <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Periodo establecido</p>
            <p className="text-lg font-semibold text-zinc-900">{periodCode}</p>
            <p className="text-xs text-zinc-500">Se mostrará en el encabezado.</p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="text-base font-semibold text-zinc-900">Fechas por fase</h2>
          <p className="text-sm text-zinc-600">
            Registra las fechas estimadas para cada fase del periodo {periodCode}.
          </p>
        </div>
        <div className="divide-y divide-zinc-100">
          <div className="grid grid-cols-1 gap-4 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 sm:grid-cols-3">
            <span>Fase</span>
            <span>Inicio</span>
            <span>Término</span>
          </div>
          {loading ? (
            <div className="px-4 py-6 text-sm text-zinc-600">Cargando configuraciones…</div>
          ) : (
            PHASES.map(({ value, label }) => (
              <div key={value} className="grid grid-cols-1 gap-4 px-4 py-3 sm:grid-cols-3">
                <div className="text-sm font-medium text-zinc-800">{label}</div>
                <div>
                  <input
                    type="date"
                    value={phaseState[value]?.start ?? ''}
                    onChange={(e) => handleFieldChange(value, 'start', e.target.value)}
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
                  />
                </div>
                <div>
                  <input
                    type="date"
                    value={phaseState[value]?.end ?? ''}
                    onChange={(e) => handleFieldChange(value, 'end', e.target.value)}
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
                  />
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-zinc-200 px-4 py-3">
          <button
            type="button"
            onClick={loadSchedules}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50"
          >
            Refrescar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-md bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar periodo'}
          </button>
        </div>
      </div>
    </section>
  )
}
