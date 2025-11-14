import http from '../lib/http'

export type Subject = {
  id: number
  code: string
  section: string
  name: string
  campus: string
  shift: string
  phase: string
  hours: number
  api_type: number
  teacher: number | null
  teacher_name?: string | null
  area: number
  area_name?: string
  career: number | null
  career_name?: string | null
  semester: number
  semester_name?: string
  descriptors?: Descriptor[]
}

export async function listSubjects() {
  const { data } = await http.get<Subject[]>(`/subjects/`)
  return data
}

export type BasicSubject = { id: number; code: string; section: string; name: string }
export async function listSubjectCodeSections() {
  try {
    const { data } = await http.get<BasicSubject[]>(`/subjects/code-sections/`)
    if (Array.isArray(data) && data.length > 0) return data
  } catch (_) {
    // fallback abajo
  }
  // Fallback: obtener desde /subjects/ y mapear a campos básicos
  try {
    const { data } = await http.get<Subject[]>(`/subjects/`)
    return (data || []).map((s) => ({ id: s.id, code: s.code, section: s.section, name: s.name }))
  } catch (e) {
    throw e
  }
}

export async function createSubject(
  payload: Pick<Subject, 'code' | 'section' | 'name' | 'hours' | 'api_type' | 'campus' | 'area' | 'semester'> & {
    teacher?: number | null
  }
) {
  const { data } = await http.post<Subject>(`/subjects/`, payload)
  return data
}

export async function updateSubject(id: number, payload: Partial<Subject>) {
  const { data } = await http.patch<Subject>(`/subjects/${id}/`, payload)
  return data
}

export async function deleteSubject(id: number) {
  await http.delete(`/subjects/${id}/`)
}

export type Descriptor = {
  id: number
  subject: number | null
  file: string
  is_scanned: boolean
  text_cache?: string
  processed_at?: string | null
}

export async function uploadDescriptor(file: File, subjectId?: number | null) {
  const form = new FormData()
  if (typeof subjectId === 'number') {
    form.append('subject', String(subjectId))
  } else if (subjectId === null) {
    form.append('subject', '')
  }
  form.append('file', file)
  const { data } = await http.post<Descriptor>(`/descriptors/`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function processDescriptor(id: number) {
  await http.post(`/descriptors/${id}/process/`)
}

export async function getDescriptor(id: number) {
  const { data } = await http.get<Descriptor>(`/descriptors/${id}/`)
  return data
}

export async function listDescriptorsBySubject(subjectId: number) {
  const { data } = await http.get<Descriptor[]>(`/descriptors/`, { params: { subject: subjectId } })
  return data
}

export type Area = { id: number; name: string }
export async function listAreas() {
  const { data } = await http.get<Area[]>(`/areas/`)
  return data
}

export async function getArea(id: number) {
  const { data } = await http.get<Area>(`/areas/${id}/`)
  return data
}

export type SemesterLevel = { id: number; name: string }
export async function listSemesters() {
  const { data } = await http.get<SemesterLevel[]>(`/subject-semesters/`)
  return data
}

export type Career = { id: number; name: string; area: number; area_name?: string }
export async function listCareers() {
  const { data } = await http.get<Career[]>(`/careers/`)
  return data
}

export async function getCareer(id: number) {
  const { data } = await http.get<Career>(`/careers/${id}/`)
  return data
}

export type SubjectUnit = {
  id: number
  subject: number
  number: number
  expected_learning?: string | null
  unit_hours?: number | null
  activities_description?: string | null
  evaluation_evidence?: string | null
  evidence_detail?: string | null
  counterpart_link?: string | null
  place_mode_type?: string | null
  counterpart_participant_name?: string | null
}

export async function listSubjectUnits(subjectId: number) {
  const { data } = await http.get<SubjectUnit[]>(`/subject-units/`, { params: { subject: subjectId } })
  return data
}

export async function updateSubjectUnit(id: number, payload: Partial<SubjectUnit>) {
  const { data } = await http.patch<SubjectUnit>(`/subject-units/${id}/`, payload)
  return data
}

export async function createSubjectUnit(payload: Omit<SubjectUnit, 'id'>) {
  const { data } = await http.post<SubjectUnit>(`/subject-units/`, payload)
  return data
}

export type SubjectCompetency = {
  id: number
  subject: number
  number: number
  description: string
}

export async function listSubjectCompetencies(subjectId: number) {
  const { data } = await http.get<SubjectCompetency[]>(`/subject-competencies/`, { params: { subject: subjectId } })
  return data
}

export async function createSubjectCompetency(payload: Omit<SubjectCompetency, 'id'>) {
  const { data } = await http.post<SubjectCompetency>(`/subject-competencies/`, payload)
  return data
}

export async function updateSubjectCompetency(
  id: number,
  payload: Partial<Omit<SubjectCompetency, 'id' | 'subject' | 'number'>>
) {
  const { data } = await http.patch<SubjectCompetency>(`/subject-competencies/${id}/`, payload)
  return data
}

export type CompanyBoundaryCondition = {
  id: number
  subject: number
  large_company: boolean
  medium_company: boolean
  small_company: boolean
  family_enterprise: boolean
  not_relevant: boolean
  company_type_description: string
  company_requirements_for_level_2_3: string
  project_minimum_elements: string
}

export async function listBoundaryConditions() {
  const { data } = await http.get<CompanyBoundaryCondition[]>(`/boundary-conditions/`)
  return data
}

export async function getBoundaryConditionBySubject(subjectId: number) {
  const { data } = await http.get<CompanyBoundaryCondition[]>(`/boundary-conditions/`, {
    params: { subject: subjectId },
  })
  return data?.[0] ?? null
}

export async function createBoundaryCondition(payload: Omit<CompanyBoundaryCondition, 'id'>) {
  const { data } = await http.post<CompanyBoundaryCondition>(`/boundary-conditions/`, payload)
  return data
}

export async function updateBoundaryCondition(
  id: number,
  payload: Partial<Omit<CompanyBoundaryCondition, 'id' | 'subject'>>
) {
  const { data } = await http.patch<CompanyBoundaryCondition>(`/boundary-conditions/${id}/`, payload)
  return data
}

export type CompanyRequirement = {
  id: number
  sector: string
  worked_before: boolean
  interest_collaborate: boolean
  can_develop_activities: boolean
  willing_design_project: boolean
  interaction_type: string[]
  has_guide: boolean
  can_receive_alternance: boolean
  alternance_students_quota: number | null
  subject: number
  company: number
}

export async function listCompanyRequirements() {
  const { data } = await http.get<CompanyRequirement[]>(`/company-requirements/`)
  return data
}

export async function createCompanyRequirement(payload: Omit<CompanyRequirement, 'id'>) {
  const { data } = await http.post<CompanyRequirement>(`/company-requirements/`, payload)
  return data
}

export async function updateCompanyRequirement(id: number, payload: Partial<Omit<CompanyRequirement, 'id'>>) {
  const { data } = await http.patch<CompanyRequirement>(`/company-requirements/${id}/`, payload)
  return data
}

export type ApiType2Completion = {
  id: number
  subject: number
  project_goal_students: string
  deliverables_at_end: string
  company_expected_participation: string
  other_activities: string
}

export async function getApiType2CompletionBySubject(subjectId: number) {
  const { data } = await http.get<ApiType2Completion[]>(`/api2-completions/`, { params: { subject: subjectId } })
  return data?.[0] ?? null
}

export async function createApiType2Completion(payload: Omit<ApiType2Completion, 'id'>) {
  const { data } = await http.post<ApiType2Completion>(`/api2-completions/`, payload)
  return data
}

export async function updateApiType2Completion(
  id: number,
  payload: Partial<Omit<ApiType2Completion, 'id' | 'subject'>>
) {
  const { data } = await http.patch<ApiType2Completion>(`/api2-completions/${id}/`, payload)
  return data
}

export type ApiType3Completion = {
  id: number
  subject: number
  project_goal_students: string
  deliverables_at_end: string
  expected_student_role: string
  other_activities: string
  master_guide_expected_support: string
}

export async function getApiType3CompletionBySubject(subjectId: number) {
  const { data } = await http.get<ApiType3Completion[]>(`/api3-completions/`, { params: { subject: subjectId } })
  return data?.[0] ?? null
}

export async function createApiType3Completion(payload: Omit<ApiType3Completion, 'id'>) {
  const { data } = await http.post<ApiType3Completion>(`/api3-completions/`, payload)
  return data
}

export async function updateApiType3Completion(
  id: number,
  payload: Partial<Omit<ApiType3Completion, 'id' | 'subject'>>
) {
  const { data } = await http.patch<ApiType3Completion>(`/api3-completions/${id}/`, payload)
  return data
}

export async function getSubject(id: number) {
  const { data } = await http.get<Subject>(`/subjects/${id}/`)
  return data
}

// -----------------
// Schedules de fases (soporte backend actual)
// -----------------

export type SubjectPhaseSchedule = {
  id: number
  subject: number
  phase: string
  days_allocated: number
  start_date: string | null
  end_date: string | null
}

export async function listSubjectPhaseSchedules(subjectId: number) {
  const { data } = await http.get<SubjectPhaseSchedule[]>(`/subject-phase-schedules/`, { params: { subject: subjectId } })
  return data
}

// API 3 Alternance
export type Api3Alternance = {
  id: number
  student_role: string
  students_quota: number
  tutor_name: string
  tutor_email: string
  alternance_hours: number
  subject: number
}

export async function listAlternances() {
  const { data } = await http.get<Api3Alternance[]>(`/alternances/`)
  return data
}

export async function createAlternance(payload: Omit<Api3Alternance, 'id'>) {
  const { data } = await http.post<Api3Alternance>(`/alternances/`, payload)
  return data
}

export async function updateAlternance(id: number, payload: Partial<Omit<Api3Alternance, 'id'>>) {
  const { data } = await http.patch<Api3Alternance>(`/alternances/${id}/`, payload)
  return data
}

