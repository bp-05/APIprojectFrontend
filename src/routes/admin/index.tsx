import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { listCompanies, listProblemStatements } from '../../api/companies'
import { listSubjects, type Subject } from '../../api/subjects'
import { usePeriodStore } from '../../store/period'

export default function AdminDashboard() {
  const periodCode = usePeriodStore((state) => state.periodCode)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [companyTotal, setCompanyTotal] = useState<number | null>(null)
  const [problemTotal, setProblemTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [subjectList, companies, problems] = await Promise.all([
        listSubjects(),
        listCompanies(),
        listProblemStatements(),
      ])
      setSubjects(Array.isArray(subjectList) ? subjectList : [])
      setCompanyTotal(Array.isArray(companies) ? companies.length : 0)
      setProblemTotal(Array.isArray(problems) ? problems.length : 0)
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

  const hasData =
    totalSubjects > 0 || (companyTotal !== null && companyTotal > 0) || (problemTotal !== null && problemTotal > 0)

  return (
    <section className="space-y-8 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-zinc-900">Panel admin</h1>
        <p className="text-sm text-zinc-500">
          Indicadores clave del periodo en curso y estado global del ecosistema con empresas.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={loadDashboard}
          className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Actualizando...' : 'Actualizar'}
        </button>
        <span className="text-xs text-zinc-500">
          Periodo seleccionado:{' '}
          <span className="font-semibold text-zinc-700">{periodCode ? periodCode : 'Sin configurar'}</span>
        </span>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Periodo actual" value={periodCode || '--'} subtitle="Configuracion vigente" tone="zinc" />
        <StatCard
          title="Asignaturas activas"
          value={loading && !totalSubjects ? '--' : totalSubjects}
          subtitle="Solo periodo seleccionado"
          tone="blue"
        />
        <StatCard
          title="Empresas registradas"
          value={companyTotal ?? '--'}
          subtitle="Inventario global"
          tone="green"
        />
        <StatCard
          title="Problematicas levantadas"
          value={problemTotal ?? '--'}
          subtitle="Todas las empresas"
          tone="amber"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PhaseBreakdown data={phaseSummary} total={totalSubjects} loading={loading} />
        <div className="rounded-xl border border-dashed border-zinc-200 bg-white/60 p-6 text-sm text-zinc-500">
          {!hasData && !loading ? (
            <p>No hay informacion disponible para el periodo seleccionado.</p>
          ) : (
            <p>
              Utiliza este panel para validar rapidamente si la oferta academica cuenta con suficientes empresas y
              problematicas. Si los numeros no cuadran, revisa los modulos de <strong>Asignaturas</strong> o{' '}
              <strong>Empresas</strong> para intervenir oportunamente.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

type StatTone = 'zinc' | 'blue' | 'green' | 'amber'

function StatCard({
  title,
  value,
  subtitle,
  tone = 'zinc',
}: {
  title: string
  value: ReactNode
  subtitle?: string
  tone?: StatTone
}) {
  const accents: Record<StatTone, string> = {
    zinc: 'text-zinc-900',
    blue: 'text-sky-600',
    green: 'text-emerald-600',
    amber: 'text-amber-600',
  } as const
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/90 px-4 py-5 shadow-sm">
      <p className="text-sm font-medium text-zinc-500">{title}</p>
      <div className={`mt-3 text-3xl font-semibold ${accents[tone] || accents.zinc}`}>{value}</div>
      {subtitle ? <p className="mt-1 text-xs text-zinc-500">{subtitle}</p> : null}
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
    <div className="rounded-2xl border border-zinc-200 bg-white/90 shadow-sm">
      <div className="border-b border-zinc-100 px-5 py-4">
        <div className="text-sm font-medium text-zinc-900">Fases de asignaturas</div>
        <p className="text-xs text-zinc-500">Distribucion del periodo actual</p>
      </div>
      <div className="px-5 py-4">
        {loading ? (
          <p className="text-sm text-zinc-500">Preparando resumen...</p>
        ) : !total ? (
          <p className="text-sm text-zinc-500">Aun no hay asignaturas que reportar en este periodo.</p>
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
