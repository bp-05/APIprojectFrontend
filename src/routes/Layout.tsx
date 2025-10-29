import { Outlet, useNavigate } from 'react-router'
import { useAuth } from '../store/auth'

export default function Layout() {
  const navigate = useNavigate()
  const { isAuthenticated, logout } = useAuth()

  function handleLogout() {
    logout()
    navigate('/login')
  }
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <div className="text-sm font-semibold tracking-wide text-zinc-800">Gestor API</div>
        {isAuthenticated && (
          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-600/20"
          >
            Salir
          </button>
        )}
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
