import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { toast } from '../../lib/toast'
import { listCompanies, type Company } from '../../api/companies'
import { 
  createCompanyRequirement, 
  listCompanyRequirements, 
  type CompanyRequirement, 
  updateCompanyRequirement, 
  deleteCompanyRequirement,
  getSubject,
  type Subject
} from '../../api/subjects'

type Row = CompanyRequirement & {
  company_name?: string
}

export default function PosibleContraparteDetalle() {
  const { subjectId } = useParams<{ subjectId: string }>()
  const navigate = useNavigate()
  const [subject, setSubject] = useState<Subject | null>(null)
  const [items, setItems] = useState<Row[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [editing, setEditing] = useState<Row | null>(null)

  async function load() {
    if (!subjectId) return
    setLoading(true)
    try {
      const [subjectData, requirements, companiesData] = await Promise.all([
        getSubject(Number(subjectId)),
        listCompanyRequirements(),
        listCompanies()
      ])
      
      const filtered = requirements.filter(r => r.subject === Number(subjectId))
      const enriched = filtered.map(req => ({
        ...req,
        company_name: companiesData.find(c => c.id === req.company)?.name || 'Empresa desconocida'
      }))
      
      setSubject(subjectData)
      setItems(enriched)
      setCompanies(companiesData)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar datos'
      toast.error(msg)
      navigate('/doc/posible-contraparte')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [subjectId])

  function openNew() {
    setEditing({
      id: 0,
      company: 0,
      sector: '',
      worked_before: false,
      interest_collaborate: false,
      can_develop_activities: false,
      willing_design_project: false,
      interaction_type: [],
      has_guide: false,
      can_receive_alternance: false,
      alternance_students_quota: null,
      subject: Number(subjectId)
    })
  }

  function openEdit(r: Row) {
    setEditing(r)
  }

  async function onDelete(r: Row) {
    if (!confirm(`¿Eliminar contraparte "${r.company_name}"?`)) return
    try {
      await deleteCompanyRequirement(r.id)
      toast.success('Contraparte eliminada')
      await load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al eliminar'
      toast.error(msg)
    }
  }

  function toggleExpand(id: number) {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <section className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <button 
            onClick={() => navigate('/doc/posible-contraparte')}
            className="mb-2 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
          >
            Volver
          </button>
          <h1 className="text-xl font-semibold">
            {subject ? `${subject.code}-${subject.section} - ${subject.name}` : 'Cargando...'}
          </h1>
          <p className="text-sm text-zinc-600">Contrapartes asociadas a esta asignatura</p>
        </div>
        <button
          onClick={openNew}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
        >
          Nueva Contraparte
        </button>
      </div>

      {loading ? (
        <p className="p-4 text-sm text-zinc-600">Cargando...</p>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
          <p className="text-sm text-zinc-600">No hay contrapartes asociadas a esta asignatura</p>
          <button
            onClick={openNew}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Agregar primera contraparte
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
              {/* Header */}
              <div 
                onClick={() => toggleExpand(item.id)}
                className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-zinc-50 transition"
              >
                <div className="flex-1">
                  <h3 className="font-medium text-zinc-900">{item.company_name}</h3>
                  <p className="text-sm text-zinc-600">Sector: {item.sector || 'No especificado'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openEdit(item)
                    }}
                    className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50"
                  >
                    Editar
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(item)
                    }}
                    className="rounded-md border border-red-300 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    Eliminar
                  </button>
                  <span className="ml-2 text-lg text-zinc-500">
                    {expandedId === item.id ? '▾' : '▸'}
                  </span>
                </div>
              </div>

              {/* Detalles expandibles */}
              {expandedId === item.id && (
                <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-3">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InfoItem label="Trabajado antes" value={item.worked_before ? 'Sí' : 'No'} />
                    <InfoItem label="Interés en colaborar" value={item.interest_collaborate ? 'Sí' : 'No'} />
                    <InfoItem label="Puede desarrollar actividades" value={item.can_develop_activities ? 'Sí' : 'No'} />
                    <InfoItem label="Dispuesto a diseñar proyecto" value={item.willing_design_project ? 'Sí' : 'No'} />
                    <InfoItem label="Tiene guía" value={item.has_guide ? 'Sí' : 'No'} />
                    <InfoItem label="Puede recibir alternancia" value={item.can_receive_alternance ? 'Sí' : 'No'} />
                    {item.can_receive_alternance && item.alternance_students_quota !== null && (
                      <InfoItem label="Cupos alternancia" value={String(item.alternance_students_quota)} />
                    )}
                    {item.interaction_type && item.interaction_type.length > 0 && (
                      <InfoItem 
                        label="Tipos de interacción" 
                        value={item.interaction_type.map(t => {
                          if (t === 'onsite_company') return 'Presencial empresa'
                          if (t === 'onsite_inacap') return 'Presencial INACAP'
                          if (t === 'virtual') return 'Virtual'
                          return t
                        }).join(' - ')} 
                        className="sm:col-span-2" 
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditDialog
          item={editing}
          companies={companies}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
    </section>
  )
}

function InfoItem({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1 text-sm text-zinc-900">{value}</dd>
    </div>
  )
}

function EditDialog({ 
  item, 
  companies, 
  onClose, 
  onSaved 
}: { 
  item: Row
  companies: Company[]
  onClose: () => void
  onSaved: () => void
}) {
  const [companyId, setCompanyId] = useState(item.company || 0)
  const [sector, setSector] = useState(item.sector || '')
  const [workedBefore, setWorkedBefore] = useState(!!item.worked_before)
  const [interestCollaborate, setInterestCollaborate] = useState(!!item.interest_collaborate)
  const [canDevelop, setCanDevelop] = useState(!!item.can_develop_activities)
  const [willingDesign, setWillingDesign] = useState(!!item.willing_design_project)
  const [interactionTypes, setInteractionTypes] = useState<string[]>(item.interaction_type || [])
  const [hasGuide, setHasGuide] = useState(!!item.has_guide)
  const [canAlternance, setCanAlternance] = useState(!!item.can_receive_alternance)
  const [quota, setQuota] = useState<string>(item.alternance_students_quota !== null && item.alternance_students_quota !== undefined ? String(item.alternance_students_quota) : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setError(null)
    if (!companyId) {
      setError('Selecciona una empresa')
      return
    }
    
    setLoading(true)
    try {
      const payload = {
        company: companyId,
        sector,
        worked_before: workedBefore,
        interest_collaborate: interestCollaborate,
        can_develop_activities: canDevelop,
        willing_design_project: willingDesign,
        interaction_type: interactionTypes,
        has_guide: hasGuide,
        can_receive_alternance: canAlternance,
        alternance_students_quota: quota === '' ? null : Number(quota),
        subject: item.subject
      }
      
      if (item.id) {
        await updateCompanyRequirement(item.id, payload)
        toast.success('Contraparte actualizada')
      } else {
        await createCompanyRequirement(payload)
        toast.success('Contraparte creada')
      }
      
      onSaved()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function toggleInteraction(code: string) {
    setInteractionTypes(prev => 
      prev.includes(code) ? prev.filter(x => x !== code) : [...prev, code]
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-xl bg-white shadow-lg ring-1 ring-black/5 max-h-[calc(100vh-4rem)] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-3">
          <h2 className="text-sm font-semibold text-zinc-900">{item.id ? 'Editar contraparte' : 'Nueva contraparte'}</h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">Empresa *</span>
            <select value={companyId} onChange={(e) => setCompanyId(Number(e.target.value))} className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10">
              <option value={0}>Selecciona empresa</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">Sector</span>
            <input 
              value={sector} 
              onChange={(e) => setSector(e.target.value)} 
              className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" 
            />
          </label>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={workedBefore} onChange={(e) => setWorkedBefore(e.target.checked)} className="rounded" />
              <span>Trabajado antes</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={interestCollaborate} onChange={(e) => setInterestCollaborate(e.target.checked)} className="rounded" />
              <span>Interés en colaborar</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={canDevelop} onChange={(e) => setCanDevelop(e.target.checked)} className="rounded" />
              <span>Puede desarrollar actividades</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={willingDesign} onChange={(e) => setWillingDesign(e.target.checked)} className="rounded" />
              <span>Dispuesto a diseñar proyecto</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hasGuide} onChange={(e) => setHasGuide(e.target.checked)} className="rounded" />
              <span>Tiene guía</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={canAlternance} onChange={(e) => setCanAlternance(e.target.checked)} className="rounded" />
              <span>Puede recibir alternancia</span>
            </label>
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-zinc-800">Tipos de interacción</span>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={interactionTypes.includes('virtual')} onChange={() => toggleInteraction('virtual')} className="rounded" />
              <span>Virtual</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={interactionTypes.includes('onsite_inacap')} onChange={() => toggleInteraction('onsite_inacap')} className="rounded" />
              <span>Presencial INACAP</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={interactionTypes.includes('onsite_company')} onChange={() => toggleInteraction('onsite_company')} className="rounded" />
              <span>Presencial empresa</span>
            </label>
          </div>

          {canAlternance && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-800">Cupos alternancia (nivel 3)</span>
              <input 
                type="number" 
                value={quota} 
                onChange={(e) => setQuota(e.target.value)} 
                className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" 
              />
            </label>
          )}
        </div>
        <div className="px-6 py-3 border-t flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50">Cancelar</button>
          <button onClick={handleSave} disabled={loading} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">{loading ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}
