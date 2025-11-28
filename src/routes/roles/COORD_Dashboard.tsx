import { useEffect, useMemo, useState } from 'react'
import { listSubjects, type Subject } from '../../api/subjects'
import { usePeriodStore } from '../../store/period'
import jsPDF from 'jspdf'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function COORD_DASH() {
  const [items, setItems] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterInput, setFilterInput] = useState('')
  const [filters, setFilters] = useState<Array<{ key: 'docente' | 'carrera' | 'area'; value?: string }>>([])
  const season = usePeriodStore((s) => s.season)
  const year = usePeriodStore((s) => s.year)

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

  useEffect(() => { load() }, [season, year])

  const active = useMemo(() => items.filter((s) => !!s.teacher), [items])

  // Mapeo de fase del backend a fase del frontend
  const PHASE_MAP: Record<string, string> = {
    'inicio': 'Inicio',
    'formulacion': 'Formulación',
    'gestion': 'Gestión',
    'validacion': 'Validación',
    'completado': 'Completado',
  }
  
  // KPI: Conteo por fase
  const phaseKpi = useMemo(() => {
    const res: Record<string, number> = { 
      'Inicio': 0, 
      'Formulación': 0, 
      'Gestión': 0, 
      'Validación': 0, 
      'Completado': 0 
    }
    for (const s of items as any[]) {
      const backendPhase = s.phase || 'inicio'
      const mappedPhase = PHASE_MAP[backendPhase] || 'Inicio'
      res[mappedPhase] = (res[mappedPhase] || 0) + 1
    }
    return res
  }, [items])

  // Datos para el gráfico de barras
  const chartData = useMemo(() => {
    return [
      { name: 'Inicio', value: phaseKpi['Inicio'], color: '#71717a' },
      { name: 'Formulación', value: phaseKpi['Formulación'], color: '#3b82f6' },
      { name: 'Gestión', value: phaseKpi['Gestión'], color: '#f59e0b' },
      { name: 'Validación', value: phaseKpi['Validación'], color: '#a855f7' },
      { name: 'Completado', value: phaseKpi['Completado'], color: '#22c55e' },
    ]
  }, [phaseKpi])

  useEffect(() => {
    try { (window as any).phaseKpi = phaseKpi } catch {}
  }, [phaseKpi])

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

  function exportCsv() {
    const rows = [
      ['Fase', 'Cantidad'],
      ['Inicio', String(phaseKpi['Inicio'])],
      ['Formulación', String(phaseKpi['Formulación'])],
      ['Gestión', String(phaseKpi['Gestión'])],
      ['Validación', String(phaseKpi['Validación'])],
      ['Completado', String(phaseKpi['Completado'])],
    ]
    const csv = rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fases_coordinador_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportPdf() {
    const doc = new jsPDF()
    const d = new Date()
    doc.setFontSize(18)
    doc.text('Resumen de Fases - Coordinador', 14, 22)
    doc.setFontSize(10)
    doc.text(`Fecha: ${d.toLocaleString()}`, 14, 30)
    
    let y = 45
    doc.setFontSize(12)
    doc.text('Fase', 14, y)
    doc.text('Cantidad', 100, y)
    y += 8
    
    doc.setFontSize(10)
    const phases = ['Inicio', 'Formulación', 'Gestión', 'Validación', 'Completado']
    for (const phase of phases) {
      doc.text(phase, 14, y)
      doc.text(String(phaseKpi[phase] || 0), 100, y)
      y += 6
    }
    
    doc.save(`fases_coordinador_${new Date().toISOString().slice(0,10)}.pdf`)
  }

  // Obtener label de fase
  function getPhaseLabel(phase: string): string {
    return PHASE_MAP[phase] || phase
  }

  return (
    <section className="p-6">
      <div className="mb-6 mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Panel de Coordinador</h1>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            CSV
          </button>
          <button onClick={exportPdf} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            PDF
          </button>
        </div>
      </div>

      {/* KPI Cards por Fase */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard title="Inicio" value={phaseKpi['Inicio']} tone="zinc" linkTo="/coord/asignaturas?filter=inicio" />
        <KpiCard title="Formulación" value={phaseKpi['Formulación']} tone="blue" linkTo="/coord/asignaturas?filter=fase1" />
        <KpiCard title="Gestión" value={phaseKpi['Gestión']} tone="amber" linkTo="/coord/asignaturas?filter=fase2" />
        <KpiCard title="Validación" value={phaseKpi['Validación']} tone="purple" linkTo="/coord/asignaturas?filter=fase3" />
        <KpiCard title="Completado" value={phaseKpi['Completado']} tone="green" linkTo="/coord/asignaturas?filter=completado" />
      </div>

      {/* Gráfico de barras */}
      <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Distribución por Fase</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" name="Asignaturas">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Proyectos API en curso</h2>
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

