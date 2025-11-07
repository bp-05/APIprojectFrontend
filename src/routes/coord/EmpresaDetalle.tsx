import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getCompany, listProblemStatements, type Company, type ProblemStatement } from '../../api/companies'

export default function EmpresaDetalle() {
  const { id, companyId } = useParams()
  const subjectId = Number(id)
  const compId = Number(companyId)
  const [company, setCompany] = useState<Company | null>(null)
  const [problems, setProblems] = useState<ProblemStatement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function loadAll() {
      setLoading(true)
      setError(null)
      try {
        const [c, probs] = await Promise.all([
          getCompany(compId),
          listProblemStatements({ subject: subjectId, company: compId }),
        ])
        if (!mounted) return
        setCompany(c)
        setProblems(probs || [])
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
            <>
              <p className="text-sm text-zinc-600">{company.name} - {company.sector}</p>
              <div className="mt-1 text-xs text-zinc-600">
                <span className="font-medium">Contacto:</span> {company.email || '-'} | {company.phone || '-'} | {company.address || '-'}
              </div>
            </>
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
          <Section title="Problematica">
            {problems.length === 0 ? (
              <div className="text-sm text-zinc-600">Sin problemática registrada</div>
            ) : (
              problems.map((p) => (
                <div key={p.id} className="mb-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
                  <Field label="Definición del problema" value={p.problem_definition || '-'} />
                </div>
              ))
            )}
          </Section>

          <Section title="Alcance con contraparte">
            {problems.length === 0 ? (
              <div className="text-sm text-zinc-600">Sin información</div>
            ) : (
              problems.map((p) => (
                <div key={p.id} className="mb-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
                  <Field label="Beneficios (corto/mediano/largo plazo)" value={p.benefits_short_medium_long_term || '-'} />
                </div>
              ))
            )}
          </Section>

          <Section title="Requisitos de la empresa">
            {problems.length === 0 ? (
              <div className="text-sm text-zinc-600">Sin información</div>
            ) : (
              problems.map((p) => (
                <div key={p.id} className="mb-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
                  <Field label="Problema a abordar" value={p.problem_to_address || '-'} />
                  <Field label="Importancia" value={p.why_important || '-'} />
                </div>
              ))
            )}
          </Section>

          <Section title="Área relacionada">
            {problems.length === 0 ? (
              <div className="text-sm text-zinc-600">Sin información</div>
            ) : (
              problems.map((p) => (
                <div key={p.id} className="mb-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
                  <Field label="Área relacionada" value={p.related_area || '-'} />
                </div>
              ))
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
      <div className="whitespace-pre-wrap text-sm text-zinc-800">{String(value)}</div>
    </div>
  )
}
