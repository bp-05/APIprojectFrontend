import { useEffect, useMemo, useState } from 'react'
import { listSubjects, listDescriptorsBySubject, type Subject, type Descriptor } from '../../api/subjects'

type ProjectState = 'Borrador' | 'Enviada' | 'Observada' | 'Aprobada'
type LocalStatus = { status: ProjectState; timestamps?: Partial<Record<ProjectState, string>> }

export default function Gantt() {
  const [items, setItems] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterInput, setFilterInput] = useState('')
  const [advFilters, setAdvFilters] = useState<Array<{ kind: 'status' | 'risk' | 'delay'; value: string }>>([])

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
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    let arr = items
    // filtros avanzados
    if (advFilters.length > 0) {
      const statusVals = advFilters.filter((f) => f.kind === 'status').map((f) => f.value.toLowerCase())
      const riskVals = advFilters.filter((f) => f.kind === 'risk').map((f) => f.value.toLowerCase())
      const hasDelay = advFilters.some((f) => f.kind === 'delay')
      arr = arr.filter((s) => {
        if (statusVals.length) {
          const st = mapStatus(s).toLowerCase()
          if (!statusVals.includes(st)) return false
        }
        if (riskVals.length) {
          const r = riskScore(s)
          const lvl = r <= 0 ? 'sin riesgo' : r <= 2 ? 'bajo' : r <= 4 ? 'medio' : 'alto'
          if (!riskVals.includes(lvl)) return false
        }
        if (hasDelay) {
          // En esta vista no calculamos atraso exacto; placeholder: considerar Observada como atraso
          if (mapStatus(s) !== 'Observada') return false
        }
        return true
      })
    }
    if (!search) return arr
    const q = search.toLowerCase()
    return arr.filter((s) => [s.code, s.section, s.name, s.area_name || '', s.career_name || '']
      .some((v) => String(v || '').toLowerCase().includes(q)))
  }, [items, search, advFilters])

  function addFilterFromInput() {
    const raw = filterInput.trim()
    if (!raw) return
    const tokens = raw.split(',').map((t) => t.trim()).filter(Boolean)
    const next: Array<{ kind: 'status' | 'risk' | 'delay'; value: string }> = []
    for (const t of tokens) {
      const k = t.toLowerCase()
      if (['borrador','enviada','enviado','observada','aprobada'].includes(k)) {
        const map: Record<string, string> = { enviado: 'Enviada', enviada: 'Enviada', borrador: 'Borrador', observada: 'Observada', aprobada: 'Aprobada' }
        next.push({ kind: 'status', value: map[k] })
        continue
      }
      if (k === 'atraso' || k === 'atrasado' || k === 'con atraso') {
        next.push({ kind: 'delay', value: 'atraso' })
        continue
      }
      if (k.startsWith('riesgo')) {
        const level = k.replace('riesgo', '').trim()
        const lvl = level || 'alto'
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

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => { setAdvFilters([]) }}
          className={`rounded-full border px-3 py-1 text-xs ${advFilters.length === 0 ? 'border-red-300 bg-red-50 text-red-700' : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'}`}
        >
          Todos
        </button>
        {advFilters.map((f, i) => (
          <span key={i} className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
            {f.kind === 'status' ? `Estado: ${f.value}` : f.kind === 'risk' ? `Riesgo: ${f.value}` : 'Atraso'}
            <button onClick={() => setAdvFilters((fs) => fs.filter((_, idx) => idx !== i))} className="rounded-full border border-red-200 bg-white px-1 text-red-700 hover:bg-red-50">×</button>
          </span>
        ))}
        <div className="ml-auto" />
        <input
          value={filterInput}
          onChange={(e) => setFilterInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFilterFromInput() } }}
          placeholder="Filtrar por estado, riesgo, etc."
          className="w-72 max-w-full truncate rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
        />
      </div>

      {error ? (<div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>) : null}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <Th>Descriptor</Th>
              <Th>Código</Th>
              <Th>Sección</Th>
              <Th>Nombre</Th>
              <Th>Área</Th>
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
                <td className="p-4 text-sm text-zinc-600" colSpan={10}>Cargando…</td>
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
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">{mapStatus(s)}</span>
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
                    {/* En vista Gantt no mostramos botones de acción */}
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

function DescriptorCell({ subject }: { subject: Subject }) {
  const [items, setItems] = useState<Descriptor[] | null>(null)
  useEffect(() => {
    let mounted = true
    listDescriptorsBySubject(subject.id)
      .then((data) => {
        if (!mounted) return
        const filtered = Array.isArray(data) ? data.filter((d) => d.subject === subject.id) : []
        setItems(filtered)
      })
      .catch(() => { if (mounted) setItems([]) })
    return () => { mounted = false }
  }, [subject.id])

  if (items === null) {
    return <span className="inline-block h-3 w-3 animate-pulse rounded-sm bg-zinc-300" title="Cargando…" />
  }
  if (!items.length) {
    return <span className="text-xs text-zinc-500">-</span>
  }
  const last = items[items.length - 1]
  return (
    <a
      href={last.file}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm font-medium text-red-700 hover:underline"
      title="ver descriptor"
    >
      ver descriptor
    </a>
  )
}
