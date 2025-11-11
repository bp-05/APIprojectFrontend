import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Link, useParams } from 'react-router'
import { getSubject, type Subject } from '../../api/subjects'
import { listCompanies, listEngagementScopes, listProblemStatements, type Company, type CompanyEngagementScope, type ProblemStatement } from '../../api/companies'
import { listCompanyRequirements, type CompanyRequirement, updateCompanyRequirement, createCompanyRequirement, listAlternances, type Api3Alternance, updateAlternance, createAlternance } from '../../api/subjects'

export default function AsignaturaVCMDetalle() {
  const { id } = useParams()
  const subjectId = Number(id)
  const [subject, setSubject] = useState<Subject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [requirements, setRequirements] = useState<CompanyRequirement[]>([])
  const [scopes, setScopes] = useState<CompanyEngagementScope[]>([])
  const [problems, setProblems] = useState<ProblemStatement[]>([])
  const [savingId, setSavingId] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newReqCompany, setNewReqCompany] = useState<number>(0)
  const [newReqCan, setNewReqCan] = useState(false)
  const [newReqQuota, setNewReqQuota] = useState('')
  const [alternance, setAlternance] = useState<Api3Alternance | null>(null)
  const [altForm, setAltForm] = useState<{ student_role: string; students_quota: string; tutor_name: string; tutor_email: string; alternance_hours: string }>({ student_role: '', students_quota: '', tutor_name: '', tutor_email: '', alternance_hours: '' })

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        if (!Number.isFinite(subjectId)) throw new Error('ID invalido')
        const [s, comps, reqs, scps, probs, alts] = await Promise.all([
          getSubject(subjectId),
          listCompanies(),
          listCompanyRequirements(),
          listEngagementScopes(),
          listProblemStatements({ subject: subjectId }),
          listAlternances(),
        ])
        if (mounted) {
          setSubject(s)
          setCompanies(comps)
          setRequirements(reqs)
          setScopes(scps)
          setProblems(probs)
          const a = (alts || []).find((x) => x.subject === subjectId) || null
          setAlternance(a)
          setAltForm({
            student_role: a?.student_role || '',
            students_quota: a ? String(a.students_quota) : '',
            tutor_name: a?.tutor_name || '',
            tutor_email: a?.tutor_email || '',
            alternance_hours: a ? String(a.alternance_hours) : '',
          })
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'No se pudo cargar la asignatura'
        if (mounted) setError(msg)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [id])

  return (
    <section className="p-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Detalle de asignatura</h1>
          {subject ? (
            <p className="text-sm text-zinc-600">{subject.name} — {subject.code}-{subject.section}</p>
          ) : null}
        </div>
        <Link to="/vcm/asignaturas" className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50">Volver</Link>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="text-sm text-zinc-600">Cargando…</div>
      ) : subject ? (
        <div className="grid grid-cols-1 gap-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold">Información general</h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              <Item label="Código">{subject.code}</Item>
              <Item label="Sección">{subject.section}</Item>
              <Item label="Nombre">{subject.name}</Item>
              <Item label="Docente">{subject.teacher_name || '—'}</Item>
              <Item label="Campus">{subject.campus}</Item>
              <Item label="Jornada">{subject.shift}</Item>
              <Item label="Horas">{String(subject.hours)}</Item>
              <Item label="Semestre">{subject.semester_name ?? String(subject.semester)}</Item>
              <Item label="Área">{subject.Área_name || String(subject.Área)}</Item>
              <Item label="Carrera">{subject.career_name || (subject.career ? String(subject.career) : '—')}</Item>
              <Item label="Tipo API">{String(subject.api_type)}</Item>
            </dl>
          </div>

          <EmpresasSection subject={subject} companies={companies} requirements={requirements} scopes={scopes} problems={problems} />

          <RequerimientosSection
            subject={subject}
            companies={companies}
            requirements={requirements}
            onChangeRequirements={setRequirements}
            savingId={savingId}
            setSavingId={setSavingId}
            showCreate={showCreate}
            setShowCreate={setShowCreate}
            newReqCompany={newReqCompany}
            setNewReqCompany={setNewReqCompany}
            newReqCan={newReqCan}
            setNewReqCan={setNewReqCan}
            newReqQuota={newReqQuota}
            setNewReqQuota={setNewReqQuota}
          />

          <TiposProyectoSection subject={subject} companies={companies} scopes={scopes} />

          <AlternanceSection
            subjectId={subject.id}
            value={alternance}
            form={altForm}
            onChangeForm={setAltForm}
            onSaved={setAlternance}
          />

          <PosiblesContrapartesSeleccion subjectId={subject.id} />
        </div>
      ) : null}
    </section>
  )
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-zinc-600">{label}</dt>
      <dd className="text-sm text-zinc-900">{children}</dd>
    </div>
  )
}

function EmpresasSection({ subject, companies, requirements, scopes, problems }: {
  subject: Subject
  companies: Company[]
  requirements: CompanyRequirement[]
  scopes: CompanyEngagementScope[]
  problems: ProblemStatement[]
}) {
  const companiesById = new Map<number, Company>()
  companies.forEach((c) => companiesById.set(c.id, c))

  const ids = (() => {
    const set = new Set<number>()
    ;(requirements || []).filter((r) => r.subject === subject.id).forEach((r) => set.add(r.company))
    ;(problems || []).forEach((p) => set.add(p.company))
    ;(scopes || []).filter((s) => s.subject_code === subject.code && s.subject_section === subject.section).forEach((a) => set.add(a.company))
    return Array.from(set)
  })()

  if (ids.length === 0) return null
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold">Empresas vinculadas</h2>
      <ul className="list-inside list-disc text-sm text-zinc-800">
        {ids.map((id) => (
          <li key={id}>{companiesById.get(id)?.name || `Empresa #${id}`}</li>
        ))}
      </ul>
    </div>
  )
}

function RequerimientosSection({ subject, companies, requirements, onChangeRequirements, savingId, setSavingId, showCreate, setShowCreate, newReqCompany, setNewReqCompany, newReqCan, setNewReqCan, newReqQuota, setNewReqQuota }: {
  subject: Subject
  companies: Company[]
  requirements: CompanyRequirement[]
  onChangeRequirements: (v: CompanyRequirement[]) => void
  savingId: number | null
  setSavingId: (v: number | null) => void
  showCreate: boolean
  setShowCreate: (v: boolean) => void
  newReqCompany: number
  setNewReqCompany: (v: number) => void
  newReqCan: boolean
  setNewReqCan: (v: boolean) => void
  newReqQuota: string
  setNewReqQuota: (v: string) => void
}) {
  const list = (requirements || []).filter((r) => r.subject === subject.id)
  const companiesById = new Map<number, Company>()
  companies.forEach((c) => companiesById.set(c.id, c))

  async function save(r: CompanyRequirement, updates: Partial<CompanyRequirement>) {
    setSavingId(r.id)
    try {
      await updateCompanyRequirement(r.id, updates)
      const fresh = await listCompanyRequirements()
      onChangeRequirements(fresh)
    } finally {
      setSavingId(null)
    }
  }

  async function create() {
    setSavingId(-1)
    try {
      await createCompanyRequirement({
        subject: subject.id,
        company: newReqCompany,
        sector: '',
        worked_before: false,
        interest_collaborate: true,
        can_develop_activities: false,
        willing_design_project: false,
        interaction_type: '',
        has_guide: false,
        can_receive_alternance: newReqCan,
        alternance_students_quota: newReqCan && newReqQuota !== '' ? Number(newReqQuota) : null,
      })
      const fresh = await listCompanyRequirements()
      onChangeRequirements(fresh)
      setShowCreate(false)
      setNewReqCompany(0)
      setNewReqCan(false)
      setNewReqQuota('')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Requerimientos de empresa</h2>
        <button onClick={() => setShowCreate(true)} className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50">Agregar</button>
      </div>
      {list.length === 0 ? (
        <div className="text-sm text-zinc-600">Sin requerimientos</div>
      ) : (
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-600">Empresa</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-600">Alternancia</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-600">Cupo</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-zinc-600">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {list.map((r) => (
              <AlternanceRow
                key={r.id}
                companyName={companiesById.get(r.company)?.name || `Empresa #${r.company}`}
                value={{ can: r.can_receive_alternance, quota: r.alternance_students_quota }}
                saving={savingId === r.id}
                onSave={(val) => save(r, { can_receive_alternance: val.can, alternance_students_quota: val.quota })}
              />
            ))}
          </tbody>
        </table>
      )}
      {showCreate ? (
        <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <div className="mb-2 text-sm font-medium">Nuevo requerimiento</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            <label className="text-xs">
              <span className="mb-1 block">Empresa</span>
              <select value={String(newReqCompany || '')} onChange={(e) => setNewReqCompany(Number(e.target.value))} className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm">
                <option value="" disabled>Seleccione…</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={newReqCan} onChange={(e) => setNewReqCan(e.target.checked)} /> Alternancia
            </label>
            <label className="text-xs">
              <span className="mb-1 block">Cupo</span>
              <input value={newReqQuota} onChange={(e) => setNewReqQuota(e.target.value.replace(/[^0-9]/g, ''))} className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm" placeholder="#" disabled={!newReqCan} />
            </label>
            <div className="text-right">
              <button onClick={() => setShowCreate(false)} className="mr-2 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs">Cancelar</button>
              <button onClick={create} disabled={!newReqCompany} className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700">Guardar</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function AlternanceRow({ companyName, value, onSave, saving }: { companyName: string; value: { can: boolean; quota: number | null }; onSave: (v: { can: boolean; quota: number | null }) => void | Promise<void>; saving?: boolean }) {
  const [can, setCan] = useState<boolean>(value.can)
  const [quota, setQuota] = useState<string>(value.quota !== null && value.quota !== undefined ? String(value.quota) : '')
  return (
    <tr>
      <td className="px-3 py-2 text-sm">{companyName}</td>
      <td className="px-3 py-2 text-sm"><input type="checkbox" checked={can} onChange={(e) => setCan(e.target.checked)} /></td>
      <td className="px-3 py-2 text-sm">
        <input value={quota} onChange={(e) => setQuota(e.target.value.replace(/[^0-9]/g, ''))} className="w-16 rounded-md border border-zinc-300 px-2 py-1 text-sm" placeholder="#" disabled={!can} />
      </td>
      <td className="px-3 py-2 text-right text-sm">
        <button onClick={() => onSave({ can, quota: quota === '' ? null : Number(quota) })} disabled={saving} className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50">Guardar</button>
      </td>
    </tr>
  )
}

function TiposProyectoSection({ subject, companies, scopes }: { subject: Subject; companies: Company[]; scopes: CompanyEngagementScope[] }) {
  const companiesById = new Map<number, Company>()
  companies.forEach((c) => companiesById.set(c.id, c))

  const list = (scopes || []).filter((s) => s.subject_code === subject.code && s.subject_section === subject.section)
  if (!list.length) return null
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold">Tipos de proyecto</h2>
      <table className="min-w-full divide-y divide-zinc-200">
        <thead className="bg-zinc-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-600">Empresa</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-600">Proyecto de valor/investigacion</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-600">Beneficios esperados</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {list.map((a) => (
            <tr key={a.id}>
              <td className="px-3 py-2 text-sm">{companiesById.get(a.company)?.name || `Empresa #${a.company}`}</td>
              <td className="px-3 py-2 text-sm">{a.has_value_or_research_project ? 'Si' : 'No'}</td>
              <td className="px-3 py-2 text-sm">{a.benefits_from_student || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AlternanceSection({ subjectId, value, form, onChangeForm, onSaved }: {
  subjectId: number
  value: Api3Alternance | null
  form: { student_role: string; students_quota: string; tutor_name: string; tutor_email: string; alternance_hours: string }
  onChangeForm: (v: { student_role: string; students_quota: string; tutor_name: string; tutor_email: string; alternance_hours: string }) => void
  onSaved: (v: Api3Alternance | null) => void
}) {
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const payload = {
        student_role: form.student_role.trim(),
        students_quota: Number(form.students_quota || '0') || 0,
        tutor_name: form.tutor_name.trim(),
        tutor_email: form.tutor_email.trim(),
        alternance_hours: Number(form.alternance_hours || '0') || 0,
        subject: subjectId,
      }
      let res: Api3Alternance
      if (value) {
        res = await updateAlternance(value.id, payload)
      } else {
        res = await createAlternance(payload)
      }
      onSaved(res)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold">Requerimientos (API - Alternance)</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <LabeledInput label="Rol del estudiante" value={form.student_role} onChange={(v) => onChangeForm({ ...form, student_role: v })} />
        <LabeledInput label="Cupo de estudiantes" value={form.students_quota} onChange={(v) => onChangeForm({ ...form, students_quota: v.replace(/[^0-9]/g, '') })} />
        <LabeledInput label="Nombre tutor" value={form.tutor_name} onChange={(v) => onChangeForm({ ...form, tutor_name: v })} />
        <LabeledInput label="Correo tutor" value={form.tutor_email} onChange={(v) => onChangeForm({ ...form, tutor_email: v })} />
        <LabeledInput label="Horas de alternancia" value={form.alternance_hours} onChange={(v) => onChangeForm({ ...form, alternance_hours: v.replace(/[^0-9]/g, '') })} />
      </div>
      <div className="mt-3 text-right">
        <button onClick={save} disabled={saving} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
          {saving ? 'Guardando…' : value ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </div>
  )
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-zinc-800">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
    </label>
  )
}

// --- Posibles contrapartes (localStorage) ---
import { useId } from 'react'

type Prospect = {
  id: string
  company_name: string
  sector: string
  worked_before: boolean
  interest_collaborate: boolean
  can_develop_activities: boolean
  willing_design_project: boolean
  interaction_type: string
  has_guide: boolean
  can_receive_alternance: boolean
  alternance_students_quota: number | null
}

function loadProspects(): Prospect[] {
  try {
    const raw = localStorage.getItem('vcm_posibles_contrapartes')
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}
function saveProspects(list: Prospect[]) {
  localStorage.setItem('vcm_posibles_contrapartes', JSON.stringify(list))
}

function PosibleContraparteSection() {
  const [items, setItems] = useState<Prospect[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Prospect | null>(null)

  useEffect(() => { setItems(loadProspects()) }, [])

  function onSaved(p: Prospect) {
    const arr = loadProspects()
    const idx = arr.findIndex((x) => x.id === p.id)
    if (idx >= 0) arr[idx] = p; else arr.push(p)
    saveProspects(arr)
    setItems(arr)
    setOpen(false)
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Posible contraparte</h2>
        <button onClick={() => { setEditing(null); setOpen(true) }} className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">Agregar</button>
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-zinc-600">Sin registros</div>
      ) : (
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-600">Empresa</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-600">Sector</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-600">Interés</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-zinc-600">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {items.map((p) => (
              <tr key={p.id}>
                <td className="px-3 py-2 text-sm">{p.company_name}</td>
                <td className="px-3 py-2 text-sm">{p.sector || '—'}</td>
                <td className="px-3 py-2 text-sm">{p.interest_collaborate ? 'Sí' : 'No'}</td>
                <td className="px-3 py-2 text-right text-sm">
                  <button onClick={() => { setEditing(p); setOpen(true) }} className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50">Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {open && (
        <ProspectDialog initial={editing || undefined} onClose={() => setOpen(false)} onSaved={onSaved} />
      )}
    </div>
  )
}

function YesNo({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const name = useId()
  return (
    <div className="text-sm">
      <div className="mb-1 font-medium text-zinc-800">{label}</div>
      <div className="flex items-center gap-4">
        <label className="inline-flex items-center gap-2">
          <input type="radio" name={name} checked={value === true} onChange={() => onChange(true)} className="h-4 w-4 border-zinc-300 text-red-600 focus:ring-red-600" />
          <span>Sí</span>
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="radio" name={name} checked={value === false} onChange={() => onChange(false)} className="h-4 w-4 border-zinc-300 text-red-600 focus:ring-red-600" />
          <span>No</span>
        </label>
      </div>
    </div>
  )
}

function ProspectDialog({ initial, onClose, onSaved }: { initial?: Prospect; onClose: () => void; onSaved: (p: Prospect) => void }) {
  const [form, setForm] = useState<Prospect>({
    id: initial?.id || crypto.randomUUID(),
    company_name: initial?.company_name || '',
    sector: initial?.sector || '',
    worked_before: initial?.worked_before || false,
    interest_collaborate: initial?.interest_collaborate || false,
    can_develop_activities: initial?.can_develop_activities || false,
    willing_design_project: initial?.willing_design_project || false,
    interaction_type: initial?.interaction_type || '',
    has_guide: initial?.has_guide || false,
    can_receive_alternance: initial?.can_receive_alternance || false,
    alternance_students_quota: initial?.alternance_students_quota ?? null,
  })
  const [quotaStr, setQuotaStr] = useState<string>(typeof form.alternance_students_quota === 'number' ? String(form.alternance_students_quota) : '')
  const [saving, setSaving] = useState(false)

  function update<K extends keyof Prospect>(k: K, v: Prospect[K]) { setForm((f) => ({ ...f, [k]: v })) }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const payload: Prospect = {
        ...form,
        company_name: form.company_name.trim(),
        sector: form.sector.trim(),
        interaction_type: form.interaction_type.trim(),
        alternance_students_quota: form.can_receive_alternance ? (quotaStr === '' ? null : Math.max(0, Number(quotaStr) || 0)) : null,
      }
      if (!payload.company_name) throw new Error('Ingrese el nombre de la contraparte')
      onSaved(payload)
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-lg ring-1 ring-black/5 max-h-[calc(100vh-4rem)] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-3">
          <h2 className="text-sm font-semibold text-zinc-900">{initial ? 'Editar posible contraparte' : 'Agregar posible contraparte'}</h2>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100">Cerrar</button>
        </div>
        <form className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 sm:px-6" onSubmit={onSubmit}>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">Nombre de la contraparte</span>
            <input value={form.company_name} onChange={(e) => update('company_name', e.target.value)} className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">Sector</span>
            <input value={form.sector} onChange={(e) => update('sector', e.target.value)} className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
          </label>

          <YesNo label="¿La sede ha trabajado anteriormente con esta contraparte?" value={form.worked_before} onChange={(v) => update('worked_before', v)} />
          <YesNo label="¿La contraparte tiene interés de participar con INACAP de manera colaborativa?" value={form.interest_collaborate} onChange={(v) => update('interest_collaborate', v)} />
          <YesNo label="¿El estudiante puede desarrollar actividades asociadas a los aprendizajes esperados?" value={form.can_develop_activities} onChange={(v) => update('can_develop_activities', v)} />
          <YesNo label="¿Cuenta con proyecto para diseño/desarrollo (si corresponde)?" value={form.willing_design_project} onChange={(v) => update('willing_design_project', v)} />

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">Tipo de interacción</span>
            <select value={form.interaction_type} onChange={(e) => update('interaction_type', e.target.value)} className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10">
              <option value="">Seleccionar</option>
              <option value="Virtual">Virtual</option>
              <option value="Presencial en la empresa">Presencial en la empresa</option>
              <option value="Presencial en INACAP">Presencial en INACAP</option>
            </select>
          </label>

          <YesNo label="Si recibe estudiantes en alternancia (Tipo 3), ¿cuenta con un Maestro Guía?" value={form.has_guide} onChange={(v) => update('has_guide', v)} />
          <YesNo label="¿Puede recibir estudiantes en alternancia (nivel 3) durante el semestre?" value={form.can_receive_alternance} onChange={(v) => update('can_receive_alternance', v)} />

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">N° estudiantes alternancia (nivel 3)</span>
            <input value={quotaStr} onChange={(e) => setQuotaStr(e.target.value.replace(/[^0-9]/g, ''))} disabled={!form.can_receive_alternance} className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
          </label>

          <div className="col-span-full mt-2 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm">Cancelar</button>
            <button type="submit" disabled={saving} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}



// Selection-only list of possible counterparts per subject (no create/edit here)
function PosiblesContrapartesSeleccion({ subjectId }: { subjectId: number }) {
  type ProspectDisplay = { id: string; company_name: string; sector?: string; interest_collaborate?: boolean }
  const [prospects, setProspects] = useState<ProspectDisplay[]>([])
  const [dbForSubject, setDbForSubject] = useState<ProspectDisplay[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    async function loadLists() {
      // Unir DB + Local (evitando duplicados por nombre)
      try {
        // Local
        const raw = localStorage.getItem('vcm_posibles_contrapartes')
        const arr = raw ? JSON.parse(raw) : []
        const localList: ProspectDisplay[] = Array.isArray(arr)
          ? arr.map((p: any) => ({ id: String(p.id), company_name: String(p.company_name || ''), sector: p.sector || '', interest_collaborate: !!p.interest_collaborate }))
          : []

        // DB
        let dbReqs: CompanyRequirement[] = []
        try { dbReqs = await listCompanyRequirements() } catch {}
        // Consultamos empresas para resolver nombres
        let compsLocal: Company[] = []
        try { compsLocal = await listCompanies() } catch { compsLocal = [] }
        const byId = new Map(compsLocal.map((c) => [c.id, c]))
        const dbList: ProspectDisplay[] = (dbReqs || []).map((r) => ({
          id: `db:${r.id}`,
          company_name: byId.get(r.company)?.name || `Empresa #${r.company}`,
          sector: r.sector || '',
          interest_collaborate: !!r.interest_collaborate,
        }))

        // Guardar también los de esta asignatura para mostrarlos como seleccionados
        const dbChosen: ProspectDisplay[] = (dbReqs || [])
          .filter((r) => Number(r.subject) === Number(subjectId))
          .map((r) => ({
            id: `db:${r.id}`,
            company_name: byId.get(r.company)?.name || `Empresa #${r.company}`,
            sector: r.sector || '',
            interest_collaborate: !!r.interest_collaborate,
          }))
        setDbForSubject(dbChosen)

        const merged: ProspectDisplay[] = [...dbList]
        for (const p of localList) {
          const key = (p.company_name || '').trim().toLowerCase()
          if (!merged.some((d) => (d.company_name || '').trim().toLowerCase() === key)) merged.push(p)
        }
        setProspects(merged)
      } catch {
        setProspects([])
      }

      // Seleccionados persistidos (solo ids locales)
      try {
        const rawSel = localStorage.getItem('vcm_subject_prospects')
        const map = rawSel ? JSON.parse(rawSel) : {}
        const curr = map && typeof map === 'object' ? (map[String(subjectId)] || []) : []
        setSelected(Array.isArray(curr) ? curr.map(String) : [])
      } catch { setSelected([]) }
    }
    loadLists()
  }, [subjectId])

  function toggle(id: string) {
    setSelected((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]))
  }

  function save() {
    try {
      const rawSel = localStorage.getItem('vcm_subject_prospects')
      const map = rawSel ? JSON.parse(rawSel) : {}
      const obj = map && typeof map === 'object' ? map : {}
      obj[String(subjectId)] = selected
      localStorage.setItem('vcm_subject_prospects', JSON.stringify(obj))
      setOpen(false)
    } catch {
      // silently fail; keep modal open if needed
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Posibles contrapartes</h2>
        <button onClick={() => setOpen(true)} className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">Seleccionar posibles contrapartes</button>
      </div>
      {(() => {
        // Unir seleccionadas locales + las que están en base para esta asignatura
        const localChosen = prospects.filter((p) => selected.includes(p.id))
        const mergedChosen: ProspectDisplay[] = [...dbForSubject]
        for (const p of localChosen) {
          const key = (p.company_name || '').trim().toLowerCase()
          if (!mergedChosen.some((d) => (d.company_name || '').trim().toLowerCase() === key)) mergedChosen.push(p)
        }
        return mergedChosen.length ? (
          <div className="flex flex-wrap gap-2">
            {mergedChosen.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-700"
                title={p.company_name}
              >
                {p.company_name}
                {p.id.startsWith('db:') ? (
                  <span className="ml-1 rounded bg-white/70 px-1 text-[10px] text-zinc-600">en base</span>
                ) : null}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-sm text-zinc-600">Sin contrapartes seleccionadas.</div>
        )
      })()}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white shadow-lg ring-1 ring-black/5 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-3">
              <h3 className="text-sm font-semibold text-zinc-900">Seleccionar posibles contrapartes</h3>
              {/* Cerrar superior eliminado: usamos botones inferiores */}
            </div>
            <div className="p-4">
              {prospects.length === 0 ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-zinc-600">No hay posibles contrapartes. Cree algunas en "Posible contraparte".</div>
                  <Link to="/vcm/posible-contraparte" className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50">Ir a Posible contraparte</Link>
                </div>
              ) : (
                <ul className="max-h-80 overflow-y-auto rounded-md border border-zinc-200">
                  {prospects.map((p) => (
                    <li key={p.id} className="flex items-center justify-between border-b border-zinc-100 px-3 py-2 last:border-b-0">
                      <div>
                        <div className="text-sm text-zinc-900">{p.company_name}</div>
                        <div className="text-xs text-zinc-600">{p.sector || '—'}</div>
                      </div>
                      <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-600" />
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex items-center justify-end gap-2">
                <button onClick={() => setOpen(false)} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm">Cancelar</button>
                <button onClick={save} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}



