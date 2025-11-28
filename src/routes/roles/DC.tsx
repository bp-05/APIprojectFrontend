import { useEffect, useMemo, useState } from 'react'
import {
  listSubjects,
  listSubjectCompetencies,
  getBoundaryConditionBySubject,
  getApiType2CompletionBySubject,
  getApiType3CompletionBySubject,
  getAlternanceBySubject,
  type Subject,
} from '../../api/subjects'
import { listCompanies } from '../../api/companies'
import { useNavigate } from 'react-router'

type SectionCounts = {
  info: number
  competencies: number
  boundaries: number
  api2: number
  api3: number
  alternance: number
}

export default function DC() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Subject[]>([])
  const [companyTotal, setCompanyTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [counts, setCounts] = useState<SectionCounts>({
    info: 0,
    competencies: 0,
    boundaries: 0,
    api2: 0,
    api3: 0,
    alternance: 0,
  })

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [subjectsData, companies] = await Promise.all([listSubjects(), listCompanies()])
      const subjects = Array.isArray(subjectsData) ? subjectsData : []
      setItems(subjects)
      setCompanyTotal(Array.isArray(companies) ? companies.length : 0)
      await computeSectionCounts(subjects)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar asignaturas'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function computeSectionCounts(subjects: Subject[]) {
    if (!subjects.length) {
      setCounts({ info: 0, competencies: 0, boundaries: 0, api2: 0, api3: 0, alternance: 0 })
      return
    }
    const detailed = await Promise.all(
      subjects.map(async (s) => {
        const competencies = await listSubjectCompetencies(s.id).catch(() => [])
        const boundary = await getBoundaryConditionBySubject(s.id).catch(() => null)
        const api2 = s.api_type === 2 ? await getApiType2CompletionBySubject(s.id).catch(() => null) : null
        const api3 = s.api_type === 3 ? await getApiType3CompletionBySubject(s.id).catch(() => null) : null
        const alternance = s.api_type === 3 ? await getAlternanceBySubject(s.id).catch(() => null) : null
        const infoDone = Boolean(s.area && s.career && s.teacher && s.total_students != null)
        const competenciesDone = Array.isArray(competencies) && competencies.some((c) => (c?.description || '').trim().length > 0)
        const boundaryDone =
          !!boundary &&
          (boundary.large_company ||
            boundary.medium_company ||
            boundary.small_company ||
            boundary.family_enterprise ||
            boundary.not_relevant ||
            (boundary.company_type_description || '').trim() ||
            (boundary.company_requirements_for_level_2_3 || '').trim() ||
            (boundary.project_minimum_elements || '').trim())
        const api2Done =
          s.api_type === 2 &&
          !!api2 &&
          Object.values({
            goal: api2.project_goal_students,
            deliv: api2.deliverables_at_end,
            part: api2.company_expected_participation,
            other: api2.other_activities,
          }).some((v) => (v || '').toString().trim().length > 0)
        const api3Done =
          s.api_type === 3 &&
          !!api3 &&
          Object.values({
            goal: api3.project_goal_students,
            deliv: api3.deliverables_at_end,
            role: api3.expected_student_role,
            other: api3.other_activities,
            support: api3.master_guide_expected_support,
          }).some((v) => (v || '').toString().trim().length > 0)
        const alternanceDone =
          s.api_type === 3 &&
          !!alternance &&
          Object.values({
            role: alternance.student_role,
            quota: alternance.students_quota,
            tutor: alternance.tutor_name,
            email: alternance.tutor_email,
          }).some((v) => (v || '').toString().trim().length > 0)
        return {
          infoDone,
          competenciesDone,
          boundaryDone,
          api2Done,
          api3Done,
          alternanceDone,
        }
      })
    )
    setCounts({
      info: detailed.filter((d) => d.infoDone).length,
      competencies: detailed.filter((d) => d.competenciesDone).length,
      boundaries: detailed.filter((d) => d.boundaryDone).length,
      api2: detailed.filter((d) => d.api2Done).length,
      api3: detailed.filter((d) => d.api3Done).length,
      alternance: detailed.filter((d) => d.alternanceDone).length,
    })
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    if (!search) return items
    const q = search.toLowerCase()
    return items.filter((s) =>
      [s.code, s.section, s.name, s.campus, s.area_name || '', s.career_name || '', s.semester_name || '', s.teacher_name || '']
        .some((v) => String(v || '').toLowerCase().includes(q))
    )
  }, [items, search])

  return (
    <section className="p-6 space-y-6">
      <div className="mb-6 mt-2 text-center">
        <h1 className="text-2xl font-bold">Panel de Director de Carrera</h1>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard title="Total Asignaturas" value={items.length} tone="zinc" />
        <KpiCard title="Empresas" value={companyTotal ?? 0} tone="blue" />
        <KpiCard title="Información General" value={counts.info} tone="green" subtitle={`${counts.info}/${items.length || 1} completos`} />
        <KpiCard title="Competencias" value={counts.competencies} tone="purple" subtitle={`${counts.competencies}/${items.length || 1} registradas`} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard title="Condiciones de Borde" value={counts.boundaries} tone="amber" subtitle={`${counts.boundaries}/${items.length || 1} cargados`} />
        <KpiCard
          title="API Tipo 2"
          value={counts.api2}
          subtitle={`${counts.api2}/${Math.max(1, items.filter((s) => s.api_type === 2).length)} completados`}
          tone="blue"
        />
        <KpiCard
          title="API Tipo 3"
          value={counts.api3}
          subtitle={`${counts.api3}/${Math.max(1, items.filter((s) => s.api_type === 3).length)} completados`}
          tone="purple"
        />
        <KpiCard
          title="Alternancia"
          value={counts.alternance}
          subtitle={`${counts.alternance}/${Math.max(1, items.filter((s) => s.api_type === 3).length)} con info`}
          tone="green"
        />
      </div>

      {/* Gráfico de asignaturas por fase */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-zinc-900">Distribución de Asignaturas por Fase</h2>
          <p className="text-sm text-zinc-500">Progreso general del proceso API</p>
        </div>
        <PhaseChart subjects={items} />
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Asignaturas</h2>
            <p className="text-sm text-zinc-600">Listado para tu rol</p>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por codigo, seccion o nombre"
            className="w-72 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <Th>Codigo</Th>
                <Th>Seccion</Th>
                <Th>Nombre</Th>
                <Th>Area</Th>
                <Th>Carrera</Th>
                <Th>Docente</Th>
                <Th>Semestre</Th>
                <Th>Fase</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {loading ? (
                <tr>
                  <td className="p-4 text-sm text-zinc-600" colSpan={8}>Cargando...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="p-4 text-sm text-zinc-600" colSpan={8}>Sin resultados</td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr
                    key={s.id}
                    className="cursor-pointer transition-colors hover:bg-zinc-50"
                    onClick={() => navigate(`/dc/asignaturas/${s.id}`)}
                  >
                    <Td>{s.code}</Td>
                    <Td>{s.section}</Td>
                    <Td>{s.name}</Td>
                    <Td>{s.area_name}</Td>
                    <Td>{s.career_name || '-'}</Td>
                    <Td>{s.teacher_name || '-'}</Td>
                    <Td>{s.semester_name}</Td>
                    <Td>{phaseLabel(s.phase)}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function KpiCard({ title, value, tone = 'zinc', linkTo, subtitle = 'Total de elementos' }: { title: string; value: number | string; tone?: 'zinc' | 'blue' | 'amber' | 'green' | 'purple'; linkTo?: string; subtitle?: string }) {
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

function phaseLabel(v: string) {
  const map: Record<string, string> = {
    inicio: 'Inicio',
    formulacion: 'Formulacion',
    gestion: 'Gestion',
    validacion: 'Validacion',
    completado: 'Completado',
  }
  return map[v] || v
}

function PhaseChart({ subjects }: { subjects: Subject[] }) {
  const phases = [
    { key: 'inicio', label: 'Inicio', color: '#71717a', strokeColor: '#3f3f46' },
    { key: 'formulacion', label: 'Formulación', color: '#3b82f6', strokeColor: '#1d4ed8' },
    { key: 'gestion', label: 'Gestión', color: '#f59e0b', strokeColor: '#d97706' },
    { key: 'validacion', label: 'Validación', color: '#a855f7', strokeColor: '#7e22ce' },
    { key: 'completado', label: 'Completado', color: '#22c55e', strokeColor: '#16a34a' },
  ]

  const phaseCounts = phases.map((phase) => ({
    ...phase,
    count: subjects.filter((s) => (s.phase || 'inicio').toLowerCase() === phase.key).length,
  }))

  const maxCount = Math.max(...phaseCounts.map((p) => p.count), 10)
  const chartHeight = 500
  const chartWidth = 1400
  const padding = { top: 40, right: 80, bottom: 80, left: 100 }
  const graphWidth = chartWidth - padding.left - padding.right
  const graphHeight = chartHeight - padding.top - padding.bottom

  // Generar puntos para cada línea de fase
  const getLinePoints = (_phaseIndex: number) => {
    return phaseCounts.map((_, i) => {
      const x = padding.left + (i * graphWidth) / (phaseCounts.length - 1)
      const y = padding.top + graphHeight - (phaseCounts[i].count / maxCount) * graphHeight
      return { x, y, count: phaseCounts[i].count }
    })
  }

  // Crear path SVG con curvas suaves
  const createSmoothPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return ''
    
    let path = `M ${points[0].x} ${points[0].y}`
    
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i]
      const next = points[i + 1]
      const controlX = current.x + (next.x - current.x) / 2
      
      path += ` Q ${controlX} ${current.y}, ${controlX} ${(current.y + next.y) / 2}`
      path += ` Q ${controlX} ${next.y}, ${next.x} ${next.y}`
    }
    
    return path
  }

  // Líneas de cuadrícula horizontales
  const gridLines = Array.from({ length: 6 }, (_, i) => {
    const value = (maxCount / 5) * (5 - i)
    const y = padding.top + (i * graphHeight) / 5
    return { y, value: Math.round(value) }
  })

  return (
    <div className="space-y-6">
      {/* Gráfico de líneas SVG */}
      <div className="flex justify-center overflow-x-auto">
        <svg
          width={chartWidth}
          height={chartHeight}
          className="rounded-lg border border-zinc-200 bg-white"
          style={{ minWidth: chartWidth }}
        >
          {/* Cuadrícula horizontal */}
          {gridLines.map((line, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={line.y}
                x2={chartWidth - padding.right}
                y2={line.y}
                stroke="#e4e4e7"
                strokeWidth="1"
                strokeDasharray={i === gridLines.length - 1 ? '0' : '4 2'}
              />
              <text
                x={padding.left - 15}
                y={line.y + 5}
                textAnchor="end"
                className="text-sm fill-zinc-600"
                style={{ fontSize: '13px', fontWeight: 500 }}
              >
                {line.value}
              </text>
            </g>
          ))}

          {/* Líneas de datos */}
          {phaseCounts.map((phase, phaseIndex) => {
            const points = getLinePoints(phaseIndex)
            const pathData = createSmoothPath(points)
            
            return (
              <g key={phase.key}>
                <path
                  d={pathData}
                  fill="none"
                  stroke={phase.color}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.85"
                />
                {/* Puntos en cada fase */}
                {points.map((point, i) => (
                  <circle
                    key={i}
                    cx={point.x}
                    cy={point.y}
                    r="7"
                    fill={phase.color}
                    stroke="white"
                    strokeWidth="3"
                    className="cursor-pointer transition-all hover:r-9"
                  >
                    <title>{`${phase.label}: ${point.count} asignaturas`}</title>
                  </circle>
                ))}
              </g>
            )
          })}

          {/* Etiquetas del eje X */}
          {phaseCounts.map((phase, i) => {
            const x = padding.left + (i * graphWidth) / (phaseCounts.length - 1)
            return (
              <text
                key={phase.key}
                x={x}
                y={chartHeight - 25}
                textAnchor="middle"
                className="text-sm fill-zinc-700"
                style={{ fontSize: '14px', fontWeight: 600 }}
              >
                {phase.label}
              </text>
            )
          })}

          {/* Título del eje Y */}
          <text
            x={20}
            y={chartHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90, 20, ${chartHeight / 2})`}
            className="text-sm fill-zinc-600"
            style={{ fontSize: '13px', fontWeight: 500 }}
          >
            Cantidad de Asignaturas
          </text>
        </svg>
      </div>

      {/* Leyenda con estadísticas */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {phaseCounts.map((phase) => (
          <div key={phase.key} className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <div
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: phase.color }}
            />
            <div className="flex-1">
              <div className="text-xs text-zinc-600">{phase.label}</div>
              <div className="text-xl font-bold text-zinc-900">{phase.count}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
