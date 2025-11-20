import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { toast } from 'react-hot-toast'
import {
  getProblemStatement,
  updateProblemStatement,
  deleteProblemStatement,
  listCompanies,
  type Company,
  type ProblemStatement,
} from '../../api/companies'
import { listSubjectCodeSections, type BasicSubject } from '../../api/subjects'

function HelpTooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-block ml-2">
      <svg className="h-5 w-5 text-zinc-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="10" strokeWidth="2" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <circle cx="12" cy="17" r="0.5" fill="currentColor" strokeWidth="0" />
      </svg>
      <div className="invisible group-hover:visible absolute z-10 w-72 p-3 bg-zinc-800 text-white text-sm rounded-lg shadow-lg -top-2 left-8">
        {text}
        <div className="absolute top-3 -left-1 w-2 h-2 bg-zinc-800 transform rotate-45"></div>
      </div>
    </div>
  )
}

export default function DCProyectoDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<ProblemStatement | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [subjects, setSubjects] = useState<BasicSubject[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Omit<ProblemStatement, 'id'>>({
    company: 0,
    subject: 0,
    problem_to_address: '',
    why_important: '',
    stakeholders: '',
    related_area: '',
    benefits_short_medium_long_term: '',
    problem_definition: '',
  })

  async function load() {
    if (!id) return
    setLoading(true)
    try {
      const [proj, comps, subjs] = await Promise.all([
        getProblemStatement(Number(id)),
        listCompanies(),
        listSubjectCodeSections()
      ])
      setProject(proj)
      setCompanies(comps)
      setSubjects(subjs)
      setForm({
        company: proj.company,
        subject: proj.subject,
        problem_to_address: proj.problem_to_address || '',
        why_important: proj.why_important || '',
        stakeholders: proj.stakeholders || '',
        related_area: proj.related_area || '',
        benefits_short_medium_long_term: proj.benefits_short_medium_long_term || '',
        problem_definition: proj.problem_definition || '',
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar proyecto'
      toast.error(msg)
      navigate('/dc/proyectos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  async function handleSave() {
    if (!id || !project) return
    setLoading(true)
    try {
      await updateProblemStatement(Number(id), form)
      toast.success('Proyecto actualizado')
      setEditing(false)
      await load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!id || !confirm('¿Eliminar este proyecto?')) return
    try {
      await deleteProblemStatement(Number(id))
      toast.success('Proyecto eliminado')
      navigate('/dc/proyectos')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al eliminar'
      toast.error(msg)
    }
  }

  if (loading && !project) {
    return (
      <section className="p-6">
        <p className="text-sm text-zinc-600">Cargando proyecto...</p>
      </section>
    )
  }

  if (!project) return null

  const company = companies.find(c => c.id === project.company)
  const subject = subjects.find(s => s.id === project.subject)

  return (
    <section className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <button 
            onClick={() => navigate('/dc/proyectos')}
            className="mb-2 text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
          >
            <span>←</span> Volver a proyectos
          </button>
          <h1 className="text-xl font-semibold">Detalle del Proyecto</h1>
          <p className="text-sm text-zinc-600">
            {company?.name || 'Empresa desconocida'} - {subject ? `${subject.code}-${subject.section}` : 'Sin asignatura'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                onClick={() => {
                  setEditing(false)
                  setForm({
                    company: project.company,
                    subject: project.subject,
                    problem_to_address: project.problem_to_address || '',
                    why_important: project.why_important || '',
                    stakeholders: project.stakeholders || '',
                    related_area: project.related_area || '',
                    benefits_short_medium_long_term: project.benefits_short_medium_long_term || '',
                    problem_definition: project.problem_definition || '',
                  })
                }}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
              >
                Editar
              </button>
              <button
                onClick={handleDelete}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                Eliminar
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {editing ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-800">Empresa *</span>
              <select
                value={form.company}
                onChange={(e) => setForm({ ...form, company: Number(e.target.value) })}
                className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              >
                <option value={0}>Selecciona empresa</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-800">Asignatura *</span>
              <select
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: Number(e.target.value) })}
                className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              >
                <option value={0}>Selecciona asignatura</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.code}-{s.section} - {s.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 flex items-center font-medium text-zinc-800">
                Problema a abordar
                <HelpTooltip text="¿Cuál es la problemática que necesitamos abordar?" />
              </span>
              <textarea
                value={form.problem_to_address}
                onChange={(e) => setForm({ ...form, problem_to_address: e.target.value })}
                rows={3}
                className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 flex items-center font-medium text-zinc-800">
                Por qué es importante
                <HelpTooltip text="¿Por qué esta problemática es importante para nosotros?" />
              </span>
              <textarea
                value={form.why_important}
                onChange={(e) => setForm({ ...form, why_important: e.target.value })}
                rows={3}
                className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 flex items-center font-medium text-zinc-800">
                Stakeholders
                <HelpTooltip text="¿Para quienes es relevante? ¿A quién concierne? ¿Quiénes están involucrados y en qué medida?" />
              </span>
              <textarea
                value={form.stakeholders}
                onChange={(e) => setForm({ ...form, stakeholders: e.target.value })}
                rows={3}
                className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 flex items-center font-medium text-zinc-800">
                Área relacionada
                <HelpTooltip text="¿Qué área está más directamente relacionada?" />
              </span>
              <textarea
                value={form.related_area}
                onChange={(e) => setForm({ ...form, related_area: e.target.value })}
                rows={2}
                className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 flex items-center font-medium text-zinc-800">
                Beneficios corto/mediano/largo plazo
                <HelpTooltip text="¿Cómo y en qué nos beneficiaría en el corto, mediano y largo plazo la solución a la problemática cuando esté resuelta?" />
              </span>
              <textarea
                value={form.benefits_short_medium_long_term}
                onChange={(e) => setForm({ ...form, benefits_short_medium_long_term: e.target.value })}
                rows={3}
                className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 flex items-center font-medium text-zinc-800">
                Definición del problema
                <HelpTooltip text="A partir de las respuestas, define la problemática a trabajar en la asignatura." />
              </span>
              <textarea
                value={form.problem_definition}
                onChange={(e) => setForm({ ...form, problem_definition: e.target.value })}
                rows={3}
                className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </label>
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-white p-6">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoItem label="Empresa" value={company?.name || '-'} />
              <InfoItem label="Asignatura" value={subject ? `${subject.code}-${subject.section} - ${subject.name}` : '-'} />
              <InfoItem 
                label="Problema a abordar" 
                value={project.problem_to_address || '-'} 
                helpText="¿Cuál es la problemática que necesitamos abordar?"
                className="sm:col-span-2" 
              />
              <InfoItem 
                label="Por qué es importante" 
                value={project.why_important || '-'} 
                helpText="¿Por qué esta problemática es importante para nosotros?"
                className="sm:col-span-2" 
              />
              <InfoItem 
                label="Stakeholders" 
                value={project.stakeholders || '-'} 
                helpText="¿Para quienes es relevante? ¿A quién concierne? ¿Quiénes están involucrados y en qué medida?"
                className="sm:col-span-2" 
              />
              <InfoItem 
                label="Área relacionada" 
                value={project.related_area || '-'} 
                helpText="¿Qué área está más directamente relacionada?"
                className="sm:col-span-2" 
              />
              <InfoItem 
                label="Beneficios corto/mediano/largo plazo" 
                value={project.benefits_short_medium_long_term || '-'} 
                helpText="¿Cómo y en qué nos beneficiaría en el corto, mediano y largo plazo la solución a la problemática cuando esté resuelta?"
                className="sm:col-span-2" 
              />
              <InfoItem 
                label="Definición del problema" 
                value={project.problem_definition || '-'} 
                helpText="A partir de las respuestas, define la problemática a trabajar en la asignatura."
                className="sm:col-span-2" 
              />
            </dl>
          </div>
        )}
      </div>
    </section>
  )
}

function InfoItem({ label, value, helpText, className = '' }: { label: string; value: string; helpText?: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500 flex items-center">
        {label}
        {helpText && <HelpTooltip text={helpText} />}
      </dt>
      <dd className="mt-1 text-sm text-zinc-900 whitespace-pre-wrap">{value}</dd>
    </div>
  )
}
