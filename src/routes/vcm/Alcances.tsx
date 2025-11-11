import { useEffect, useMemo, useState, useId } from 'react'
import { toast } from 'react-hot-toast'
import {
  createEngagementScope,
  deleteEngagementScope,
  listCompanies,
  listEngagementScopes,
  updateEngagementScope,
  type Company,
  type CompanyEngagementScope,
} from '../../api/companies'
import { listSubjects, type Subject } from '../../api/subjects'

export default function Alcances() {
  const [items, setItems] = useState<CompanyEngagementScope[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<CompanyEngagementScope | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [as, cs, ss] = await Promise.all([
        listEngagementScopes(),
        listCompanies(),
        listSubjects(),
      ])
      setItems(as)
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
  const subjectsByCodeSection = useMemo(() => {
    const m = new Map<string, Subject>()
    subjects.forEach((s) => m.set(`${s.code}-${s.section}`, s))
    return m
  }, [subjects])

  function openCreate() {
    setEditing(null)
    setShowForm(true)
  }
  function openEdit(a: CompanyEngagementScope) {
    setEditing(a)
    setShowForm(true)
  }
  async function onDelete(a: CompanyEngagementScope) {
    if (!confirm('¿Eliminar alcance seleccionado?')) return
    await deleteEngagementScope(a.id)
    toast.success('Alcance eliminado')
    await load()
  }

  return (
    <section className="p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Alcances con contraparte</h1>
          <p className="text-sm text-zinc-600">Gestión de alcances</p>
        </div>
        <button onClick={openCreate} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">
          Nuevo alcance
        </button>
      </div>

      {error ? (
        <div className="mb-3 rounded-md border border-red-2 00 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <Th>Empresa</Th>
              <Th>Asignatura</Th>
              <Th>Beneficios</Th>
              <Th>Condiciones</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {loading ? (
              <tr><td className="p-4 text-sm text-zinc-600" colSpan={5}>Cargando…</td></tr>
            ) : items.length === 0 ? (
              <tr><td className="p-4 text-sm text-zinc-600" colSpan={5}>Sin resultados</td></tr>
            ) : (
              items.map((a) => (
                <tr key={a.id} className="hover:bg-zinc-50">
                  <Td>{companiesById.get(a.company)?.name || `#${a.company}`}</Td>
                  <Td>
                    {(() => {
                      const key = `${a.subject_code}-${a.subject_section}`
                      const subj = subjectsByCodeSection.get(key)
                      return subj ? `${subj.name} (${key})` : key
                    })()}
                  </Td>
                  <Td>{a.benefits_from_student || '-'}</Td>
                  <Td><YesNoPill value={!!a.workplace_has_conditions_for_group} /></Td>
                  <Td className="text-right">
                    <button
                      onClick={() => openEdit(a)}
                      className="mr-2 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onDelete(a)}
                      className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                    >
                      Eliminar
                    </button>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <AlcanceForm
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
  return (
    <th className={`px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 ${className}`}>{children}</th>
  )
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2 text-sm text-zinc-800 ${className}`}>{children}</td>
}

function YesNoPill({ value }: { value: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
      value
        ? 'border-green-200 bg-green-50 text-green-700'
        : 'border-red-200 bg-red-50 text-red-700'
    }`}>
      <span className={`h-2 w-2 rounded-full ${value ? 'bg-green-500' : 'bg-red-500'}`} />
      {value ? 'Sí' : 'No'}
    </span>
  )
}

function AlcanceForm({
  initial,
  companies,
  subjects,
  onClose,
  onSaved,
}: {
  initial?: CompanyEngagementScope
  companies: Company[]
  subjects: Subject[]
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const [company, setCompany] = useState<number>(initial?.company || 0)
  const [subjectId, setSubjectId] = useState<number>(initial ? -1 : 0)
  const [form, setForm] = useState<Omit<CompanyEngagementScope, 'id'>>({
    company,
    subject_code: initial?.subject_code || '',
    subject_section: initial?.subject_section || '',
    benefits_from_student: initial?.benefits_from_student || '',
    has_value_or_research_project: initial?.has_value_or_research_project || false,
    time_availability_and_participation: initial?.time_availability_and_participation || '',
    workplace_has_conditions_for_group: initial?.workplace_has_conditions_for_group || false,
    meeting_schedule_availability: initial?.meeting_schedule_availability || '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm((f) => ({ ...f, company }))
  }, [company])

  useEffect(() => {
    if (initial) return
    const subj = subjects.find((s) => s.id === subjectId)
    if (subj) {
      setForm((f) => ({ ...f, subject_code: subj.code, subject_section: subj.section }))
    }
  }, [subjectId, subjects, initial])

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (!initial) {
        if (!company || !form.subject_code || !form.subject_section) {
          throw new Error('Seleccione empresa y asignatura')
        }
      }
      if (initial) {
        await updateEngagementScope(initial.id, form)
        toast.success('Alcance actualizado')
      } else {
        await createEngagementScope(form)
        toast.success('Alcance creado')
      }
      await onSaved()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-lg ring-1 ring-black/5 max-h-[calc(100vh-4rem)] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-3">
          <h2 className="text-sm font-semibold text-zinc-900">
            {initial ? 'Editar alcance' : 'Nuevo alcance'}
          </h2>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100">
            Cerrar
          </button>
        </div>
        <form className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 sm:px-6" onSubmit={onSubmit}>
          <Select
            label="Empresa"
            value={String(company || '')}
            onChange={(v) => setCompany(Number(v))}
            options={companies.map((c) => ({ value: String(c.id), label: c.name }))}
            placeholder={companies.length === 0 ? 'Sin empresas disponibles' : 'Seleccionar empresa'}
            disabled={companies.length === 0}
          />
          {initial ? (
            <Text
              label="Asignatura (code-section)"
              value={`${form.subject_code}-${form.subject_section}`}
              onChange={() => {}}
              readOnly
            />
          ) : (
            <Select
              label="Asignatura"
              value={String(subjectId || '')}
              onChange={(v) => setSubjectId(Number(v))}
              options={subjects.map((s) => ({
                value: String(s.id),
                label: `${s.name || '(sin nombre)'} (${s.code}-${s.section})`,
              }))}
              placeholder={subjects.length === 0 ? 'Sin asignaturas disponibles' : 'Seleccionar asignatura'}
              disabled={subjects.length === 0}
            />
          )}

          <Area
            label="¿Qué beneficios podría aportar un estudiante a su organización?"
            value={form.benefits_from_student}
            onChange={(v) => update('benefits_from_student', v)}
          />
          <Area
            label="¿Cuánto tiempo le gustaría disponer para esta experiencia? ¿Podría participar durante el semestre?"
            help="Se busca que la contraparte participe al inicio, presentando el proyecto, y al final, retroalimentando los entregables. Idealmente, podría participar además en instancias de retroalimentación intermedias durante el semestre."
            value={form.time_availability_and_participation}
            onChange={(v) => update('time_availability_and_participation', v)}
          />
          <Area
            label="¿Qué horarios de reunión (presencial / online) tiene disponible para discutir avances del proyecto con la contraparte de Inacap?"
            value={form.meeting_schedule_availability}
            onChange={(v) => update('meeting_schedule_availability', v)}
          />

          <Check
            label="¿Tiene un proyecto de investigación o de valor agregado que podría asignar al grupo de estudiantes?"
            checked={form.has_value_or_research_project}
            onChange={(v) => update('has_value_or_research_project', v)}
          />
          <Check
            label="¿Su lugar de trabajo presenta condiciones para recibir al grupo de estudiantes?"
            help="Por ejemplo, para mostrar el equipamiento, equipos de trabajo, auditorio para presentar el proyecto y/o retroalimentarlo u otras actividades. En caso de que no, la contraparte también puede ir a la sede."
            checked={form.workplace_has_conditions_for_group}
            onChange={(v) => update('workplace_has_conditions_for_group', v)}
          />

          <div className="col-span-full mt-2 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Text({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  readOnly?: boolean
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-zinc-800">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
      />
    </label>
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
        {!value ? (
          <option value="" disabled>
            {placeholder || 'Seleccione una opción'}
          </option>
        ) : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function Area({ label, value, onChange, help }: { label: string; value: string; onChange: (v: string) => void; help?: string }) {
  const [open, setOpen] = useState(false)
  const helpId = useId()
  return (
    <label className="relative col-span-full block text-sm">
      <span className="mb-1 flex items-start gap-2 font-medium text-zinc-800">
        <span className="text-justify">{label}</span>
        {help ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={helpId}
            className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border border-zinc-300 text-[10px] leading-none text-zinc-600 hover:bg-zinc-50"
            aria-label="Ayuda"
          >
            ?
          </button>
        ) : null}
      </span>
      {help && open ? (
        <div
          id={helpId}
          className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 shadow-lg"
        >
          {help}
        </div>
      ) : null}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
      />
    </label>
  )
}

function Check({ label, checked, onChange, help }: { label: string; checked: boolean; onChange: (v: boolean) => void; help?: string }) {
  const [open, setOpen] = useState(false)
  const helpId = useId()
  return (
    <label className="relative flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-600"
      />
      <span className="flex items-start gap-2 text-zinc-800">
        <span className="block leading-snug text-justify">{label}</span>
        {help ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={helpId}
            className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border border-zinc-300 text-[10px] leading-none text-zinc-600 hover:bg-zinc-50"
            aria-label="Ayuda"
          >
            ?
          </button>
        ) : null}
      </span>
      {help && open ? (
        <div
          id={helpId}
          className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 shadow-lg"
        >
          {help}
        </div>
      ) : null}
    </label>
  )
}
