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
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
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
  function setStatus(id: number, status: ProjectState) {
    saveLocalStatus({
      ...localStatus,
      [id]: {
        status,
        timestamps: { ...(localStatus[id]?.timestamps || {}), [status]: new Date().toISOString() },
      },
    })
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

  useEffect(() => {
    load()
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

  const filtered = useMemo(() => {
    let arr = items
    const f = (searchParams.get('filter') || '').toLowerCase()
    if (f) {
      if (['borrador','enviada','observada','aprobada'].includes(f)) {
        arr = arr.filter((s) => mapStatus(s).toLowerCase() === f)
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
    if (!search) return arr
    const q = search.toLowerCase()
    return arr.filter((s) =>
      [s.code, s.section, s.name, s.campus, s.area_name || '', s.career_name || '', s.semester_name || '']
        .some((v) => String(v || '').toLowerCase().includes(q))
    )
  }, [items, search, searchParams])

  function openView(s: Subject) {
    navigate(`/coord/asignaturas/${s.id}`)
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
            placeholder={'Buscar por c\u00F3digo, secci\u00F3n o nombre'}
            className="w-72 max-w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {[
          { k: '', t: 'Todos' },
          { k: 'borrador', t: 'Borrador' },
          { k: 'enviada', t: 'Enviada' },
          { k: 'observada', t: 'Observada' },
          { k: 'aprobada', t: 'Aprobada' },
          { k: 'atraso', t: 'Atraso' },
          { k: 'riesgo', t: 'Riesgo' },
        ].map(({ k, t }) => {
          const active = (searchParams.get('filter') || '') === k
          return (
            <button
              key={k || 'all'}
              onClick={() => setSearchParams((prev) => { const p = new URLSearchParams(prev); if(k) p.set('filter', k); else p.delete('filter'); return p })}
              className={`rounded-full border px-3 py-1 text-xs ${active ? 'border-red-300 bg-red-50 text-red-700' : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'}`}
            >
              {t}
            </button>
          )
        })}
        <div className="ml-auto" />
        <button
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          disabled
          title="Requiere endpoint backend para crear proyectos"
        >
          Agregar proyecto (borrador)
        </button>
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
                <td className="p-4 text-sm text-zinc-600" colSpan={10}>Cargandoâ€¦</td>
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
                      const lvl = r <= 0 ? '' : r <= 2 ? 'Bajo' : r <= 4 ? 'Medio' : 'Alto'
                      return r <= 0 ? (
                        <span className="text-xs text-zinc-500">—</span>
                      ) : (
                        <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">{lvl}</span>
                      )
                    })()}
                  </Td>
                  <Td className="text-right">
                    <button
                      onClick={() => openView(s)}
                      className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                    >
                      {(() => { const a = atrasoInfo(s); return a.delayed ? 'Ver m\u00E1s \u00B7 Atraso ' + a.days + ' d\u00EDas' : 'Ver m\u00E1s'})()}
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
    return <span className="inline-block h-3 w-3 animate-pulse rounded-sm bg-zinc-300" title="Cargandoâ€¦" />
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




















