import http from '../lib/http'

export type Company = {
  id: number
  name: string
  address: string
  management_address: string
  spys_responsible_name: string
  email: string
  phone: string
  employees_count: number
  sector: string
}

export async function listCompanies(params?: { search?: string }) {
  const { data } = await http.get<Company[]>('/companies/', { params })
  return data
}

export async function createCompany(payload: Omit<Company, 'id'>) {
  const { data } = await http.post<Company>('/companies/', payload)
  return data
}

export async function updateCompany(id: number, payload: Partial<Omit<Company, 'id'>>) {
  const { data } = await http.patch<Company>(`/companies/${id}/`, payload)
  return data
}

export async function deleteCompany(id: number) {
  await http.delete(`/companies/${id}/`)
}

export type ProblemStatement = {
  id: number
  problem_to_address: string
  why_important: string
  stakeholders: string
  related_area: string
  benefits_short_medium_long_term: string
  problem_definition: string
  subject: number
  company: number
}

export async function listProblemStatements(params?: { subject?: number; company?: number }) {
  const { data } = await http.get<ProblemStatement[]>('/problem-statements/', { params })
  return data
}

export async function getCompany(id: number) {
  const { data } = await http.get<Company>(`/companies/${id}/`)
  return data
}

export async function createProblemStatement(payload: Omit<ProblemStatement, 'id'>) {
  const { data } = await http.post<ProblemStatement>('/problem-statements/', payload)
  return data
}

export async function updateProblemStatement(id: number, payload: Partial<Omit<ProblemStatement, 'id'>>) {
  const { data } = await http.patch<ProblemStatement>(`/problem-statements/${id}/`, payload)
  return data
}

export async function deleteProblemStatement(id: number) {
  await http.delete(`/problem-statements/${id}/`)
}

export type CompanyEngagementScope = {
  id: number
  benefits_from_student: string
  has_value_or_research_project: boolean
  time_availability_and_participation: string
  workplace_has_conditions_for_group: boolean
  meeting_schedule_availability: string
  company: number
  subject_code: string
  subject_section: string
}

export async function listEngagementScopes(params?: {
  company?: number
  subject_code?: string
  subject_section?: string
}) {
  const { data } = await http.get<CompanyEngagementScope[]>('/engagement-scopes/', { params })
  return data
}

export async function createEngagementScope(payload: Omit<CompanyEngagementScope, 'id'>) {
  const { data } = await http.post<CompanyEngagementScope>('/engagement-scopes/', payload)
  return data
}

export async function updateEngagementScope(
  id: number,
  payload: Partial<Omit<CompanyEngagementScope, 'id'>>,
) {
  const { data } = await http.patch<CompanyEngagementScope>(`/engagement-scopes/${id}/`, payload)
  return data
}

export async function deleteEngagementScope(id: number) {
  await http.delete(`/engagement-scopes/${id}/`)
}

