import type { UserRole } from '../store/auth'

export const rolePathMap: Record<UserRole, string> = {
  ADMIN: '/admin',
  VCM: '/vcm',
  DAC: '/dac',
  DC: '/dc',
  DOC: '/doc',
  COORD: '/coord',
}

export const roleLabelMap: Record<UserRole, string> = {
  ADMIN: 'Admin',
  VCM: 'Vinculación con el medio',
  DAC: 'Departamento Académico',
  DC: 'Director de carrera',
  DOC: 'Docente',
  COORD: 'Coordinador API',
}

export function pathForRole(role: UserRole | null): string {
  if (!role) return '/login'
  return rolePathMap[role]
}
