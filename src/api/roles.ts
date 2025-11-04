import http from '../lib/http'
import { rolePathMap } from '../routes/roleMap'

// Obtiene los códigos de roles disponibles desde el backend.
// Fallback: usa los keys del rolePathMap si el endpoint no existe.
export async function listRoles(): Promise<string[]> {
  const tryNormalize = (data: any) => {
    // Acepta arrays de strings o de objetos { code } / { name }
    if (!Array.isArray(data)) return null
    const norm = data
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') {
          return (item.code || item.name || '').toString()
        }
        return ''
      })
      .filter(Boolean)
      .map((s) => s.toUpperCase())
    return norm.length > 0 ? norm : null
  }

  try {
    // Intento 1: /users/roles/
    const res1 = await http.get<any>(`/users/roles/`)
    const norm1 = tryNormalize(res1.data)
    if (norm1) return norm1
  } catch (_) {}

  try {
    // Intento 2: /roles/
    const res2 = await http.get<any>(`/roles/`)
    const norm2 = tryNormalize(res2.data)
    if (norm2) return norm2
  } catch (_) {}

  return Object.keys(rolePathMap)
}
