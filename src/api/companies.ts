import http from '../lib/http'

export type CounterpartContact = {
  id?: number
  name: string
  rut: string
  phone: string
  email: string
  counterpart_area: string
  role: string
  company?: number
}

export type Company = {
  id: number
  name: string
  address: string
  management_address: string
  email: string
  phone: string
  employees_count: number
  sector: string
  api_type?: number
  counterpart_contacts: CounterpartContact[]
}

export async function listCounterpartContacts(params?: { company?: number }) {
  const { data } = await http.get<CounterpartContact[]>('/counterpart-contacts/', { params })
  return data
}

export async function listCompanies(params?: { search?: string }) {
  const { data } = await http.get<Company[]>('/companies/', { params })
  
  // Asegurar que cada empresa tenga su array de contactos (puede venir vacío)
  let companiesWithEmptyContacts = data.map((c) => ({
    ...c,
    counterpart_contacts: Array.isArray((c as any).counterpart_contacts) 
      ? (c as any).counterpart_contacts 
      : [],
  }))
  
  // Cargar contactos por separado para cada empresa que no los tenga
  // Hacer esto de forma paralela para cada empresa
  const companiesWithLoadedContacts = await Promise.all(
    companiesWithEmptyContacts.map(async (c) => {
      if (c.counterpart_contacts.length === 0 && c.id) {
        try {
          const contacts = await listCounterpartContacts({ company: c.id })
          return {
            ...c,
            counterpart_contacts: contacts,
          }
        } catch (e) {
          // Silenciosamente ignorar errores de contactos individuales
          return c
        }
      }
      return c
    })
  )
  
  return companiesWithLoadedContacts
}

type CompanyPayload = Omit<Company, 'id'>

function normalizeContacts(contacts?: CounterpartContact[]) {
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return []
  }
  return contacts.map(({ id, ...rest }) => ({
    name: rest.name,
    rut: rest.rut,
    phone: rest.phone,
    email: rest.email,
    counterpart_area: rest.counterpart_area,
    role: rest.role,
  }))
}

export async function createCompany(payload: CompanyPayload) {
  const body = {
    ...payload,
    counterpart_contacts: normalizeContacts(payload.counterpart_contacts),
  }
  const { data } = await http.post<Company>('/companies/', body)
  return data
}

export async function updateCompany(id: number, payload: Partial<CompanyPayload>) {
  const body = {
    ...payload,
  }
  const { data } = await http.patch<Company>(`/companies/${id}/`, body)
  return data
}

export async function createCounterpartContact(payload: CounterpartContact & { company: number }) {
  const { data } = await http.post<CounterpartContact>('/counterpart-contacts/', payload)
  return data
}

export async function updateCounterpartContact(
  id: number,
  payload: Partial<CounterpartContact & { company: number }>,
) {
  const { data } = await http.patch<CounterpartContact>(`/counterpart-contacts/${id}/`, payload)
  return data
}

export async function deleteCounterpartContact(id: number) {
  await http.delete(`/counterpart-contacts/${id}/`)
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
  counterpart_contacts?: CounterpartContact[]
}

export async function listProblemStatements(params?: { subject?: number; company?: number }) {
  const { data } = await http.get<ProblemStatement[]>('/problem-statements/', { params })
  return data.map((p) => ({
    ...p,
    counterpart_contacts: Array.isArray((p as any).counterpart_contacts)
      ? ((p as any).counterpart_contacts as CounterpartContact[])
      : [],
  }))
}

export async function getCompany(id: number) {
  const { data } = await http.get<Company>(`/companies/${id}/`)
  return {
    ...data,
    counterpart_contacts: Array.isArray((data as any).counterpart_contacts)
      ? ((data as any).counterpart_contacts as CounterpartContact[])
      : [],
  }
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
  subject_period_season: string
  subject_period_year: number
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

