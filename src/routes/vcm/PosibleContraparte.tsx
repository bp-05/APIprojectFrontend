import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { listCompanies, type Company } from '../../api/companies'

type Prospect = {
  id: string
  company_name: string
  sector: string
  interest_collaborate: boolean
  responsible_name?: string
  // Campos opcionales que pueden venir desde otras vistas
  worked_before?: boolean
  can_develop_activities?: boolean
  willing_design_project?: boolean
  interaction_type?: string
  has_guide?: boolean
  can_receive_alternance?: boolean
  alternance_students_quota?: number | null
}

function getProspects(): Prospect[] {
  try {
    const raw = localStorage.getItem('vcm_posibles_contrapartes')
    const arr = raw ? JSON.parse(raw) : []
    if (!Array.isArray(arr)) return []
    return arr.map((p: any) => ({
      id: String(p.id ?? crypto.randomUUID()),
      company_name: String(p.company_name ?? ''),
      sector: String(p.sector ?? ''),
      interest_collaborate: !!p.interest_collaborate,
      responsible_name: typeof p.responsible_name === 'string' ? p.responsible_name : undefined,
      worked_before: !!p.worked_before,
      can_develop_activities: !!p.can_develop_activities,
      willing_design_project: !!p.willing_design_project,
      interaction_type: typeof p.interaction_type === 'string' ? p.interaction_type : '',
      has_guide: !!p.has_guide,
      can_receive_alternance: !!p.can_receive_alternance,
      alternance_students_quota:
        typeof p.alternance_students_quota === 'number' || p.alternance_students_quota === null
          ? p.alternance_students_quota
          : null,
    }))
  } catch {
    return []
  }
}

export default function PosibleContraparte() {
  const [items, setItems] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [viewing, setViewing] = useState<Prospect | null>(null)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [assignName, setAssignName] = useState('')

  const [companies, setCompanies] = useState<Company[]>([])

  // Form edición/creación
  const [editing, setEditing] = useState<Prospect | null>(null)
  const [editName, setEditName] = useState('')
  const [editSector, setEditSector] = useState('')
  const [editInterest, setEditInterest] = useState(false)
  const [editWorkedBefore, setEditWorkedBefore] = useState(false)
  const [editCanDevelopActivities, setEditCanDevelopActivities] = useState(false)
  const [editWillingDesignProject, setEditWillingDesignProject] = useState(false)
  const [editInteractionType, setEditInteractionType] = useState('')
  const [editHasGuide, setEditHasGuide] = useState(false)
  const [editCanReceiveAlternance, setEditCanReceiveAlternance] = useState(false)
  const [editQuotaStr, setEditQuotaStr] = useState('')

  useEffect(() => {
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        setItems(getProspects())
        const comps = await listCompanies()
        setCompanies(comps)
      } catch (e) {
        // no es crítico para listar
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  function openAssign(p: Prospect) {
    setAssigningId(p.id)
    const candidate = companies.find(
      (c) => c.name.trim().toLowerCase() === p.company_name.trim().toLowerCase(),
    )
    setAssignName(candidate?.spys_responsible_name?.trim() || '')
  }

  function saveAssign() {
    const name = assignName.trim()
    try {
      const arr = getProspects()
      const idx = arr.findIndex((x) => x.id === assigningId)
      if (idx >= 0) {
        arr[idx] = { ...arr[idx], responsible_name: name }
        localStorage.setItem('vcm_posibles_contrapartes', JSON.stringify(arr))
        setItems(arr)
        toast.success('Responsable asignado')
      }
    } finally {
      setAssigningId(null)
      setAssignName('')
    }
  }

  function openEdit(p: Prospect) {
    setEditing(p)
    setEditName(p.company_name || '')
    setEditSector(p.sector || '')
    setEditInterest(!!p.interest_collaborate)
    setEditWorkedBefore(!!p.worked_before)
    setEditCanDevelopActivities(!!p.can_develop_activities)
    setEditWillingDesignProject(!!p.willing_design_project)
    setEditInteractionType(p.interaction_type || '')
    setEditHasGuide(!!p.has_guide)
    setEditCanReceiveAlternance(!!p.can_receive_alternance)
    setEditQuotaStr(
      typeof p.alternance_students_quota === 'number' ? String(p.alternance_students_quota) : ''
    )
  }

  function openCreate() {
    const p: Prospect = {
      id: crypto.randomUUID(),
      company_name: '',
      sector: '',
      interest_collaborate: false,
    }
    setEditing(p)
    setEditName('')
    setEditSector('')
    setEditInterest(false)
    setEditWorkedBefore(false)
    setEditCanDevelopActivities(false)
    setEditWillingDesignProject(false)
    setEditInteractionType('')
    setEditHasGuide(false)
    setEditCanReceiveAlternance(false)
    setEditQuotaStr('')
  }

  function handleEditNameChange(v: string) {
    setEditName(v)
    const name = v.trim().toLowerCase()
    const c = companies.find((x) => x.name.trim().toLowerCase() === name)
    if (c) setEditSector(String(c.sector || ''))
    const existing = getProspects().find(
      (p) => (p.company_name || '').trim().toLowerCase() === name,
    )
    if (existing) {
      setEditInterest(!!existing.interest_collaborate)
      setEditWorkedBefore(!!existing.worked_before)
      setEditCanDevelopActivities(!!existing.can_develop_activities)
      setEditWillingDesignProject(!!existing.willing_design_project)
      setEditInteractionType(existing.interaction_type || '')
      setEditHasGuide(!!existing.has_guide)
      setEditCanReceiveAlternance(!!existing.can_receive_alternance)
      setEditQuotaStr(
        typeof existing.alternance_students_quota === 'number'
          ? String(existing.alternance_students_quota)
          : ''
      )
    }
  }

  function saveEdit() {
    const name = editName.trim()
    const sector = editSector.trim()
    if (!name) {
      alert('Ingrese el nombre de la contraparte')
      return
    }
    const arr = getProspects()
    const idx = editing ? arr.findIndex((x) => x.id === editing.id) : -1

    const candidate = companies.find(
      (c) => c.name.trim().toLowerCase() === name.toLowerCase(),
    )
    const resp = candidate?.spys_responsible_name?.trim() || ''

    const record: Prospect = {
      id: editing?.id || crypto.randomUUID(),
      company_name: name,
      sector,
      responsible_name: resp || editing?.responsible_name,
      interest_collaborate: !!editInterest,
      worked_before: !!editWorkedBefore,
      can_develop_activities: !!editCanDevelopActivities,
      willing_design_project: !!editWillingDesignProject,
      interaction_type: editInteractionType,
      has_guide: !!editHasGuide,
      can_receive_alternance: !!editCanReceiveAlternance,
      alternance_students_quota:
        editCanReceiveAlternance && editQuotaStr !== ''
          ? Math.max(0, parseInt(editQuotaStr || '0', 10) || 0)
          : null,
    }

    if (idx >= 0) {
      arr[idx] = { ...arr[idx], ...record }
      toast.success('Contraparte actualizada')
    } else {
      arr.push(record)
      toast.success('Contraparte creada')
    }
    localStorage.setItem('vcm_posibles_contrapartes', JSON.stringify(arr))
    setItems(arr)
    setEditing(null)
  }

  function onDelete(p: Prospect) {
    if (!confirm(`¿Eliminar "${p.company_name}" de posibles contrapartes?`)) return
    const arr = getProspects().filter((x) => x.id !== p.id)
    localStorage.setItem('vcm_posibles_contrapartes', JSON.stringify(arr))
    setItems(arr)
    toast.success('Contraparte eliminada')
  }

  return (
    <section className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Posible contraparte</h1>
        <button
          onClick={openCreate}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
        >
          Nueva contraparte
        </button>
      </div>

      {error ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <Th className="uppercase tracking-wide">Empresa</Th>
              <Th className="uppercase tracking-wide">Sector</Th>
              <Th className="uppercase tracking-wide">Interés</Th>
              <Th className="uppercase tracking-wide">Responsable</Th>
              <Th className="text-right uppercase tracking-wide">Acciones</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {loading ? (
              <tr><td className="p-4 text-sm text-zinc-600" colSpan={5}>Cargando…</td></tr>
            ) : items.length === 0 ? (
              <tr><td className="p-4 text-sm text-zinc-600" colSpan={5}>Sin registros</td></tr>
            ) : (
              items.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50">
                  <Td>{r.company_name || '—'}</Td>
                  <Td>{r.sector || '—'}</Td>
                  <Td><YesNoPill value={!!r.interest_collaborate} /></Td>
                  <Td>
                    {r.responsible_name && r.responsible_name.trim() ? (
                      r.responsible_name
                    ) : (
                      <button
                        onClick={() => openAssign(r)}
                        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50"
                      >
                        Asignar
                      </button>
                    )}
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                      <button
                        onClick={() => setViewing(r)}
                        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50 shadow-sm"
                      >
                        Ver
                      </button>
                      <button
                        onClick={() => openEdit(r)}
                        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50 shadow-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => onDelete(r)}
                        className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 shadow-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {assigningId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/5 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-3">
              <h2 className="text-sm font-semibold text-zinc-900">Asignar responsable</h2>
              <button onClick={() => { setAssigningId(null); setAssignName('') }} className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100">Cerrar</button>
            </div>
            <div className="px-6 py-4">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-800">Nombre (desde Responsable SPyS en Empresas)</span>
                <input
                  value={assignName}
                  disabled
                  className="block w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-700"
                  placeholder="No encontrado en Empresas"
                />
                {!assignName && (
                  <span className="mt-1 block text-xs text-zinc-600">No se encontró Responsable SPyS para esta empresa. Revise el nombre en Empresas.</span>
                )}
              </label>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button onClick={() => { setAssigningId(null); setAssignName('') }} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm">Cancelar</button>
                <button onClick={saveAssign} disabled={!assignName.trim()} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/5 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-3">
              <h2 className="text-sm font-semibold text-zinc-900">Detalle de contraparte</h2>
              <button onClick={() => setViewing(null)} className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100">Cerrar</button>
            </div>
            <div className="px-6 py-4">
              <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                <Item label="Empresa">{viewing.company_name || '—'}</Item>
                <Item label="Sector">{viewing.sector || '—'}</Item>
                <Item label="Interés de colaborar"><YesNoPill value={!!viewing.interest_collaborate} /></Item>
                <Item label="Trabajó anteriormente"><YesNoPill value={!!viewing.worked_before} /></Item>
                <Item label="Puede desarrollar actividades"><YesNoPill value={!!viewing.can_develop_activities} /></Item>
                <Item label="Tiene proyecto para diseño"><YesNoPill value={!!viewing.willing_design_project} /></Item>
                <Item label="Tipo de interacción">{viewing.interaction_type || '—'}</Item>
                <Item label="Cuenta con Maestro Guía"><YesNoPill value={!!viewing.has_guide} /></Item>
                <Item label="Puede recibir alternancia"><YesNoPill value={!!viewing.can_receive_alternance} /></Item>
                <Item label="Cupos alternancia (nivel 3)">{
                  viewing.can_receive_alternance ? (viewing.alternance_students_quota ?? '—') : '—'
                }</Item>
              </dl>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/5 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-3">
              <h2 className="text-sm font-semibold text-zinc-900">Editar contraparte</h2>
              <button onClick={() => setEditing(null)} className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100">Cerrar</button>
            </div>
            <div className="px-6 py-4">
              <label className="mb-3 block text-sm">
                <span className="mb-1 block font-medium text-zinc-800">Empresa</span>
                <input list="companies-list" value={editName} onChange={(e) => handleEditNameChange(e.target.value)} className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
                <datalist id="companies-list">
                  {companies.map((c) => (
                    <option key={c.id} value={String(c.name)} />
                  ))}
                </datalist>
              </label>

              <label className="mb-3 block text-sm">
                <span className="mb-1 block font-medium text-zinc-800">¿A qué tipo de sector productivo o de servicios responde la contraparte?</span>
                <input value={editSector} onChange={(e) => setEditSector(e.target.value)} className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
              </label>

              <YesNoChoice label="¿La sede ha trabajado anteriormente con esta contraparte?" value={editWorkedBefore} onChange={setEditWorkedBefore} />
              <YesNoChoice label="¿La contraparte tiene interés de participar con INACAP de manera colaborativa?" value={editInterest} onChange={setEditInterest} />
              <YesNoChoice label="¿Puede el estudiante desarrollar actividades asociadas a los aprendizajes esperados?" value={editCanDevelopActivities} onChange={setEditCanDevelopActivities} />
              <YesNoChoice label="¿La contraparte estaría dispuesta a diseñar con un docente de INACAP un PROYECTO atingente a los aprendizajes?" value={editWillingDesignProject} onChange={setEditWillingDesignProject} />

              <label className="mb-3 block text-sm">
                <span className="mb-1 block font-medium text-zinc-800">¿Qué tipo de interacción puede tener el estudiante con la contraparte?</span>
                <select value={editInteractionType} onChange={(e) => setEditInteractionType(e.target.value)} className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10">
                  <option value="">Seleccionar</option>
                  <option value="Virtual">Virtual</option>
                  <option value="Presencial en la empresa">Presencial en la empresa</option>
                  <option value="Presencial en INACAP">Presencial en INACAP</option>
                </select>
              </label>

              <YesNoChoice label="Si la contraparte recibe estudiantes en alternancia (Tipo 3), ¿cuenta con un Maestro Guía?" value={editHasGuide} onChange={setEditHasGuide} />
              <YesNoChoice label="¿La contraparte puede recibir a estudiantes en alternancia (nivel 3) durante el semestre?" value={editCanReceiveAlternance} onChange={(v) => { setEditCanReceiveAlternance(v); if (!v) setEditQuotaStr('') }} />

              <label className="mb-1 block text-sm">
                <span className="mb-1 block font-medium text-zinc-800">¿Cuál es el N° de estudiantes que puede recibir en alternancia (nivel 3) por 12 horas o más durante el semestre?</span>
                <input value={editQuotaStr} onChange={(e) => setEditQuotaStr(e.target.value.replace(/[^0-9]/g, ''))} disabled={!editCanReceiveAlternance} className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50 focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
              </label>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button onClick={() => setEditing(null)} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm">Cancelar</button>
                <button onClick={saveEdit} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2 text-left text-xs font-semibold text-zinc-600 ${className}`}>{children}</th>
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2 text-sm text-zinc-800 ${className}`}>{children}</td>
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="text-sm">
      <dt className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="text-zinc-900">{children}</dd>
    </div>
  )
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

function YesNoChoice({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const nameRef = useRef(`yn-${Math.random().toString(36).slice(2)}`)
  const name = nameRef.current
  return (
    <div className="mb-2 text-sm">
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
