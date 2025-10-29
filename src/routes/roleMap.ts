import type { UserRole } from '../store/auth'

export const rolePathMap: Record<UserRole, string> = {
  ADMIN: '/admin',
  VCM: '/vcm',
  DAC: '/dac',
  DC: '/dc',
  DOC: '/doc',
  COORD: '/coord',
}

export function pathForRole(role: UserRole | null): string {
  if (!role) return '/login'
  return rolePathMap[role]
}

