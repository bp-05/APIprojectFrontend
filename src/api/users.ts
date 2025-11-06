import http from '../lib/http'

export type User = {
  id: number
  email: string
  first_name: string
  last_name: string
  role: string
  is_active: boolean
}

export async function listUsers(query?: string) {
  const { data } = await http.get<User[]>(`/users/`, {
    params: query ? { search: query } : undefined,
  })
  return data
}

export async function createUser(
  payload: Pick<User, 'email' | 'first_name' | 'last_name' | 'role'> & {
    is_active?: boolean
    password: string
    password2: string
  }
) {
  const { data } = await http.post<User>(`/users/`, payload)
  return data
}

export async function updateUser(
  id: number,
  payload: Partial<User> & { password?: string; password2?: string }
) {
  const { data } = await http.patch<User>(`/users/${id}/`, payload)
  return data
}

export async function deleteUser(id: number) {
  await http.delete(`/users/${id}/`)
}

export async function listDocentes(options?: { search?: string; onlyActive?: boolean }) {
  const params: Record<string, any> = {}
  if (options?.search) params.search = options.search
  try {
    // Endpoint dedicado para docentes (requiere ADMIN, DAC o grupo vcm)
    const { data } = await http.get<User[]>(`/users/teachers/`, { params })
    return data
  } catch (_) {
    // Fallback: usar filtro por rol en listado general
    const p: Record<string, any> = { role: 'DOC' }
    if (options?.onlyActive !== false) p.is_active = true
    if (options?.search) p.search = options.search
    const { data } = await http.get<User[]>(`/users/`, { params: p })
    return data
  }
}
