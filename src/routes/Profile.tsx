import { useEffect, useMemo, useState } from 'react'
import http from '../lib/http'
import { toast } from '../lib/toast'
import { useAuth } from '../store/auth'
import { getArea, getCareer } from '../api/subjects'

export default function Profile() {
  const { user, loadMe, role } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [areaName, setAreaName] = useState<string | null>(null)
  const [careerName, setCareerName] = useState<string | null>(null)

  // Password section
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const canChangePassword = useMemo(
    () => 
      oldPassword.trim().length > 0 && 
      newPassword.trim().length >= 8 && 
      confirmPassword.trim().length >= 8 &&
      newPassword === confirmPassword,
    [oldPassword, newPassword, confirmPassword]
  )
  const [changingPwd, setChangingPwd] = useState(false)

  useEffect(() => {
    if (!user) {
      loadMe().catch(() => {})
    }
  }, [user, loadMe])

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '')
      setLastName(user.last_name || '')
      setEmail(user.email || '')
    }
  }, [user])

  const isDirector = role === 'DC'

  useEffect(() => {
    let active = true
    async function loadExtras() {
      if (!isDirector || !user) {
        if (active) {
          setAreaName(null)
          setCareerName(null)
        }
        return
      }
      try {
        if (user.area) {
          const area = await getArea(user.area)
          if (active) setAreaName(area.name)
        } else if (active) {
          setAreaName(null)
        }
      } catch {
        if (active) setAreaName(null)
      }
      try {
        if (user.career) {
          const career = await getCareer(user.career)
          if (active) setCareerName(career.name)
        } else if (active) {
          setCareerName(null)
        }
      } catch {
        if (active) setCareerName(null)
      }
    }
    loadExtras()
    return () => {
      active = false
    }
  }, [isDirector, user])

  // Edición de datos básicos deshabilitada por ahora (solo lectura)

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    if (!canChangePassword) {
      toast.error('La nueva contraseña no cumple los requisitos o no coincide')
      return
    }
    setChangingPwd(true)
    try {
      await http.post(`/users/me/change-password/`, {
        old_password: oldPassword,
        new_password: newPassword,
        new_password2: confirmPassword,
      })
      toast.success('Contraseña actualizada correctamente')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo actualizar la contraseña'
      toast.error(msg)
    } finally {
      setChangingPwd(false)
    }
  }

  return (
    <section className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-xl font-semibold">Perfil</h1>

      {/* Datos de perfil (solo lectura) */}
      <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-800">Nombre</label>
            <div className="block w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-900 shadow-sm">
              {firstName || '-'}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-800">Apellido</label>
            <div className="block w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-900 shadow-sm">
              {lastName || '-'}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-zinc-800">Correo</label>
            <div className="block w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-900 shadow-sm">
              {email || '-'}
            </div>
          </div>
          {isDirector && user?.area ? (
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-zinc-800">Area asignada</label>
              <div className="block w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-900 shadow-sm">
                {areaName || 'Cargando...'}
              </div>
            </div>
          ) : null}
          {isDirector && user?.career ? (
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-zinc-800">Carrera asignada</label>
              <div className="block w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-900 shadow-sm">
                {careerName || 'Cargando...'}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Cambiar contraseña */}
      <div className="mt-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h2 className="mb-4 text-base font-semibold">Cambiar contraseña</h2>
        <form onSubmit={onChangePassword} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-800">Contraseña actual</label>
              <input
                required
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-800">Nueva contraseña</label>
              <input
                required
                minLength={8}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-800">Confirmar nueva</label>
              <input
                required
                minLength={8}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!canChangePassword || changingPwd}
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
            >
              {changingPwd ? 'Actualizando…' : 'Actualizar contraseña'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

