import { useEffect, useMemo, useState } from 'react'
import type React from 'react'
import axios from 'axios'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router'
import {
  createProblemStatement,
  listCompanies,
  listProblemStatements,
  updateProblemStatement,
  type ProblemStatement,
  type Company,
} from '../../api/companies'
import { listSubjectCodeSections, type BasicSubject } from '../../api/subjects'


export default function Proyectos() {

  const navigate = useNavigate()
  const [items, setItems] = useState<ProblemStatement[]>([])

  const [companies, setCompanies] = useState<Company[]>([])

  const [subjects, setSubjects] = useState<BasicSubject[]>([])

  const [search, setSearch] = useState('')

  const [loading, setLoading] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)

  const [editing, setEditing] = useState<ProblemStatement | null>(null)

  const [expandedCompanies, setExpandedCompanies] = useState<Record<number, boolean>>({})

  const [expandedSubjects, setExpandedSubjects] = useState<Record<number, boolean>>({})

  const [viewMode, setViewMode] = useState<'company' | 'subject'>('company')



  async function load() {

    setLoading(true)

    setError(null)

    try {

      const [ps, cs, ss] = await Promise.all([

        listProblemStatements(),

        listCompanies(),

        listSubjectCodeSections(),

      ])

      setItems(ps)

      setCompanies(cs)

      setSubjects(ss)

    } catch (e) {

      const msg = e instanceof Error ? e.message : 'Error al cargar datos'

      setError(msg)

    } finally {

      setLoading(false)

    }

  }



  useEffect(() => {

    load()

  }, [])



  const companiesById = useMemo(() => {

    const m = new Map<number, Company>()

    companies.forEach((c) => m.set(c.id, c))

    return m

  }, [companies])



  const subjectsById = useMemo(() => {

    const m = new Map<number, BasicSubject>()

    subjects.forEach((s) => m.set(s.id, s))

    return m

  }, [subjects])



  const filtered = useMemo(() => {

    const q = search.trim().toLowerCase()

    if (!q) return items

    return items.filter((p) =>

      [p.problem_to_address, p.why_important, p.stakeholders]

        .filter(Boolean)

        .some((v) => String(v).toLowerCase().includes(q)),

    )

  }, [items, search])

  const groupedByCompany = useMemo(() => {

    const grouped = new Map<number, ProblemStatement[]>()

    filtered.forEach((p) => {

      if (!grouped.has(p.company)) grouped.set(p.company, [])

      grouped.get(p.company)!.push(p)

    })

    return grouped

  }, [filtered])

  const groupedBySubject = useMemo(() => {

    const grouped = new Map<number, ProblemStatement[]>()

    filtered.forEach((p) => {

      if (!grouped.has(p.subject)) grouped.set(p.subject, [])

      grouped.get(p.subject)!.push(p)

    })

    return grouped

  }, [filtered])



  function openCreate() {

    setEditing(null)

    setShowForm(true)

  }


  return (

    <section className="p-6">

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        <div>

          <h1 className="text-xl font-semibold">Proyectos</h1>

          <p className="text-sm text-zinc-600">Gestión de proyectos con contraparte</p>

          <div className="mt-3 flex gap-4 border-b border-zinc-200">

            <button

              onClick={() => setViewMode('company')}

              className={`pb-2 text-sm font-medium transition-colors ${

                viewMode === 'company'

                  ? 'border-b-2 border-red-600 text-red-600'

                  : 'text-zinc-600 hover:text-zinc-900'

              }`}

            >

              Por Empresa

            </button>

            <button

              onClick={() => setViewMode('subject')}

              className={`pb-2 text-sm font-medium transition-colors ${

                viewMode === 'subject'

                  ? 'border-b-2 border-red-600 text-red-600'

                  : 'text-zinc-600 hover:text-zinc-900'

              }`}

            >

              Por Asignatura

            </button>

          </div>

        </div>

        <div className="flex items-center gap-2">

          <input

            value={search}

            onChange={(e) => setSearch(e.target.value)}

            placeholder="Buscar…"

            className="w-56 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"

          />

          <button onClick={openCreate} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">

            Nuevo proyecto

          </button>

        </div>

      </div>



      {error ? (

        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>

      ) : null}



      <div className="space-y-2">

        {loading ? (

          <div className="p-4 text-sm text-zinc-600">Cargando…</div>

        ) : viewMode === 'company' ? (

          Array.from(groupedByCompany.entries()).length === 0 ? (

            <div className="p-4 text-sm text-zinc-600">Sin resultados</div>

          ) : (

            Array.from(groupedByCompany.entries()).map(([companyId, problems]) => {

              const company = companiesById.get(companyId)

              const isExpanded = expandedCompanies[companyId]

              return (

                <div key={companyId} className="rounded-lg border border-zinc-200 bg-white">

                  <button

                    onClick={() =>

                      setExpandedCompanies((prev) => ({

                        ...prev,

                        [companyId]: !prev[companyId],

                      }))

                    }

                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-50 transition-colors"

                  >

                    <div className="text-left">

                      <h3 className="font-semibold text-zinc-900">{company?.name || `#${companyId}`}</h3>

                      <p className="text-xs text-zinc-500">{problems.length} proyecto{problems.length !== 1 ? 's' : ''}</p>

                    </div>

                    <svg

                      className={`w-5 h-5 text-zinc-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}

                      fill="none"

                      stroke="currentColor"

                      viewBox="0 0 24 24"

                    >

                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />

                    </svg>

                  </button>



                  {isExpanded && (

                    <div className="border-t border-zinc-200 divide-y divide-zinc-100 bg-zinc-50">

                      {problems.map((p) => {

                        const subj = subjectsById.get(p.subject)

                        return (

                          <div

                            key={p.id}

                            onClick={() => navigate(`/vcm/proyectos/${p.id}`)}

                            className="px-4 py-3 hover:bg-zinc-100 cursor-pointer transition-colors"

                          >

                            <div className="flex items-start justify-between gap-3">

                              <div className="flex-1 min-w-0">

                                <p className="text-sm font-medium text-zinc-900 mb-1">

                                  {subj ? `${subj.name || '(sin nombre)'} (${subj.code}-${subj.section})` : `#${p.subject}`}

                                </p>

                                <p className="text-sm text-zinc-700 line-clamp-2">{p.problem_to_address || '-'}</p>

                                {p.stakeholders && (

                                  <p className="text-xs text-zinc-600 mt-1">Stakeholders: {p.stakeholders}</p>

                                )}

                              </div>

                            </div>

                          </div>

                        )

                      })}

                    </div>

                  )}

                </div>

              )

            })

          )

        ) : (

          Array.from(groupedBySubject.entries()).length === 0 ? (

            <div className="p-4 text-sm text-zinc-600">Sin resultados</div>

          ) : (

            Array.from(groupedBySubject.entries()).map(([subjectId, problems]) => {

              const subject = subjectsById.get(subjectId)

              const isExpanded = expandedSubjects[subjectId]

              // Agrupar problemas por empresa dentro de esta asignatura

              const problemsByCompanyInSubject = new Map<number, ProblemStatement[]>()

              problems.forEach((p) => {

                if (!problemsByCompanyInSubject.has(p.company)) {

                  problemsByCompanyInSubject.set(p.company, [])

                }

                problemsByCompanyInSubject.get(p.company)!.push(p)

              })

              return (

                <div key={subjectId} className="rounded-lg border border-zinc-200 bg-white">

                  <button

                    onClick={() =>

                      setExpandedSubjects((prev) => ({

                        ...prev,

                        [subjectId]: !prev[subjectId],

                      }))

                    }

                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-50 transition-colors"

                  >

                    <div className="text-left">

                      <h3 className="font-semibold text-zinc-900">

                        {subject ? `${subject.name || '(sin nombre)'} (${subject.code}-${subject.section})` : `#${subjectId}`}

                      </h3>

                      <p className="text-xs text-zinc-500">{problems.length} proyecto{problems.length !== 1 ? 's' : ''}</p>

                    </div>

                    <svg

                      className={`w-5 h-5 text-zinc-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}

                      fill="none"

                      stroke="currentColor"

                      viewBox="0 0 24 24"

                    >

                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />

                    </svg>

                  </button>



                  {isExpanded && (

                    <div className="border-t border-zinc-200 bg-zinc-50">

                      {Array.from(problemsByCompanyInSubject.entries()).map(([companyId, companyProblems]) => {

                        const company = companiesById.get(companyId)

                        return (

                          <div key={companyId} className="border-b border-zinc-100 last:border-b-0">

                            <div className="px-4 py-2 bg-zinc-100 text-sm font-medium text-zinc-700">

                              {company?.name || `#${companyId}`}

                            </div>

                            <div className="divide-y divide-zinc-100">

                              {companyProblems.map((p) => (

                                <div

                                  key={p.id}

                                  onClick={() => navigate(`/vcm/proyectos/${p.id}`)}

                                  className="px-4 py-3 hover:bg-zinc-100 cursor-pointer transition-colors"

                                >

                                  <p className="text-sm text-zinc-700 line-clamp-2">{p.problem_to_address || '-'}</p>

                                  {p.stakeholders && (

                                    <p className="text-xs text-zinc-600 mt-1">Stakeholders: {p.stakeholders}</p>

                                  )}

                                </div>

                              ))}

                            </div>

                          </div>

                        )

                      })}

                    </div>

                  )}

                </div>

              )

            })

          )

        )}

      </div>



      {showForm && (

        <ProyectoForm

          initial={editing || undefined}

          companies={companies}

          subjects={subjects}

          onClose={() => setShowForm(false)}

          onSaved={async () => {

            setShowForm(false)

            await load()

          }}

        />

      )}

    </section>

  )

}



function ProyectoForm({

  initial,

  companies,

  subjects,

  onClose,

  onSaved,

}: {

  initial?: ProblemStatement

  companies: Company[]

  subjects: BasicSubject[]

  onClose: () => void

  onSaved: () => void | Promise<void>

}) {

  const [form, setForm] = useState<Omit<ProblemStatement, 'id'>>({

    company: initial?.company || 0,

    subject: initial?.subject || 0,

    problem_to_address: initial?.problem_to_address || '',

    why_important: initial?.why_important || '',

    stakeholders: initial?.stakeholders || '',

    related_area: initial?.related_area || '',

    benefits_short_medium_long_term: initial?.benefits_short_medium_long_term || '',

    problem_definition: initial?.problem_definition || '',

  })

  const [saving, setSaving] = useState(false)
  // Contacto eliminado - el formulario de contacto fue removido

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: React.FormEvent) {

    e.preventDefault()

    const payload = Object.fromEntries(

      Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]),

    ) as typeof form

    const isValidId = (x: unknown) => typeof x === 'number' && Number.isFinite(x) && x > 0
    
    // Validaciones de campos principales
    if (!isValidId(payload.company)) {
      toast.error('Selecciona una Empresa')
      return
    }
    if (!isValidId(payload.subject)) {
      toast.error('Selecciona una Asignatura')
      return
    }
    if (!payload.problem_to_address.trim()) {
      toast.error('Completa: ¿Cuál es el proyecto que necesitamos abordar?')
      return
    }
    if (!payload.why_important.trim()) {
      toast.error('Completa: ¿Por qué este proyecto es importante para nosotros?')
      return
    }
    if (!payload.stakeholders.trim()) {
      toast.error('Completa: ¿Para quiénes es relevante? ¿A quién concierne?')
      return
    }
    if (!payload.related_area.trim()) {
      toast.error('Completa: ¿Qué área está más directamente relacionada?')
      return
    }
    if (!payload.benefits_short_medium_long_term.trim()) {
      toast.error('Completa: ¿Cómo y en qué nos beneficiaría en el corto, mediano y largo plazo?')
      return
    }
    if (!payload.problem_definition.trim()) {
      toast.error('Completa: Define el proyecto a trabajar en la asignatura')
      return
    }

    setSaving(true)

    try {
      // Guardar el problem statement
      if (initial) {

        await updateProblemStatement(initial.id, payload)

        toast.success('Proyecto actualizado')

      } else {

        await createProblemStatement(payload)

        toast.success('Proyecto creado')

      }

      await onSaved()

    } catch (err) {

      let msg = 'Error al guardar'

      if (axios.isAxiosError(err)) {

        const data = err.response?.data as any

        if (typeof data === 'string') msg = data

        else if (data && typeof data === 'object') {

          try {

            const parts = Object.entries(data).map(([k, v]) => {

              const val = Array.isArray(v) ? v.join(', ') : String(v)

              return `${k}: ${val}`

            })

            if (parts.length) msg = parts.join(' | ')

          } catch {}

        }

      } else if (err instanceof Error) {

        msg = err.message

      }

      toast.error(msg)

    } finally {

      setSaving(false)

    }

  }



  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">

      <div className="w-full max-w-3xl rounded-xl bg-white shadow-lg ring-1 ring-black/5 max-h-[calc(100vh-4rem)] overflow-y-auto">

        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-3">

          <h2 className="text-sm font-semibold text-zinc-900">{initial ? 'Editar proyecto' : 'Nuevo proyecto'}</h2>

          {/* Botón Cerrar superior eliminado para unificar formato */}

        </div>

        <form className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 sm:px-6" onSubmit={onSubmit}>

          <Select

            label="Empresa"

            value={String(form.company || '')}

            onChange={(v) => {
              update('company', Number(v))
            }}

            options={companies.map((c) => ({ value: String(c.id), label: c.name }))}

            placeholder={companies.length === 0 ? 'Sin empresas disponibles' : 'Seleccionar empresa'}

            disabled={companies.length === 0}

          />

          <Select

            label="Asignatura"

            value={String(form.subject || '')}

            onChange={(v) => update('subject', Number(v))}

            options={subjects.map((s) => ({ value: String(s.id), label: `${s.name || '(sin nombre)'} (${s.code}-${s.section})` }))}

            placeholder={subjects.length === 0 ? 'Sin asignaturas disponibles' : 'Seleccionar asignatura'}

            disabled={subjects.length === 0}

          />



          <Area label="¿Cuál es el proyecto que necesitamos abordar? *" value={form.problem_to_address} onChange={(v) => update('problem_to_address', v)} />

          <Area label="¿Por qué este proyecto es importante para nosotros? *" value={form.why_important} onChange={(v) => update('why_important', v)} />

          <Area label="¿Para quiénes es relevante? ¿A quién concierne? ¿Quiénes están involucrados y en qué medida? *" value={form.stakeholders} onChange={(v) => update('stakeholders', v)} />

          <Area label="¿Qué área está más directamente relacionada? *" value={form.related_area} onChange={(v) => update('related_area', v)} />

          <Area label="¿Cómo y en qué nos beneficiaría en el corto, mediano y largo plazo la solución al proyecto cuando esté resuelto? *" value={form.benefits_short_medium_long_term} onChange={(v) => update('benefits_short_medium_long_term', v)} />

          <Area label="A partir de las respuestas, define el proyecto a trabajar en la asignatura. *" value={form.problem_definition} onChange={(v) => update('problem_definition', v)} />

          <div className="col-span-full mt-2 flex items-center justify-end gap-2">

            <button type="button" onClick={onClose} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm">Cancelar</button>

            <button type="submit" disabled={saving} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">

              {saving ? 'Guardando…' : 'Guardar'}

            </button>

          </div>

        </form>

      </div>

    </div>

  )

}



function Select({

  label,

  value,

  onChange,

  options,

  placeholder,

  disabled,

}: {

  label: string

  value: string

  onChange: (v: string) => void

  options: Array<{ value: string; label: string }>

  placeholder?: string

  disabled?: boolean

}) {

  return (

    <label className="block text-sm">

      <span className="mb-1 block font-medium text-zinc-800">{label}</span>

      <select

        value={value}

        onChange={(e) => onChange(e.target.value)}

        disabled={disabled}

        className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50 focus:border-red-600 focus:ring-4 focus:ring-red-600/10"

      >

        <option value="" disabled>

          {placeholder || 'Seleccione una opción'}

        </option>

        {options.map((o) => (

          <option key={o.value} value={o.value}>

            {o.label}

          </option>

        ))}

      </select>

    </label>

  )

}



function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {

  return (

    <label className="col-span-full block text-sm">

      <span className="mb-1 block font-medium text-zinc-800 text-justify">{label}</span>

      <textarea

        value={value}

        onChange={(e) => onChange(e.target.value)}

        rows={3}

        className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"

      />

    </label>

  )

}
