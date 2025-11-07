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
  if (options?.onlyActive !== false) params.is_active = true
  try {
    // Nuevo endpoint CRUD dedicado para docentes
    const { data } = await http.get<User[]>(`/teachers/`, { params })
    return data
  } catch (_) {
    try {
      // Compatibilidad: endpoint antiguo de solo listado
      const { data } = await http.get<User[]>(`/users/teachers/`, { params })
      return data
    } catch {
      // Fallback: usar filtro por rol en listado general
      const p: Record<string, any> = { role: 'DOC' }
      if (options?.onlyActive !== false) p.is_active = true
      if (options?.search) p.search = options.search
      const { data } = await http.get<User[]>(`/users/`, { params: p })
      return data
    }
  }
}

export async function createTeacher(payload: {
  email: string
  first_name?: string
  last_name?: string
  password: string
  password2: string
  is_active?: boolean
}) {
  const { data } = await http.post<User>(`/teachers/`, payload)
  return data
}

export async function updateTeacher(id: number, payload: Partial<User>) {
  const { data } = await http.patch<User>(`/teachers/${id}/`, payload)
  return data
}

export async function deleteTeacher(id: number) {
  await http.delete(`/teachers/${id}/`)
}

export async function getTeacher(id: number) {
  const { data } = await http.get<User>(`/teachers/${id}/`)
  return data
}
