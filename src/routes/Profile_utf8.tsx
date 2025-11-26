import { useEffect, useMemo, useState } from 'react'
import http from '../lib/http'
import { toast } from '../lib/toast'
import { useAuth } from '../store/auth'

export default function Profile() {
  const { user, loadMe } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Password section
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const canChangePassword = useMemo(() => newPassword.length >= 8 && newPassword === confirmPassword, [newPassword, confirmPassword])
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

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await http.patch(`/users/${user.id}/`, {
        first_name: firstName,
        last_name: lastName,
        email,
      })
      setMessage('Perfil actualizado correctamente')
      toast.success('Perfil actualizado correctamente')
      await loadMe()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo actualizar el perfil'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    if (!canChangePassword) {
      setError('La nueva contraseña no cumple los requisitos o no coincide')
      return
    }
    setChangingPwd(true)
    setError(null)
    setMessage(null)
    try {
      // Backend: POST /api/users/me/change-password/
      await http.post(`/users/me/change-password/`, {
        old_password: oldPassword,
        new_password: newPassword,
        new_password2: confirmPassword,
      })
      setMessage('Contraseña actualizada correctamente')
      toast.success('Contraseña actualizada correctamente')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo actualizar la contraseña'
      setError(msg)
      toast.error(msg)
    } finally {
      setChangingPwd(false)
    }
  }

  return (
    <section className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-xl font-semibold">Perfil</h1>

      {message ? (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form onSubmit={onSaveProfile} className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-800">Nombre</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-800">Apellido</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-zinc-800">Correo</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button type="submit" disabled={saving} className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
      </form>

      <div className="mt-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h2 className="mb-4 text-base font-semibold">Cambiar contraseña</h2>
        <form onSubmit={onChangePassword} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-800">Contraseña actual</label>
              <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-800">Nueva contraseña</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-800">Confirmar nueva</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={!canChangePassword || changingPwd} className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60">{changingPwd ? 'Actualizando…' : 'Actualizar contraseña'}</button>
          </div>
        </form>
        <p className="mt-2 text-xs text-zinc-500">Nota: confirmar endpoint de cambio de contraseña en el backend.</p>
      </div>
    </section>
  )
}

