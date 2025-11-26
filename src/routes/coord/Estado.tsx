import { useEffect, useMemo, useState } from 'react'
import { listSubjects, updateSubject, type Subject } from '../../api/subjects'
import { listPeriodPhaseSchedules, type PeriodPhaseSchedule } from '../../api/periods'
import { useSearchParams, Link } from 'react-router'
import { usePeriodStore } from '../../store/period'
import { toast } from '../../lib/toast'

type ProjectState = 'Borrador' | 'Enviada' | 'Observada' | 'Aprobada'
type LocalStatus = { status: ProjectState; timestamps?: Partial<Record<ProjectState, string>> }

export default function EstadoCoord() {
  const [items, setItems] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchParams] = useSearchParams()
  const [editTarget, setEditTarget] = useState<{ id: number; state: ProjectState } | null>(null)
  const [editSelection, setEditSelection] = useState<ProjectState>('Borrador')

  // Admin phase schedules from database
  const [adminPhaseSchedules, setAdminPhaseSchedules] = useState<PeriodPhaseSchedule[]>([])
  const season = usePeriodStore((s) => s.season)
  const year = usePeriodStore((s) => s.year)

  const [localStatus, setLocalStatus] = useState<Record<number, LocalStatus>>(() => {
    try { return JSON.parse(localStorage.getItem('coordSubjectStatus') || '{}') } catch { return {} }
  })

  // Tipo de fase que usa valores del backend directamente
  type PhaseName = 'inicio' | 'formulacion' | 'gestion' | 'validacion' | 'completado'
  
  const PHASES: { value: PhaseName; label: string }[] = [
    { value: 'inicio', label: 'Inicio' },
    { value: 'formulacion', label: 'Formulación de requerimientos' },
    { value: 'gestion', label: 'Gestión de requerimientos' },
    { value: 'validacion', label: 'Validación de requerimientos' },
    { value: 'completado', label: 'Completado' },
  ]

  // Mapeo de valores de backend a etiquetas completas
  const phaseLabels: Record<PhaseName, string> = {
    'inicio': 'Fase: Inicio',
    'formulacion': 'Fase 1: Formulación de Requerimientos',
    'gestion': 'Fase 2: Gestión de Requerimientos',
    'validacion': 'Fase 3: Validación de requerimientos',
    'completado': 'Fase: Completado',
  }

  function saveLocalStatus(next: Record<number, LocalStatus>) {
    setLocalStatus(next)
    try {
      localStorage.setItem('coordSubjectStatus', JSON.stringify(next))
      window.dispatchEvent(new Event('coordSubjectStatusChanged'))
    } catch {}
  }

  function setStatus(id: number, status: ProjectState) {
    saveLocalStatus({
      ...localStatus,
      [id]: {
        status,
        timestamps: { ...(localStatus[id]?.timestamps || {}), [status]: new Date().toISOString() },
      },
    })
  }

  // Estado para controlar cuál select está guardando
  const [savingPhase, setSavingPhase] = useState<number | null>(null)

  // Función para actualizar fase en el backend
  async function handlePhaseChange(subjectId: number, phase: PhaseName) {
    setSavingPhase(subjectId)
    try {
      await updateSubject(subjectId, { phase })
      // Actualizar el item local con la nueva fase
      setItems((prev) =>
        prev.map((s) => (s.id === subjectId ? { ...s, phase } : s))
      )
      toast.success('Fase actualizada correctamente')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al actualizar fase'
      toast.error(msg)
    } finally {
      setSavingPhase(null)
    }
  }

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await listSubjects()
      setItems(data)
      // Load admin phase schedules for current period
      const schedules = await listPeriodPhaseSchedules({
        period_year: year,
        period_season: season,
      })
      setAdminPhaseSchedules(schedules)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar asignaturas'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [season, year])

  function mapStatus(s: any): ProjectState {
    const local = localStatus[s.id]?.status
    if (local) return local
    const raw = String(s?.project_status || s?.status || '').toLowerCase()
    if (raw.includes('observ')) return 'Observada'
    if (raw.includes('apro') || raw.includes('aprob')) return 'Aprobada'
    if (raw.includes('env')) return 'Enviada'
    if (!s?.teacher) return 'Borrador'
    return 'Enviada'
  }

  function riskScore(s: any) {
    let score = 0
    const st = mapStatus(s)
    if (st === 'Observada') score += 3
    if (!s?.teacher) score += 2
    if (!s?.career_name) score += 1
    if (!s?.area_name) score += 1
    return score
  }

  function phaseOf(s: Subject): PhaseName {
    // Obtener fase directamente del Subject (base de datos)
    const phase = s.phase as PhaseName
    return phase || 'inicio'
  }

  function phaseLabel(phase: PhaseName): string {
    return phaseLabels[phase] || phase
  }

  function getAdminPhaseInfo(phase: PhaseName): { start?: string; end?: string } | null {
    const schedule = adminPhaseSchedules.find((s) => s.phase.toLowerCase() === phase.toLowerCase())
    return schedule ? { start: schedule.start_date || undefined, end: schedule.end_date || undefined } : null
  }

  function statusLabel(st: ProjectState) {
    if (st === 'Borrador') return 'Borrador'
    if (st === 'Enviada') return 'Enviada'
    if (st === 'Observada') return 'Observada'
    return 'Aprobada'
  }

  const filtered = useMemo(() => {
    let arr = items
    const idParam = searchParams.get('id')
    if (idParam) {
      const idNum = Number(idParam)
      if (Number.isFinite(idNum)) {
        arr = arr.filter((s) => s.id === idNum)
        return arr
      }
    }
    const f = (searchParams.get('filter') || '').toLowerCase()
    if (f && ['borrador','enviada','observada','aprobada'].includes(f)) {
      arr = arr.filter((s) => mapStatus(s).toLowerCase() === f)
    }
    if (!search) return arr
    const q = search.toLowerCase()
    return arr.filter((s) => [s.code, s.section, s.name, s.area_name || ''].some((v) => String(v || '').toLowerCase().includes(q)))
  }, [items, search, searchParams, localStatus])

  return (
    <section className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Estado de Proyectos</h1>
          <p className="text-sm text-zinc-600">Resumen y acciones de estado</p>
        </div>
        <div className="flex items-center gap-2">
          {searchParams.get('id') ? null : (
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, sección o nombre"
              className="w-72 max-w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
          )}
          <Link to="/coord/asignaturas" className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50">Volver</Link>
        </div>
      </div>

      {error ? (<div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>) : null}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <Th>Código</Th>
              <Th>Sección</Th>
              <Th>Nombre</Th>
              <Th>Área</Th>
              <Th>Estado</Th>
              <Th>Fase</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {loading ? (
              <tr><td className="p-4 text-sm text-zinc-600" colSpan={7}>Cargando…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="p-4 text-sm text-zinc-600" colSpan={7}>Sin resultados</td></tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50">
                  <Td>{s.code}</Td>
                  <Td>{s.section}</Td>
                  <Td>{s.name}</Td>
                  <Td>{s.area_name}</Td>
                  <Td>
                    {(() => {
                      const st = mapStatus(s)
                      const colorCls = st === 'Aprobada'
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : st === 'Observada'
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : st === 'Enviada'
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-zinc-300 bg-zinc-50 text-zinc-700'
                      return (
                        <select
                          value={st}
                          onChange={(e) => setStatus(s.id, e.target.value as ProjectState)}
                          className={`rounded-md px-2 py-1 text-xs outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 ${colorCls}`}
                          title="Editar estado"
                        >
                          <option value="Borrador">Borrador</option>
                          <option value="Enviada">Enviada</option>
                          <option value="Observada">Observada</option>
                          <option value="Aprobada">Aprobada</option>
                        </select>
                      )
                    })()}
                  </Td>
                  <Td className="align-top">
                    <select
                      value={phaseOf(s)}
                      onChange={(e) => {
                        const phase = e.target.value as PhaseName
                        handlePhaseChange(s.id, phase)
                      }}
                      disabled={savingPhase === s.id}
                      className={`w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 ${savingPhase === s.id ? 'opacity-50 cursor-wait' : ''}`}
                      title="Seleccionar fase"
                    >
                      {PHASES.map(({ value: phase, label }) => (
                        <option key={phase} value={phase}>{label}</option>
                      ))}
                    </select>
                  </Td>
                  <Td className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      <button
                        onClick={() => { const cur = mapStatus(s); setEditTarget({ id: s.id, state: cur }); setEditSelection(cur) }}
                        className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                      >
                        Ver información
                      </button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" onClick={() => setEditTarget(null)}>
          <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3">
              <h2 className="text-base font-semibold">Información adicional</h2>
            </div>
            <div className="mb-4 rounded-md border border-zinc-200 bg-zinc-50 p-3">
              {(() => {
                const id = editTarget?.id
                const subject = items.find((s) => s.id === id)
                const currentPhase = subject ? phaseOf(subject) : 'inicio' as PhaseName
                // Get admin dates for current phase
                const adminInfo = getAdminPhaseInfo(currentPhase)
                const startDate = adminInfo?.start || 'No asignadas'
                const endDate = adminInfo?.end || 'No asignadas'
                return (
                  <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-zinc-500">Fase del proyecto</dt>
                      <dd className="font-medium text-zinc-800">{phaseLabel(currentPhase)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-500">Fecha de inicio</dt>
                      <dd className="font-medium text-zinc-800">{startDate}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-500">Fecha límite</dt>
                      <dd className="font-medium text-zinc-800">{endDate}</dd>
                    </div>
                  </dl>
                )
              })()}
            </div>
            <div className="flex justify-end">
              <button onClick={() => setEditTarget(null)} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">Cerrar</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function Th({ children, className = '' }: { children: any; className?: string }) {
  return (
    <th className={`px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 ${className}`}>
      {children}
    </th>
  )
}

function Td({ children, className = '' }: { children: any; className?: string }) {
  return <td className={`px-4 py-2 text-sm text-zinc-800 ${className}`}>{children}</td>
}







