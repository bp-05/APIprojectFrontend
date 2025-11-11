import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-hot-toast'
import {
  createProblemStatement,
  deleteProblemStatement,
  listCompanies,
  listProblemStatements,
  updateProblemStatement,
  type ProblemStatement,
  type Company,
} from '../../api/companies'
import { listSubjectCodeSections, type BasicSubject } from '../../api/subjects'

export default function Problemas() {
  const [items, setItems] = useState<ProblemStatement[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [subjects, setSubjects] = useState<BasicSubject[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ProblemStatement | null>(null)

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

  function openCreate() {
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(p: ProblemStatement) {
    setEditing(p)
    setShowForm(true)
  }

  async function onDelete(p: ProblemStatement) {
    if (!confirm('¿Eliminar problemática seleccionada?')) return
    await deleteProblemStatement(p.id)
    toast.success('Problemática eliminada')
    await load()
  }

  return (
    <section className="p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Problemáticas</h1>
          <p className="text-sm text-zinc-600">Gestión de problemáticas con contraparte</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar…"
            className="w-56 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
          <button onClick={openCreate} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">
            Nueva problemática
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <Th>Empresa</Th>
              <Th>Asignatura</Th>
              <Th>Asunto a abordar</Th>
              <Th>Stakeholders</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {loading ? (
              <tr><td className="p-4 text-sm text-zinc-600" colSpan={5}>Cargando…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="p-4 text-sm text-zinc-600" colSpan={5}>Sin resultados</td></tr>
            ) : (
              filtered.map((p) => {
                const comp = companiesById.get(p.company)
                const subj = subjectsById.get(p.subject)
                return (
                  <tr key={p.id} className="hover:bg-zinc-50">
                    <Td>{comp?.name || `#${p.company}`}</Td>
                    <Td>{subj ? `${subj.name || '(sin nombre)'} (${subj.code}-${subj.section})` : `#${p.subject}`}</Td>
                    <Td>{p.problem_to_address || '-'}</Td>
                    <Td>{p.stakeholders || '-'}</Td>
                    <Td className="text-right">
                      <button
                        onClick={() => openEdit(p)}
                        className="mr-2 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => onDelete(p)}
                        className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                      >
                        Eliminar
                      </button>
                    </Td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <ProblemForm
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

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 ${className}`}>{children}</th>
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2 text-sm text-zinc-800 ${className}`}>{children}</td>
}

function ProblemForm({
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

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]),
      ) as typeof form
      const isValidId = (x: unknown) => typeof x === 'number' && Number.isFinite(x) && x > 0
      if (!isValidId(payload.company)) throw new Error('Seleccione una empresa válida')
      if (!isValidId(payload.subject)) throw new Error('Seleccione una asignatura válida')
      if (initial) {
        await updateProblemStatement(initial.id, payload)
        toast.success('Problemática actualizada')
      } else {
        await createProblemStatement(payload)
        toast.success('Problemática creada')
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
          <h2 className="text-sm font-semibold text-zinc-900">{initial ? 'Editar problemática' : 'Nueva problemática'}</h2>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100">Cerrar</button>
        </div>
        <form className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 sm:px-6" onSubmit={onSubmit}>
          <Select
            label="Empresa"
            value={String(form.company || '')}
            onChange={(v) => update('company', Number(v))}
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

          <Area label="¿Cuál es la problemática que necesitamos abordar?" value={form.problem_to_address} onChange={(v) => update('problem_to_address', v)} />
          <Area label="¿Por qué esta problemática es importante para nosotros?" value={form.why_important} onChange={(v) => update('why_important', v)} />
          <Area label="¿Para quiénes es relevante? ¿A quién concierne? ¿Quiénes están involucrados y en qué medida?" value={form.stakeholders} onChange={(v) => update('stakeholders', v)} />
          <Area label="¿Qué área está más directamente relacionada?" value={form.related_area} onChange={(v) => update('related_area', v)} />
          <Area label="¿Cómo y en qué nos beneficiaría en el corto, mediano y largo plazo la solución a la problemática cuando esté resuelta?" value={form.benefits_short_medium_long_term} onChange={(v) => update('benefits_short_medium_long_term', v)} />
          <Area label="A partir de las respuestas, define la problemática a trabajar en la asignatura." value={form.problem_definition} onChange={(v) => update('problem_definition', v)} />

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

