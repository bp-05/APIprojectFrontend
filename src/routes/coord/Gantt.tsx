import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  listSubjects,
  listSubjectPhaseProgress,
  bulkUpsertSubjectPhaseProgress,
  type Subject,
  type PhaseProgressPhase,
  type PhaseProgressStatus,
} from '../../api/subjects'
import { listPeriodPhaseSchedules, type PeriodPhaseSchedule } from '../../api/periods'
import { usePeriodStore } from '../../store/period'
import { toast } from '../../lib/toast'

type PhaseMark = PhaseProgressStatus // 'nr' | 'ec' | 'rz'
type PhaseMarks = { 1?: PhaseMark; 2?: PhaseMark; 3?: PhaseMark }

// Mapeo de número de fase a nombre de fase en backend
const PHASE_NUM_TO_NAME: Record<1 | 2 | 3, PhaseProgressPhase> = {
  1: 'formulacion',
  2: 'gestion',
  3: 'validacion',
}

const PHASE_NAME_TO_NUM: Record<PhaseProgressPhase, 1 | 2 | 3> = {
  formulacion: 1,
  gestion: 2,
  validacion: 3,
}

export default function Gantt() {
  const [items, setItems] = useState<Subject[]>([])
  const [adminPhases, setAdminPhases] = useState<PeriodPhaseSchedule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [ganttTarget, setGanttTarget] = useState<Subject | null>(null)
  const [marks, setMarks] = useState<PhaseMarks>({})
  const [marksMap, setMarksMap] = useState<Record<number, PhaseMarks>>({})
  const [saving, setSaving] = useState(false)
  const season = usePeriodStore((s) => s.season)
  const year = usePeriodStore((s) => s.year)

  // Cargar progreso desde la base de datos
  const loadProgress = useCallback(async () => {
    try {
      const progressData = await listSubjectPhaseProgress()
      const map: Record<number, PhaseMarks> = {}
      for (const p of progressData) {
        const phaseNum = PHASE_NAME_TO_NUM[p.phase]
        if (!map[p.subject]) map[p.subject] = {}
        map[p.subject][phaseNum] = p.status
      }
      setMarksMap(map)
    } catch (e) {
      console.error('Error cargando progreso de fases:', e)
    }
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [data, phases] = await Promise.all([
        listSubjects(),
        listPeriodPhaseSchedules({ period_year: year, period_season: season }),
        loadProgress(),
      ])
      setItems(data)
      setAdminPhases(phases || [])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar asignaturas'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [season, year])

  function openGantt(s: Subject) {
    setGanttTarget(s)
    const currentMarks = marksMap[s.id] || {}
    // Auto-marcar fases vencidas sin marca como "no realizado"
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const updatedMarks = { ...currentMarks }
    let hasChanges = false
    
    for (let phaseNum = 1; phaseNum <= 3; phaseNum++) {
      // Solo auto-marcar si no hay marca previa
      if (!updatedMarks[phaseNum as 1 | 2 | 3]) {
        const phaseSchedule = adminPhases.find(p => {
          const phaseKey = String(p.phase || '').toLowerCase()
          return phaseNum === 1 ? phaseKey === 'formulacion'
               : phaseNum === 2 ? phaseKey === 'gestion'
               : phaseNum === 3 ? phaseKey === 'validacion'
               : false
        })
        
        if (phaseSchedule && phaseSchedule.end_date) {
          const endDate = new Date(phaseSchedule.end_date)
          endDate.setHours(0, 0, 0, 0)
          // Si la fecha ya pasó y no hay marca, marcar como "no realizado"
          if (today > endDate) {
            updatedMarks[phaseNum as 1 | 2 | 3] = 'nr'
            hasChanges = true
          }
        }
      }
    }
    
    setMarks(updatedMarks)
    // Si hubo cambios por fases vencidas, guardar en BD
    if (hasChanges) {
      saveMarksToDB(s.id, updatedMarks)
    }
  }

  async function saveMarksToDB(subjectId: number, marksToSave: PhaseMarks) {
    const items: Array<{
      subject: number
      phase: PhaseProgressPhase
      status: PhaseProgressStatus
    }> = []

    for (const [num, status] of Object.entries(marksToSave)) {
      if (status) {
        const phaseNum = parseInt(num) as 1 | 2 | 3
        items.push({
          subject: subjectId,
          phase: PHASE_NUM_TO_NAME[phaseNum],
          status: status,
        })
      }
    }

    if (items.length === 0) return

    try {
      await bulkUpsertSubjectPhaseProgress(items)
      // Actualizar el mapa local
      setMarksMap((prev) => ({ ...prev, [subjectId]: marksToSave }))
    } catch (e) {
      console.error('Error guardando progreso:', e)
    }
  }

  async function updateMark(phase: 1 | 2 | 3, t: PhaseMark) {
    if (!ganttTarget) return

    const next = { ...marks, [phase]: t }
    setMarks(next)
    setSaving(true)

    try {
      await bulkUpsertSubjectPhaseProgress([
        {
          subject: ganttTarget.id,
          phase: PHASE_NUM_TO_NAME[phase],
          status: t,
        },
      ])
      // Actualizar el mapa local
      setMarksMap((prev) => ({ ...prev, [ganttTarget.id]: next }))
      toast.success('Progreso guardado')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar progreso'
      toast.error(msg)
      // Revertir el cambio visual
      setMarks(marks)
    } finally {
      setSaving(false)
    }
  }

  const filtered = useMemo(() => {
    const arr = items
    if (!search) return arr
    const q = search.toLowerCase()
    return arr.filter((s) => [s.code, s.section, s.name, s.area_name || '', s.career_name || '']
      .some((v) => String(v || '').toLowerCase().includes(q)))
  }, [items, search])

  return (
    <section className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Gantt</h1>
          <p className="text-sm text-zinc-600">Asignaturas registradas para planificación</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={'Buscar asignatura por código, sección o nombre'}
            className="w-72 max-w-full truncate rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
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
              <Th>Carrera</Th>
              <Th>Completado %</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {loading ? (
              <tr>
                <td className="p-4 text-sm text-zinc-600" colSpan={7}>Cargando…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="p-4 text-sm text-zinc-600" colSpan={7}>Sin resultados</td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50">
                  <Td>{s.code}</Td>
                  <Td>{s.section}</Td>
                  <Td>{s.name}</Td>
                  <Td>{s.area_name}</Td>
                  <Td>{s.career_name || '-'}</Td>
                  <Td>{(() => {
                    const m = marksMap[s.id]
                    if (!m || (!m[1] && !m[2] && !m[3])) return '-'
                    const w = (x?: PhaseMark) => (x === 'rz' ? 100 : x === 'ec' ? 50 : 0)
                    const pct = Math.round((w(m[1]) + w(m[2]) + w(m[3])) / 3)
                    return `${pct}%`
                  })()}</Td>
                  <Td className="text-right">
                    <button
                      onClick={() => openGantt(s)}
                      className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                    >
                      Mostrar Gantt
                    </button>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {ganttTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setGanttTarget(null)}
        >
          <div
            className="w-full max-w-3xl rounded-lg border border-zinc-200 bg-white p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">
                Actividades · {ganttTarget.name} ({ganttTarget.code}-{ganttTarget.section})
              </h2>
              <div className="flex items-center gap-2">
                {saving && <span className="text-xs text-zinc-500">Guardando...</span>}
                <button
                  onClick={() => setGanttTarget(null)}
                  className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50"
                >
                  Cerrar
                </button>
              </div>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded-md border border-zinc-200 bg-white">
              <table className="min-w-full divide-y divide-zinc-200">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide bg-red-600 text-white">Actividad</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide bg-amber-600 text-white">No realizado</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide bg-blue-700 text-white">En curso</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide bg-green-600 text-white">Realizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white text-sm">
                  <tr>
                    <td className="px-4 py-2 text-xs font-semibold uppercase tracking-wide bg-red-50 text-red-700 border-t border-red-200">
                      Fase 1: Formulación de Requerimientos
                    </td>
                    <td className="px-4 py-2 text-center bg-amber-50 border-l border-amber-200">
                      <MarkBtn phase={1} type="nr" active={marks[1] === 'nr'} disabled={saving} onSelect={(t) => updateMark(1, t)} />
                    </td>
                    <td className="px-4 py-2 text-center bg-blue-50 border-l border-blue-200">
                      <MarkBtn phase={1} type="ec" active={marks[1] === 'ec'} disabled={saving} onSelect={(t) => updateMark(1, t)} />
                    </td>
                    <td className="px-4 py-2 text-center bg-green-50 border-l border-green-200">
                      <MarkBtn phase={1} type="rz" active={marks[1] === 'rz'} disabled={saving} onSelect={(t) => updateMark(1, t)} />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-xs font-semibold uppercase tracking-wide bg-red-50 text-red-700 border-t border-red-200">
                      Fase 2: Gestión de Requerimientos
                    </td>
                    <td className="px-4 py-2 text-center bg-amber-50 border-l border-amber-200">
                      <MarkBtn phase={2} type="nr" active={marks[2] === 'nr'} disabled={saving} onSelect={(t) => updateMark(2, t)} />
                    </td>
                    <td className="px-4 py-2 text-center bg-blue-50 border-l border-blue-200">
                      <MarkBtn phase={2} type="ec" active={marks[2] === 'ec'} disabled={saving} onSelect={(t) => updateMark(2, t)} />
                    </td>
                    <td className="px-4 py-2 text-center bg-green-50 border-l border-green-200">
                      <MarkBtn phase={2} type="rz" active={marks[2] === 'rz'} disabled={saving} onSelect={(t) => updateMark(2, t)} />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-xs font-semibold uppercase tracking-wide bg-red-50 text-red-700 border-t border-red-200">
                      Fase 3: Validación de requerimientos
                    </td>
                    <td className="px-4 py-2 text-center bg-amber-50 border-l border-amber-200">
                      <MarkBtn phase={3} type="nr" active={marks[3] === 'nr'} disabled={saving} onSelect={(t) => updateMark(3, t)} />
                    </td>
                    <td className="px-4 py-2 text-center bg-blue-50 border-l border-blue-200">
                      <MarkBtn phase={3} type="ec" active={marks[3] === 'ec'} disabled={saving} onSelect={(t) => updateMark(3, t)} />
                    </td>
                    <td className="px-4 py-2 text-center bg-green-50 border-l border-green-200">
                      <MarkBtn phase={3} type="rz" active={marks[3] === 'rz'} disabled={saving} onSelect={(t) => updateMark(3, t)} />
                    </td>
                  </tr>
                </tbody>
              </table>
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

function MarkBtn({ type, active, disabled, onSelect }: { phase: 1 | 2 | 3; type: PhaseMark; active: boolean; disabled?: boolean; onSelect: (t: PhaseMark) => void }) {
  const symbol = type === 'nr' ? '×' : type === 'ec' ? '…' : '✓'
  const classMap: Record<string, string> = {
    nrIdle: 'border-amber-300 text-amber-600 bg-white hover:bg-amber-50',
    nrAct: 'border-amber-500 text-white bg-amber-600',
    ecIdle: 'border-blue-300 text-blue-600 bg-white hover:bg-blue-50',
    ecAct: 'border-blue-600 text-white bg-blue-700',
    rzIdle: 'border-green-300 text-green-600 bg-white hover:bg-green-50',
    rzAct: 'border-green-600 text-white bg-green-600',
  }
  const cls = type === 'nr' ? (active ? classMap.nrAct : classMap.nrIdle) : type === 'ec' ? (active ? classMap.ecAct : classMap.ecIdle) : (active ? classMap.rzAct : classMap.rzIdle)
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onSelect(type)}
      disabled={disabled}
      className={`inline-flex h-6 w-6 items-center justify-center rounded border text-sm font-semibold ${cls} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={type === 'nr' ? 'No realizado' : type === 'ec' ? 'En curso' : 'Realizado'}
    >
      {active ? symbol : ''}
    </button>
  )
}

