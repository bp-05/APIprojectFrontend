import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  getSubject,
  listSubjectCompetencies,
  getBoundaryConditionBySubject,
  getApiType2CompletionBySubject,
  getApiType3CompletionBySubject,
  getAlternanceBySubject,
  type Subject,
  type SubjectCompetency,
  type CompanyBoundaryCondition,
  type ApiType2Completion,
  type ApiType3Completion,
  type Api3Alternance,
} from '../../api/subjects'

export default function DCAsignaturaDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [subject, setSubject] = useState<Subject | null>(null)
  const [competencies, setCompetencies] = useState<SubjectCompetency[]>([])
  const [boundary, setBoundary] = useState<CompanyBoundaryCondition | null>(null)
  const [api2, setApi2] = useState<ApiType2Completion | null>(null)
  const [api3, setApi3] = useState<ApiType3Completion | null>(null)
  const [alternance, setAlternance] = useState<Api3Alternance | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const subjectId = Number(id)
    if (!subjectId) return
    async function loadAll() {
      setLoading(true)
      setError(null)
      try {
        const subj = await getSubject(subjectId)
        setSubject(subj)
        const [comp, bc, a2, a3, alt] = await Promise.all([
          listSubjectCompetencies(subjectId).catch(() => []),
          getBoundaryConditionBySubject(subjectId).catch(() => null),
          getApiType2CompletionBySubject(subjectId).catch(() => null),
          getApiType3CompletionBySubject(subjectId).catch(() => null),
          getAlternanceBySubject(subjectId).catch(() => null),
        ])
        setCompetencies(Array.isArray(comp) ? comp : [])
        setBoundary(bc)
        setApi2(a2)
        setApi3(a3)
        setAlternance(alt)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'No se pudo cargar la asignatura'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [id])

  return (
    <section className="space-y-6 p-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate('/dc')}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
        >
          Volver
        </button>
      </div>

      <div className="mb-4">
        <h1 className="text-xl font-semibold text-zinc-900">{subject?.name || 'Asignatura'}</h1>
        <p className="text-sm text-zinc-600">{subject?.code}-{subject?.section} - {subject?.period_code || ''}</p>
      </div>

      {loading ? (
        <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">Cargando información...</div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      {subject ? (
        <div className="space-y-4">
          <Card title="Información de la asignatura">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailRow label="Código" value={subject.code} />
              <DetailRow label="Sección" value={subject.section} />
              <DetailRow label="Campus" value={subject.campus || '-'} />
              <DetailRow label="Jornada" value={subject.shift || '-'} />
              <DetailRow label="Horas" value={subject.hours} />
              <DetailRow label="Tipo API" value={subject.api_type} />
              <DetailRow label="Fase" value={phaseLabel(subject.phase)} />
              <DetailRow label="Área" value={subject.area_name || '-'} />
              <DetailRow label="Carrera" value={subject.career_name || '-'} />
              <DetailRow label="Docente" value={subject.teacher_name || '-'} />
              <DetailRow label="Periodo" value={formatPeriod(subject)} />
              <DetailRow label="Cupo estudiantes" value={subject.total_students ?? '-'} />
            </dl>
          </Card>

          <Card title="Competencias técnicas">
            {competencies.length === 0 ? (
              <p className="text-sm text-zinc-600">Sin competencias registradas.</p>
            ) : (
              <ul className="space-y-2">
                {competencies.map((c) => (
                  <li key={c.id} className="rounded-md border border-dashed border-zinc-300 bg-white/70 px-3 py-2 text-sm text-zinc-800">
                    {c.description}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Condiciones de borde">
            {boundary ? (
              <div className="space-y-2 text-sm text-zinc-800">
                <p><strong>Empresa grande:</strong> {boundary.large_company ? 'Sí' : 'No'}</p>
                <p><strong>Empresa mediana:</strong> {boundary.medium_company ? 'Sí' : 'No'}</p>
                <p><strong>Empresa pequeña:</strong> {boundary.small_company ? 'Sí' : 'No'}</p>
                <p><strong>Empresa familiar:</strong> {boundary.family_enterprise ? 'Sí' : 'No'}</p>
                <p><strong>No relevante:</strong> {boundary.not_relevant ? 'Sí' : 'No'}</p>
                <p><strong>Tipo / descripción:</strong> {boundary.company_type_description || '-'}</p>
                <p><strong>Requisitos nivel 2/3:</strong> {boundary.company_requirements_for_level_2_3 || '-'}</p>
                <p><strong>Elementos mínimos:</strong> {boundary.project_minimum_elements || '-'}</p>
              </div>
            ) : (
              <p className="text-sm text-zinc-600">Sin condiciones registradas.</p>
            )}
          </Card>

          {subject.api_type === 2 ? (
            <Card title="API Tipo 2">
              {api2 ? (
                <ApiFields2 data={api2} />
              ) : (
                <p className="text-sm text-zinc-600">Sin información de API 2.</p>
              )}
            </Card>
          ) : null}

          {subject.api_type === 3 ? (
            <Card title="API Tipo 3">
              {api3 ? <ApiFields3 data={api3} /> : <p className="text-sm text-zinc-600">Sin información de API 3.</p>}
            </Card>
          ) : null}

          {subject.api_type === 3 ? (
            <Card title="Alternancia (API 3)">
              {alternance ? (
                <div className="grid gap-3 sm:grid-cols-2 text-sm text-zinc-800">
                  <InfoRow label="Rol del estudiante" value={alternance.student_role} />
                  <InfoRow label="Cupo estudiantes" value={alternance.students_quota} />
                  <InfoRow label="Horas de alternancia" value={alternance.alternance_hours} />
                  <InfoRow label="Tutor" value={alternance.tutor_name} />
                  <InfoRow label="Email tutor" value={alternance.tutor_email} />
                </div>
              ) : (
                <p className="text-sm text-zinc-600">Sin información de alternancia.</p>
              )}
            </Card>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-base font-semibold text-zinc-900">{title}</h2>
      {children}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: any }) {
  const display = value === undefined || value === null || value === '' ? '-' : value
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-sm text-zinc-900">{display}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
      <span className="text-sm text-zinc-900">{value || '-'}</span>
    </div>
  )
}

function ApiFields2({ data }: { data: ApiType2Completion }) {
  return (
    <div className="space-y-2 text-sm text-zinc-800">
      <InfoRow label="Objetivo del proyecto" value={data.project_goal_students} />
      <InfoRow label="Entregables" value={data.deliverables_at_end} />
      <InfoRow label="Participación esperada" value={data.company_expected_participation} />
      <InfoRow label="Otras actividades" value={data.other_activities} />
    </div>
  )
}

function ApiFields3({ data }: { data: ApiType3Completion }) {
  return (
    <div className="space-y-2 text-sm text-zinc-800">
      <InfoRow label="Objetivo del proyecto" value={data.project_goal_students} />
      <InfoRow label="Entregables" value={data.deliverables_at_end} />
      <InfoRow label="Rol esperado del estudiante" value={data.expected_student_role} />
      <InfoRow label="Otras actividades" value={data.other_activities} />
      <InfoRow label="Apoyo esperado de guía maestro" value={data.master_guide_expected_support} />
    </div>
  )
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

function formatPeriod(subject: Subject) {
  if (subject.period_code) return subject.period_code
  const season = subject.period_season ? subject.period_season.toUpperCase() : ''
  const year = subject.period_year ? String(subject.period_year) : ''
  return [season, year].filter(Boolean).join('-') || 'Sin periodo'
}
