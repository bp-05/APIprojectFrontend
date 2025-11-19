import { useEffect, useMemo, useState, type ReactNode } from 'react'
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

type SectionCounts = {
  info: number
  competencies: number
  boundaries: number
  api2: number
  api3: number
  alternance: number
}

export default function DC() {
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
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Director de area/carrera</h1>
        <p className="text-sm text-zinc-600">Resumen de avance y asignaturas visibles para tu rol.</p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Asignaturas" value={items.length} tone="blue" />
        <StatCard title="Empresas" value={companyTotal ?? '--'} tone="green" />
        <StatCard title="Info completa" value={`${counts.info}/${items.length || 1}`} subtitle="Área + carrera + docente + cupo" tone="indigo" />
        <StatCard title="Competencias" value={`${counts.competencies}/${items.length || 1}`} subtitle="Al menos 1 registrada" tone="amber" />
        <StatCard title="Condiciones de borde" value={`${counts.boundaries}/${items.length || 1}`} subtitle="Con datos cargados" tone="violet" />
        <StatCard
          title="API Tipo 2"
          value={`${counts.api2}/${Math.max(1, items.filter((s) => s.api_type === 2).length)}`}
          subtitle="Campos completados"
          tone="cyan"
        />
        <StatCard
          title="API Tipo 3"
          value={`${counts.api3}/${Math.max(1, items.filter((s) => s.api_type === 3).length)}`}
          subtitle="Campos completados"
          tone="pink"
        />
        <StatCard
          title="Alternancia API 3"
          value={`${counts.alternance}/${Math.max(1, items.filter((s) => s.api_type === 3).length)}`}
          subtitle="Con información"
          tone="emerald"
        />
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
                  <tr key={s.id} className="transition-colors hover:bg-zinc-50">
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

function StatCard({
  title,
  value,
  subtitle,
  tone = 'zinc',
}: {
  title: string
  value: ReactNode
  subtitle?: string
  tone?: 'zinc' | 'blue' | 'green' | 'indigo' | 'violet' | 'amber' | 'cyan' | 'pink' | 'emerald'
}) {
  const accents: Record<string, string> = {
    zinc: 'text-zinc-900',
    blue: 'text-sky-600',
    green: 'text-emerald-600',
    indigo: 'text-indigo-600',
    violet: 'text-violet-600',
    amber: 'text-amber-600',
    cyan: 'text-cyan-600',
    pink: 'text-pink-600',
    emerald: 'text-emerald-600',
  }
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/90 px-4 py-5 shadow-sm">
      <p className="text-sm font-medium text-zinc-500">{title}</p>
      <div className={`mt-2 text-3xl font-semibold ${accents[tone] || accents.zinc}`}>{value}</div>
      {subtitle ? <p className="mt-1 text-xs text-zinc-500">{subtitle}</p> : null}
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
