import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from '../../lib/toast'
import {
  createPeriodPhaseSchedule,
  listPeriodPhaseSchedules,
  updatePeriodPhaseSchedule,
  type PeriodPhaseSchedule,
} from '../../api/periods'
import { type PeriodSeason, normalizePeriodSeason } from '../../lib/period'
import { usePeriodStore } from '../../store/period'

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

export default function GestionFasesCoord() {
  const navigate = useNavigate()
  const [items, setItems] = useState<PeriodPhaseSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [phaseState, setPhaseState] = useState<PhaseState>(() => defaultPhaseState())
  const season = usePeriodStore((s) => s.season)
  const year = usePeriodStore((s) => s.year)
  const periodCode = usePeriodStore((s) => s.periodCode)

  async function loadSchedules() {
    setLoading(true)
    setError(null)
    try {
      const data = await listPeriodPhaseSchedules()
      setItems(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo cargar la configuración de fases'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchedules()
  }, [])

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

  const [savingPhases, setSavingPhases] = useState<Record<string, boolean>>({})

  async function handleSavePhase(phase: string) {
    setSavingPhases((prev) => ({ ...prev, [phase]: true }))
    setError(null)
    try {
      const record = phaseState[phase] ?? { start: '', end: '' }
      const payload = {
        period_year: year,
        period_season: season,
        phase: phase,
        start_date: record.start || null,
        end_date: record.end || null,
      }
      if (record.id) {
        await updatePeriodPhaseSchedule(record.id, payload)
      } else {
        await createPeriodPhaseSchedule(payload)
      }
      toast.success(`Fase ${PHASES.find(p => p.value === phase)?.label} guardada correctamente`)
      await loadSchedules()
    } catch (e: any) {
      // Extraer mensaje de error del servidor
      let msg = 'No se pudo guardar la fase'
      if (e?.response?.data) {
        const data = e.response.data
        if (typeof data === 'string') {
          msg = data
        } else if (data.detail) {
          msg = data.detail
        } else if (data.non_field_errors) {
          msg = data.non_field_errors.join(', ')
        } else {
          // Mostrar errores de campos específicos
          const fieldErrors = Object.entries(data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join('; ')
          if (fieldErrors) msg = fieldErrors
        }
      } else if (e instanceof Error) {
        msg = e.message
      }
      setError(msg)
      toast.error(msg)
    } finally {
      setSavingPhases((prev) => ({ ...prev, [phase]: false }))
    }
  }

  return (
    <section className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Gestionar Fases</h1>
          <p className="text-sm text-zinc-600">
            Registra las fechas de inicio y término de cada fase del proceso para el periodo {periodCode}.
          </p>
        </div>
        <button
          onClick={() => navigate('/coord')}
          className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver
        </button>
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
          <div className="grid grid-cols-1 gap-4 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 sm:grid-cols-4">
            <span>Fase</span>
            <span>Inicio</span>
            <span>Término</span>
            <span className="text-right">Acción</span>
          </div>
          {loading ? (
            <div className="px-4 py-6 text-sm text-zinc-600">Cargando configuraciones…</div>
          ) : (
            PHASES.map(({ value, label }) => (
              <div key={value} className="grid grid-cols-1 gap-4 px-4 py-3 sm:grid-cols-4 sm:items-center">
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
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={savingPhases[value]}
                    onClick={() => handleSavePhase(value)}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {savingPhases[value] ? 'Guardando…' : 'Guardar'}
                  </button>
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
        </div>
      </div>
    </section>
  )
}
