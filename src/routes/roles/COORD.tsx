import { useEffect, useMemo, useState } from 'react'
import { listSubjects, type Subject } from '../../api/subjects'

export default function COORD() {
  const [items, setItems] = useState<Subject[]>([])
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

  const active = useMemo(() => items.filter((s) => !!s.teacher), [items])

  // KPI: Conteo por fase
  type PhaseName = 'inicio' | 'formulacion' | 'gestion' | 'validacion' | 'completado'
  
  const phaseKpi = useMemo(() => {
    const result: Record<PhaseName, number> = { inicio: 0, formulacion: 0, gestion: 0, validacion: 0, completado: 0 }
    for (const s of items) {
      const phase = (s.phase || 'inicio') as PhaseName
      result[phase] = (result[phase] ?? 0) + 1
    }
    return result
  }, [items])

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

  // Obtener label de fase
  function getPhaseLabel(phase: string): string {
    const labels: Record<string, string> = {
      'inicio': 'Inicio',
      'formulacion': 'Formulación',
      'gestion': 'Gestión',
      'validacion': 'Validación',
      'completado': 'Completado',
    }
    return labels[phase] || phase
  }

  return (
    <section className="p-6">
      <div className="mb-6 mt-2 text-center">
        <h1 className="text-2xl font-bold">Panel de Coordinador</h1>
      </div>
      
      {/* KPI Cards por Fase */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard title="Inicio" value={phaseKpi.inicio} tone="zinc" linkTo="/coord/asignaturas?filter=inicio" />
        <KpiCard title="Formulación" value={phaseKpi.formulacion} tone="blue" linkTo="/coord/asignaturas?filter=fase1" />
        <KpiCard title="Gestión" value={phaseKpi.gestion} tone="amber" linkTo="/coord/asignaturas?filter=fase2" />
        <KpiCard title="Validación" value={phaseKpi.validacion} tone="purple" linkTo="/coord/asignaturas?filter=fase3" />
        <KpiCard title="Completado" value={phaseKpi.completado} tone="green" linkTo="/coord/asignaturas?filter=completado" />
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
              <Th>Fase</Th>
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
                  <Td>
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                      {getPhaseLabel(s.phase || 'inicio')}
                    </span>
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

function KpiCard({ title, value, tone = 'zinc', linkTo, subtitle = 'Total de proyectos' }: { title: string; value: number | string; tone?: 'zinc' | 'blue' | 'amber' | 'green' | 'purple'; linkTo?: string; subtitle?: string }) {
  const ring = {
    zinc: 'ring-zinc-200',
    blue: 'ring-blue-200',
    amber: 'ring-amber-200',
    green: 'ring-green-200',
    purple: 'ring-purple-200',
  }[tone]
  const badgeBg = {
    zinc: 'bg-zinc-100 text-zinc-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
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


