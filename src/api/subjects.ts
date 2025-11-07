import http from '../lib/http'

export type Subject = {
  id: number
  code: string
  section: string
  name: string
  campus: string
  shift: string
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
