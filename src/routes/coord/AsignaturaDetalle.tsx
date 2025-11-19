import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { getSubject, updateSubject, listSubjectCompetencies, listSubjectUnits, getBoundaryConditionBySubject, getApiType2CompletionBySubject, getApiType3CompletionBySubject, getAlternanceBySubject, listCompanyRequirements, type Subject, type SubjectCompetency, type SubjectUnit, type CompanyBoundaryCondition, type ApiType2Completion, type ApiType3Completion, type Api3Alternance, type CompanyRequirement } from '../../api/subjects'
import { listDocentes, type User as AppUser, getTeacher } from '../../api/users'
import { listProblemStatements, getCompany, type ProblemStatement } from '../../api/companies'
import { nameCase } from '../../lib/strings'

export default function AsignaturaCoordDetalle() {
  const { id } = useParams()
  const subjectId = Number(id)
  const navigate = useNavigate()

  const [subject, setSubject] = useState<Subject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [teacher, setTeacher] = useState<AppUser | null>(null)
  const [teacherError, setTeacherError] = useState<string | null>(null)
  const [editingTeacher, setEditingTeacher] = useState(false)
  const [teachers, setTeachers] = useState<AppUser[]>([])
  const [teacherSel, setTeacherSel] = useState<number | ''>('')

  const [companyId, setCompanyId] = useState<number | null>(null)
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<null | { title: string; message: string; confirmText?: string; onConfirm: () => void }>(null)
  const [competencies, setCompetencies] = useState<SubjectCompetency[]>([])
  const [units, setUnits] = useState<SubjectUnit[]>([])
  const [selectedUnit, setSelectedUnit] = useState<SubjectUnit | null>(null)
  const [boundary, setBoundary] = useState<CompanyBoundaryCondition | null>(null)
  const [api2, setApi2] = useState<ApiType2Completion | null>(null)
  const [api3, setApi3] = useState<ApiType3Completion | null>(null)
  const [alternance, setAlternance] = useState<Api3Alternance | null>(null)
  const [apiModal, setApiModal] = useState<2 | 3 | null>(null)
  const [requirements, setRequirements] = useState<CompanyRequirement[]>([])

  useEffect(() => {
    let mounted = true
    async function fetchAll() {
      setLoading(true)
      setError(null)
      try {
        const [s, probs, reqs] = await Promise.all([
          getSubject(subjectId),
          listProblemStatements({ subject: subjectId }),
          listCompanyRequirements(),
        ])
        if (!mounted) return
        setSubject(s)

        let compId: number | null = null
        if (Array.isArray(probs) && probs.length > 0) {
          compId = (probs[0] as ProblemStatement).company
        } else if (Array.isArray(reqs) && reqs.length > 0) {
          const r = (reqs as CompanyRequirement[]).find((r) => (r as any).subject === subjectId)
          if (r) compId = (r as any).company
        }
        setCompanyId(compId)
        if (compId) {
          try {
            const c = await getCompany(compId)
            if (mounted) setCompanyName((c as any)?.name || null)
          } catch {
            if (mounted) setCompanyName(null)
          }
        } else {
          setCompanyName(null)
        }

        if (s?.teacher) {
          try {
            const t = await getTeacher(s.teacher)
            if (mounted) setTeacher(t)
          } catch {
            if (mounted) setTeacher(null)
          }
        } else {
          setTeacher(null)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'No se pudo cargar la información'
        setError(msg)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    if (!Number.isFinite(subjectId)) {
      setError('ID de asignatura inválido')
      setLoading(false)
      return
    }
    fetchAll()
    return () => { mounted = false }
  }, [id])

  useEffect(() => {
    let mounted = true
    async function loadCompetencies() {
      try {
        const data = await listSubjectCompetencies(subjectId)
        if (mounted) setCompetencies(Array.isArray(data) ? data : [])
      } catch {
        if (mounted) setCompetencies([])
      }
    }
    if (Number.isFinite(subjectId)) loadCompetencies()
    return () => { mounted = false }
  }, [subjectId])

  useEffect(() => {
    let mounted = true
    async function loadUnits() {
      try {
        const data = await listSubjectUnits(subjectId)
        if (!mounted) return
        const arr = Array.isArray(data) ? data.sort((a, b) => a.number - b.number) : []
        setUnits(arr)
        setSelectedUnit((prev) => {
          if (prev && arr.find((u) => u.id === prev.id)) return prev
          return arr[0] ?? null
        })
      } catch {
        if (mounted) {
          setUnits([])
          setSelectedUnit(null)
        }
      }
    }
    if (Number.isFinite(subjectId)) loadUnits()
    return () => { mounted = false }
  }, [subjectId])

  useEffect(() => {
    let mounted = true
    async function loadBoundary() {
      try {
        const data = await getBoundaryConditionBySubject(subjectId)
        if (mounted) setBoundary(data)
      } catch {
        if (mounted) setBoundary(null)
      }
    }
    if (Number.isFinite(subjectId)) loadBoundary()
    return () => { mounted = false }
  }, [subjectId])

  useEffect(() => {
    let mounted = true
    async function loadRequirements() {
      try {
        const data = await listCompanyRequirements()
        if (!mounted) return
        const filtered = Array.isArray(data) ? data.filter((r) => (r as any).subject === subjectId) : []
        setRequirements(filtered)
      } catch {
        if (mounted) setRequirements([])
      }
    }
    if (Number.isFinite(subjectId)) loadRequirements()
    return () => { mounted = false }
  }, [subjectId])

  useEffect(() => {
    let mounted = true
    async function loadApiTypes() {
      setApi2(null)
      setApi3(null)
      setAlternance(null)
      if (!Number.isFinite(subjectId)) return
      const apiType = subject?.api_type
      if (apiType === 2) {
        try {
          const data = await getApiType2CompletionBySubject(subjectId)
          if (mounted) setApi2(data)
        } catch {
          if (mounted) setApi2(null)
        }
      } else if (apiType === 3) {
        try {
          const data3 = await getApiType3CompletionBySubject(subjectId)
          if (mounted) setApi3(data3)
        } catch {
          if (mounted) setApi3(null)
        }
        try {
          const alt = await getAlternanceBySubject(subjectId)
          if (mounted) setAlternance(alt)
        } catch {
          if (mounted) setAlternance(null)
        }
      }
    }
    loadApiTypes()
    return () => { mounted = false }
  }, [subjectId, subject?.api_type])

  async function startEditTeacher() {
    setTeacherError(null)
    setEditingTeacher(true)
    try {
      const data = await listDocentes()
      setTeachers(data)
      setTeacherSel(subject?.teacher ?? '')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudieron cargar docentes'
      setTeacherError(msg)
    }
  }

  async function saveTeacher() {
    if (!subject) return
    setTeacherError(null)
    try {
      await updateSubject(subject.id, { teacher: teacherSel === '' ? null : Number(teacherSel) })
      const s = await getSubject(subject.id)
      setSubject(s)
      if (s.teacher) {
        try {
          const t = await getTeacher(s.teacher)
          setTeacher(t)
        } catch {
          setTeacher(null)
        }
      } else {
        setTeacher(null)
      }
      setEditingTeacher(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo guardar el docente'
      setTeacherError(msg)
    }
  }

  async function removeTeacher() {
    if (!subject) return
    setTeacherError(null)
    try {
      await updateSubject(subject.id, { teacher: null })
      const s = await getSubject(subject.id)
      setSubject(s)
      setTeacher(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo eliminar el docente'
      setTeacherError(msg)
    }
  }

  return (
    <section className="p-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Detalle de asignatura</h1>
          {subject ? (
            <p className="text-sm text-zinc-600">{subject.name} · {subject.code}-{subject.section}</p>
          ) : null}
        </div>
        <Link to="/coord/asignaturas" className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50">Volver</Link>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="text-sm text-zinc-600">Cargando…</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {subject ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-zinc-700">Información general</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Docente</div>
                  {subject.teacher ? (
                    <>
                      <div className="font-medium">{nameCase(subject.teacher_name || teacher?.full_name || teacher?.email || '') || '-'}</div>
                      <div className="text-xs text-zinc-600">{teacher?.email || '-'}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-zinc-600">Sin docente asignado</div>
                      <div className="mt-2">
                        <button onClick={() => startEditTeacher()} className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700">Agregar docente</button>
                      </div>
                    </>
                  )}
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Asignatura</div>
                  <div className="text-sm">{subject.name || '-'}</div>
                  <div className="text-xs text-zinc-500">{subject.code}-{subject.section}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Empresa</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-zinc-700">{companyName || '-'}</span>
                    <button
                      onClick={() => companyId && navigate(`/coord/asignaturas/${subject.id}/empresa/${companyId}`)}
                      disabled={!companyId}
                      className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      Ver Empresa
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600">No se encontró información de la asignatura</div>
          )}

          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-zinc-700">Competencias técnicas</h2>
            {competencies.length > 0 ? (
              <ol className="space-y-2 text-sm">
                {competencies
                  .sort((a, b) => a.number - b.number)
                  .map((c) => (
                    <li key={c.id} className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2">
                      <div className="text-xs font-semibold text-zinc-500">Competencia {c.number}</div>
                      <div className="text-zinc-800">{c.description || '-'}</div>
                    </li>
                  ))}
              </ol>
            ) : (
              <div className="text-sm text-zinc-600">Sin competencias técnicas registradas</div>
            )}
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-700">Unidades y aprendizaje esperado</h2>
              <div className="flex flex-wrap gap-2">
                {units.length === 0 ? (
                  <span className="text-xs text-zinc-600">Sin unidades registradas</span>
                ) : (
                  units.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUnit(u)}
                      className={`rounded-md px-3 py-1 text-xs font-medium ${selectedUnit?.id === u.id ? 'bg-red-600 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
                    >
                      Unidad {u.number}
                    </button>
                  ))
                )}
              </div>
            </div>
            {selectedUnit ? (
              <div className="space-y-2 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Aprendizaje esperado</div>
                  <div className="text-zinc-800">{selectedUnit.expected_learning || 'No definido'}</div>
                </div>
                {selectedUnit.activities_description ? (
                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Actividades</div>
                    <div className="text-zinc-800">{selectedUnit.activities_description}</div>
                  </div>
                ) : null}
                {selectedUnit.evaluation_evidence ? (
                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Evidencia de evaluación</div>
                    <div className="text-zinc-800">{selectedUnit.evaluation_evidence}</div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-sm text-zinc-600">Selecciona una unidad para ver el aprendizaje esperado.</div>
            )}
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-zinc-700">Condiciones de borde</h2>
            {boundary ? (
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Tipo de empresa</div>
                  <div className="text-zinc-800">{boundary.company_type_description || '-'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Requisitos nivel 2/3</div>
                  <div className="text-zinc-800">{boundary.company_requirements_for_level_2_3 || '-'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Elementos mínimos del proyecto</div>
                  <div className="text-zinc-800">{boundary.project_minimum_elements || '-'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Tipos de empresa</div>
                  <div className="text-zinc-800">
                    {['large_company','medium_company','small_company','family_enterprise','not_relevant']
                      .map((k) => ({
                        key: k,
                        label: k === 'large_company' ? 'Grande' : k === 'medium_company' ? 'Mediana' : k === 'small_company' ? 'Pequeña' : k === 'family_enterprise' ? 'Empresa familiar' : 'No relevante',
                        value: (boundary as any)[k],
                      }))
                      .filter((i) => i.value !== null && i.value !== undefined)
                      .map((i) => `${i.label}: ${i.value ? 'Sí' : 'No'}`)
                      .join(' · ') || 'Sin especificar'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-zinc-600">Sin condiciones de borde registradas</div>
            )}
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-zinc-700">Posible contraparte</h2>
            {requirements.length > 0 ? (
              <div className="space-y-3 text-sm">
                {requirements.map((r) => (
                  <div key={r.id} className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2">
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Sector</div>
                    <div className="text-zinc-800">{r.sector || '-'}</div>
                    <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">Interés en colaborar</div>
                    <div className="text-zinc-800">{r.interest_collaborate ? 'Sí' : 'No'}</div>
                    <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">Puede desarrollar actividades</div>
                    <div className="text-zinc-800">{r.can_develop_activities ? 'Sí' : 'No'}</div>
                    <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">Diseñar proyecto</div>
                    <div className="text-zinc-800">{r.willing_design_project ? 'Sí' : 'No'}</div>
                    <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">Interacción</div>
                    <div className="text-zinc-800">{r.interaction_type && r.interaction_type.length ? r.interaction_type.join(', ') : '-'}</div>
                    <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">Guía</div>
                    <div className="text-zinc-800">{r.has_guide ? 'Sí' : 'No'}</div>
                    <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">Alternancia</div>
                    <div className="text-zinc-800">{r.can_receive_alternance ? `Sí (${r.alternance_students_quota ?? '-'} cupos)` : 'No'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-zinc-600">No hay información de posible contraparte</div>
            )}
          </div>

          {subject?.api_type === 2 ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Tipo de API</div>
                  <div className="text-sm font-semibold text-zinc-800">API 2</div>
                </div>
                <button
                  onClick={() => setApiModal(2)}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                >
                  Ver detalles
                </button>
              </div>
              <div className="mt-2 text-xs text-zinc-600">Haz clic en "Ver detalles" para ver la información de API 2.</div>
            </div>
          ) : null}

          {subject?.api_type === 3 ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Tipo de API</div>
                  <div className="text-sm font-semibold text-zinc-800">API 3</div>
                </div>
                <button
                  onClick={() => setApiModal(3)}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                >
                  Ver detalles
                </button>
              </div>
              <div className="mt-2 text-xs text-zinc-600">Haz clic en "Ver detalles" para ver la información de API 3.</div>
            </div>
          ) : null}

          {editingTeacher && subject ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <EditTeacherPanel
                currentId={subject.teacher ?? null}
                teachers={teachers}
                selected={teacherSel}
                onChangeSelected={setTeacherSel}
                onCancel={() => setEditingTeacher(false)}
                onSave={() => saveTeacher()}
              />
            </div>
          ) : null}
        </div>
      )}

      {confirm ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setConfirm(null)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-semibold">{confirm.title || 'Confirmación'}</h2>
              <button
                onClick={() => setConfirm(null)}
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50"
              >
                Cerrar
              </button>
            </div>
            <p className="text-sm text-zinc-700">{confirm.message}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => confirm.onConfirm()}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
              >
                {confirm.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {apiModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setApiModal(null)}
        >
          <div
            className="w-full max-w-xl rounded-lg border border-zinc-200 bg-white p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Tipo de API {apiModal}</h2>
              <button
                onClick={() => setApiModal(null)}
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50"
              >
                Cerrar
              </button>
            </div>
            {apiModal === 2 ? (
              api2 ? (
                <div className="grid gap-2 text-sm">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Project goal students</div>
                    <div className="text-zinc-800">{api2.project_goal_students || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Deliverables at end</div>
                    <div className="text-zinc-800">{api2.deliverables_at_end || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Company expected participation</div>
                    <div className="text-zinc-800">{api2.company_expected_participation || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Other activities</div>
                    <div className="text-zinc-800">{api2.other_activities || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Subject</div>
                    <div className="text-zinc-800">{subject?.name || '-'}</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-zinc-600">Sin API type 2 completions registradas</div>
              )
            ) : apiModal === 3 ? (
              api3 ? (
                <div className="grid gap-2 text-sm">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Project goal students</div>
                    <div className="text-zinc-800">{api3.project_goal_students || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Deliverables at end</div>
                    <div className="text-zinc-800">{api3.deliverables_at_end || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Expected student role</div>
                    <div className="text-zinc-800">{api3.expected_student_role || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Other activities</div>
                    <div className="text-zinc-800">{api3.other_activities || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Master guide expected support</div>
                    <div className="text-zinc-800">{api3.master_guide_expected_support || '-'}</div>
                  </div>
                  {alternance ? (
                    <>
                      <div className="mt-2 text-sm font-semibold text-zinc-700">API 3 alternance</div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-zinc-500">Student role</div>
                        <div className="text-zinc-800">{alternance.student_role || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-zinc-500">Students quota</div>
                        <div className="text-zinc-800">{alternance.students_quota ?? '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-zinc-500">Tutor</div>
                        <div className="text-zinc-800">{alternance.tutor_name || '-'} | {alternance.tutor_email || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-zinc-500">Alternance hours</div>
                        <div className="text-zinc-800">{alternance.alternance_hours ?? '-'}</div>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : (
                <div className="text-sm text-zinc-600">Sin API type 3 completions registradas</div>
              )
            ) : null}
          </div>
        </div>
      ) : null}

    </section>
  )
}

function EditTeacherPanel({ currentId, teachers, selected, onChangeSelected, onCancel, onSave }: {
  currentId: number | null
  teachers: AppUser[]
  selected: number | ''
  onChangeSelected: (v: number | '') => void
  onCancel: () => void
  onSave: () => void
}) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    if (!search) return teachers
    const q = search.toLowerCase()
    return teachers.filter((u) => [u.email, u.first_name, u.last_name].some((v) => String(v || '').toLowerCase().includes(q)))
  }, [teachers, search])

  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <div className="mb-2 grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-zinc-700">Buscar docente</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" placeholder="Nombre o correo" />
        </div>
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-zinc-700">Docentes</label>
          <select
            value={selected === '' ? '' : Number(selected)}
            onChange={(e) => onChangeSelected(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            size={6}
          >
            <option value="">Seleccione…</option>
            {currentId && !teachers.some((u) => u.id === currentId) ? (
              <option value={currentId}>Docente #{currentId}</option>
            ) : null}
            {filtered.map((u) => (
              <option key={u.id} value={u.id}>
                {nameCase(`${u.first_name} ${u.last_name}`)} · {u.email}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50">Cancelar</button>
        <button type="button" onClick={onSave} className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">Guardar</button>
      </div>
    </div>
  )
}
