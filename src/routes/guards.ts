import { redirect } from 'react-router'
import { pathForRole } from './roleMap'

function hasToken() {
  return !!localStorage.getItem('access_token')
}

export async function requireAuthLoader() {
  if (!hasToken()) {
    return redirect('/login')
  }
  return null
}

export async function redirectIfAuthedLoader() {
  if (hasToken()) {
    const role = localStorage.getItem('user_role') as any
    return redirect(pathForRole(role))
  }
  return null
}

export function requireRoleLoader(requiredRole: string) {
  return async function () {
    if (!hasToken()) return redirect('/login')
    const role = localStorage.getItem('user_role')
    if (!role) return redirect('/login')
    if (role !== requiredRole) {
      return redirect(pathForRole(role as any))
    }
    return null
  }
}

export function requireAnyRoleLoader(roles: string[]) {
  return async function () {
    if (!hasToken()) return redirect('/login')
    const role = localStorage.getItem('user_role')
    if (!role) return redirect('/login')
    if (!roles.includes(role)) {
      return redirect(pathForRole(role as any))
    }
    return null
  }
}

export async function entryLoader() {
  // Entry point after auth: send to role route
  if (!hasToken()) return redirect('/login')
  const role = localStorage.getItem('user_role') as any
  return redirect(pathForRole(role))
}
