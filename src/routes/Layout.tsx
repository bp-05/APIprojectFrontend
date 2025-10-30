import { Link, Outlet, useNavigate } from 'react-router'
import { useAuth } from '../store/auth'
import { useEffect } from 'react'
import { pathForRole } from './roleMap'

export default function Layout() {
  const navigate = useNavigate()
  const { isAuthenticated, logout, user, role, loadMe } = useAuth()

  useEffect(() => {
    if (isAuthenticated && !user) {
      loadMe().catch(() => {})
    }
  }, [isAuthenticated, user, loadMe])

  function handleLogout() {
    logout()
    navigate('/login')
  }
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <Link to={pathForRole(role)} className="flex items-center gap-2">
          <img src="/favicon.ico" alt="Logo" className="h-6 w-6 rounded-sm" />
          <div className="text-sm font-semibold tracking-wide text-zinc-800">Gestor API</div>
        </Link>
        {isAuthenticated && (
          <div className="flex items-center gap-3">
            <div className="text-sm text-zinc-700">
              {user?.full_name || `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || user?.username}
              {role ? <span className="ml-2 rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">{role}</span> : null}
            </div>
            <Link
              to="/profile"
              className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Perfil
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-600/20"
            >
              Salir
            </button>
          </div>
        )}
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
