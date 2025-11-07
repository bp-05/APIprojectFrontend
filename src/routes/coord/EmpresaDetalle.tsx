import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getCompany, listProblemStatements, listEngagementScopes, type Company, type ProblemStatement, type CompanyEngagementScope } from '../../api/companies'

export default function EmpresaDetalle() {
  const { id, companyId } = useParams()
  const subjectId = Number(id)
  const compId = Number(companyId)
  const [company, setCompany] = useState<Company | null>(null)
  const [problems, setProblems] = useState<ProblemStatement[]>([])
  const [scope, setScope] = useState<CompanyEngagementScope | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function loadAll() {
      setLoading(true)
      setError(null)
      try {
        const [c, probs, scopes] = await Promise.all([
          getCompany(compId),
          listProblemStatements({ subject: subjectId, company: compId }),
          listEngagementScopes({ company: compId }),
        ])
        if (!mounted) return
        setCompany(c)
        setProblems(probs || [])
        const s = (scopes || []).find((x) => x.subject_code && x.subject_section) || null
        setScope(s || null)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'No se pudo cargar la empresa'
        setError(msg)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    if (!Number.isFinite(subjectId) || !Number.isFinite(compId)) {
      setError('Parámetros inválidos')
      setLoading(false)
      return
    }
    loadAll()
    return () => { mounted = false }
  }, [id, companyId])

  return (
    <section className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Empresa</h1>
          {company ? (
            <p className="text-sm text-zinc-600">{company.name} — {company.sector}</p>
          ) : null}
        </div>
        <Link to={`/coord/asignaturas/${id}`} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50">Volver</Link>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="text-sm text-zinc-600">Cargando…</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <Section title="Problemática">
            {problems.length === 0 ? (
              <div className="text-sm text-zinc-600">Sin problemática registrada</div>
            ) : (
              problems.map((p) => (
                <div key={p.id} className="mb-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
                  <Field label="Problema a abordar" value={p.problem_to_address || '-'} />
                  <Field label="Importancia" value={p.why_important || '-'} />
                  <Field label="Actores involucrados" value={p.stakeholders || '-'} />
                  <Field label="Área relacionada" value={p.related_area || '-'} />
                  <Field label="Beneficios (corto/mediano/largo)" value={p.benefits_short_medium_long_term || '-'} />
                  <Field label="Definición del problema" value={p.problem_definition || '-'} />
                </div>
              ))
            )}
          </Section>

          <Section title="Alcance con contraparte">
            {!scope ? (
              <div className="text-sm text-zinc-600">Sin alcance registrado</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Beneficios esperados" value={scope.benefits_from_student || '-'} />
                <Field label="Proyecto de valor/investigación" value={scope.has_value_or_research_project ? 'Sí' : 'No'} />
                <Field label="Disponibilidad/participación" value={scope.time_availability_and_participation || '-'} />
                <Field label="Condiciones de espacio" value={scope.workplace_has_conditions_for_group ? 'Sí' : 'No'} />
                <Field label="Disponibilidad reuniones" value={scope.meeting_schedule_availability || '-'} />
              </div>
            )}
          </Section>
        </div>
      )}
    </section>
  )
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-zinc-800">{title}</div>
      <div className="rounded-lg border border-zinc-200 bg-white p-4">{children}</div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div className="mb-1">
      <div className="text-xs font-medium text-zinc-600">{label}</div>
      <div className="text-sm text-zinc-800 whitespace-pre-wrap">{String(value)}</div>
    </div>
  )
}

