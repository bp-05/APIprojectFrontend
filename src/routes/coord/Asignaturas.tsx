import { useEffect, useMemo, useState } from 'react'
import { listSubjects, listDescriptorsBySubject, type Subject, type Descriptor } from '../../api/subjects'
import { useNavigate, useSearchParams  , Link } from 'react-router'

type ProjectState = 'Borrador' | 'Enviada' | 'Observada' | 'Aprobada'
type LocalStatus = { status: ProjectState; timestamps?: Partial<Record<ProjectState, string>> }

export default function AsignaturasCoord() {
  const [items, setItems] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterInput, setFilterInput] = useState('')
  const [advFilters, setAdvFilters] = useState<Array<{ kind: 'status' | 'risk' | 'delay'; value: string }>>([])
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [cycleVersion, setCycleVersion] = useState(0)
  // Overlay de estado local por proyecto (hasta que backend exponga estado)
  const [localStatus, setLocalStatus] = useState<Record<number, LocalStatus>>(() => {
    try { return JSON.parse(localStorage.getItem('coordSubjectStatus') || '{}') } catch { return {} }
  })
  function saveLocalStatus(next: Record<number, LocalStatus>) {
    setLocalStatus(next)
    try {
      localStorage.setItem('coordSubjectStatus', JSON.stringify(next))
      window.dispatchEvent(new Event('coordSubjectStatusChanged'))
    } catch {}
  }
  // function setStatus(id: number, status: ProjectState) {
  //   saveLocalStatus({
  //     ...localStatus,
  //     [id]: {
  //       status,
  //       timestamps: { ...(localStatus[id]?.timestamps || {}), [status]: new Date().toISOString() },
  //     },
  //   })
  // }

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await listSubjects()
      setItems(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar asignaturas'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // Escuchar cambios del ciclo (fases) locales
  useEffect(() => {
    function onCycleCustom() { setCycleVersion((v) => v + 1) }
    function onCycleStorage(e: StorageEvent) { if (e.key === 'coordSubjectCycle') setCycleVersion((v) => v + 1) }
    window.addEventListener('coordSubjectCycleChanged', onCycleCustom as any)
    window.addEventListener('storage', onCycleStorage)
    return () => {
      window.removeEventListener('coordSubjectCycleChanged', onCycleCustom as any)
      window.removeEventListener('storage', onCycleStorage)
    }
  }, [])
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
  function statusTimestamp(id: number, status: ProjectState): Date | null {
    const iso = localStatus[id]?.timestamps?.[status]
    if (!iso) return null
    const d = new Date(iso)
    return isNaN(d.getTime()) ? null : d
  }
  function daysBetween(a: Date, b: Date) { return Math.max(0, Math.round((b.getTime() - a.getTime()) / (1000*60*60*24))) }
  const SLA_DAYS = 14
  function atrasoInfo(s: Subject): { delayed: boolean; days: number } {
    const st = mapStatus(s)
    let ref: Date | null = null
    if (st === 'Observada') ref = statusTimestamp(s.id, 'Observada') || statusTimestamp(s.id, 'Enviada')
    else if (st === 'Enviada') ref = statusTimestamp(s.id, 'Enviada')
    if (!ref) return { delayed: false, days: 0 }
    const diff = daysBetween(ref, new Date())
    const over = Math.max(0, diff - SLA_DAYS)
    return { delayed: over > 0, days: over }
  }

  // Lectura de ciclo local (fase actual)
  type LocalCycle = { phase: 'Fase 1' | 'Fase 2' | 'Fase 3'; start?: string; end?: string }
  function readLocalCycle(): Record<number, LocalCycle> {
    try { return JSON.parse(localStorage.getItem('coordSubjectCycle') || '{}') } catch { return {} as any }
  }
  const localCycleMap = useMemo(() => readLocalCycle(), [cycleVersion])

  const filtered = useMemo(() => {
    let arr = items
    const f = (searchParams.get('filter') || '').toLowerCase()
    if (f) {
      if (['borrador','enviada','observada','aprobada'].includes(f)) {
        arr = arr.filter((s) => mapStatus(s).toLowerCase() === f)
      } else if (['fase1','fase2','fase3'].includes(f)) {
        const target = f === 'fase1' ? 'Fase 1' : f === 'fase2' ? 'Fase 2' : 'Fase 3'
        arr = arr.filter((s: any) => (localCycleMap as any)[s.id]?.phase === target)
      } else if (f === 'atraso') {
        arr = arr.filter((s) => mapStatus(s) === 'Observada')
      } else if (f === 'riesgo') {
        arr = arr
          .map((s) => ({ s, r: riskScore(s) }))
          .filter((x) => x.r > 0)
          .sort((a, b) => b.r - a.r)
          .map((x) => x.s)
      }
    }
    // Aplicar filtros avanzados (chips): AND entre tipos, OR dentro del mismo tipo
    if (advFilters.length > 0) {
      const statusVals = advFilters.filter((f) => f.kind === 'status').map((f) => f.value.toLowerCase())
      const riskVals = advFilters.filter((f) => f.kind === 'risk').map((f) => f.value.toLowerCase())
      const hasDelay = advFilters.some((f) => f.kind === 'delay')
      arr = arr.filter((s) => {
        // status
        if (statusVals.length) {
          const st = mapStatus(s).toLowerCase()
          if (!statusVals.includes(st)) return false
        }
        // riesgo
        if (riskVals.length) {
          const r = riskScore(s)
          const lvl = r <= 0 ? 'sin riesgo' : r <= 2 ? 'bajo' : r <= 4 ? 'medio' : 'alto'
          if (!riskVals.includes(lvl)) return false
        }
        // atraso
        if (hasDelay) {
          const a = atrasoInfo(s)
          if (!a.delayed) return false
        }
        return true
      })
    }
    if (!search) return arr
    const q = search.toLowerCase()
    return arr.filter((s) =>
      [s.code, s.section, s.name, s.campus, s.area_name || '', s.career_name || '', s.semester_name || '']
        .some((v) => String(v || '').toLowerCase().includes(q))
    )
  }, [items, search, searchParams, advFilters, cycleVersion])

  function openView(s: Subject) {
    navigate(`/coord/asignaturas/${s.id}`)
  }

  // (Revertido) Lectura de fase local eliminada; se mantiene columna Riesgo

  // Utilities para filtros avanzados
  function addFilterFromInput() {
    const raw = filterInput.trim()
    if (!raw) return
    const tokens = raw.split(',').map((t) => t.trim()).filter(Boolean)
    const next: Array<{ kind: 'status' | 'risk' | 'delay'; value: string }> = []
    for (const t of tokens) {
      const k = t.toLowerCase()
      // Estados
      if (['borrador','enviada','enviado','observada','aprobada'].includes(k)) {
        const map: Record<string, string> = { enviado: 'Enviada', enviada: 'Enviada', borrador: 'Borrador', observada: 'Observada', aprobada: 'Aprobada' }
        next.push({ kind: 'status', value: map[k] })
        continue
      }
      // Atraso
      if (k === 'atraso' || k === 'atrasado' || k === 'con atraso') {
        next.push({ kind: 'delay', value: 'atraso' })
        continue
      }
      // Riesgo niveles
      if (k.startsWith('riesgo')) {
        const level = k.replace('riesgo', '').trim()
        const lvl = level || 'alto' // si solo ponen "riesgo", asumir alto
        const mapR: Record<string, string> = { alto: 'Alto', medio: 'Medio', mediano: 'Medio', bajo: 'Bajo', 'sin riesgo': 'Sin riesgo', ninguno: 'Sin riesgo' }
        if (mapR[lvl]) next.push({ kind: 'risk', value: mapR[lvl] })
        continue
      }
      if (['alto','medio','mediano','bajo','sin riesgo','ninguno'].includes(k)) {
        const mapR: Record<string, string> = { alto: 'Alto', medio: 'Medio', mediano: 'Medio', bajo: 'Bajo', 'sin riesgo': 'Sin riesgo', ninguno: 'Sin riesgo' }
        next.push({ kind: 'risk', value: mapR[k] })
        continue
      }
    }
    if (next.length) {
      setAdvFilters((prev) => {
        const exists = (f: { kind: 'status'|'risk'|'delay'; value: string }) => prev.some((p) => p.kind === f.kind && p.value === f.value)
        return [...prev, ...next.filter((f) => !exists(f))]
      })
      setFilterInput('')
    }
  }

  return (
    <section className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Asignaturas</h1>
          <p className="text-sm text-zinc-600">Asignaturas registradas en la base de datos</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={'Buscar asignatura por c\u00F3digo, secci\u00F3n o nombre'}
            className="w-72 max-w-full truncate rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* BotÃ³n Todos */}
        <button
          onClick={() => {
            setSearchParams((prev) => { const p = new URLSearchParams(prev); p.delete('filter'); return p })
            setAdvFilters([])
          }}
          className={`rounded-full border px-3 py-1 text-xs ${!searchParams.get('filter') && advFilters.length === 0 ? 'border-red-300 bg-red-50 text-red-700' : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'}`}
        >
          Todos
        </button>
        {/* Chips de filtros agregados */}
        {advFilters.map((f, i) => (
          <span key={i} className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
            {f.kind === 'status' ? `Estado: ${f.value}` : f.kind === 'risk' ? `Riesgo: ${f.value}` : 'Atraso'}
            <button
              onClick={() => setAdvFilters((fs) => fs.filter((_, idx) => idx !== i))}
              className="rounded-full border border-red-200 bg-white px-1 text-red-700 hover:bg-red-50"
              title="Quitar filtro"
            >
              Ã—
            </button>
          </span>
        ))}
        <div className="ml-auto" />
        {/* Input y acciÃ³n para agregar filtrado */}
        <input
          value={filterInput}
          onChange={(e) => setFilterInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFilterFromInput() } }}
          placeholder="Filtrar por estado, riesgo, etc."
          className="w-72 max-w-full truncate rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
        />
      </div>

      {error ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <Th>Descriptor</Th>
              <Th>{'C\u00F3digo'}</Th>
              <Th>{'Secci\u00F3n'}</Th>
              <Th>Nombre</Th>
              <Th>{'\u00C1rea'}</Th>
              <Th>Carrera</Th>
              <Th>Semestre</Th>
              <Th>Estado</Th>
              <Th>Riesgo</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {loading ? (
              <tr>
                <td className="p-4 text-sm text-zinc-600" colSpan={10}>CargandoÃ¢â‚¬Â¦</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="p-4 text-sm text-zinc-600" colSpan={10}>Sin resultados</td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50">
                  <Td>
                    <DescriptorCell subject={s} />
                  </Td>
                  <Td>{s.code}</Td>
                  <Td>{s.section}</Td>
                  <Td>{s.name}</Td>
                  <Td>{s.area_name}</Td>
                  <Td>{s.career_name || '-'}</Td>
                  <Td>{s.semester_name}</Td>
                  <Td>
                    {(() => {
                      const st = mapStatus(s)
                      const cls = st === 'Aprobada'
                        ? 'bg-green-50 text-green-700'
                        : st === 'Observada'
                        ? 'bg-amber-50 text-amber-700'
                        : st === 'Enviada'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-zinc-100 text-zinc-700'
                      return (
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{st}</span>
                      )
                    })()}
                  </Td>
                  <Td>
                    {(() => {
                      const r = riskScore(s)
                      const lvl = r <= 0 ? 'Sin riesgo' : r <= 2 ? 'Bajo' : r <= 4 ? 'Medio' : 'Alto'
                      const cls = lvl === 'Alto'
                        ? 'bg-red-50 text-red-700'
                        : lvl === 'Medio'
                        ? 'bg-orange-50 text-orange-700'
                        : lvl === 'Bajo'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-green-50 text-green-700'
                      return (
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{lvl}</span>
                      )
                    })()}
                  </Td>
                  <Td className="text-right">
                    <button
                      onClick={() => openView(s)}
                      className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                    >
                      Ver más
                    </button>
                    <Link to={`/coord/estado?id=${s.id}`} className="ml-2 inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 hover:bg-zinc-50">Ver estado</Link>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// Componentes auxiliares
function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={`bg-zinc-50 px-3 py-2 text-left text-xs font-semibold text-zinc-700 ${className || ''}`}>{children}</th>
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 text-sm text-zinc-700 ${className || ''}`}>{children}</td>
}

interface DescriptorCellProps {
  subject: Subject
}

function DescriptorCell({ subject }: DescriptorCellProps) {
  const [open, setOpen] = useState(false)
  const [descriptors, setDescriptors] = useState<Descriptor[]>([])
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await listDescriptorsBySubject(subject.id)
      setDescriptors(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function handleOpen() {
    if (!open && descriptors.length === 0) load()
    setOpen(!open)
  }

  return (
    <div>
      <button
        onClick={handleOpen}
        className="rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-200"
      >
        {open ? '▼' : '▶'} {descriptors.length > 0 ? descriptors.length : '?'}
      </button>
      {open && (
        <div className="mt-2 space-y-1 text-xs">
          {loading ? (
            <p className="text-zinc-500">Cargando...</p>
          ) : descriptors.length === 0 ? (
            <p className="text-zinc-500">Sin descriptores</p>
          ) : (
            descriptors.map((d) => (
              <div key={d.id} className="rounded bg-zinc-50 p-1 text-zinc-600">
                {d.file}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

