import { useEffect, useMemo, useState } from 'react'
import { listSubjects, type Subject } from '../../api/subjects'

export default function COORD() {
  const [items, setItems] = useState<Subject[]>([])
  const [lsVersion, setLsVersion] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterInput, setFilterInput] = useState('')
  const [filters, setFilters] = useState<Array<{ key: 'docente' | 'carrera' | 'area'; value?: string }>>([])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await listSubjects()
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar proyectos'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // Escuchar cambios de estado local de proyectos para sincronizar KPIs
  useEffect(() => {
    function onCustom() { setLsVersion((v) => v + 1) }
    function onStorage(e: StorageEvent) { if (e.key === 'coordSubjectStatus') setLsVersion((v) => v + 1) }
    window.addEventListener('coordSubjectStatusChanged', onCustom as any)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('coordSubjectStatusChanged', onCustom as any)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const active = useMemo(() => items.filter((s) => !!s.teacher), [items])

  // KPI: Conteo por estado de proyecto (considera estado local guardado)
  type ProjectState = 'Borrador' | 'Enviada' | 'Observada' | 'Aprobada'
  function readLocalStatus(): Record<number, { status: ProjectState }> {
    try { return JSON.parse(localStorage.getItem('coordSubjectStatus') || '{}') } catch { return {} }
  }
  const localStatusMap = useMemo(() => readLocalStatus(), [lsVersion])
  function mapStatus(s: any): ProjectState {
    const local = (localStatusMap as any)[s.id]?.status as ProjectState | undefined
    if (local) return local
    const raw = String(s?.project_status || s?.status || '').toLowerCase()
    if (raw.includes('observ')) return 'Observada'
    if (raw.includes('apro') || raw.includes('aprob')) return 'Aprobada'
    if (raw.includes('env')) return 'Enviada'
    if (!s?.teacher) return 'Borrador'
    return 'Enviada'
  }

  const kpi = useMemo(() => {
    const result: Record<ProjectState, number> = { Borrador: 0, Enviada: 0, Observada: 0, Aprobada: 0 }
    for (const s of items) {
      const st = mapStatus(s)
      result[st] = (result[st] ?? 0) + 1
    }
    return result
  }, [items, localStatusMap])

  // % con atraso (heurística: estados Observada considerados con atraso)
  const delayedPct = useMemo(() => {
    if (!items.length) return 0
    const delayed = items.filter((s) => mapStatus(s) === 'Observada').length
    return Math.round((delayed / items.length) * 100)
  }, [items, localStatusMap])

  // Tiempo de ciclo promedio en días (si hay algún campo de duración, usarlo; de lo contrario, mostrar '-')
  const avgCycleDays = useMemo(() => {
    const values: number[] = []
    for (const s of items as any[]) {
      const d = Number(s?.cycle_days ?? s?.duration_days ?? s?.avg_cycle_days)
      if (Number.isFinite(d) && d > 0) values.push(d)
    }
    if (!values.length) return null
    const sum = values.reduce((a, b) => a + b, 0)
    return Math.round(sum / values.length)
  }, [items, localStatusMap])

  // Top 5 proyectos en riesgo (heurística)
  function riskScore(s: any) {
    let score = 0
    const st = mapStatus(s)
    if (st === 'Observada') score += 3
    if (!s?.teacher) score += 2
    if (!s?.career_name) score += 1
    if (!s?.area_name) score += 1
    return score
  }
  const topRisk = useMemo(() => {
    return [...items]
      .map((s) => ({ s, score: riskScore(s) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }, [items])

  useEffect(() => {
    try {
      ;(window as any).kpi = kpi
      ;(window as any).delayedPct = delayedPct
      ;(window as any).avgCycleDays = avgCycleDays
    } catch {}
  }, [kpi, delayedPct, avgCycleDays])

  function norm(s: string) {
    try { return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase() } catch { return s.toLowerCase() }
  }

  const filtered = useMemo(() => {
    if (!filters.length) return active
    return active.filter((s) => {
      return filters.every((f) => {
        const key = f.key
        const val = (f.value || '').trim()
        if (key === 'docente') {
          if (!val) return !!s.teacher
          return norm(s.teacher_name || '').includes(norm(val))
        }
        if (key === 'carrera') {
          if (!val) return !!s.career_name
          return norm(s.career_name || '').includes(norm(val))
        }
        if (key === 'area') {
          if (!val) return !!s.area_name
          return norm(s.area_name || '').includes(norm(val))
        }
        return true
      })
    })
  }, [active, filters])

  function addFilterFromInput() {
    const raw = filterInput.trim()
    if (!raw) return
    let keyStr = raw
    let val = ''
    const idx = raw.indexOf(':')
    if (idx !== -1) {
      keyStr = raw.slice(0, idx)
      val = raw.slice(idx + 1).trim()
    }
    const k = norm(keyStr)
    let key: 'docente' | 'carrera' | 'area' | null = null
    if (k === 'docente') key = 'docente'
    else if (k === 'carrera') key = 'carrera'
    else if (k === 'area' || k === 'área') key = 'area'
    if (!key) {
      // Si no coincide, intentar interpretarlo como búsqueda por docente
      setFilters((fs) => [...fs, { key: 'docente', value: raw }])
      setFilterInput('')
      return
    }
    setFilters((fs) => [...fs, { key, value: val }])
    setFilterInput('')
  }

  function removeFilter(i: number) {
    setFilters((fs) => fs.filter((_, idx) => idx !== i))
  }

  return (
    <section className="p-6">
      <div className="mb-6 mt-2 text-center">
        <h1 className="text-2xl font-bold">Panel de Coordinador</h1>
      </div>
      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Borrador" value={kpi.Borrador} tone="zinc" linkTo="/coord/asignaturas?filter=borrador" />
        <KpiCard title="Enviada" value={kpi.Enviada} tone="blue" linkTo="/coord/asignaturas?filter=enviada" />
        <KpiCard title="Observada" value={kpi.Observada} tone="amber" linkTo="/coord/asignaturas?filter=observada" />
        <KpiCard title="Aprobada" value={kpi.Aprobada} tone="green" linkTo="/coord/asignaturas?filter=aprobada" />
      </div>

      {/* KPIs avanzados */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard title="% con atraso" value={`${delayedPct}%`} tone="amber" linkTo="/coord/asignaturas?filter=atraso" subtitle="Sobre el total de proyectos" />
        <KpiCard title="Tiempo de ciclo promedio" value={avgCycleDays === null ? '—' : `${avgCycleDays} días`} tone="zinc" subtitle="Promedio estimado" />
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm ring-1 ring-zinc-200">
          <div className="mb-2 flex items-center justify-between">
            <div className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Top 5 proyectos en riesgo</div>
            <a href="/coord/asignaturas?filter=riesgo" className="text-xs font-medium text-red-700 hover:underline">Ver detalle</a>
          </div>
          {topRisk.length === 0 ? (
            <div className="text-sm text-zinc-600">Sin datos</div>
          ) : (
            <ul className="space-y-2">
              {topRisk.map(({ s, score }) => (
                <li key={(s as any).id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{s.name}</div>
                    <div className="truncate text-xs text-zinc-500">{s.code}-{s.section}</div>
                  </div>
                  <span className="ml-2 rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">riesgo {score}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mb-4 flex items-center justify-end gap-2">
        <button onClick={exportCsv} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50">Exportar KPIs (CSV)</button>
        <button onClick={exportPdf} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50">Exportar KPIs (PDF)</button>
      </div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Proyectos API en curso</h1>
          <p className="text-sm text-zinc-600">Listado de proyectos activos asignados a docentes</p>
        </div>
        <div>
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
          >
            Filtrar
          </button>
        </div>
      </div>

      {filterOpen ? (
        <div className="mb-4 rounded-lg border border-zinc-200 bg-white p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {filters.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                {f.key}{f.value ? `: ${f.value}` : ''}
                <button onClick={() => removeFilter(i)} className="rounded-full border border-red-200 bg-white px-1 text-red-700 hover:bg-red-50">×</button>
              </span>
            ))}
          </div>
          <input
            value={filterInput}
            onChange={(e) => setFilterInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFilterFromInput() } }}
            placeholder="Ej: docente: juan | carrera: informática | area: informática"
            className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
        </div>
      ) : null}

      {error ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <Th>Docente</Th>
              <Th>Asignatura</Th>
              <Th>Área</Th>
              <Th>Carrera</Th>
              <Th>Fecha de inicio</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {loading ? (
              <tr>
                <td className="p-4 text-sm text-zinc-600" colSpan={5}>Cargando…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="p-4 text-sm text-zinc-600" colSpan={5}>No hay proyectos activos</td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50">
                  <Td>{s.teacher_name || '-'}</Td>
                  <Td>
                    <div className="text-sm">{s.name}</div>
                    <div className="text-xs text-zinc-500">{s.code}-{s.section}</div>
                  </Td>
                  <Td>{s.area_name || '-'}</Td>
                  <Td>{s.career_name || '-'}</Td>
                  <Td>-</Td>
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

function KpiCard({ title, value, tone = 'zinc', linkTo, subtitle = 'Total de proyectos' }: { title: string; value: number | string; tone?: 'zinc' | 'blue' | 'amber' | 'green'; linkTo?: string; subtitle?: string }) {
  const ring = {
    zinc: 'ring-zinc-200',
    blue: 'ring-blue-200',
    amber: 'ring-amber-200',
    green: 'ring-green-200',
  }[tone]
  const badgeBg = {
    zinc: 'bg-zinc-100 text-zinc-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-green-50 text-green-700',
  }[tone]
  return (
    <div className={`rounded-lg border border-zinc-200 bg-white p-4 shadow-sm ring-1 ${ring}`}>
      <div className="flex items-center justify-between">
        <div className={`rounded px-2 py-0.5 text-xs font-medium ${badgeBg}`}>{title}</div>
        {linkTo ? (
          <a href={linkTo} className="text-xs font-medium text-red-700 hover:underline">Ver detalle</a>
        ) : null}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-zinc-500">{subtitle}</div>
    </div>
  )
}

function exportCsv() {
  const rows = [
    ['Métrica', 'Valor'],
    ['Borrador', String((window as any).kpi?.Borrador ?? '')],
    ['Enviada', String((window as any).kpi?.Enviada ?? '')],
    ['Observada', String((window as any).kpi?.Observada ?? '')],
    ['Aprobada', String((window as any).kpi?.Aprobada ?? '')],
    ['% con atraso', String((window as any).delayedPct ?? '')],
    ['Tiempo de ciclo promedio (días)', String((window as any).avgCycleDays ?? '')],
  ]
  const csv = rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `kpis_coordinador_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function exportPdf() {
  const w = window.open('', '_blank')
  if (!w) return
  const d = new Date()
  const html = `<!doctype html><html><head><meta charset="utf-8" /><title>KPIs Coordinador</title>
    <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif;padding:24px;color:#111} h1{font-size:20px;margin:0 0 12px} table{border-collapse:collapse;width:100%} th,td{border:1px solid #ddd;padding:8px;text-align:left} th{background:#f5f5f5}</style>
  </head><body>
    <h1>KPIs Coordinador</h1>
    <div>Fecha: ${d.toLocaleString()}</div>
    <table style="margin-top:12px">
      <thead><tr><th>Métrica</th><th>Valor</th></tr></thead>
      <tbody>
        <tr><td>Borrador</td><td>${(window as any).kpi?.Borrador ?? ''}</td></tr>
        <tr><td>Enviada</td><td>${(window as any).kpi?.Enviada ?? ''}</td></tr>
        <tr><td>Observada</td><td>${(window as any).kpi?.Observada ?? ''}</td></tr>
        <tr><td>Aprobada</td><td>${(window as any).kpi?.Aprobada ?? ''}</td></tr>
        <tr><td>% con atraso</td><td>${(window as any).delayedPct ?? ''}%</td></tr>
        <tr><td>Tiempo de ciclo promedio (días)</td><td>${(window as any).avgCycleDays ?? '—'}</td></tr>
      </tbody>
    </table>
    <script>window.onload = () => setTimeout(() => window.print(), 300)</script>
  </body></html>`
  w.document.open()
  w.document.write(html)
  w.document.close()
}

