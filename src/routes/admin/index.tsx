import { useCallback, useEffect, useMemo, useState } from 'react'
import { listCompanies, listProblemStatements, listEngagementScopes } from '../../api/companies'
import { listSubjects, listAreas, listCareers, listCompanyRequirements, type Subject, type Area, type Career } from '../../api/subjects'
import { usePeriodStore } from '../../store/period'

export default function AdminDashboard() {
  const periodCode = usePeriodStore((state) => state.periodCode)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [careers, setCareers] = useState<Career[]>([])
  const [companyTotal, setCompanyTotal] = useState<number | null>(null)
  const [problemTotal, setProblemTotal] = useState<number | null>(null)
  const [problems, setProblems] = useState<Awaited<ReturnType<typeof listProblemStatements>>>([])
  const [engagementScopesTotal, setEngagementScopesTotal] = useState<number | null>(null)
  const [companyRequirementsTotal, setCompanyRequirementsTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [subjectList, companies, problemsRes, areaList, careerList, engagementScopes, companyReqs] = await Promise.all([
        listSubjects(),
        listCompanies(),
        listProblemStatements(),
        listAreas(),
        listCareers(),
        listEngagementScopes(),
        listCompanyRequirements(),
      ])
      const subjectsArr = Array.isArray(subjectList) ? subjectList : []
      setSubjects(subjectsArr)
      setAreas(Array.isArray(areaList) ? areaList : [])
      setCareers(Array.isArray(careerList) ? careerList : [])
      setCompanyTotal(Array.isArray(companies) ? companies.length : 0)
      const problemsSafe = Array.isArray(problemsRes) ? problemsRes : []
      setProblems(problemsSafe)
      setProblemTotal(problemsSafe.length)
      setEngagementScopesTotal(Array.isArray(engagementScopes) ? engagementScopes.length : 0)
      setCompanyRequirementsTotal(Array.isArray(companyReqs) ? companyReqs.length : 0)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo cargar el dashboard'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard, periodCode])

  const totalSubjects = subjects.length
  const totalAreas = areas.length
  const totalCareers = careers.length

  const phaseSummary = useMemo(() => {
    if (!subjects.length) return []
    const order = ['fase 1', 'fase 2', 'fase 3']
    const weights = new Map(order.map((value, index) => [value, index]))
    const counts: Record<string, number> = {}
    for (const subject of subjects) {
      const label = formatPhase(subject.phase)
      counts[label] = (counts[label] ?? 0) + 1
    }
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => {
        const aw = weights.get(a.label.toLowerCase())
        const bw = weights.get(b.label.toLowerCase())
        if (typeof aw === 'number' && typeof bw === 'number') return aw - bw
        if (typeof aw === 'number') return -1
        if (typeof bw === 'number') return 1
        return a.label.localeCompare(b.label, 'es', { numeric: true })
      })
  }, [subjects])

  const problemsByArea = useMemo(() => {
    if (!problems.length) return []
    const subjectAreaMap = new Map<number, string>()
    subjects.forEach((s) => subjectAreaMap.set(s.id, s.area_name || 'Sin área'))
    const counts: Record<string, number> = {}
    problems.forEach((p: any) => {
      const areaName = subjectAreaMap.get(p.subject) || 'Sin área'
      counts[areaName] = (counts[areaName] ?? 0) + 1
    })
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }))
  }, [problems, subjects])

  return (
    <section className="p-6">
      <div className="mb-6 mt-2 text-center">
        <h1 className="text-2xl font-bold">Panel de Administrador</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Indicadores clave del periodo en curso y estado global del ecosistema con empresas
        </p>
      </div>

      {/* Botón de actualización y periodo */}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={loadDashboard}
          className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Actualizando...' : 'Actualizar'}
        </button>
        <span className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-600">
          Periodo: <span className="font-semibold text-zinc-900">{periodCode || 'Sin configurar'}</span>
        </span>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {/* KPI Cards principales - Fila 1 */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Asignaturas"
          value={loading && !totalSubjects ? '--' : totalSubjects}
          tone="blue"
          linkTo="/asignaturas"
          subtitle="Periodo actual"
        />
        <KpiCard
          title="Áreas"
          value={totalAreas ?? '--'}
          tone="purple"
          linkTo="/areas"
          subtitle="Inventario global"
        />
        <KpiCard
          title="Carreras"
          value={totalCareers ?? '--'}
          tone="amber"
          linkTo="/carreras"
          subtitle="Inventario global"
        />
        <KpiCard
          title="Empresas"
          value={companyTotal ?? '--'}
          tone="green"
          linkTo="/empresas"
          subtitle="Registradas"
        />
      </div>

      {/* KPI Cards secundarios - Fila 2 */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Proyectos"
          value={problemTotal ?? '--'}
          tone="red"
          linkTo="/admin/proyectos"
          subtitle="Todas las empresas"
        />
        <KpiCard
          title="Alcances"
          value={engagementScopesTotal ?? '--'}
          tone="zinc"
          linkTo="/admin/alcances"
          subtitle="Contrapartes"
        />
        <KpiCard
          title="Posibles Contrapartes"
          value={companyRequirementsTotal ?? '--'}
          tone="zinc"
          linkTo="/admin/posible-contraparte"
          subtitle="Requisitos"
        />
        <KpiCard
          title="Periodo"
          value={periodCode || '--'}
          tone="zinc"
          linkTo="/admin/periodos"
          subtitle="Vigente"
        />
      </div>

      {/* Gráficos de resumen */}
      <div className="grid gap-4 lg:grid-cols-2">
        <PhaseBreakdown data={phaseSummary} total={totalSubjects} loading={loading} />
        <ProblemsByArea data={problemsByArea} loading={loading} />
      </div>
    </section>
  )
}

function KpiCard({ title, value, tone = 'zinc', linkTo, subtitle = 'Total' }: { title: string; value: number | string; tone?: 'zinc' | 'blue' | 'amber' | 'green' | 'purple' | 'red'; linkTo?: string; subtitle?: string }) {
  const ring = {
    zinc: 'ring-zinc-200',
    blue: 'ring-blue-200',
    amber: 'ring-amber-200',
    green: 'ring-green-200',
    purple: 'ring-purple-200',
    red: 'ring-red-200',
  }[tone]
  const badgeBg = {
    zinc: 'bg-zinc-100 text-zinc-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    red: 'bg-red-50 text-red-700',
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

function PhaseBreakdown({
  data,
  total,
  loading,
}: {
  data: Array<{ label: string; count: number }>
  total: number
  loading: boolean
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-5 py-4">
        <div className="text-sm font-semibold text-zinc-900">Fases de asignaturas</div>
        <p className="text-xs text-zinc-500">Distribución del periodo actual</p>
      </div>
      <div className="px-5 py-4">
        {loading ? (
          <p className="text-sm text-zinc-500">Preparando resumen...</p>
        ) : !total ? (
          <p className="text-sm text-zinc-500">Aún no hay asignaturas que reportar en este periodo.</p>
        ) : (
          <ul className="space-y-3">
            {data.map((entry) => {
              const pct = Math.round((entry.count / total) * 100)
              const accent = phaseAccent(entry.label)
              return (
                <li key={entry.label} className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-800">{entry.label}</p>
                    <p className="text-xs text-zinc-500">
                      {entry.count} {entry.count === 1 ? 'asignatura' : 'asignaturas'}
                    </p>
                  </div>
                  <div className="w-40">
                    <div className="h-2 rounded-full bg-zinc-100">
                      <div className={`h-2 rounded-full ${accent}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-right text-xs font-medium text-zinc-500">{pct}%</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function phaseAccent(label: string) {
  const normalized = label.toLowerCase()
  if (normalized.includes('fase 1')) return 'bg-zinc-800'
  if (normalized.includes('fase 2')) return 'bg-sky-500'
  if (normalized.includes('fase 3')) return 'bg-amber-500'
  return 'bg-emerald-500'
}

function formatPhase(value?: string | null) {
  const raw = (value || '').trim()
  if (!raw) return 'Sin fase'
  const normalized = raw.toLowerCase()
  if (normalized.startsWith('fase 1')) return 'Fase 1'
  if (normalized.startsWith('fase 2')) return 'Fase 2'
  if (normalized.startsWith('fase 3')) return 'Fase 3'
  return raw
}

function ProblemsByArea({
  data,
  loading,
}: {
  data: Array<{ label: string; count: number }>
  loading: boolean
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-5 py-4">
        <div className="text-sm font-semibold text-zinc-900">Proyectos por área</div>
        <p className="text-xs text-zinc-500">Agrupadas por área de la asignatura asociada</p>
      </div>
      <div className="px-5 py-4">
        {loading ? (
          <p className="text-sm text-zinc-500">Preparando resumen...</p>
        ) : !data.length ? (
          <p className="text-sm text-zinc-500">Aún no hay proyectos con área asignada.</p>
        ) : (
          <ul className="space-y-3">
            {data.map((entry) => (
              <li key={entry.label} className="flex items-center justify-between text-sm text-zinc-800">
                <span className="font-medium">{entry.label}</span>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">
                  {entry.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
