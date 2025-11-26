import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../store/auth'
import type { UserRole } from '../store/auth'
import { pathForRole } from './roleMap'
import { toast } from '../lib/toast'
import { roleLabelMap } from './roleMap'
import { nameCase } from '../lib/strings'

export default function Login() {
  const navigate = useNavigate()
  const { login, loadMe } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email.trim(), password)
      const me = await loadMe()
      const rawName = (me.full_name || `${me.first_name ?? ''} ${me.last_name ?? ''}`.trim())
      const displayName = nameCase(rawName)
      if (displayName) {
        toast.success(`Bienvenido, ${displayName}`)
      } else if (me.role) {
        const roleKey = me.role as UserRole
        const roleLabel = roleLabelMap[roleKey] || roleKey
        toast.success(`Bienvenido, ${roleLabel}`)
      } else {
        toast.success('Bienvenido')
      }
      const storedRole = localStorage.getItem('user_role') as UserRole | null
      const role: UserRole | null = me.role || storedRole || null
      navigate(pathForRole(role))
    } catch (err: any) {
      let message = 'Error de autenticación'
      
      if (err instanceof Error) {
        message = err.message
      } else if (err.response?.data?.detail) {
        message = err.response.data.detail
      } else if (err.response?.data?.non_field_errors) {
        message = err.response.data.non_field_errors[0] || message
      }
      
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="flex min-h-[60vh] items-center justify-center py-12">
      <div className="w-full max-w-md rounded-xl bg-white shadow-md ring-1 ring-black/5">
        <div className="flex items-center gap-3 border-b border-zinc-100 px-6 py-4">
          <img src="/favicon.ico" alt="Logo" className="h-8 w-8 rounded-md" />
          <div>
            <h1 className="text-base font-semibold text-zinc-900">Gestor API</h1>
            <p className="text-xs text-zinc-500">Acceso institucional</p>
          </div>
        </div>

        <form className="space-y-4 px-6 py-6" onSubmit={onSubmit}>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-800">Correo institucional</label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="nombre.apellido@inacap.cl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 shadow-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-zinc-800">
                Contraseña
              </label>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 shadow-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-600/20"
          >
            {loading ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="border-t border-zinc-100 px-6 py-4">
          <p className="text-center text-xs text-zinc-500">Uso exclusivo para personal autorizado. INACAP.</p>
        </div>
      </div>
    </section>
  )
}
