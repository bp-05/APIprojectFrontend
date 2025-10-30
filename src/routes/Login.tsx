import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../store/auth'
import { pathForRole } from './roleMap'
import { toast } from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const { login, loadMe } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email.trim(), password)
      const me = await loadMe()
      const name = (me.full_name || `${me.first_name ?? ''} ${me.last_name ?? ''}`.trim())
      if (name) {
        toast.success(`Bienvenido, ${name}`)
      } else if (me.role) {
        toast.success(`Bienvenido, ${me.role}`)
      } else {
        toast.success('Bienvenido')
      }
      const role = me.role || (localStorage.getItem('user_role') as any) || null
      navigate(pathForRole(role))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error de autenticación'
      setError(message)
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

          {/* Los errores se notifican por toast para evitar mover el layout */}

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
