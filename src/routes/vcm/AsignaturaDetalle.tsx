import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router'
import {
  getSubject,
  type Subject,
  listCompanyRequirements,
  type CompanyRequirement,
  listApi2Completions,
  type Api2Completion,
  listApi3Completions,
  type Api3Completion,
  listAlternances,
  type Api3Alternance,
} from '../../api/subjects'
import { listCompanies, type Company } from '../../api/companies'

type Prospect = { id: string; company_name: string }
type SubjectProspects = Record<number, string[]>

export default function AsignaturaVCMDetalle() {
  const navigate = useNavigate()
  const { id } = useParams()
  const subjectId = Number(id)

  const [subject, setSubject] = useState<Subject | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [requirements, setRequirements] = useState<CompanyRequirement[]>([])
  const [api2Completion, setApi2Completion] = useState<Api2Completion | null>(null)
  const [api3Completion, setApi3Completion] = useState<Api3Completion | null>(null)
  const [alternance, setAlternance] = useState<Api3Alternance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [prospects, setProspects] = useState<Prospect[]>(() => loadProspects())
  const [subjectProspects, setSubjectProspects] = useState<SubjectProspects>(() => loadSubjectProspects())

  useEffect(() => {
    if (!Number.isFinite(subjectId)) {
      setError('Asignatura invalida')
      setLoading(false)
      return
    }

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const [s, comps, reqs, api2, api3, alts] = await Promise.all([
          getSubject(subjectId),
          listCompanies().catch(() => [] as Company[]),
          listCompanyRequirements().catch(() => [] as CompanyRequirement[]),
          listApi2Completions({ subject: subjectId }).catch(() => []),
          listApi3Completions({ subject: subjectId }).catch(() => []),
          listAlternances({ subject: subjectId }).catch(() => []),
        ])
        setSubject(s)
        setCompanies(comps)
        setRequirements(reqs)
        setApi2Completion(api2[0] ?? null)
        setApi3Completion(api3[0] ?? null)
        setAlternance(alts[0] ?? null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar la asignatura')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [subjectId])

  useEffect(() => {
    const handler = () => {
      setProspects(loadProspects())
      setSubjectProspects(loadSubjectProspects())
    }
    window.addEventListener('vcm:prospects-updated', handler)
    return () => window.removeEventListener('vcm:prospects-updated', handler)
  }, [])

  const counterpartNames = useMemo(() => {
    if (!subject) return [] as string[]
    return resolveCounterparts(subject.id, companies, requirements, prospects, subjectProspects)
  }, [subject, companies, requirements, prospects, subjectProspects])

  const apiType = subject?.api_type ?? null
  const showApi2 = apiType === 2
  const showApi3 = apiType === 3
  const acceptsAlternance = useMemo(() => {
    if (!subject || !showApi3) return false
    return requirements.some((r) => r.subject === subject.id && r.can_receive_alternance)
  }, [requirements, subject, showApi3])

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-zinc-600">Cargando asignatura...</p>
      </div>
    )
  }

  if (error || !subject) {
    return (
      <div className="p-6">
        <button className="mb-3 text-sm text-red-600 hover:underline" onClick={() => navigate(-1)}>
          Volver
        </button>
        <p className="text-sm text-red-600">{error || 'No se encontro la asignatura solicitada.'}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <button className="mb-4 text-sm text-red-600 hover:underline" onClick={() => navigate(-1)}>
        Volver
      </button>

      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-zinc-900">{subject.name}</h1>
        <p className="text-sm text-zinc-600">
          {subject.code}-{subject.section} · {subject.career_name || 'Carrera sin definir'}
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DetailItem label="Codigo">{subject.code}</DetailItem>
          <DetailItem label="Seccion">{subject.section}</DetailItem>
          <DetailItem label="Carrera">{subject.career_name || '-'}</DetailItem>
          <DetailItem label="Area">{subject.area_name || '-'}</DetailItem>
          <DetailItem label="Semestre">{subject.semester_name || '-'}</DetailItem>
          <DetailItem label="Campus">{subject.campus || '-'}</DetailItem>
          <DetailItem label="Jornada">{subject.shift || '-'}</DetailItem>
          <DetailItem label="Docente">{subject.teacher_name || '-'}</DetailItem>
        </dl>

        <div className="mt-6">
          <h2 className="text-base font-semibold text-zinc-900">Posibles contrapartes</h2>
          {counterpartNames.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {counterpartNames.map((name) => (
                <span key={name} className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100 px-3 py-0.5 text-sm text-zinc-700">
                  {name}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">Sin contrapartes registradas.</p>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {showApi2 ? (
          <SectionCard title="API tipo 2">
            {api2Completion ? (
              <div className="space-y-3">
                <TextBlock label="Objetivo para estudiantes" value={api2Completion.project_goal_students} />
                <TextBlock label="Entregables" value={api2Completion.deliverables_at_end} />
                <TextBlock label="Participación esperada de la empresa" value={api2Completion.company_expected_participation} />
                <TextBlock label="Otras actividades" value={api2Completion.other_activities} />
              </div>
            ) : (
              <p className="text-sm text-zinc-600">Sin información.</p>
            )}
          </SectionCard>
        ) : null}

        {showApi3 ? (
          <SectionCard title="API tipo 3">
            {api3Completion ? (
              <div className="space-y-3">
                <TextBlock label="Objetivo para estudiantes" value={api3Completion.project_goal_students} />
                <TextBlock label="Entregables" value={api3Completion.deliverables_at_end} />
                <TextBlock label="Rol esperado del estudiante" value={api3Completion.expected_student_role} />
                <TextBlock label="Otras actividades" value={api3Completion.other_activities} />
                <TextBlock label="Apoyo maestro guía" value={api3Completion.master_guide_expected_support} />
              </div>
            ) : (
              <p className="text-sm text-zinc-600">Sin información.</p>
            )}
          </SectionCard>
        ) : null}

        {showApi3 ? (
          <SectionCard title="Alternancia (API 3)" className="md:col-span-2">
            {!acceptsAlternance ? (
              <p className="text-sm text-zinc-600">Ninguna contraparte ha indicado disposición para alternancia.</p>
            ) : alternance ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextBlock label="Rol del estudiante" value={alternance.student_role} />
                <TextBlock label="Cupos de estudiantes" value={alternance.students_quota ? `${alternance.students_quota} estudiantes` : '-'} />
                <TextBlock label="Tutor" value={alternance.tutor_name} />
                <TextBlock label="Correo del tutor" value={alternance.tutor_email} />
                <TextBlock label="Horas de alternancia" value={alternance.alternance_hours ? `${alternance.alternance_hours} horas` : '-'} />
              </div>
            ) : (
              <p className="text-sm text-zinc-600">La empresa acepta alternancia, pero aún no se han ingresado datos.</p>
            )}
          </SectionCard>
        ) : null}
      </div>
    </div>
  )
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-zinc-600">{label}</dt>
      <dd className="text-sm text-zinc-900">{children}</dd>
    </div>
  )
}

function SectionCard({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-zinc-200 bg-white p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  )
}

function TextBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs font-medium text-zinc-600">{label}</div>
      <div className="text-sm text-zinc-900 whitespace-pre-line">{value?.trim() ? value : '—'}</div>
    </div>
  )
}

function resolveCounterparts(
  subjectId: number,
  companies: Company[],
  requirements: CompanyRequirement[],
  prospects: Prospect[],
  subjectProspects: SubjectProspects
): string[] {
  const byCompanyId = new Map(companies.map((c) => [c.id, c]))
  const byReqId = new Map(requirements.map((r) => [r.id, r]))

  const ids = subjectProspects[subjectId] || []
  const localNames = ids.map((id) => {
    if (id.startsWith('db:')) {
      const rid = Number(id.slice(3))
      const req = byReqId.get(rid)
      if (req && req.subject === subjectId) return byCompanyId.get(req.company)?.name
      return undefined
    }
    if (id.startsWith('dbco:')) {
      const cid = Number(id.slice(5))
      return byCompanyId.get(cid)?.name
    }
    return prospects.find((p) => p.id === id)?.company_name
  }).filter(Boolean) as string[]

  const backendNames = requirements
    .filter((r) => r.subject === subjectId)
    .map((r) => byCompanyId.get(r.company)?.name)
    .filter(Boolean) as string[]

  return Array.from(new Set(localNames.length ? localNames : backendNames))
}

function loadProspects(): Prospect[] {
  try {
    const raw = localStorage.getItem('vcm_posibles_contrapartes')
    const arr = raw ? JSON.parse(raw) : []
    if (Array.isArray(arr)) {
      return arr.map((p: any) => ({ id: String(p.id), company_name: String(p.company_name || '') }))
    }
    return []
  } catch {
    return []
  }
}

function loadSubjectProspects(): SubjectProspects {
  try {
    const raw = localStorage.getItem('vcm_subject_prospects')
    const obj = raw ? JSON.parse(raw) : {}
    return obj && typeof obj === 'object' ? obj : {}
  } catch {
    return {}
  }
}
