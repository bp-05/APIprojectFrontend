import { useEffect, useMemo, useState, useRef } from 'react'
import { listSubjects, type Subject } from '../../api/subjects'
import { useSearchParams, Link } from 'react-router'

type ProjectState = 'Borrador' | 'Enviada' | 'Observada' | 'Aprobada'
type LocalStatus = { status: ProjectState; timestamps?: Partial<Record<ProjectState, string>> }

export default function EstadoCoord() {
  const [items, setItems] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const [editTarget, setEditTarget] = useState<{ id: number; state: ProjectState } | null>(null)
  const [editSelection, setEditSelection] = useState<ProjectState>('Borrador')
  const [cycleTarget, setCycleTarget] = useState<{ id: number } | null>(null)
  const [phaseSel, setPhaseSel] = useState<'Fase 1' | 'Fase 2' | 'Fase 3'>('Fase 1')
  const [startText, setStartText] = useState('')
  const [endText, setEndText] = useState('')
  const startPickerRef = useRef<HTMLInputElement | null>(null)
  const endPickerRef = useRef<HTMLInputElement | null>(null)

  const [localStatus, setLocalStatus] = useState<Record<number, LocalStatus>>(() => {
    try { return JSON.parse(localStorage.getItem('coordSubjectStatus') || '{}') } catch { return {} }
  })
  const [localCycle, setLocalCycle] = useState<Record<number, { phase: 'Fase 1' | 'Fase 2' | 'Fase 3'; start?: string; end?: string }>>(() => {
    try { return JSON.parse(localStorage.getItem('coordSubjectCycle') || '{}') } catch { return {} }
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

  function saveCycle(next: Record<number, { phase: 'Fase 1' | 'Fase 2' | 'Fase 3'; start?: string; end?: string }>) {
    setLocalCycle(next)
    try { localStorage.setItem('coordSubjectCycle', JSON.stringify(next)) } catch {}
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
              placeholder={'Buscar por código, sección o nombre'}
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
              <Th>Riesgo</Th>
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
                  <Td><span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">{statusLabel(mapStatus(s))}</span></Td>
                  <Td>{(() => { const r = riskScore(s); const lvl = r <= 0 ? '' : r <= 2 ? 'Bajo' : r <= 4 ? 'Medio' : 'Alto'; return r > 0 ? (<span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">{lvl}</span>) : (<span className="text-xs text-zinc-500">—</span>) })()}</Td>
                  <Td className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      <button
                        onClick={() => { const cur = mapStatus(s); setEditTarget({ id: s.id, state: cur }); setEditSelection(cur) }}
                        className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                      >
                        Editar estado
                      </button>
                      <button
                        onClick={() => {
                          setCycleTarget({ id: s.id })
                          const c = localCycle[s.id]
                          setPhaseSel(c?.phase || 'Fase 1')
                          setStartText(c?.start || '')
                          setEndText(c?.end || '')
                        }}
                        className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                      >
                        Editar ciclo
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
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Editar estado del proyecto</h2>
              <button onClick={() => setEditTarget(null)} className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50">Cerrar</button>
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-zinc-700">Estado</label>
              <select
                value={editSelection}
                onChange={(e) => setEditSelection(e.target.value as ProjectState)}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              >
                <option value="Borrador">Borrador</option>
                <option value="Enviada">Enviada</option>
                <option value="Observada">Observada</option>
                <option value="Aprobada">Aprobada</option>
              </select>
            </div>
            <div className="mb-4 rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Información adicional</div>
                <button
                  type="button"
                  onClick={() => {
                    const id = editTarget?.id
                    if (id != null) {
                      setCycleTarget({ id })
                      const c = localCycle[id]
                      setPhaseSel(c?.phase || 'Fase 1')
                      setStartText(c?.start || '')
                      setEndText(c?.end || '')
                      setEditTarget(null)
                    }
                  }}
                  className="text-xs font-medium text-red-700 hover:underline"
                >
                  Ir
                </button>
              </div>
              {(() => {
                const id = editTarget?.id
                const info = id != null ? localCycle[id] : undefined
                return (
                  <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-zinc-500">Fase</dt>
                      <dd className="font-medium text-zinc-800">{info?.phase || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-500">Fecha de inicio</dt>
                      <dd className="font-medium text-zinc-800">{info?.start || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-500">Fecha límite</dt>
                      <dd className="font-medium text-zinc-800">{info?.end || '—'}</dd>
                    </div>
                  </dl>
                )
              })()}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditTarget(null)} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50">Cancelar</button>
              <button
                onClick={() => { if (editTarget) { setStatus(editTarget.id, editSelection); setEditTarget(null) } }}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {cycleTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" onClick={() => setCycleTarget(null)}>
          <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Editar ciclo del proyecto</h2>
              <button onClick={() => setCycleTarget(null)} className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50">Cerrar</button>
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-zinc-700">Fase del proyecto</label>
              <select value={phaseSel} onChange={(e) => setPhaseSel(e.target.value as any)} className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10">
                <option>Fase 1</option>
                <option>Fase 2</option>
                <option>Fase 3</option>
              </select>
            </div>
            <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Fecha de inicio</label>
                <div className="flex items-center gap-2">
                  <input
                    value={startText}
                    onChange={(e) => setStartText(formatDateMask(e.target.value))}
                    placeholder="DD-MM-AAAA"
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
                  />
                  <input ref={startPickerRef} type="date" className="hidden" onChange={(e) => { const v = e.target.value; if (v) { const [y,m,d] = v.split('-'); setStartText(`${d}-${m}-${y}`) } }} />
                  <button onClick={() => { const el = startPickerRef.current as any; if (el?.showPicker) el.showPicker(); else el?.click() }} className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50">Abrir calendario</button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Fecha límite</label>
                <div className="flex items-center gap-2">
                  <input
                    value={endText}
                    onChange={(e) => setEndText(formatDateMask(e.target.value))}
                    placeholder="DD-MM-AAAA"
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
                  />
                  <input ref={endPickerRef} type="date" className="hidden" onChange={(e) => { const v = e.target.value; if (v) { const [y,m,d] = v.split('-'); setEndText(`${d}-${m}-${y}`) } }} />
                  <button onClick={() => { const el = endPickerRef.current as any; if (el?.showPicker) el.showPicker(); else el?.click() }} className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50">Abrir calendario</button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setCycleTarget(null)} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50">Cancelar</button>
              <button
                onClick={() => {
                  if (!cycleTarget) return
                  saveCycle({
                    ...localCycle,
                    [cycleTarget.id]: { phase: phaseSel, start: startText, end: endText },
                  })
                  setCycleTarget(null)
                }}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function formatDateMask(input: string) {
  const digits = input.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) {
    return digits
  }
  if (digits.length <= 4) {
    // Evita guion de arrastre cuando hay exactamente 2 o 4 dígitos
    return digits.slice(0, 2) + '-' + digits.slice(2)
  }
  return digits.slice(0, 2) + '-' + digits.slice(2, 4) + '-' + digits.slice(4)
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
