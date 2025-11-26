import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { toast } from '../../lib/toast'
import {
  createApiType2Completion,
  createApiType3Completion,
  getAlternanceBySubject,
  createBoundaryCondition,
  createSubjectCompetency,
  getApiType2CompletionBySubject,
  getApiType3CompletionBySubject,
  getBoundaryConditionBySubject,
  getSubject,
  listAreas,
  listCareers,
  listSemesters,
  listSubjectCompetencies,
  listSubjects,
  updateApiType2Completion,
  updateApiType3Completion,
  updateBoundaryCondition,
  createAlternance,
  updateAlternance,
  updateSubject,
  updateSubjectCompetency,
  type ApiType2Completion,
  type ApiType3Completion,
  type Api3Alternance,
  type Area,
  type Career,
  type CompanyBoundaryCondition,
  type SemesterLevel,
  type Subject,
  type SubjectCompetency,
} from '../../api/subjects'
import { listDocentes, type User as Teacher } from '../../api/users'

type PanelMode = 'list' | 'view' | 'edit'

type CompetencySlot = {
  id: number | null
  number: number
  description: string
}

const COMPETENCY_SLOTS = 5

type BoundaryForm = {
  id: number | null
  large_company: boolean | null
  medium_company: boolean | null
  small_company: boolean | null
  family_enterprise: boolean | null
  not_relevant: boolean | null
  company_type_description: string
  company_requirements_for_level_2_3: string
  project_minimum_elements: string
}

type Api2Form = {
  id: number | null
  project_goal_students: string
  deliverables_at_end: string
  company_expected_participation: string
  other_activities: string
}

type Api3Form = {
  id: number | null
  project_goal_students: string
  deliverables_at_end: string
  expected_student_role: string
  other_activities: string
  master_guide_expected_support: string
}

type AlternanceForm = {
  id: number | null
  student_role: string
  students_quota: number
  tutor_name: string
  tutor_email: string
  alternance_hours: number
}

type SubjectFormValues = {
  code: string
  section: string
  name: string
  campus: string
  shift: string
  hours: string
  total_students: string
  api_type: string
  area: string
  semester: string
  teacher: string
  career: string
}

function createEmptyFormValues(): SubjectFormValues {
  return {
    code: '',
    section: '',
    name: '',
    campus: '',
    shift: '',
    hours: '',
    total_students: '',
    api_type: '1',
    area: '',
    semester: '',
    teacher: '',
    career: '',
  }
}

function createCompetencySlots(data?: SubjectCompetency[]): CompetencySlot[] {
  return Array.from({ length: COMPETENCY_SLOTS }, (_, idx) => {
    const number = idx + 1
    const existing = data?.find((item) => Number(item.number) === number)
    return {
      id: existing?.id ?? null,
      number,
      description: existing?.description ?? '',
    }
  })
}

function createBoundaryForm(data?: CompanyBoundaryCondition | null): BoundaryForm {
  return {
    id: data?.id ?? null,
    large_company: data?.large_company ?? null,
    medium_company: data?.medium_company ?? null,
    small_company: data?.small_company ?? null,
    family_enterprise: data?.family_enterprise ?? null,
    not_relevant: data?.not_relevant ?? null,
    company_type_description: data?.company_type_description ?? '',
    company_requirements_for_level_2_3: data?.company_requirements_for_level_2_3 ?? '',
    project_minimum_elements: data?.project_minimum_elements ?? '',
  }
}

function createApi2Form(data?: ApiType2Completion | null): Api2Form {
  return {
    id: data?.id ?? null,
    project_goal_students: data?.project_goal_students ?? '',
    deliverables_at_end: data?.deliverables_at_end ?? '',
    company_expected_participation: data?.company_expected_participation ?? '',
    other_activities: data?.other_activities ?? '',
  }
}

function createApi3Form(data?: ApiType3Completion | null): Api3Form {
  return {
    id: data?.id ?? null,
    project_goal_students: data?.project_goal_students ?? '',
    deliverables_at_end: data?.deliverables_at_end ?? '',
    expected_student_role: data?.expected_student_role ?? '',
    other_activities: data?.other_activities ?? '',
    master_guide_expected_support: data?.master_guide_expected_support ?? '',
  }
}

function createAlternanceForm(data?: Api3Alternance | null): AlternanceForm {
  return {
    id: data?.id ?? null,
    student_role: data?.student_role ?? '',
    students_quota: data?.students_quota ?? 0,
    tutor_name: data?.tutor_name ?? '',
    tutor_email: data?.tutor_email ?? '',
    alternance_hours: data?.alternance_hours ?? 0,
  }
}

function subjectToFormValues(subject: Subject): SubjectFormValues {
  return {
    code: subject.code || '',
    section: subject.section || '',
    name: subject.name || '',
    campus: subject.campus || '',
    shift: subject.shift || '',
    hours: subject.hours ? String(subject.hours) : '',
    total_students: subject.total_students != null ? String(subject.total_students) : '',
    api_type: subject.api_type ? String(subject.api_type) : '1',
    area: subject.area ? String(subject.area) : '',
    semester: subject.semester ? String(subject.semester) : '',
    teacher: subject.teacher ? String(subject.teacher) : '',
    career: subject.career ? String(subject.career) : '',
  }
}

function validateForm(values: SubjectFormValues) {
  if (!values.code.trim()) return 'El codigo es obligatorio'
  if (!values.section.trim()) return 'La seccion es obligatoria'
  if (!values.name.trim()) return 'El nombre es obligatorio'
  if (!values.campus.trim()) return 'El campus es obligatorio'
  if (!values.area) return 'Debes seleccionar un area'
  if (!values.semester) return 'Debes seleccionar un semestre'
  const hoursNumber = Number(values.hours)
  if (!values.hours || Number.isNaN(hoursNumber) || hoursNumber <= 0) return 'Horas invalidas'
  if (!values.api_type) return 'Debes indicar el tipo de API'
  return null
}

function buildUpdatePayload(values: SubjectFormValues): Partial<Subject> {
  const payload: Partial<Subject> = {
    code: values.code.trim(),
    section: values.section.trim(),
    name: values.name.trim(),
    campus: values.campus.trim(),
    shift: values.shift.trim(),
    hours: Number(values.hours),
    total_students: values.total_students === '' ? null : Number(values.total_students),
    api_type: Number(values.api_type),
    area: values.area ? Number(values.area) : undefined,
    semester: values.semester ? Number(values.semester) : undefined,
    teacher: values.teacher ? Number(values.teacher) : null,
    career: values.career ? Number(values.career) : null,
  }
  return payload
}

export default function DCAsignaturas() {
  const location = useLocation()
  const [items, setItems] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<PanelMode>('list')
  const [selected, setSelected] = useState<Subject | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const [areas, setAreas] = useState<Area[]>([])
  const [semesters, setSemesters] = useState<SemesterLevel[]>([])
  const [careers, setCareers] = useState<Career[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [metaLoading, setMetaLoading] = useState(false)
  const [metaError, setMetaError] = useState<string | null>(null)

  const [formValues, setFormValues] = useState<SubjectFormValues>(createEmptyFormValues())
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [competencySlots, setCompetencySlots] = useState<CompetencySlot[]>(() => createCompetencySlots())
  const [competenciesLoading, setCompetenciesLoading] = useState(false)
  const [competenciesError, setCompetenciesError] = useState<string | null>(null)
  const [savingCompetencies, setSavingCompetencies] = useState(false)
  const [boundaryForm, setBoundaryForm] = useState<BoundaryForm>(createBoundaryForm())
  const [boundaryLoading, setBoundaryLoading] = useState(false)
  const [boundaryError, setBoundaryError] = useState<string | null>(null)
  const [boundarySaving, setBoundarySaving] = useState(false)
  const [api2Form, setApi2Form] = useState<Api2Form>(createApi2Form())
  const [api2Loading, setApi2Loading] = useState(false)
  const [api2Error, setApi2Error] = useState<string | null>(null)
  const [api2Saving, setApi2Saving] = useState(false)
  const [api3Form, setApi3Form] = useState<Api3Form>(createApi3Form())
  const [api3Loading, setApi3Loading] = useState(false)
  const [api3Error, setApi3Error] = useState<string | null>(null)
  const [api3Saving, setApi3Saving] = useState(false)
  const [alternanceForm, setAlternanceForm] = useState<AlternanceForm>(createAlternanceForm())
  const [alternanceLoading, setAlternanceLoading] = useState(false)
  const [alternanceError, setAlternanceError] = useState<string | null>(null)
  const [alternanceSaving, setAlternanceSaving] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await listSubjects()
      setItems(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar asignaturas'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function loadSubjectCompetencies(subjectId: number) {
    setCompetenciesLoading(true)
    setCompetenciesError(null)
    try {
      const data = await listSubjectCompetencies(subjectId)
      setCompetencySlots(createCompetencySlots(data))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudieron cargar las competencias tecnicas'
      setCompetenciesError(msg)
      setCompetencySlots(createCompetencySlots())
    } finally {
      setCompetenciesLoading(false)
    }
  }

  async function loadBoundaryCondition(subjectId: number) {
    setBoundaryLoading(true)
    setBoundaryError(null)
    try {
      const data = await getBoundaryConditionBySubject(subjectId)
      setBoundaryForm(createBoundaryForm(data))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo cargar la condicion de borde'
      setBoundaryError(msg)
      setBoundaryForm(createBoundaryForm())
    } finally {
      setBoundaryLoading(false)
    }
  }

  async function loadApiType2(subjectId: number) {
    setApi2Loading(true)
    setApi2Error(null)
    try {
      const data = await getApiType2CompletionBySubject(subjectId)
      setApi2Form(createApi2Form(data))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo cargar la seccion API 2'
      setApi2Error(msg)
      setApi2Form(createApi2Form())
    } finally {
      setApi2Loading(false)
    }
  }

  async function loadApiType3(subjectId: number) {
    setApi3Loading(true)
    setApi3Error(null)
    try {
      const data = await getApiType3CompletionBySubject(subjectId)
      setApi3Form(createApi3Form(data))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo cargar la seccion API 3'
      setApi3Error(msg)
      setApi3Form(createApi3Form())
    } finally {
      setApi3Loading(false)
    }
  }

  async function loadAlternance(subjectId: number) {
    setAlternanceLoading(true)
    setAlternanceError(null)
    try {
      const data = await getAlternanceBySubject(subjectId)
      setAlternanceForm(createAlternanceForm(data))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo cargar la alternancia'
      setAlternanceError(msg)
      setAlternanceForm(createAlternanceForm())
    } finally {
      setAlternanceLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    async function loadMeta() {
      setMetaLoading(true)
      setMetaError(null)
      try {
        const [areasData, semestersData, careersData, teachersData] = await Promise.all([
          listAreas(),
          listSemesters(),
          listCareers(),
          listDocentes(),
        ])
        setAreas(areasData)
        setSemesters(semestersData)
        setCareers(careersData)
        setTeachers(teachersData)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'No se pudieron cargar los catalogos'
        setMetaError(msg)
      } finally {
        setMetaLoading(false)
      }
    }
    loadMeta()
  }, [])

  useEffect(() => {
    if (mode === 'edit' && selected) {
      setFormValues(subjectToFormValues(selected))
    }
  }, [mode, selected])

  useEffect(() => {
    if (!selected) return
    void loadSubjectCompetencies(selected.id)
    void loadBoundaryCondition(selected.id)
  }, [selected?.id])

  useEffect(() => {
    if (!selected) return
    if (selected.api_type === 2) {
      void loadApiType2(selected.id)
      setApi3Form(createApi3Form())
      setApi3Error(null)
      setAlternanceForm(createAlternanceForm())
      setAlternanceError(null)
    } else if (selected.api_type === 3) {
      void loadApiType3(selected.id)
      void loadAlternance(selected.id)
      setApi2Form(createApi2Form())
      setApi2Error(null)
    } else {
      setApi2Form(createApi2Form())
      setApi3Form(createApi3Form())
      setApi2Error(null)
      setApi3Error(null)
      setAlternanceForm(createAlternanceForm())
      setAlternanceError(null)
    }
  }, [selected?.id, selected?.api_type])

  const filtered = useMemo(() => {
    if (!search) return items
    const q = search.toLowerCase()
    return items.filter((s) =>
      [s.code, s.section, s.name, s.campus, s.area_name || '', s.career_name || '', s.semester_name || '', s.teacher_name || '']
        .some((v) => String(v || '').toLowerCase().includes(q))
    )
  }, [items, search])

  const handleFormChange = (field: keyof SubjectFormValues, value: string) => {
    setFormError(null)
    setFormValues((prev) => {
      if (field === 'area') {
        return { ...prev, area: value, career: '' }
      }
      return { ...prev, [field]: value }
    })
  }

  const handleCompetencyChange = (number: number, value: string) => {
    setCompetencySlots((prev) => prev.map((slot) => (slot.number === number ? { ...slot, description: value } : slot)))
  }

  const handleBoundaryBooleanChange = (
    field: keyof Omit<
      BoundaryForm,
      'id' | 'company_type_description' | 'company_requirements_for_level_2_3' | 'project_minimum_elements'
    >,
    value: boolean
  ) => {
    setBoundaryForm((prev) => {
      if (field === 'not_relevant' && value) {
        return {
          ...prev,
          not_relevant: true,
          large_company: false,
          medium_company: false,
          small_company: false,
          family_enterprise: false,
        }
      }
      if (field === 'not_relevant') {
        return { ...prev, not_relevant: value }
      }
      return { ...prev, [field]: value, not_relevant: value ? false : prev.not_relevant }
    })
  }

  const handleBoundaryTextChange = (
    field: 'company_type_description' | 'company_requirements_for_level_2_3' | 'project_minimum_elements',
    value: string
  ) => {
    setBoundaryForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleApi2Change = (field: keyof Omit<Api2Form, 'id'>, value: string) => {
    setApi2Form((prev) => ({ ...prev, [field]: value }))
  }

  const handleApi3Change = (field: keyof Omit<Api3Form, 'id'>, value: string) => {
    setApi3Form((prev) => ({ ...prev, [field]: value }))
  }

  const handleAlternanceChange = (field: keyof Omit<AlternanceForm, 'id'>, value: string) => {
    setAlternanceForm((prev) => ({
      ...prev,
      [field]: ['students_quota', 'alternance_hours'].includes(field) ? Number(value) || 0 : value,
    }))
  }

  async function handleSaveCompetencies() {
    if (!selected) return
    const normalized = competencySlots.map((slot) => ({ ...slot, description: slot.description.trim() }))
    const filled = normalized.filter((slot) => slot.description.length > 0)
    if (filled.length === 0) {
      toast.error('Debes registrar al menos una competencia tecnica')
      return
    }
    setSavingCompetencies(true)
    try {
      const operations = normalized
        .filter((slot) => slot.description.length > 0)
        .map((slot) =>
          slot.id
            ? updateSubjectCompetency(slot.id, { description: slot.description })
            : createSubjectCompetency({ subject: selected.id, number: slot.number, description: slot.description })
        )
      await Promise.all(operations)
      toast.success('Competencias guardadas')
      await loadSubjectCompetencies(selected.id)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudieron guardar las competencias'
      toast.error(msg)
    } finally {
      setSavingCompetencies(false)
    }
  }

  async function handleSaveBoundaryCondition() {
    if (!selected) return
    setBoundarySaving(true)
    setBoundaryError(null)
    try {
      if (boundaryForm.id) {
        await updateBoundaryCondition(boundaryForm.id, {
          large_company: boundaryForm.large_company,
          medium_company: boundaryForm.medium_company,
          small_company: boundaryForm.small_company,
          family_enterprise: boundaryForm.family_enterprise,
          not_relevant: boundaryForm.not_relevant,
          company_type_description: boundaryForm.company_type_description,
          company_requirements_for_level_2_3: boundaryForm.company_requirements_for_level_2_3,
          project_minimum_elements: boundaryForm.project_minimum_elements,
        })
      } else {
        await createBoundaryCondition({
          subject: selected.id,
          large_company: boundaryForm.large_company ?? false,
          medium_company: boundaryForm.medium_company ?? false,
          small_company: boundaryForm.small_company ?? false,
          family_enterprise: boundaryForm.family_enterprise ?? false,
          not_relevant: boundaryForm.not_relevant ?? false,
          company_type_description: boundaryForm.company_type_description,
          company_requirements_for_level_2_3: boundaryForm.company_requirements_for_level_2_3,
          project_minimum_elements: boundaryForm.project_minimum_elements,
        })
      }
      toast.success('Condicion de borde guardada')
      await loadBoundaryCondition(selected.id)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo guardar la condicion de borde'
      toast.error(msg)
      setBoundaryError(msg)
    } finally {
      setBoundarySaving(false)
    }
  }

  async function handleSaveApi2() {
    if (!selected) return
    setApi2Saving(true)
    setApi2Error(null)
    try {
      if (api2Form.id) {
        await updateApiType2Completion(api2Form.id, {
          project_goal_students: api2Form.project_goal_students,
          deliverables_at_end: api2Form.deliverables_at_end,
          company_expected_participation: api2Form.company_expected_participation,
          other_activities: api2Form.other_activities,
        })
      } else {
        await createApiType2Completion({
          subject: selected.id,
          project_goal_students: api2Form.project_goal_students,
          deliverables_at_end: api2Form.deliverables_at_end,
          company_expected_participation: api2Form.company_expected_participation,
          other_activities: api2Form.other_activities,
        })
      }
      toast.success('Seccion API 2 guardada')
      await loadApiType2(selected.id)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo guardar la seccion API 2'
      toast.error(msg)
      setApi2Error(msg)
    } finally {
      setApi2Saving(false)
    }
  }

  async function handleSaveApi3() {
    if (!selected) return
    setApi3Saving(true)
    setApi3Error(null)
    try {
      if (api3Form.id) {
        await updateApiType3Completion(api3Form.id, {
          project_goal_students: api3Form.project_goal_students,
          deliverables_at_end: api3Form.deliverables_at_end,
          expected_student_role: api3Form.expected_student_role,
          other_activities: api3Form.other_activities,
          master_guide_expected_support: api3Form.master_guide_expected_support,
        })
      } else {
        await createApiType3Completion({
          subject: selected.id,
          project_goal_students: api3Form.project_goal_students,
          deliverables_at_end: api3Form.deliverables_at_end,
          expected_student_role: api3Form.expected_student_role,
          other_activities: api3Form.other_activities,
          master_guide_expected_support: api3Form.master_guide_expected_support,
        })
      }
      toast.success('Seccion API 3 guardada')
      await loadApiType3(selected.id)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo guardar la seccion API 3'
      toast.error(msg)
      setApi3Error(msg)
    } finally {
      setApi3Saving(false)
    }
  }

  async function handleSaveAlternance() {
    if (!selected) return
    setAlternanceSaving(true)
    setAlternanceError(null)
    try {
      if (alternanceForm.id) {
        await updateAlternance(alternanceForm.id, {
          student_role: alternanceForm.student_role,
          students_quota: alternanceForm.students_quota,
          tutor_name: alternanceForm.tutor_name,
          tutor_email: alternanceForm.tutor_email,
          alternance_hours: alternanceForm.alternance_hours,
        })
      } else {
        await createAlternance({
          subject: selected.id,
          student_role: alternanceForm.student_role,
          students_quota: alternanceForm.students_quota,
          tutor_name: alternanceForm.tutor_name,
          tutor_email: alternanceForm.tutor_email,
          alternance_hours: alternanceForm.alternance_hours,
        })
      }
      toast.success('Alternancia guardada')
      await loadAlternance(selected.id)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo guardar la alternancia'
      toast.error(msg)
      setAlternanceError(msg)
    } finally {
      setAlternanceSaving(false)
    }
  }

  const resetToList = () => {
    setMode('list')
    setSelected(null)
    setDetailError(null)
    setFormError(null)
    setFormValues(createEmptyFormValues())
    setCompetencySlots(createCompetencySlots())
    setCompetenciesError(null)
    setCompetenciesLoading(false)
    setSavingCompetencies(false)
    setBoundaryForm(createBoundaryForm())
    setBoundaryError(null)
    setBoundaryLoading(false)
    setBoundarySaving(false)
    setApi2Form(createApi2Form())
    setApi3Form(createApi3Form())
    setApi2Error(null)
    setApi3Error(null)
    setApi2Loading(false)
    setApi3Loading(false)
    setApi2Saving(false)
    setApi3Saving(false)
    setAlternanceForm(createAlternanceForm())
    setAlternanceError(null)
    setAlternanceLoading(false)
    setAlternanceSaving(false)
  }

  useEffect(() => {
    resetToList()
  }, [location.key])

  const cancelToView = () => {
    setFormError(null)
    if (selected) {
      setMode('view')
    } else {
      resetToList()
    }
  }

  async function handleSelect(subject: Subject) {
    setSelected(subject)
    setMode('view')
    setDetailError(null)
    setDetailLoading(true)
    setCompetencySlots(createCompetencySlots())
    setCompetenciesError(null)
    setSavingCompetencies(false)
    setBoundaryForm(createBoundaryForm())
    setBoundaryError(null)
    setBoundaryLoading(true)
    setApi2Form(createApi2Form())
    setApi3Form(createApi3Form())
    setApi2Error(null)
    setApi3Error(null)
    setAlternanceForm(createAlternanceForm())
    setAlternanceError(null)
    setApi2Loading(subject.api_type === 2)
    setApi3Loading(subject.api_type === 3)
    setAlternanceLoading(subject.api_type === 3)
    try {
      const detail = await getSubject(subject.id)
      setSelected(detail)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo obtener la asignatura'
      setDetailError(msg)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleEditClick = () => {
    if (!selected) return
    setMode('edit')
    setFormError(null)
    setFormValues(subjectToFormValues(selected))
  }

  async function handleSubmitEdit() {
    if (!selected) return
    const validation = validateForm(formValues)
    if (validation) {
      setFormError(validation)
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      await updateSubject(selected.id, buildUpdatePayload(formValues))
      const detail = await getSubject(selected.id)
      toast.success('Asignatura actualizada')
      await load()
      setSelected(detail)
      setMode('view')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo actualizar la asignatura'
      setFormError(msg)
    } finally {
      setSaving(false)
    }
  }

  if (mode === 'view' && selected) {
    return (
      <SubjectDetailView
        subject={selected}
        loading={detailLoading}
        error={detailError}
        onClose={resetToList}
        onEdit={handleEditClick}
        competencySlots={competencySlots}
        competenciesLoading={competenciesLoading}
        competenciesError={competenciesError}
        onCompetencyChange={handleCompetencyChange}
        onSaveCompetencies={handleSaveCompetencies}
        savingCompetencies={savingCompetencies}
        boundaryForm={boundaryForm}
        boundaryLoading={boundaryLoading}
        boundaryError={boundaryError}
        onBoundaryBooleanChange={handleBoundaryBooleanChange}
        onBoundaryTextChange={handleBoundaryTextChange}
        onSaveBoundary={handleSaveBoundaryCondition}
        boundarySaving={boundarySaving}
        api2Form={api2Form}
        api2Loading={api2Loading}
        api2Error={api2Error}
        onApi2Change={handleApi2Change}
        onSaveApi2={handleSaveApi2}
        api2Saving={api2Saving}
        api3Form={api3Form}
        api3Loading={api3Loading}
        api3Error={api3Error}
        onApi3Change={handleApi3Change}
        onSaveApi3={handleSaveApi3}
        api3Saving={api3Saving}
        alternanceForm={alternanceForm}
        alternanceLoading={alternanceLoading}
        alternanceError={alternanceError}
        onAlternanceChange={handleAlternanceChange}
        onSaveAlternance={handleSaveAlternance}
        alternanceSaving={alternanceSaving}
      />
    )
  }

  if (mode === 'edit' && selected) {
    return (
      <SubjectFormView
        values={formValues}
        onChange={handleFormChange}
        onSubmit={handleSubmitEdit}
        onCancel={cancelToView}
        areas={areas}
        semesters={semesters}
        careers={careers}
        teachers={teachers}
        loading={saving}
        metaLoading={metaLoading}
        error={formError || metaError}
      />
    )
  }

  return (
    <section className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Asignaturas</h1>
          <p className="text-sm text-zinc-600">Listado para Director de area/carrera</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por codigo, seccion o nombre"
            className="w-72 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
        </div>
      </div>

      {error ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <Th>Codigo</Th>
              <Th>Seccion</Th>
          <Th>Nombre</Th>
          <Th>Area</Th>
          <Th>Carrera</Th>
          <Th>Docente</Th>
          <Th>Total estudiantes</Th>
          <Th>Fase</Th>
        </tr>
      </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {loading ? (
              <tr>
                <td className="p-4 text-sm text-zinc-600" colSpan={8}>Cargando...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="p-4 text-sm text-zinc-600" colSpan={8}>Sin resultados</td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => handleSelect(s)}
                  className="cursor-pointer transition-colors hover:bg-zinc-50"
                >
                  <Td>{s.code}</Td>
                  <Td>{s.section}</Td>
          <Td>{s.name}</Td>
          <Td>{s.area_name}</Td>
          <Td>{s.career_name || '-'}</Td>
          <Td>{s.teacher_name || '-'}</Td>
          <Td>{s.total_students ?? '-'}</Td>
                  <Td>{phaseLabel(s.phase)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function SubjectDetailView({
  subject,
  loading,
  error,
  onClose,
  onEdit,
  competencySlots,
  competenciesLoading,
  competenciesError,
  onCompetencyChange,
  onSaveCompetencies,
  savingCompetencies,
  boundaryForm,
  boundaryLoading,
  boundaryError,
  onBoundaryBooleanChange,
  onBoundaryTextChange,
  onSaveBoundary,
  boundarySaving,
  api2Form,
  api2Loading,
  api2Error,
  onApi2Change,
  onSaveApi2,
  api2Saving,
  api3Form,
  api3Loading,
  api3Error,
  onApi3Change,
  onSaveApi3,
  api3Saving,
  alternanceForm,
  alternanceLoading,
  alternanceError,
  onAlternanceChange,
  onSaveAlternance,
  alternanceSaving,
}: {
  subject: Subject
  loading: boolean
  error: string | null
  onClose: () => void
  onEdit: () => void
  competencySlots: CompetencySlot[]
  competenciesLoading: boolean
  competenciesError: string | null
  onCompetencyChange: (number: number, value: string) => void
  onSaveCompetencies: () => void | Promise<void>
  savingCompetencies: boolean
  boundaryForm: BoundaryForm
  boundaryLoading: boolean
  boundaryError: string | null
  onBoundaryBooleanChange: (
    field: keyof Omit<BoundaryForm, 'id' | 'company_type_description' | 'company_requirements_for_level_2_3' | 'project_minimum_elements'>,
    value: boolean
  ) => void
  onBoundaryTextChange: (field: 'company_type_description' | 'company_requirements_for_level_2_3' | 'project_minimum_elements', value: string) => void
  onSaveBoundary: () => void | Promise<void>
  boundarySaving: boolean
  api2Form: Api2Form
  api2Loading: boolean
  api2Error: string | null
  onApi2Change: (field: keyof Omit<Api2Form, 'id'>, value: string) => void
  onSaveApi2: () => void | Promise<void>
  api2Saving: boolean
  api3Form: Api3Form
  api3Loading: boolean
  api3Error: string | null
  onApi3Change: (field: keyof Omit<Api3Form, 'id'>, value: string) => void
  onSaveApi3: () => void | Promise<void>
  api3Saving: boolean
  alternanceForm: AlternanceForm
  alternanceLoading: boolean
  alternanceError: string | null
  onAlternanceChange: (field: keyof Omit<AlternanceForm, 'id'>, value: string) => void
  onSaveAlternance: () => void | Promise<void>
  alternanceSaving: boolean
}) {
  const [openInfo, setOpenInfo] = useState(true)
  const [openCompetencies, setOpenCompetencies] = useState(false)
  const [openBoundary, setOpenBoundary] = useState(false)
  const [openApi2, setOpenApi2] = useState(false)
  const [openApi3, setOpenApi3] = useState(false)
  const [openAlternance, setOpenAlternance] = useState(false)

  useEffect(() => {
    setOpenInfo(true)
    setOpenCompetencies(false)
    setOpenBoundary(false)
    setOpenApi2(false)
    setOpenApi3(false)
    setOpenAlternance(false)
  }, [subject.id, subject.api_type])

  return (
    <section className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">{subject.name}</h1>
          <p className="text-sm text-zinc-600">
            {subject.code}-{subject.section} - {formatPeriod(subject)}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:border-zinc-400"
        >
          Cerrar
        </button>
      </div>
      <CollapsibleSection
        title="Informacion de la asignatura"
        open={openInfo}
        onToggle={() => setOpenInfo((v) => !v)}
        actions={
          <button
            onClick={onEdit}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Editar
          </button>
        }
      >
        {loading ? (
          <div className="mb-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
            Actualizando informacion...
          </div>
        ) : null}
        {error ? (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}
        <dl className="grid gap-4 sm:grid-cols-2">
          <DetailRow label="Codigo" value={subject.code} />
          <DetailRow label="Seccion" value={subject.section} />
          <DetailRow label="Campus" value={subject.campus || '-'} />
          <DetailRow label="Jornada" value={subject.shift || '-'} />
          <DetailRow label="Horas" value={subject.hours} />
          <DetailRow label="Total estudiantes" value={subject.total_students ?? '-'} />
          <DetailRow label="Tipo API" value={subject.api_type} />
          <DetailRow label="Fase" value={phaseLabel(subject.phase)} />
          <DetailRow label="Area" value={subject.area_name || '-'} />
          <DetailRow label="Carrera" value={subject.career_name || '-'} />
          <DetailRow label="Docente" value={subject.teacher_name || '-'} />
          <DetailRow label="Periodo" value={formatPeriod(subject)} />
        </dl>
      </CollapsibleSection>

      <CollapsibleSection
        title="Competencias tecnicas"
        open={openCompetencies}
        onToggle={() => setOpenCompetencies((v) => !v)}
      >
        <SubjectCompetenciesPanel
          slots={competencySlots}
          loading={competenciesLoading}
          error={competenciesError}
          onChange={onCompetencyChange}
          onSaveAll={onSaveCompetencies}
          saving={savingCompetencies}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Condiciones de borde"
        open={openBoundary}
        onToggle={() => setOpenBoundary((v) => !v)}
      >
        <BoundaryConditionPanel
          form={boundaryForm}
          loading={boundaryLoading}
          error={boundaryError}
          onBooleanChange={onBoundaryBooleanChange}
          onTextChange={onBoundaryTextChange}
          onSave={onSaveBoundary}
          saving={boundarySaving}
        />
      </CollapsibleSection>

      {subject.api_type === 2 ? (
        <CollapsibleSection
          title="API Tipo 2"
          open={openApi2}
          onToggle={() => setOpenApi2((v) => !v)}
        >
          <ApiType2Panel
            form={api2Form}
            loading={api2Loading}
            error={api2Error}
            onChange={onApi2Change}
            onSave={onSaveApi2}
            saving={api2Saving}
          />
        </CollapsibleSection>
      ) : null}
      {subject.api_type === 3 ? (
        <CollapsibleSection
          title="API Tipo 3"
          open={openApi3}
          onToggle={() => setOpenApi3((v) => !v)}
        >
          <ApiType3Panel
            form={api3Form}
            loading={api3Loading}
            error={api3Error}
            onChange={onApi3Change}
            onSave={onSaveApi3}
            saving={api3Saving}
          />
        </CollapsibleSection>
      ) : null}
      {subject.api_type === 3 ? (
        <CollapsibleSection
          title="Alternancia (API 3)"
          open={openAlternance}
          onToggle={() => setOpenAlternance((v) => !v)}
        >
          <AlternancePanel
            form={alternanceForm}
            loading={alternanceLoading}
            error={alternanceError}
            onChange={onAlternanceChange}
            onSave={onSaveAlternance}
            saving={alternanceSaving}
          />
        </CollapsibleSection>
      ) : null}
    </section>
  )
}

function CollapsibleSection({
  title,
  open,
  onToggle,
  actions,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-zinc-50"
      >
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-zinc-900">{title}</span>
          <span className="text-xs text-zinc-500">{open ? 'Ocultar' : 'Mostrar'}</span>
        </div>
        <div className="flex items-center gap-3">
          {actions}
          <span className="text-lg text-zinc-500">{open ? '▾' : '▸'}</span>
        </div>
      </button>
      {open ? <div className="border-t border-zinc-100 p-4 sm:p-6">{children}</div> : null}
    </div>
  )
}

function SubjectCompetenciesPanel({
  slots,
  loading,
  error,
  onChange,
  onSaveAll,
  saving,
}: {
  slots: CompetencySlot[]
  loading: boolean
  error: string | null
  onChange: (number: number, value: string) => void
  onSaveAll: () => void | Promise<void>
  saving: boolean
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-zinc-900">Competencias tecnicas</h2>
        <p className="text-sm text-zinc-500">Minimo 1 y maximo 5 competencias por asignatura.</p>
      </div>
      {loading ? (
        <div className="mb-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
          Cargando competencias...
        </div>
      ) : null}
      {error ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}
      <div className="space-y-3">
        {slots.map((slot) => (
          <div key={slot.number} className="rounded-md border border-dashed border-zinc-300 bg-white/70 p-3 shadow-sm">
            <textarea
              value={slot.description}
              onChange={(e) => onChange(slot.number, e.target.value)}
              placeholder="Ingresa la competencia tecnica"
              className="h-24 w-full resize-none border-none bg-transparent text-sm text-zinc-800 outline-none focus:outline-none"
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => {
            void onSaveAll()
          }}
          disabled={loading || saving}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

function BoundaryConditionPanel({
  form,
  loading,
  error,
  onBooleanChange,
  onTextChange,
  onSave,
  saving,
}: {
  form: BoundaryForm
  loading: boolean
  error: string | null
  onBooleanChange: (
    field: keyof Omit<BoundaryForm, 'id' | 'company_type_description' | 'company_requirements_for_level_2_3' | 'project_minimum_elements'>,
    value: boolean
  ) => void
  onTextChange: (field: 'company_type_description' | 'company_requirements_for_level_2_3' | 'project_minimum_elements', value: string) => void
  onSave: () => void | Promise<void>
  saving: boolean
}) {
  const booleanFields: Array<{
    key: keyof Omit<BoundaryForm, 'id' | 'company_type_description' | 'company_requirements_for_level_2_3' | 'project_minimum_elements'>
    label: string
  }> = [
    { key: 'large_company', label: 'Empresa grande' },
    { key: 'medium_company', label: 'Empresa mediana' },
    { key: 'small_company', label: 'Empresa pequena' },
    { key: 'family_enterprise', label: 'Empresa familiar' },
    { key: 'not_relevant', label: 'No es relevante para el desarrollo de la asignatura' },
  ]
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-zinc-900">Condiciones de borde</h2>
        <p className="text-sm text-zinc-500">Definen el tipo de empresa y sus requisitos para implementar API en la asignatura</p>
      </div>
      {loading ? (
        <div className="mb-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">Cargando condicion...</div>
      ) : null}
      {error ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}
      <div className="flex flex-col gap-2">
        {booleanFields.map((field) => (
          <label key={field.key} className="inline-flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={!!form[field.key]}
              onChange={(e) => onBooleanChange(field.key, e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-600/30"
            />
            {field.label}
          </label>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Tipo de empresa / descripcion
          </label>
          <textarea
            value={form.company_type_description}
            onChange={(e) => onTextChange('company_type_description', e.target.value)}
            className="h-24 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-800 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            placeholder="Describe el tipo de empresa ideal"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Requisitos para niveles 2 y 3
          </label>
          <textarea
            value={form.company_requirements_for_level_2_3}
            onChange={(e) => onTextChange('company_requirements_for_level_2_3', e.target.value)}
            className="h-24 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-800 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            placeholder="Detalla requisitos clave"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Elementos minimos del proyecto
          </label>
          <textarea
            value={form.project_minimum_elements}
            onChange={(e) => onTextChange('project_minimum_elements', e.target.value)}
            className="h-24 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-800 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            placeholder="Describe los elementos minimos"
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => {
            void onSave()
          }}
          disabled={saving || loading}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

function ApiType2Panel({
  form,
  loading,
  error,
  onChange,
  onSave,
  saving,
}: {
  form: Api2Form
  loading: boolean
  error: string | null
  onChange: (field: keyof Omit<Api2Form, 'id'>, value: string) => void
  onSave: () => void | Promise<void>
  saving: boolean
}) {
  const fields: Array<{ key: keyof Omit<Api2Form, 'id'>; label: string; placeholder: string }> = [
    { key: 'project_goal_students', label: 'Objetivo del proyecto para estudiantes', placeholder: 'Describe el objetivo del proyecto' },
    { key: 'deliverables_at_end', label: 'Entregables', placeholder: 'Lista los entregables finales' },
    { key: 'company_expected_participation', label: 'Participacion esperada de la empresa', placeholder: 'Describe la participacion de la empresa' },
    { key: 'other_activities', label: 'Otras actividades', placeholder: 'Indica actividades complementarias' },
  ]
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-zinc-900">API Tipo 2</h2>
        <p className="text-sm text-zinc-500">Completa los campos descriptivos para la API tipo 2.</p>
      </div>
      {loading ? (
        <div className="mb-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">Cargando API 2...</div>
      ) : null}
      {error ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}
      <div className="space-y-3">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">{field.label}</label>
            <textarea
              value={form[field.key]}
              onChange={(e) => onChange(field.key, e.target.value)}
              className="h-28 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-800 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              placeholder={field.placeholder}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => {
            void onSave()
          }}
          disabled={saving || loading}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

function ApiType3Panel({
  form,
  loading,
  error,
  onChange,
  onSave,
  saving,
}: {
  form: Api3Form
  loading: boolean
  error: string | null
  onChange: (field: keyof Omit<Api3Form, 'id'>, value: string) => void
  onSave: () => void | Promise<void>
  saving: boolean
}) {
  const fields: Array<{ key: keyof Omit<Api3Form, 'id'>; label: string; placeholder: string }> = [
    { key: 'project_goal_students', label: 'Objetivo del proyecto para estudiantes', placeholder: 'Describe el objetivo del proyecto' },
    { key: 'deliverables_at_end', label: 'Entregables', placeholder: 'Lista los entregables finales' },
    { key: 'expected_student_role', label: 'Rol esperado del estudiante', placeholder: 'Describe el rol del estudiante' },
    { key: 'other_activities', label: 'Otras actividades', placeholder: 'Indica actividades complementarias' },
    { key: 'master_guide_expected_support', label: 'Apoyo esperado de guia maestro', placeholder: 'Describe el apoyo requerido' },
  ]
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-zinc-900">API Tipo 3</h2>
        <p className="text-sm text-zinc-500">Completa los campos descriptivos para la API tipo 3.</p>
      </div>
      {loading ? (
        <div className="mb-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">Cargando API 3...</div>
      ) : null}
      {error ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}
      <div className="space-y-3">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">{field.label}</label>
            <textarea
              value={form[field.key]}
              onChange={(e) => onChange(field.key, e.target.value)}
              className="h-28 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-800 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              placeholder={field.placeholder}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => {
            void onSave()
          }}
          disabled={saving || loading}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

function AlternancePanel({
  form,
  loading,
  error,
  onChange,
  onSave,
  saving,
}: {
  form: AlternanceForm
  loading: boolean
  error: string | null
  onChange: (field: keyof Omit<AlternanceForm, 'id'>, value: string) => void
  onSave: () => void | Promise<void>
  saving: boolean
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-zinc-900">Alternancia API 3</h2>
        <p className="text-sm text-zinc-500">Información del modelo de alternancia para esta asignatura.</p>
      </div>
      {loading ? (
        <div className="mb-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
          Cargando alternancia...
        </div>
      ) : null}
      {error ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Rol del estudiante</label>
          <input
            value={form.student_role}
            onChange={(e) => onChange('student_role', e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Cupo de estudiantes</label>
          <input
            type="number"
            min={0}
            value={form.students_quota}
            onChange={(e) => onChange('students_quota', e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Horas de alternancia</label>
          <input
            type="number"
            min={0}
            value={form.alternance_hours}
            onChange={(e) => onChange('alternance_hours', e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Nombre tutor</label>
          <input
            value={form.tutor_name}
            onChange={(e) => onChange('tutor_name', e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Email tutor</label>
          <input
            type="email"
            value={form.tutor_email}
            onChange={(e) => onChange('tutor_email', e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => {
            void onSave()
          }}
          disabled={saving || loading}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

function SubjectFormView({
  values,
  onChange,
  onSubmit,
  onCancel,
  areas,
  semesters,
  careers,
  teachers,
  loading,
  metaLoading,
  error,
}: {
  values: SubjectFormValues
  onChange: (field: keyof SubjectFormValues, value: string) => void
  onSubmit: () => void | Promise<void>
  onCancel: () => void
  areas: Area[]
  semesters: SemesterLevel[]
  careers: Career[]
  teachers: Teacher[]
  loading: boolean
  metaLoading: boolean
  error: string | null
}) {
  const availableCareers = useMemo(() => {
    if (!values.area) return careers
    return careers.filter((career) => String(career.area) === values.area)
  }, [values.area, careers])

  return (
    <section className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Editar asignatura</h1>
          <p className="text-sm text-zinc-600">Actualiza los datos principales de la asignatura seleccionada.</p>
        </div>
        <button
          onClick={onCancel}
          className="text-sm font-medium text-red-600 hover:text-red-700"
        >
          ← Volver
        </button>
      </div>

      {metaLoading ? (
        <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
          Cargando catalogos...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <form
        className="rounded-lg border border-zinc-200 bg-white p-6"
        onSubmit={(e) => {
          e.preventDefault()
          void onSubmit()
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Codigo">
            <input
              value={values.code}
              onChange={(e) => onChange('code', e.target.value)}
              placeholder="API101"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
          </FormField>
          <FormField label="Seccion">
            <input
              value={values.section}
              onChange={(e) => onChange('section', e.target.value)}
              placeholder="01"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
          </FormField>
          <FormField label="Nombre">
            <input
              value={values.name}
              onChange={(e) => onChange('name', e.target.value)}
              placeholder="Nombre de la asignatura"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
          </FormField>
          <FormField label="Campus">
            <input
              value={values.campus}
              onChange={(e) => onChange('campus', e.target.value)}
              placeholder="Casa Central"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
          </FormField>
          <FormField label="Jornada">
            <input
              value={values.shift}
              onChange={(e) => onChange('shift', e.target.value)}
              placeholder="Diurna/Vespertina"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
          </FormField>
          <FormField label="Horas">
            <input
              type="number"
              min={1}
              value={values.hours}
              onChange={(e) => onChange('hours', e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
          </FormField>
          <FormField label="Total estudiantes">
            <input
              type="number"
              min={0}
              value={values.total_students}
              onChange={(e) => onChange('total_students', e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
          </FormField>
          <FormField label="Tipo API">
            <input
              type="number"
              min={1}
              value={values.api_type}
              onChange={(e) => onChange('api_type', e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
          </FormField>
          <FormField label="Area">
            <select
              value={values.area}
              onChange={(e) => onChange('area', e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            >
              <option value="">Selecciona un area</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Carrera">
            <select
              value={values.career}
              onChange={(e) => onChange('career', e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            >
              <option value="">Sin carrera asignada</option>
              {availableCareers.map((career) => (
                <option key={career.id} value={career.id}>
                  {career.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Semestre">
            <select
              value={values.semester}
              onChange={(e) => onChange('semester', e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            >
              <option value="">Selecciona un semestre</option>
              {semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Docente">
            <select
              value={values.teacher}
              onChange={(e) => onChange('teacher', e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            >
              <option value="">Sin docente asignado</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {`${teacher.first_name} ${teacher.last_name}`.trim() || teacher.email}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:border-zinc-400"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-70"
          >
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </section>
  )
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-zinc-700">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
      {children}
    </label>
  )
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  const display = value === undefined || value === null || value === '' ? '-' : value
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-sm text-zinc-900">{display}</div>
    </div>
  )
}

function Th({ children, className = '' }: { children: any; className?: string }) {
  return (
    <th className={`px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 ${className}`}>
      {children}
    </th>
  )
}

function Td({ children, className = '' }: { children: any; className?: string }) {
  return <td className={`px-4 py-2 text-sm text-zinc-800 ${className}`}>{children}</td>
}

function phaseLabel(v: string) {
  const map: Record<string, string> = {
    inicio: 'Inicio',
    formulacion: 'Formulacion',
    gestion: 'Gestion',
    validacion: 'Validacion',
    completado: 'Completado',
  }
  return map[v] || v
}

function formatPeriod(subject: Subject) {
  if (subject.period_code) return subject.period_code
  const season = subject.period_season ? subject.period_season.toUpperCase() : ''
  const year = subject.period_year ? String(subject.period_year) : ''
  return [season, year].filter(Boolean).join('-') || 'Sin periodo'
}
