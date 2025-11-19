import React, { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { listCompanies, listProblemStatements, type Company, type ProblemStatement } from '../../api/companies'
import { listSubjectCodeSections, type BasicSubject, createCompanyRequirement, listCompanyRequirements, type CompanyRequirement, updateCompanyRequirement } from '../../api/subjects'
import http from '../../lib/http'

// Persistencia local como respaldo
const LS_KEY = 'vcm_posibles_contrapartes'

type Prospect = {
  id: string
  company_name: string
  sector: string
  interest_collaborate: boolean
  responsible_name?: string
  responsible_email?: string
  responsible_phone?: string
  responsible_rut?: string
  responsible_area?: string
  responsible_role?: string
  worked_before?: boolean
  can_develop_activities?: boolean
  willing_design_project?: boolean
  interaction_types?: string[]
  interaction_type?: string
  has_guide?: boolean
  can_receive_alternance?: boolean
  alternance_students_quota?: number | null
  // metadatos
  subject_hint?: number
  source?: 'local' | 'db'
  requirement_id?: number
}

type SubjectProspects = Record<number, string[]>

const SUBJECT_ASSIGN_KEY = 'vcm_subject_prospects'

function loadProspects(): Prospect[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    const arr = raw ? JSON.parse(raw) : []
    if (!Array.isArray(arr)) return []
    return arr.map((p: any) => ({
      id: String(p.id ?? crypto.randomUUID()),
      company_name: String(p.company_name ?? ''),
      sector: String(p.sector ?? ''),
      interest_collaborate: !!p.interest_collaborate,
      responsible_name: typeof p.responsible_name === 'string' ? p.responsible_name : undefined,
      responsible_email: typeof p.responsible_email === 'string' ? p.responsible_email : undefined,
      responsible_phone: typeof p.responsible_phone === 'string' ? p.responsible_phone : undefined,
      responsible_rut: typeof p.responsible_rut === 'string' ? p.responsible_rut : undefined,
      responsible_area: typeof p.responsible_area === 'string' ? p.responsible_area : undefined,
      responsible_role: typeof p.responsible_role === 'string' ? p.responsible_role : undefined,
      worked_before: !!p.worked_before,
      can_develop_activities: !!p.can_develop_activities,
      willing_design_project: !!p.willing_design_project,
      interaction_types: Array.isArray(p.interaction_types)
        ? (p.interaction_types as any[]).map((x) => String(x)).filter(Boolean)
        : (typeof p.interaction_type === 'string' && p.interaction_type
            ? [String(p.interaction_type)]
            : []),
      interaction_type: typeof p.interaction_type === 'string' ? p.interaction_type : '',
      has_guide: !!p.has_guide,
      can_receive_alternance: !!p.can_receive_alternance,
      alternance_students_quota: typeof p.alternance_students_quota === 'number' || p.alternance_students_quota === null ? p.alternance_students_quota : null,
      subject_hint: typeof p.subject_hint === 'number' ? p.subject_hint : undefined,
      source: 'local',
    }))
  } catch {
    return []
  }
}

function saveProspects(items: Prospect[]) {
  const onlyLocal = items.filter((i) => i.source !== 'db')
  localStorage.setItem(LS_KEY, JSON.stringify(onlyLocal))
}

function loadSubjectProspects(): SubjectProspects {
  try {
    const raw = localStorage.getItem(SUBJECT_ASSIGN_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function persistSubjectProspects(map: SubjectProspects) {
  localStorage.setItem(SUBJECT_ASSIGN_KEY, JSON.stringify(map))
  window.dispatchEvent(new CustomEvent('vcm:prospects-updated'))
}

function subjectsForProspect(pid: string, map: SubjectProspects): number[] {
  const result: number[] = []
  for (const [key, ids] of Object.entries(map)) {
    if ((ids || []).includes(pid)) result.push(Number(key))
  }
  return result
}

function normalizeAssignments(
  prospectId: string,
  subjectIds: number[],
  current: SubjectProspects
): SubjectProspects {
  const next: SubjectProspects = {}
  for (const [key, ids] of Object.entries(current)) {
    const filtered = (ids || []).filter((id) => id !== prospectId)
    if (filtered.length) next[Number(key)] = filtered
  }

  subjectIds
    .filter((sid) => Number.isFinite(sid) && sid > 0)
    .forEach((sid) => {
      const key = Number(sid)
      next[key] = [...(next[key] || []), prospectId]
    })

  return next
}

export default function PosibleContraparte() {
  const [items, setItems] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recentlyUpdated, setRecentlyUpdated] = useState<Set<string>>(new Set())

  const [viewing, setViewing] = useState<Prospect | null>(null)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [assignName, setAssignName] = useState('')

  const [companies, setCompanies] = useState<Company[]>([])
  const [companyContacts, setCompanyContacts] = useState<Map<number, ContactInfo>>(new Map())
  const [subjects, setSubjects] = useState<BasicSubject[]>([])
  const [subjectProspectsMap, setSubjectProspectsMap] = useState<SubjectProspects>(() => loadSubjectProspects())

  // Form edición/creación
  const [editing, setEditing] = useState<Prospect | null>(null)
  const [editName, setEditName] = useState('')
  const [editSector, setEditSector] = useState('')
  const [editAssignedSubjects, setEditAssignedSubjects] = useState<number[]>([])
  const [editInterest, setEditInterest] = useState(false)
  const [editWorkedBefore, setEditWorkedBefore] = useState(false)
  const [editCanDevelopActivities, setEditCanDevelopActivities] = useState(false)
  const [editWillingDesignProject, setEditWillingDesignProject] = useState(false)
  const [editInteractionTypes, setEditInteractionTypes] = useState<string[]>([])
  const [editHasGuide, setEditHasGuide] = useState(false)
  const [editCanReceiveAlternance, setEditCanReceiveAlternance] = useState(false)
  const [editQuotaStr, setEditQuotaStr] = useState('')

  useEffect(() => {
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const [comps, subs, problems] = await Promise.all([
          listCompanies(),
          listSubjectCodeSections().catch(() => []),
          listProblemStatements().catch(() => []),
        ])
        setCompanies(comps)
        setSubjects(subs as BasicSubject[])
        const contactMap = buildContactsFromProblems(problems)
        setCompanyContacts(contactMap)

        // Cargar DB + Local y unir (evitando duplicados por nombre)
        let dbReqs: CompanyRequirement[] = []
        try { dbReqs = await listCompanyRequirements() } catch {}
        const byId = new Map(comps.map((c) => [c.id, c]))
        const dbRows: Prospect[] = (dbReqs || []).map((r) => {
          const company = byId.get(r.company)
          const contact = getPrimaryContact(company, contactMap.get(r.company) || null)
          return {
            id: `db:${r.id}`,
            company_name: company?.name || `Empresa #${r.company}`,
            sector: r.sector || '',
            interest_collaborate: !!r.interest_collaborate,
            responsible_name: contact?.name?.trim() || '',
            responsible_email: contact?.email?.trim(),
            responsible_phone: contact?.phone?.trim(),
            responsible_rut: contact?.rut?.trim(),
            responsible_area: contact?.counterpart_area?.trim(),
            responsible_role: contact?.role?.trim(),
            worked_before: !!r.worked_before,
            can_develop_activities: !!r.can_develop_activities,
            willing_design_project: !!r.willing_design_project,
            interaction_types: Array.isArray((r as any).interaction_type)
              ? ((r as any).interaction_type as string[])
              : (typeof (r as any).interaction_type === 'string' && (r as any).interaction_type
                  ? [String((r as any).interaction_type)]
                  : []),
            interaction_type: Array.isArray((r as any).interaction_type)
              ? String(((r as any).interaction_type as string[])[0] || '')
              : String((r as any).interaction_type || ''),
            has_guide: !!r.has_guide,
            can_receive_alternance: !!r.can_receive_alternance,
            alternance_students_quota: typeof r.alternance_students_quota === 'number' ? r.alternance_students_quota : 0,
            subject_hint: typeof r.subject === 'number' ? r.subject : undefined,
            source: 'db',
            requirement_id: r.id,
          }
        })

        const locals = loadProspects()
        const localFiltered = locals.filter((p) => !dbRows.some((d) => (d.company_name || '').trim().toLowerCase() === (p.company_name || '').trim().toLowerCase()))
        setItems([...dbRows, ...localFiltered])
      } catch (e) {
        setError(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => { saveProspects(items) }, [items])

  useEffect(() => {
    const handler = () => setSubjectProspectsMap(loadSubjectProspects())
    window.addEventListener('vcm:prospects-updated', handler)
    return () => window.removeEventListener('vcm:prospects-updated', handler)
  }, [])

  const closeEditModal = () => {
    setEditing(null)
    setEditAssignedSubjects([])
  }

  function updateSubjectAssignments(prospectId: string, subjectIds: number[]) {
    setSubjectProspectsMap((prev) => {
      const next = normalizeAssignments(prospectId, subjectIds, prev)
      persistSubjectProspects(next)
      return next
    })
  }

  function findCompanyByName(name: string) {
    const normalized = name.trim().toLowerCase()
    return companies.find((c) => c.name.trim().toLowerCase() === normalized)
  }

type ContactInfo = {
  name?: string
  email?: string
  phone?: string
  rut?: string
  counterpart_area?: string
  role?: string
}

function cleanContactInfo(info?: ContactInfo | null): ContactInfo | null {
  if (!info) return null
  const normalized: ContactInfo = {
    name: info.name?.trim() || '',
    email: info.email?.trim() || '',
    phone: info.phone?.trim() || '',
    rut: info.rut?.trim() || '',
    counterpart_area: info.counterpart_area?.trim() || '',
    role: info.role?.trim() || '',
  }
  if (
    !normalized.name &&
    !normalized.email &&
    !normalized.phone &&
    !normalized.counterpart_area &&
    !normalized.role
  ) {
    return null
  }
  return normalized
}

function buildContactsFromProblems(problems: ProblemStatement[]): Map<number, ContactInfo> {
  const map = new Map<number, ContactInfo>()
  problems.forEach((p) => {
    const raw = p.counterpart_contacts?.[0]
    const normalized = cleanContactInfo({
      name: raw?.name,
      email: raw?.email,
      phone: raw?.phone,
      rut: raw?.rut,
      counterpart_area: raw?.counterpart_area,
      role: raw?.role,
    })
    if (normalized) {
      map.set(p.company, normalized)
    }
  })
  return map
}

function getPrimaryContact(company?: Company, fallback?: ContactInfo | null): ContactInfo | null {
  const contact = company?.counterpart_contacts?.find(
    (c) => c.name?.trim() || c.email?.trim() || c.phone?.trim(),
  )
  if (contact) {
    return cleanContactInfo({
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      rut: contact.rut,
      counterpart_area: contact.counterpart_area,
      role: contact.role,
    })
  }
  return cleanContactInfo(fallback || null)
}

  function openAssign(p: Prospect) {
    if (p.source === 'db') return // solo lectura para filas de BD
    setAssigningId(p.id)
    const candidate = findCompanyByName(p.company_name)
    const fallback = candidate ? companyContacts.get(candidate.id) || null : null
    const contact = getPrimaryContact(candidate, fallback)
    setAssignName(contact?.name?.trim() || '')
  }

  function saveAssign() {
    const name = assignName.trim()
    try {
      const arr = items.slice()
      const idx = arr.findIndex((x) => x.id === assigningId)
      if (idx >= 0) {
        arr[idx] = { ...arr[idx], responsible_name: name }
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
    const assigned = subjectsForProspect(p.id, subjectProspectsMap)
    if (assigned.length) {
      setEditAssignedSubjects(assigned)
    } else if (p.subject_hint) {
      setEditAssignedSubjects([p.subject_hint])
    } else {
      setEditAssignedSubjects([])
    }
    setEditWorkedBefore(!!p.worked_before)
    setEditCanDevelopActivities(!!p.can_develop_activities)
    setEditWillingDesignProject(!!p.willing_design_project)
    setEditInteractionTypes((p.interaction_types && p.interaction_types.length > 0)
      ? p.interaction_types.slice()
      : (p.interaction_type ? [p.interaction_type] : []))
    setEditHasGuide(!!p.has_guide)
    setEditCanReceiveAlternance(!!p.can_receive_alternance)
    setEditQuotaStr(typeof p.alternance_students_quota === 'number' ? String(p.alternance_students_quota) : '')
  }

  function openCreate() {
    const p: Prospect = {
      id: crypto.randomUUID(),
      company_name: '',
      sector: '',
      interest_collaborate: false,
      source: 'local',
    }
    setEditing(p)
    setEditName('')
    setEditSector('')
    setEditInterest(false)
    setEditAssignedSubjects([])
    setEditWorkedBefore(false)
    setEditCanDevelopActivities(false)
    setEditWillingDesignProject(false)
    setEditInteractionTypes([])
    setEditHasGuide(false)
    setEditCanReceiveAlternance(false)
    setEditQuotaStr('')
  }

  function handleEditNameChange(v: string) {
    setEditName(v)
    const name = v.trim().toLowerCase()
    const c = companies.find((x) => x.name.trim().toLowerCase() === name)
    if (c) setEditSector(String((c as any).sector || ''))
    const existing = loadProspects().find((p) => (p.company_name || '').trim().toLowerCase() === name)
    if (existing) {
      setEditInterest(!!existing.interest_collaborate)
      setEditWorkedBefore(!!existing.worked_before)
      setEditCanDevelopActivities(!!existing.can_develop_activities)
      setEditWillingDesignProject(!!existing.willing_design_project)
      setEditInteractionTypes((existing.interaction_types && existing.interaction_types.length > 0)
        ? existing.interaction_types.slice()
        : (existing.interaction_type ? [existing.interaction_type] : []))
      setEditHasGuide(!!existing.has_guide)
      setEditCanReceiveAlternance(!!existing.can_receive_alternance)
      setEditQuotaStr(typeof existing.alternance_students_quota === 'number' ? String(existing.alternance_students_quota) : '')
    }
  }

  async function saveEdit() {
    const name = editName.trim()
    const sector = editSector.trim()
    
    // Validaciones
    if (!name) { 
      toast.error('Ingresa el nombre de la Empresa')
      return 
    }
    if (!sector) { 
      toast.error('Ingresa el Sector')
      return 
    }
    
    // Validar campos de contacto
    const candidate = findCompanyByName(name)
    const fallback = candidate ? companyContacts.get(candidate.id) || null : null
    const contactInfo = getPrimaryContact(candidate, fallback)
    
    if (!contactInfo?.name?.trim()) {
      toast.error('No se encontró Responsable SPyS para esta empresa. Revisa el nombre en Empresas.')
      return
    }
    if (!contactInfo?.email?.trim()) {
      toast.error('El Responsable SPyS no tiene correo registrado en Empresas')
      return
    }
    if (!contactInfo?.phone?.trim()) {
      toast.error('El Responsable SPyS no tiene teléfono registrado en Empresas')
      return
    }
    if (!contactInfo?.counterpart_area?.trim()) {
      toast.error('El Responsable SPyS no tiene área registrada en Empresas')
      return
    }
    if (!contactInfo?.role?.trim()) {
      toast.error('El Responsable SPyS no tiene cargo registrado en Empresas')
      return
    }
    
    // Si es para guardar en BD, requiere asignatura
    if (!editing || editing.source !== 'db') {
      if (editAssignedSubjects.length === 0) {
        toast.error('Selecciona una Asignatura para guardar en la base de datos')
        return
      }
    }

    const arr = items.slice()
    const idx = editing ? arr.findIndex((x) => x.id === editing.id) : -1

    const record: Prospect = {
      id: editing?.id || crypto.randomUUID(),
      company_name: name,
      sector,
      responsible_name: contactInfo?.name?.trim() || editing?.responsible_name,
      responsible_email: contactInfo?.email?.trim() || editing?.responsible_email,
      responsible_phone: contactInfo?.phone?.trim() || editing?.responsible_phone,
      responsible_rut: contactInfo?.rut?.trim() || editing?.responsible_rut,
      responsible_area: contactInfo?.counterpart_area?.trim() || editing?.responsible_area,
      responsible_role: contactInfo?.role?.trim() || editing?.responsible_role,
        interest_collaborate: !!editInterest,
        worked_before: !!editWorkedBefore,
        can_develop_activities: !!editCanDevelopActivities,
        willing_design_project: !!editWillingDesignProject,
        interaction_types: editInteractionTypes.slice(),
        interaction_type: editInteractionTypes[0] || '',
        has_guide: !!editHasGuide,
        can_receive_alternance: !!editCanReceiveAlternance,
        alternance_students_quota: editCanReceiveAlternance && editQuotaStr !== '' ? Math.max(0, parseInt(editQuotaStr || '0', 10) || 0) : null,
        subject_hint: undefined,
        source: editing?.source || 'local',
        requirement_id: editing?.requirement_id,
      }

    // Si es fila de BD: actualizar en servidor
    if (editing?.source === 'db' && editing?.requirement_id) {
      try {
        const payload = {
          subject: editAssignedSubjects.length > 0 ? editAssignedSubjects[0] : null,
          sector: record.sector,
          worked_before: !!record.worked_before,
          interest_collaborate: !!record.interest_collaborate,
          can_develop_activities: !!record.can_develop_activities,
          willing_design_project: !!record.willing_design_project,
          interaction_type: record.interaction_types && record.interaction_types.length ? record.interaction_types : [],
          has_guide: !!record.has_guide,
          can_receive_alternance: !!record.can_receive_alternance,
          alternance_students_quota: record.can_receive_alternance ? Number(record.alternance_students_quota || 0) : 0,
        }
        const updated = await updateCompanyRequirement(editing.requirement_id, payload as any)
        const updatedRow: Prospect = {
          ...record,
          id: `db:${updated.id}`,
          source: 'db',
          requirement_id: updated.id,
        }
        if (idx >= 0) arr[idx] = { ...arr[idx], ...updatedRow }
        setItems(idx >= 0 ? arr.slice() : [updatedRow, ...arr])
        toast.success('Requerimiento actualizado')
          updateSubjectAssignments(updatedRow.id, editAssignedSubjects)

        // marcar como modificado durante unos segundos
        const key = `db:${updated.id}`
        setRecentlyUpdated((prev) => {
          const n = new Set(prev)
          n.add(key)
          return n
        })
        setTimeout(() => {
          setRecentlyUpdated((prev) => {
            const n = new Set(prev)
            n.delete(key)
            return n
          })
        }, 3500)
        } catch (e: any) {
          const msg = e?.response?.data ? JSON.stringify(e.response.data) : (e instanceof Error ? e.message : 'No se pudo actualizar en BD')
          toast.error(msg)
        } finally {
          closeEditModal()
        }
      return
    }

    // Si es fila local: actualizar lista local y, opcionalmente, crear en BD si hay asignatura
    if (idx >= 0) {
      arr[idx] = { ...arr[idx], ...record }
      toast.success('Contraparte actualizada')
      } else {
        arr.unshift(record)
        toast.success('Contraparte creada')
      }
      setItems(arr)
      updateSubjectAssignments(record.id, editAssignedSubjects)

      try {
        const company = companies.find((c) => c.name.trim().toLowerCase() === record.company_name.trim().toLowerCase())
        if (company) {
          const sec = (record.sector && record.sector.trim()) || String((company as any).sector || '')
          if (!sec) { toast.error('Sector requerido. Completa el campo "Sector".'); return }
          const payload = {
            subject: editAssignedSubjects.length > 0 ? editAssignedSubjects[0] : null,
            company: company.id,
            sector: sec,
            worked_before: !!record.worked_before,
            interest_collaborate: !!record.interest_collaborate,
            can_develop_activities: !!record.can_develop_activities,
            willing_design_project: !!record.willing_design_project,
            interaction_type: record.interaction_types && record.interaction_types.length ? record.interaction_types : [],
            has_guide: !!record.has_guide,
            can_receive_alternance: !!record.can_receive_alternance,
            alternance_students_quota: record.can_receive_alternance ? Number(record.alternance_students_quota || 0) : 0,
          }
          const created = await createCompanyRequirement(payload as any)
          const fallback = company ? companyContacts.get(company.id) || null : null
          const contact = getPrimaryContact(company, fallback)
          const dbRow: Prospect = {
            id: `db:${created.id}`,
            company_name: company.name,
            sector: created.sector || '',
            interest_collaborate: !!created.interest_collaborate,
            responsible_name: contact?.name?.trim() || '',
            responsible_email: contact?.email?.trim(),
            responsible_phone: contact?.phone?.trim(),
            responsible_rut: contact?.rut?.trim(),
            responsible_area: contact?.counterpart_area?.trim(),
            responsible_role: contact?.role?.trim(),
            worked_before: !!created.worked_before,
            can_develop_activities: !!created.can_develop_activities,
            willing_design_project: !!created.willing_design_project,
            interaction_types: Array.isArray((created as any).interaction_type)
              ? ((created as any).interaction_type as string[])
              : (typeof (created as any).interaction_type === 'string' && (created as any).interaction_type
                  ? [String((created as any).interaction_type)]
                  : []),
            interaction_type: Array.isArray((created as any).interaction_type)
              ? String(((created as any).interaction_type as string[])[0] || '')
              : String((created as any).interaction_type || ''),
            has_guide: !!created.has_guide,
            can_receive_alternance: !!created.can_receive_alternance,
            alternance_students_quota: typeof created.alternance_students_quota === 'number' ? created.alternance_students_quota : 0,
            subject_hint: created.subject ?? undefined,
            source: 'db',
            requirement_id: created.id,
          }
          setItems((prev) => [dbRow, ...prev.filter((p) => p.id !== record.id && (p.company_name || '').trim().toLowerCase() !== record.company_name.trim().toLowerCase())])
          updateSubjectAssignments(record.id, [])
          updateSubjectAssignments(dbRow.id, editAssignedSubjects)
          toast.success('Guardado en base de datos')
        } else {
          toast.error('Empresa no encontrada en BD. Crea la empresa primero en "Empresas".')
        }
      } catch (e: any) {
        const msg = e?.response?.data ? JSON.stringify(e.response.data) : (e instanceof Error ? e.message : 'No se pudo guardar en BD')
        toast.error(msg)
      } finally {
        closeEditModal()
      }
  }

  async function onDelete(p: Prospect) {
    if (!confirm(`¿Eliminar "${p.company_name}"?`)) return
    if (p.source === 'db') {
      const sure = confirm('Se eliminará el requerimiento en la base de datos. Esta acción no se puede deshacer. ¿Deseas continuar?')
      if (!sure) return
    }
    try {
        if (p.source === 'db' && p.requirement_id) {
          await http.delete(`/company-requirements/${p.requirement_id}/`)
        }
        const arr = items.filter((x) => x.id !== p.id)
        setItems(arr)
        updateSubjectAssignments(p.id, [])
        toast.success('Eliminado')
    } catch (e: any) {
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : (e instanceof Error ? e.message : 'No se pudo eliminar')
      toast.error(msg)
    }
  }

  const rows = useMemo(() => items, [items])

  return (
    <section className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Posible contraparte</h1>
        <button onClick={openCreate} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">Nueva contraparte</button>
      </div>

      {error ? (<div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>) : null}

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
            ) : rows.length === 0 ? (
              <tr><td className="p-4 text-sm text-zinc-600" colSpan={5}>Sin registros</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50">
                  <Td>{r.company_name || '—'}
                    {r.source === 'db' ? (
                      <>
                        {recentlyUpdated.has(r.id) ? (
                          <span className="ml-2 rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-[10px] text-green-700">modificado</span>
                        ) : null}
                      </>
                    ) : null}
                  </Td>
                  <Td>{r.sector || '—'}</Td>
                  <Td><YesNoPill value={!!r.interest_collaborate} /></Td>
                  <Td>
                    {r.responsible_name && r.responsible_name.trim() ? (
                      <div className="space-y-0.5">
                        <div className="font-medium text-zinc-900">{r.responsible_name}</div>
                        <div className="text-xs text-zinc-600">
                          {formatResponsibleLine(r.responsible_role, r.responsible_area) || '—'}
                        </div>
                        <div className="text-xs text-zinc-600">
                          {formatResponsibleLine(r.responsible_email, r.responsible_phone) || 'Sin datos de contacto'}
                        </div>
                      </div>
                    ) : (
                      r.source === 'db' ? '—' : (
                        <button onClick={() => openAssign(r)} className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50">Asignar</button>
                      )
                    )}
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                      <button onClick={() => setViewing(r)} className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50 shadow-sm">Ver</button>
                      <>
                          <button onClick={() => openEdit(r)} className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50 shadow-sm">Editar</button>
                          <button onClick={() => onDelete(r)} className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 shadow-sm">Eliminar</button>
                        </>
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
              {/* Cerrar en header eliminado para unificar formato */}
            </div>
            <div className="px-6 py-4">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-800">Nombre (desde Responsable SPyS en Empresas)</span>
                <input value={assignName} disabled className="block w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-700" placeholder="No encontrado en Empresas" />
                {!assignName && (<span className="mt-1 block text-xs text-zinc-600">No se encontró Responsable SPyS para esta empresa. Revise el nombre en Empresas.</span>)}
              </label>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button onClick={() => { setAssigningId(null); setAssignName('') }} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm">Cancelar</button>
                <button onClick={saveAssign} disabled={!assignName.trim()} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">Guardar</button>
              </div>
            </div>
            <div className="px-6 py-3 border-t flex justify-end">
              <button onClick={() => setViewing(null)} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/5 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-3">
              <h2 className="text-sm font-semibold text-zinc-900">Detalle de contraparte</h2>
              {/* Cerrar en header eliminado para unificar formato */}
            </div>
            <div className="px-6 py-4">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Item label="Empresa">{viewing.company_name || '—'}</Item>
                <Item label="Sector">{viewing.sector || '—'}</Item>
                <Item label="Interés de colaborar"><YesNoPill value={!!viewing.interest_collaborate} /></Item>
                <Item label="Trabajó anteriormente"><YesNoPill value={!!viewing.worked_before} /></Item>
                <Item label="Desarrollar actividades"><YesNoPill value={!!viewing.can_develop_activities} /></Item>
                <Item label="Tiene proyecto para diseño"><YesNoPill value={!!viewing.willing_design_project} /></Item>
                <Item label="Tipo de interacción">{labelInteractionTypes(viewing.interaction_types) || '—'}</Item>
                <Item label="Cuenta con Maestro Guía"><YesNoPill value={!!viewing.has_guide} /></Item>
                <Item label="Puede recibir alternancia"><YesNoPill value={!!viewing.can_receive_alternance} /></Item>
                <Item label="Cupos alternancia (nivel 3)">{viewing.can_receive_alternance ? (viewing.alternance_students_quota ?? '—') : '—'}</Item>
                <Item label="Responsable">{viewing.responsible_name || '—'}</Item>
                <Item label="Correo responsable">{viewing.responsible_email || '—'}</Item>
                <Item label="Teléfono responsable">{viewing.responsible_phone || '—'}</Item>
                <Item label="Área / cargo">{formatResponsibleLine(viewing.responsible_area, viewing.responsible_role) || '—'}</Item>
                <Item label="RUT responsable">{viewing.responsible_rut || '—'}</Item>
              </dl>
            </div>
            <div className="px-6 py-3 border-t flex justify-end">
              <button onClick={() => setViewing(null)} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/5 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-3">
              <h2 className="text-sm font-semibold text-zinc-900">{items.some(p => p.id === editing.id) ? 'Editar contraparte' : 'Nueva contraparte'}</h2>
              {/* Cerrar en header eliminado para unificar formato */}
            </div>
            <div className="px-6 py-4">
              <label className="mb-3 block text-sm">
                <span className="mb-1 block font-medium text-zinc-800">Empresa *</span>
                <select value={editName} onChange={(e) => handleEditNameChange(e.target.value)} disabled={editing?.source === 'db'} className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50 focus:border-red-600 focus:ring-4 focus:ring-red-600/10">
                  <option value="">Seleccionar</option>
                  {companies.map((c) => (
                    <option key={c.id} value={String(c.name)}>{c.name}</option>
                  ))}
                </select>
              </label>

              <label className="mb-3 block text-sm">
                <span className="mb-1 block font-medium text-zinc-800">¿A qué tipo de sector productivo o de servicios responde la contraparte? *</span>
                <input value={editSector} onChange={(e) => setEditSector(e.target.value)} className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
              </label>

              <YesNoChoice label="¿La sede ha trabajado anteriormente con esta contraparte?" value={editWorkedBefore} onChange={setEditWorkedBefore} />
              <YesNoChoice label="¿La contraparte tiene interés de participar con INACAP de manera colaborativa?" value={editInterest} onChange={setEditInterest} />
              <YesNoChoice label="¿Puede el estudiante desarrollar actividades asociadas a los aprendizajes esperados?" value={editCanDevelopActivities} onChange={setEditCanDevelopActivities} />
              <YesNoChoice label="¿La contraparte estaría dispuesta a diseñar con un docente de INACAP un PROYECTO atingente a los aprendizajes?" value={editWillingDesignProject} onChange={setEditWillingDesignProject} />

              <div className="mb-3 text-sm">
                <span className="mb-1 block font-medium text-zinc-800">¿Qué tipo de interacción puede tener el estudiante con la contraparte?</span>
                <div className="flex items-center gap-6">
                  {[
                    { key: 'virtual', label: 'Virtual' },
                    { key: 'onsite_company', label: 'Presencial en la empresa' },
                    { key: 'onsite_inacap', label: 'Presencial en INACAP' },
                  ].map((opt) => (
                    <label key={opt.key} className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 border-zinc-300 text-red-600 focus:ring-red-600"
                        checked={editInteractionTypes.includes(opt.key)}
                        onChange={(e) => {
                          setEditInteractionTypes((prev) => {
                            if (e.target.checked) return [...prev, opt.key]
                            return prev.filter((v) => v !== opt.key)
                          })
                        }}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <YesNoChoice label="Si la contraparte recibe estudiantes en alternancia (Tipo 3), ¿cuenta con un Maestro Guía?" value={editHasGuide} onChange={setEditHasGuide} />
              <YesNoChoice label="¿La contraparte puede recibir a estudiantes en alternancia (nivel 3) durante el semestre?" value={editCanReceiveAlternance} onChange={(v) => { setEditCanReceiveAlternance(v); if (!v) setEditQuotaStr('') }} />

              <label className="mb-1 block text-sm">
                <span className="mb-1 block font-medium text-zinc-800">¿Cuál es el N° de estudiantes que puede recibir en alternancia (nivel 3) por 12 horas o más durante el semestre?</span>
                <input value={editQuotaStr} onChange={(e) => setEditQuotaStr(e.target.value.replace(/[^0-9]/g, ''))} disabled={!editCanReceiveAlternance} className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50 focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
              </label>

              <div className="mb-4 text-sm">
                <span className="mb-2 block font-medium text-zinc-800">Asignatura vinculada *</span>
                <div className="max-h-48 overflow-y-auto rounded border border-zinc-200 p-3">
                  {subjects.map((s) => {
                    const checked = editAssignedSubjects.includes(s.id)
                    return (
                      <label key={s.id} className="mb-1 flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="subject"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditAssignedSubjects([s.id])
                            }
                          }}
                          className="h-4 w-4 rounded-full border-zinc-300 text-red-600 focus:ring-red-600"
                        />
                        <span>{s.name ? `${s.name} (${s.code}-${s.section})` : `${s.code}-${s.section}`}</span>
                      </label>
                    )
                  })}
                </div>
                <span className="mt-1 block text-xs text-zinc-600">Selecciona la asignatura que podrá usar esta contraparte.</span>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button onClick={() => closeEditModal()} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm">Cancelar</button>
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
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${value ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
      <span className={`h-2 w-2 rounded-full ${value ? 'bg-green-500' : 'bg-red-500'}`} />
      {value ? 'Sí' : 'No'}
    </span>
  )
}

function formatResponsibleLine(...values: Array<string | undefined>) {
  const cleaned = values
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter((v) => v.length > 0)
  return cleaned.join(' / ')
}

function labelInteractionTypes(v?: string[]) {
  const map = (key: string) => {
    switch (key) {
      case 'virtual': return 'Virtual'
      case 'onsite_company': return 'Presencial en la empresa'
      case 'onsite_inacap': return 'Presencial en INACAP'
      default: return key
    }
  }
  if (!Array.isArray(v) || v.length === 0) return ''
  return v.map(map).join(', ')
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







