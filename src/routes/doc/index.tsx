import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { listSubjects, type Subject, listSubjectUnits, type SubjectUnit } from '../../api/subjects'
import { listProblemStatements, type ProblemStatement } from '../../api/companies'
import { usePeriodStore } from '../../store/period'

type StatTone = 'zinc' | 'blue' | 'green' | 'amber' | 'indigo' | 'violet' | 'cyan' | 'purple'

export default function DocDashboard() {
  const { periodCode } = usePeriodStore()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [mySubjects, setMySubjects] = useState<Subject[]>([])
  const [totalUnits, setTotalUnits] = useState<number | null>(null)
  const [totalProjects, setTotalProjects] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Cargar todas las asignaturas
      const subjectList = await listSubjects()
      const subjectsArr = Array.isArray(subjectList) ? subjectList : []
      setSubjects(subjectsArr)
      setMySubjects(subjectsArr)

      // Cargar unidades de todas mis asignaturas
      let unitsCount = 0
      for (const subject of subjectsArr) {
        try {
          const units = await listSubjectUnits(subject.id)
          unitsCount += Array.isArray(units) ? units.length : 0
        } catch {
          // Ignorar errores individuales
        }
      }
      setTotalUnits(unitsCount)

      // Cargar proyectos de todas mis asignaturas
      let projectsCount = 0
      for (const subject of subjectsArr) {
        try {
          const projects = await listProblemStatements({ subject: subject.id })
          projectsCount += Array.isArray(projects) ? projects.length : 0
        } catch {
          // Ignorar errores individuales
        }
      }
      setTotalProjects(projectsCount)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo cargar el dashboard'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const totalMySubjects = useMemo(() => mySubjects.length, [mySubjects])

  // Calcular asignaturas por fase
  const phaseStats = useMemo(() => {
    const stats = {
      inicio: 0,
      formulacion: 0,
      gestion: 0,
      validacion: 0,
      completado: 0,
    }
    mySubjects.forEach((s) => {
      const phase = String(s.phase || 'inicio').toLowerCase()
      if (phase in stats) {
        stats[phase as keyof typeof stats]++
      } else {
        stats.inicio++
      }
    })
    return stats
  }, [mySubjects])

  // Calcular asignaturas por tipo de API
  const apiTypeStats = useMemo(() => {
    const stats: Record<number, number> = { 1: 0, 2: 0, 3: 0 }
    mySubjects.forEach((s) => {
      const type = s.api_type
      if (type && type in stats) {
        stats[type]++
      }
    })
    return stats
  }, [mySubjects])

  // Progreso general (asignaturas completadas vs totales)
  const progressPercentage = useMemo(() => {
    if (totalMySubjects === 0) return 0
    return Math.round((phaseStats.completado / totalMySubjects) * 100)
  }, [phaseStats.completado, totalMySubjects])

  const hasData = totalMySubjects > 0 || (totalUnits !== null && totalUnits > 0) || (totalProjects !== null && totalProjects > 0)

  return (
    <section className="p-6">
      <div className="mb-6 mt-2">
        <h1 className="text-2xl font-semibold">Panel Docente</h1>
        <p className="text-sm text-zinc-600">Gestión de asignaturas API y proyectos</p>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      {!loading && !hasData ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
          <p className="text-sm text-zinc-600">No hay información disponible en este momento.</p>
        </div>
      ) : (
        <>
          {/* Tarjetas principales */}
          <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Periodo actual" value={periodCode || '--'} subtitle="Configuración vigente" tone="zinc" />
            <StatCard
              title="Mis asignaturas"
              value={loading && !totalMySubjects ? '--' : totalMySubjects}
              subtitle="Asignaturas asignadas"
              tone="blue"
            />
            <StatCard
              title="Unidades gestionadas"
              value={totalUnits ?? '--'}
              subtitle="Total de unidades"
              tone="indigo"
            />
            <StatCard
              title="Proyectos activos"
              value={totalProjects ?? '--'}
              subtitle="Proyectos con empresas"
              tone="green"
            />
          </div>

          {/* Fases y progreso */}
          <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm ring-1 ring-cyan-200">
              <div className="mb-2 rounded bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-700 inline-block">
                Progreso General
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-cyan-600">{progressPercentage}%</div>
              <div className="mt-1 text-xs text-zinc-500">Asignaturas completadas</div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full bg-cyan-600 transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            <StatCard
              title="Tipo API 1"
              value={apiTypeStats[1]}
              subtitle="Asignaturas nivel básico"
              tone="violet"
            />
            <StatCard
              title="Tipo API 2"
              value={apiTypeStats[2]}
              subtitle="Asignaturas nivel intermedio"
              tone="amber"
            />
          </div>

          {/* Distribución por fases */}
          <div className="mb-6">
            <PhaseBreakdown phases={phaseStats} />
          </div>

          {/* Lista de asignaturas */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-zinc-900">Mis asignaturas asignadas</h2>
            {loading ? (
              <p className="text-sm text-zinc-600">Cargando asignaturas...</p>
            ) : mySubjects.length === 0 ? (
              <p className="text-sm text-zinc-600">No tienes asignaturas asignadas en este periodo.</p>
            ) : (
              <div className="space-y-2">
                {mySubjects.slice(0, 5).map((subject) => (
                  <div
                    key={subject.id}
                    className="flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-zinc-900">{subject.name}</div>
                      <div className="text-xs text-zinc-500">
                        {subject.code}-{subject.section} • {subject.area_name || 'Sin área'}
                      </div>
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${getPhaseColor(subject.phase)}`}
                    >
                      {formatPhase(subject.phase)}
                    </span>
                  </div>
                ))}
                {mySubjects.length > 5 ? (
                  <div className="pt-2 text-center">
                    <a
                      href="/mis-asignaturas"
                      className="text-xs font-medium text-red-700 hover:underline"
                    >
                      Ver todas las asignaturas ({mySubjects.length})
                    </a>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}

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
    indigo: 'text-indigo-600',
    violet: 'text-violet-600',
    cyan: 'text-cyan-600',
    purple: 'text-purple-600',
  } as const

  const rings: Record<StatTone, string> = {
    zinc: 'ring-zinc-200',
    blue: 'ring-sky-200',
    green: 'ring-emerald-200',
    amber: 'ring-amber-200',
    indigo: 'ring-indigo-200',
    violet: 'ring-violet-200',
    cyan: 'ring-cyan-200',
    purple: 'ring-purple-200',
  } as const

  const badges: Record<StatTone, string> = {
    zinc: 'bg-zinc-100 text-zinc-700',
    blue: 'bg-sky-50 text-sky-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    violet: 'bg-violet-50 text-violet-700',
    cyan: 'bg-cyan-50 text-cyan-700',
    purple: 'bg-purple-50 text-purple-700',
  } as const

  return (
    <div className={`rounded-lg border border-zinc-200 bg-white p-4 shadow-sm ring-1 ${rings[tone]}`}>
      <div className={`rounded px-2 py-0.5 text-xs font-medium ${badges[tone]} inline-block`}>{title}</div>
      <div className={`mt-3 text-3xl font-semibold tracking-tight ${accents[tone]}`}>{value}</div>
      {subtitle ? <div className="mt-1 text-xs text-zinc-500">{subtitle}</div> : null}
    </div>
  )
}

function PhaseBreakdown({ phases }: { phases: Record<string, number> }) {
  const total = Object.values(phases).reduce((a, b) => a + b, 0)
  
  const phaseData = [
    { key: 'inicio', label: 'Inicio', color: 'bg-zinc-400', count: phases.inicio },
    { key: 'formulacion', label: 'Formulación', color: 'bg-blue-500', count: phases.formulacion },
    { key: 'gestion', label: 'Gestión', color: 'bg-amber-500', count: phases.gestion },
    { key: 'validacion', label: 'Validación', color: 'bg-violet-500', count: phases.validacion },
    { key: 'completado', label: 'Completado', color: 'bg-green-500', count: phases.completado },
  ]

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-base font-semibold text-zinc-900">Distribución por fases</h2>
      <div className="space-y-2">
        {phaseData.map((phase) => {
          const percentage = total > 0 ? Math.round((phase.count / total) * 100) : 0
          return (
            <div key={phase.key}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-zinc-700">{phase.label}</span>
                <span className="font-medium text-zinc-900">
                  {phase.count} ({percentage}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full ${phase.color} transition-all duration-300`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatPhase(phase: string | undefined | null): string {
  const map: Record<string, string> = {
    inicio: 'Inicio',
    formulacion: 'Formulación',
    gestion: 'Gestión',
    validacion: 'Validación',
    completado: 'Completado',
  }
  return map[String(phase || '').toLowerCase()] || 'Inicio'
}

function getPhaseColor(phase: string | undefined | null): string {
  const map: Record<string, string> = {
    inicio: 'bg-zinc-100 text-zinc-700',
    formulacion: 'bg-blue-50 text-blue-700',
    gestion: 'bg-amber-50 text-amber-700',
    validacion: 'bg-violet-50 text-violet-700',
    completado: 'bg-green-50 text-green-700',
  }
  return map[String(phase || '').toLowerCase()] || 'bg-zinc-100 text-zinc-700'
}
