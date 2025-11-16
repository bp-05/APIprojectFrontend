import { useEffect, useMemo, useState } from 'react'
import type React from 'react'
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
  type CounterpartContact,
} from '../../api/companies'
import { listSubjectCodeSections, type BasicSubject } from '../../api/subjects'

const EMPTY_CONTACT: CounterpartContact = {
  name: '',
  rut: '',
  phone: '',
  email: '',
  counterpart_area: '',
  role: '',
}

const EMPTY_CONTACT_ERRORS = { rut: '', phone: '', email: '' }

// Helper functions para formatear y validar campos
function calculateRutDv(rut: string): string {
  const digits = rut.replace(/\D/g, '')
  if (digits.length < 7) return ''
  
  let sum = 0
  let multiplier = 2
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += parseInt(digits[i]) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }
  
  const dv = 11 - (sum % 11)
  if (dv === 11) return '0'
  if (dv === 10) return 'K'
  return String(dv)
}

function formatRutInput(value: string): string {
  if (!value) return ''
  
  const input = value.toUpperCase()
  
  // Just keep: digits, K, hyphen, and dots
  let cleaned = ''
  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    if (/[0-9K.\-]/.test(char)) {
      cleaned += char
    }
  }
  
  // Remove existing hyphen to rebuild it
  const withoutHyphen = cleaned.replace('-', '')
  
  // Separate numbers from potential DV
  let numPart = ''
  let dvPart = ''
  
  for (let i = 0; i < withoutHyphen.length; i++) {
    const char = withoutHyphen[i]
    if (/[0-9]/.test(char) && numPart.length < 8) {
      numPart += char
    } else if (/[0-9K]/.test(char)) {
      dvPart += char
    }
  }
  
  // Limit DV to 1 character
  dvPart = dvPart.slice(0, 1)
  
  // Format with dots
  let formatted = ''
  if (numPart.length <= 2) {
    formatted = numPart
  } else if (numPart.length <= 5) {
    formatted = numPart.slice(0, 2) + '.' + numPart.slice(2)
  } else {
    formatted = numPart.slice(0, 2) + '.' + numPart.slice(2, 5) + '.' + numPart.slice(5, 8)
  }
  
  // Add hyphen and DV automatically when we have 8 digits
  if (numPart.length === 8 && dvPart) {
    formatted += '-' + dvPart
  } else if (numPart.length === 8 && dvPart === '') {
    formatted += '-'
  }
  
  return formatted
}

function formatClPhone(value: string): string {
  if (!value) return ''
  
  // Solo filtrar caracteres no numéricos, espacios, +, -
  // No hacer reformateo, dejar que el input HTML maneje la presentación
  return value.replace(/[^\d\s+\-]/g, '')
}

function validateContactField(key: keyof CounterpartContact, value: string): Partial<typeof EMPTY_CONTACT_ERRORS> {
  const errors: Partial<typeof EMPTY_CONTACT_ERRORS> = {}
  
  if (key === 'rut' && value) {
    // Extract just digits and K from the RUT
    const rutDigits = value.replace(/\D/g, '')
    const rutFull = value.toUpperCase()
    const hasK = /K/.test(rutFull)
    
    // Need at least 8 digits for validation
    if (rutDigits.length < 8) {
      // Don't show error if incomplete, just return
      return errors
    }
    
    // Extract the 8-digit part and DV part
    const numPart = rutDigits.slice(0, 8)
    const dvCharacter = hasK ? 'K' : rutDigits.slice(8, 9)
    
    // If no DV character yet, don't validate (still typing)
    if (!dvCharacter) {
      return errors
    }
    
    // Calculate correct DV
    const expectedDv = calculateRutDv(numPart)
    if (dvCharacter !== expectedDv) {
      errors.rut = 'RUT inválido'
    }
  }
  
  if (key === 'phone' && value) {
    // Solo validar si tiene exactamente 8 dígitos (cuando esté completo)
    const phoneDigits = String(value).replace(/\D/g, '')
    if (phoneDigits.length > 0 && phoneDigits.length !== 8) {
      // Aún está incompleto, no mostrar error
      return errors
    }
    if (phoneDigits.length === 8) {
      // Validación completa solo si tiene 8 dígitos
      // Aquí podrías agregar validación adicional si lo necesitas
    }
  }
  
  if (key === 'email' && value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      errors.email = 'Correo inválido'
    }
  }
  
  return errors
}

function normalizeContact(contact?: CounterpartContact): CounterpartContact {
  if (!contact) return { ...EMPTY_CONTACT }
  return {
    name: contact.name?.trim() || '',
    rut: formatRutInput(contact.rut || ''),
    phone: formatClPhone(contact.phone || ''),
    email: contact.email?.trim().toLowerCase() || '',
    counterpart_area: contact.counterpart_area?.trim() || '',
    role: contact.role?.trim() || '',
  }
}



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
  const [contact, setContact] = useState<CounterpartContact>(() =>
    normalizeContact(initial?.counterpart_contacts?.[0]),
  )
  const [contactErrors, setContactErrors] = useState<{ rut: string; phone: string; email: string }>({
    ...EMPTY_CONTACT_ERRORS,
  })

  // Cargar responsable cuando se monta el componente o cuando cambia la empresa
  useEffect(() => {
    if (!form.company || form.company <= 0) return
    
    const company = companies.find((c) => c.id === form.company)
    if (!company) return
    
    // Si tiene counterpart_contacts, usar el primero
    if (company.counterpart_contacts?.[0]) {
      const contactData = company.counterpart_contacts[0]
      let phoneDigits = contactData.phone?.replace(/\D/g, '') || ''
      phoneDigits = phoneDigits.slice(-8)
      
      setContact({
        name: contactData.name?.trim() || '',
        rut: contactData.rut?.trim() || '',
        phone: phoneDigits,
        email: contactData.email?.trim() || '',
        counterpart_area: contactData.counterpart_area?.trim() || '',
        role: contactData.role?.trim() || '',
      })
      setContactErrors(EMPTY_CONTACT_ERRORS)
    }
  }, [form.company, companies])

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }



  function updateContact<K extends keyof CounterpartContact>(key: K, value: CounterpartContact[K]) {

    setContact((prev) => {

      let nextVal: CounterpartContact[K] = value

      if (key === 'rut') {

        nextVal = formatRutInput(String(value || '')) as CounterpartContact[K]

      } else if (key === 'email') {

        nextVal = String(value || '').trim().toLowerCase() as CounterpartContact[K]

      }
      // No procesar phone aquí, ya viene formateado del input

      const next = { ...prev, [key]: nextVal }

      setContactErrors((prevErr) => ({

        ...prevErr,

        ...validateContactField(key, String(nextVal || '')),

      }))

      return next

    })

  }

  async function onSubmit(e: React.FormEvent) {

    e.preventDefault()

    const payload = Object.fromEntries(

      Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]),

    ) as typeof form

    const isValidId = (x: unknown) => typeof x === 'number' && Number.isFinite(x) && x > 0
    
    // Validaciones
    if (!isValidId(payload.company)) {
      toast.error('Selecciona una Empresa')
      return
    }
    if (!isValidId(payload.subject)) {
      toast.error('Selecciona una Asignatura')
      return
    }
    
    // Validar campos del responsable
    if (!contact.name.trim()) {
      toast.error('Ingresa el nombre del responsable')
      return
    }
    if (!contact.email.trim()) {
      toast.error('Ingresa el correo del responsable')
      return
    }
    if (!contact.phone.trim()) {
      toast.error('Ingresa el teléfono del responsable')
      return
    }

    setSaving(true)

    try {
      // Validar y guardar contacto en la empresa
      const contactValidation = {
        rut: validateContactField('rut', contact.rut),
        phone: validateContactField('phone', contact.phone),
        email: validateContactField('email', contact.email),
      }
      
      const hasErrors = Object.values(contactValidation).some((e) => Object.keys(e).length > 0)
      
      if (hasErrors) {
        toast.error('Completa correctamente los datos del responsable')
        setSaving(false)
        return
      }

      // Formatear el teléfono completo para guardar
      const phoneToSave = contact.phone ? `+56 9 ${contact.phone}` : ''

      // Preparar el payload del problem statement con el contacto
      const problemPayload = {
        ...payload,
        counterpart_contacts: [{
          name: contact.name,
          rut: contact.rut,
          phone: phoneToSave,
          email: contact.email,
          counterpart_area: contact.counterpart_area,
          role: contact.role,
        }],
      }

      // Guardar el problem statement con el responsable
      if (initial) {

        await updateProblemStatement(initial.id, problemPayload)

        toast.success('Problemática actualizada')

      } else {

        await createProblemStatement(problemPayload)

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



          <Area label="¿Cuál es la problemática que necesitamos abordar?" value={form.problem_to_address} onChange={(v) => update('problem_to_address', v)} />

          <Area label="¿Por qué esta problemática es importante para nosotros?" value={form.why_important} onChange={(v) => update('why_important', v)} />

          <Area label="¿Para quiénes es relevante? ¿A quién concierne? ¿Quiénes están involucrados y en qué medida?" value={form.stakeholders} onChange={(v) => update('stakeholders', v)} />

          <Area label="¿Qué área está más directamente relacionada?" value={form.related_area} onChange={(v) => update('related_area', v)} />

          <Area label="¿Cómo y en qué nos beneficiaría en el corto, mediano y largo plazo la solución a la problemática cuando esté resuelta?" value={form.benefits_short_medium_long_term} onChange={(v) => update('benefits_short_medium_long_term', v)} />

          <Area label="A partir de las respuestas, define la problemática a trabajar en la asignatura." value={form.problem_definition} onChange={(v) => update('problem_definition', v)} />



          <div className="col-span-full mt-2 border-t border-zinc-200 pt-4">
    <h3 className="mb-2 text-sm font-semibold text-zinc-900">Responsable de la contraparte</h3>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-1">
        <label className="block text-xs font-medium text-zinc-600">Nombre</label>
        <input type="text" value={contact.name} onChange={(e) => updateContact('name', e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" required />
      </div>
      <div className="space-y-1">
        <label className="block text-xs font-medium text-zinc-600">RUT</label>
        <input type="text" value={contact.rut} onChange={(e) => updateContact('rut', e.target.value)} placeholder="12.345.678-9" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" required />
        {contactErrors.rut ? <p className="text-xs text-red-600">{contactErrors.rut}</p> : null}
      </div>
      <div className="space-y-1">
        <label className="block text-xs font-medium text-zinc-600">Correo</label>
        <input type="email" value={contact.email} onChange={(e) => updateContact('email', e.target.value)} placeholder="empresa@dominio.cl" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" required />
        {contactErrors.email ? <p className="text-xs text-red-600">{contactErrors.email}</p> : null}
      </div>
      <div className="space-y-1">
        <label className="block text-xs font-medium text-zinc-600">Teléfono</label>
        <div className="flex gap-0">
          <span className="flex items-center bg-zinc-100 rounded-l-md border border-zinc-300 border-r-0 px-3 py-2 text-sm font-medium text-zinc-700">+56 9</span>
          <input type="text" inputMode="numeric" value={contact.phone.replace(/[^\d]/g, '')} onChange={(e) => {
            const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 8)
            updateContact('phone', onlyDigits)
          }} placeholder="1234 5678" maxLength={8} className="flex-1 rounded-r-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" required />
        </div>
        {contactErrors.phone ? <p className="text-xs text-red-600">{contactErrors.phone}</p> : null}
      </div>
      <div className="space-y-1">
        <label className="block text-xs font-medium text-zinc-600">Área en la empresa</label>
        <input type="text" value={contact.counterpart_area} onChange={(e) => updateContact('counterpart_area', e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
      </div>
      <div className="space-y-1">
        <label className="block text-xs font-medium text-zinc-600">Cargo</label>
        <input type="text" value={contact.role} onChange={(e) => updateContact('role', e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
      </div>
    </div>
  </div>

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



