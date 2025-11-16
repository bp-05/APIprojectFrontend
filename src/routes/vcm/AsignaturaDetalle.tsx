import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router'
import toast from 'react-hot-toast'
import html2pdf from 'html2pdf.js'
import { useAuth } from '../../store/auth'
import {
  getSubject,
  type Subject,
  listCompanyRequirements,
  type CompanyRequirement,
  updateCompanyRequirement,
  listApi2Completions,
  type Api2Completion,
  listApi3Completions,
  type Api3Completion,
  listAlternances,
  type Api3Alternance,
  listSubjectCompetencies,
  type SubjectCompetency,
  listSubjectUnits,
  type SubjectUnit,
  listBoundaryConditions,
  type CompanyBoundaryCondition,
} from '../../api/subjects'
import { listCompanies, type Company } from '../../api/companies'

type Prospect = { id: string; company_name: string }
type SubjectProspects = Record<number, string[]>

export default function AsignaturaVCMDetalle() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { role } = useAuth()
  const subjectId = Number(id)
  const isVCM = role === 'VCM'

  const [subject, setSubject] = useState<Subject | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [requirements, setRequirements] = useState<CompanyRequirement[]>([])
  const [api2Completion, setApi2Completion] = useState<Api2Completion | null>(null)
  const [api3Completion, setApi3Completion] = useState<Api3Completion | null>(null)
  const [alternance, setAlternance] = useState<Api3Alternance | null>(null)
  const [competencies, setCompetencies] = useState<SubjectCompetency[]>([])
  const [units, setUnits] = useState<SubjectUnit[]>([])
  const [boundaryCondition, setBoundaryCondition] = useState<CompanyBoundaryCondition | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [prospects, setProspects] = useState<Prospect[]>(() => loadProspects())
  const [subjectProspects, setSubjectProspects] = useState<SubjectProspects>(() => loadSubjectProspects())
  const [editingReq, setEditingReq] = useState<{req: CompanyRequirement; form: {quota: string; can: boolean}} | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<SubjectUnit | null>(null)

  async function loadData() {
    try {
      setLoading(true)
      setError(null)
      const [s, comps, reqs, api2, api3, alts, comp, u, bc] = await Promise.all([
        getSubject(subjectId),
        listCompanies().catch(() => [] as Company[]),
        listCompanyRequirements().catch(() => [] as CompanyRequirement[]),
        listApi2Completions({ subject: subjectId }).catch(() => []),
        listApi3Completions({ subject: subjectId }).catch(() => []),
        listAlternances({ subject: subjectId }).catch(() => []),
        listSubjectCompetencies(subjectId).catch(() => [] as SubjectCompetency[]),
        listSubjectUnits(subjectId).catch(() => [] as SubjectUnit[]),
        listBoundaryConditions().catch(() => [] as CompanyBoundaryCondition[]),
      ])
      setSubject(s)
      setCompanies(comps)
      setRequirements(reqs)
      setApi2Completion(api2[0] ?? null)
      setApi3Completion(api3[0] ?? null)
      setAlternance(alts[0] ?? null)
      setCompetencies(comp)
      setUnits(u)
      // Seleccionar primera unidad por defecto
      if (u.length > 0) setSelectedUnit(u[0])
      // Buscar boundary condition para esta asignatura
      const bc_for_subject = bc.find(b => b.subject === subjectId)
      setBoundaryCondition(bc_for_subject ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar la asignatura')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!Number.isFinite(subjectId)) {
      setError('Asignatura invalida')
      setLoading(false)
      return
    }
    loadData()
  }, [subjectId])

  useEffect(() => {
    const handler = () => {
      setProspects(loadProspects())
      setSubjectProspects(loadSubjectProspects())
    }
    window.addEventListener('vcm:prospects-updated', handler)
    return () => window.removeEventListener('vcm:prospects-updated', handler)
  }, [])

  const counterpartNames = useMemo(() => {
    if (!subject) return [] as string[]
    return resolveCounterparts(subject.id, companies, requirements, prospects, subjectProspects)
  }, [subject, companies, requirements, prospects, subjectProspects])

  const apiType = subject?.api_type ?? null
  const showApi2 = apiType === 2
  const showApi3 = apiType === 3
  const acceptsAlternance = useMemo(() => {
    if (!subject || !showApi3) return false
    return requirements.some((r) => r.subject === subject.id && r.can_receive_alternance)
  }, [requirements, subject, showApi3])

  async function saveRequirement(req: CompanyRequirement, quotaStr: string, can: boolean) {
    if (!subject) return
    
    // Validar cuota si está habilitada
    if (can) {
      const quota = parseInt(quotaStr.trim(), 10)
      if (!quotaStr.trim() || isNaN(quota) || quota <= 0) {
        toast.error('Ingresa una cantidad válida de estudiantes para alternancia')
        return
      }
    }
    
    try {
      const quota = quotaStr.trim() === '' || !can ? 0 : Number(quotaStr)
      const payload = { ...req, alternance_students_quota: quota }
      await updateCompanyRequirement(req.id, payload)
      setRequirements(reqs => reqs.map(r => r.id === req.id ? { ...r, alternance_students_quota: quota } : r))
      setEditingReq(null)
      toast.success('Datos del requerimiento guardados')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar'
      toast.error(msg)
    }
  }

  if (loading) {
    return <div className="p-6"><p className="text-sm text-zinc-600">Cargando asignatura...</p></div>
  }

  if (error || !subject) {
    return (
      <div className="p-6">
        <button className="mb-3 text-sm text-red-600 hover:underline" onClick={() => navigate(-1)}>Volver</button>
        <p className="text-sm text-red-600">{error || 'No se encontro la asignatura solicitada.'}</p>
      </div>
    )
  }

  function generatePDF() {
    const element = document.getElementById('pdf-content')
    if (!element || !subject) {
      toast.error('No se pudo generar el reporte')
      return
    }

    const opt = {
      margin: 10,
      filename: `Reporte_${subject.code}-${subject.section}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(html2pdf() as any).set(opt).from(element).save()
    toast.success('Reporte descargado')
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <button className="text-sm text-red-600 hover:underline" onClick={() => navigate(-1)}>Volver</button>
        <button
          onClick={generatePDF}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
        >
          Descargar Reporte PDF
        </button>
      </div>

      <div id="pdf-content">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900">{subject.name}</h1>
          <p className="text-sm text-zinc-600">{subject.code}-{subject.section} · {subject.career_name || 'Carrera sin definir'}</p>
        </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 mb-6">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DetailItem label="Codigo">{subject.code}</DetailItem>
          <DetailItem label="Seccion">{subject.section}</DetailItem>
          <DetailItem label="Carrera">{subject.career_name || '-'}</DetailItem>
          <DetailItem label="Area">{subject.area_name || '-'}</DetailItem>
          <DetailItem label="Semestre">{subject.semester_name || '-'}</DetailItem>
          <DetailItem label="Campus">{subject.campus || '-'}</DetailItem>
          <DetailItem label="Jornada">{subject.shift || '-'}</DetailItem>
          <DetailItem label="Docente">{subject.teacher_name || '-'}</DetailItem>
          <DetailItem label="Tipo API">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              subject.api_type === 3 ? 'bg-purple-100 text-purple-700' :
              subject.api_type === 2 ? 'bg-blue-100 text-blue-700' :
              'bg-green-100 text-green-700'
            }`}>
              API {subject.api_type || 1}
            </span>
          </DetailItem>
        </dl>

        <div className="mt-6">
          <h2 className="text-base font-semibold text-zinc-900">Posibles contrapartes</h2>
          {counterpartNames.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {counterpartNames.map((name) => (
                <span key={name} className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100 px-3 py-0.5 text-sm text-zinc-700">{name}</span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">Sin contrapartes registradas.</p>
          )}
        </div>
      </div>

      {/* Competencias Técnicas */}
      {competencies.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-3">Competencias Técnicas de la Asignatura</h2>
          <div className="space-y-2">
            {competencies.map((comp) => (
              <div key={comp.id} className="rounded-lg border border-zinc-200 bg-white p-3">
                <p className="text-sm text-zinc-700">
                  <span className="font-semibold text-zinc-900">Competencia {comp.number}:</span> {comp.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unidades de la Asignatura */}
      {units.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-3">Unidades de la Asignatura</h2>
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="mb-4 flex flex-wrap gap-2">
              {units.map((unit) => (
                <button
                  key={unit.id}
                  onClick={() => setSelectedUnit(unit)}
                  className={`rounded-md px-3 py-1 text-xs transition-colors ${
                    selectedUnit?.id === unit.id
                      ? 'bg-red-600 text-white'
                      : 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  Unidad {unit.number}
                </button>
              ))}
            </div>
            {selectedUnit && (
              <div className="space-y-4 border-t border-zinc-200 pt-4">
                {selectedUnit.expected_learning && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-2">Aprendizaje esperado</label>
                    <p className="text-sm text-zinc-700 whitespace-pre-wrap">{selectedUnit.expected_learning}</p>
                  </div>
                )}
                {selectedUnit.unit_hours && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-2">Horas de la unidad</label>
                    <p className="text-sm text-zinc-700">{selectedUnit.unit_hours}h</p>
                  </div>
                )}
                {selectedUnit.activities_description && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-2">Descripción general de actividades</label>
                    <p className="text-sm text-zinc-700 whitespace-pre-wrap">{selectedUnit.activities_description}</p>
                  </div>
                )}
                {selectedUnit.evaluation_evidence && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-2">Evidencia sistema de evaluación</label>
                    <p className="text-sm text-zinc-700 whitespace-pre-wrap">{selectedUnit.evaluation_evidence}</p>
                  </div>
                )}
                {selectedUnit.evidence_detail && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-2">Detalle de evidencia</label>
                    <p className="text-sm text-zinc-700 whitespace-pre-wrap">{selectedUnit.evidence_detail}</p>
                  </div>
                )}
                {selectedUnit.counterpart_link && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-2">Vínculo con contraparte</label>
                    <p className="text-sm text-zinc-700 whitespace-pre-wrap">{selectedUnit.counterpart_link}</p>
                  </div>
                )}
                {selectedUnit.place_mode_type && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-2">Lugar/Modo</label>
                    <p className="text-sm text-zinc-700">{selectedUnit.place_mode_type}</p>
                  </div>
                )}
                {selectedUnit.counterpart_participant_name && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-2">Participante de contraparte</label>
                    <p className="text-sm text-zinc-700">{selectedUnit.counterpart_participant_name}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Company Boundary Condition */}
      {boundaryCondition && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-3">Condiciones Límite de la Empresa</h2>
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="space-y-3 text-sm">
              <div>
                <h4 className="font-semibold text-zinc-900 mb-1">Tipo de Empresas</h4>
                <div className="flex flex-wrap gap-2">
                  {boundaryCondition.large_company && <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">Gran Empresa</span>}
                  {boundaryCondition.medium_company && <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">Mediana Empresa</span>}
                  {boundaryCondition.small_company && <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">Pequeña Empresa</span>}
                  {boundaryCondition.family_enterprise && <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">Empresa Familiar</span>}
                  {boundaryCondition.not_relevant && <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">No Relevante</span>}
                </div>
              </div>
              {boundaryCondition.company_type_description && (
                <p><span className="font-medium text-zinc-900">Descripción:</span> <span className="text-zinc-700">{boundaryCondition.company_type_description}</span></p>
              )}
              {boundaryCondition.company_requirements_for_level_2_3 && (
                <p><span className="font-medium text-zinc-900">Requerimientos (API 2/3):</span> <span className="text-zinc-700">{boundaryCondition.company_requirements_for_level_2_3}</span></p>
              )}
              {boundaryCondition.project_minimum_elements && (
                <p><span className="font-medium text-zinc-900">Elementos mínimos del proyecto:</span> <span className="text-zinc-700">{boundaryCondition.project_minimum_elements}</span></p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Requerimientos de Empresas */}
      {requirements.filter(r => r.subject === subject.id).length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-3">Requerimientos de Empresas</h2>
          <div className="space-y-3">
            {requirements.filter(r => r.subject === subject.id).map((req) => {
              const company = companies.find(c => c.id === req.company)
              return (
                <div key={req.id} className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-red-900">{company?.name || `Empresa ${req.company}`}</h3>
                      <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                        <p><span className="font-medium">Sector:</span> {req.sector || '-'}</p>
                        <p><span className="font-medium">Ha trabajado:</span> {req.worked_before ? 'Sí' : 'No'}</p>
                        <p><span className="font-medium">Desea colaborar:</span> {req.interest_collaborate ? 'Sí' : 'No'}</p>
                        <p><span className="font-medium">Tipo interacción:</span> {req.interaction_type ? (Array.isArray(req.interaction_type) ? req.interaction_type.join(', ') : req.interaction_type) : '-'}</p>
                      </div>
                      {req.can_receive_alternance && (
                        <p className="mt-2 text-sm font-medium text-green-700">✓ Acepta alternancia</p>
                      )}
                    </div>
                    {isVCM && (
                      <button
                        onClick={() => setEditingReq({ req, form: { quota: String(req.alternance_students_quota || ''), can: req.can_receive_alternance } })}
                        className="ml-4 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal Editar Requerimiento */}
      {editingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
          <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">Editar Cupos de Alternancia</h3>
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={editingReq.form.can}
                    onChange={(e) => {
                      setEditingReq({
                        ...editingReq,
                        form: { ...editingReq.form, can: e.target.checked, quota: !e.target.checked ? '' : editingReq.form.quota }
                      })
                    }}
                    className="rounded border-zinc-300"
                  />
                  <span className="text-sm font-medium">Acepta alternancia</span>
                </label>
              </div>
              {editingReq.form.can && (
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Cupos de estudiantes</label>
                  <input
                    type="number"
                    min="0"
                    value={editingReq.form.quota}
                    onChange={(e) => setEditingReq({...editingReq, form: {...editingReq.form, quota: e.target.value}})}
                    placeholder="0"
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
                  />
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setEditingReq(null)}
                  className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => saveRequirement(editingReq.req, editingReq.form.quota, editingReq.form.can)}
                  className="flex-1 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API 2 Completion */}
      {showApi2 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-3">API Tipo 2 - Información del Proyecto</h2>
          {api2Completion ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <CompletionBox label="Objetivo para estudiantes" value={api2Completion.project_goal_students} color="border-red-200 bg-red-50" />
              <CompletionBox label="Entregables al final" value={api2Completion.deliverables_at_end} color="border-red-200 bg-red-50" />
              <CompletionBox label="Participación esperada" value={api2Completion.company_expected_participation} color="border-red-200 bg-red-50" />
              <CompletionBox label="Otras actividades" value={api2Completion.other_activities} color="border-red-200 bg-red-50" />
            </div>
          ) : (
            <p className="text-sm text-zinc-600">Sin información registrada.</p>
          )}
        </div>
      )}

      {/* API 3 Completion */}
      {showApi3 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-3">API Tipo 3 - Información del Proyecto</h2>
          {api3Completion ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <CompletionBox label="Objetivo para estudiantes" value={api3Completion.project_goal_students} color="border-red-200 bg-red-50" />
              <CompletionBox label="Entregables al final" value={api3Completion.deliverables_at_end} color="border-red-200 bg-red-50" />
              <CompletionBox label="Rol esperado del estudiante" value={api3Completion.expected_student_role} color="border-red-200 bg-red-50" />
              <CompletionBox label="Otras actividades" value={api3Completion.other_activities} color="border-red-200 bg-red-50" />
              <CompletionBox label="Apoyo maestro guía" value={api3Completion.master_guide_expected_support} color="border-red-200 bg-red-50" />
            </div>
          ) : (
            <p className="text-sm text-zinc-600">Sin información registrada.</p>
          )}
        </div>
      )}

      {/* API 3 Alternancia */}
      {showApi3 && acceptsAlternance && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-3">Alternancia (API 3)</h2>
          {alternance ? (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <TextBlock label="Rol del estudiante" value={alternance.student_role} />
                <TextBlock label="Cupos" value={alternance.students_quota ? `${alternance.students_quota} estudiantes` : '-'} />
                <TextBlock label="Tutor" value={alternance.tutor_name} />
                <TextBlock label="Correo tutor" value={alternance.tutor_email} />
                <TextBlock label="Horas de alternancia" value={alternance.alternance_hours ? `${alternance.alternance_hours} horas` : '-'} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-600">Sin datos de alternancia registrados.</p>
          )}
        </div>
      )}
      </div>
    </div>
  )
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-zinc-600">{label}</dt>
      <dd className="text-sm text-zinc-900">{children}</dd>
    </div>
  )
}

function CompletionBox({ label, value, color = 'border-zinc-200 bg-white' }: { label: string; value?: string | null; color?: string }) {
  return (
    <div className={`rounded-lg border p-4 ${color}`}>
      <div className="text-xs font-semibold text-zinc-900 mb-2">{label}</div>
      <div className="text-sm text-zinc-700 whitespace-pre-line">{value?.trim() ? value : '—'}</div>
    </div>
  )
}

function TextBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs font-medium text-zinc-600">{label}</div>
      <div className="text-sm text-zinc-900">{value?.trim() ? value : '—'}</div>
    </div>
  )
}

function resolveCounterparts(
  subjectId: number,
  companies: Company[],
  requirements: CompanyRequirement[],
  prospects: Prospect[],
  subjectProspects: SubjectProspects
): string[] {
  const byCompanyId = new Map(companies.map((c) => [c.id, c]))
  const byReqId = new Map(requirements.map((r) => [r.id, r]))

  const ids = subjectProspects[subjectId] || []
  const localNames = ids.map((id) => {
    if (id.startsWith('db:')) {
      const rid = Number(id.slice(3))
      const req = byReqId.get(rid)
      if (req && req.subject === subjectId) return byCompanyId.get(req.company)?.name
      return undefined
    }
    if (id.startsWith('dbco:')) {
      const cid = Number(id.slice(5))
      return byCompanyId.get(cid)?.name
    }
    return prospects.find((p) => p.id === id)?.company_name
  }).filter(Boolean) as string[]

  const backendNames = requirements
    .filter((r) => r.subject === subjectId)
    .map((r) => byCompanyId.get(r.company)?.name)
    .filter(Boolean) as string[]

  return Array.from(new Set(localNames.length ? localNames : backendNames))
}

function loadProspects(): Prospect[] {
  try {
    const raw = localStorage.getItem('vcm_posibles_contrapartes')
    const arr = raw ? JSON.parse(raw) : []
    if (Array.isArray(arr)) {
      return arr.map((p: any) => ({ id: String(p.id), company_name: String(p.company_name || '') }))
    }
    return []
  } catch {
    return []
  }
}

function loadSubjectProspects(): SubjectProspects {
  try {
    const raw = localStorage.getItem('vcm_subject_prospects')
    const obj = raw ? JSON.parse(raw) : {}
    return obj && typeof obj === 'object' ? obj : {}
  } catch {
    return {}
  }
}
