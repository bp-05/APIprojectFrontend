import { Link, Outlet, useNavigate } from 'react-router'
import { useAuth } from '../store/auth'
import { useEffect, useState } from 'react'
import { pathForRole, roleLabelMap } from './roleMap'
import { nameCase } from '../lib/strings'

export default function Layout() {
  const navigate = useNavigate()
  const { isAuthenticated, logout, user, role, loadMe } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

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
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <button
              onClick={() => setMobileNavOpen(true)}
              className="mr-2 inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-800 hover:bg-zinc-50 md:hidden"
              aria-label="Abrir menú"
            >
              ☰
            </button>
          ) : null}
          <Link to={pathForRole(role)} className="flex items-center gap-2">
            <img src="/favicon.ico" alt="Logo" className="h-6 w-6 rounded-sm" />
            <div className="text-sm font-semibold tracking-wide text-zinc-800">Gestor API</div>
          </Link>
        </div>
        {isAuthenticated && (
          <div className="flex items-center gap-3">
            <div className="text-sm text-zinc-700">
              {nameCase(user?.full_name || `${user?.first_name ?? ''} ${user?.last_name ?? ''}`) || user?.username}
              {role ? (
                <span className="ml-2 rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                  {roleLabelMap[role] || role}
                </span>
              ) : null}
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
      <div className="flex">
        {isAuthenticated ? (
          <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white/70 p-4 md:block">
            <nav className="space-y-1">
              {role === 'ADMIN' && (
                <>
                  <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Administración</div>
                  <Link
                    to="/usuarios"
                    className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    Usuarios
                  </Link>
                  <Link
                    to="/asignaturas"
                    className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    Asignaturas
                  </Link>
                  <Link
                    to="/proceso-api"
                    className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    Proceso API
                  </Link>
                </>
              )}
              {role === 'DAC' && (
                <>
                  <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Departamento Academico</div>
                  <Link
                    to="/asignaturas"
                    className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    Asignaturas
                  </Link>
                  <Link
                    to="/docentes"
                    className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    Docentes
                  </Link>
                </>
              )}
              {role === 'DOC' && (
                <>
                  <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Docente</div>
                  <Link
                    to="/mis-asignaturas"
                    className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    Asignaturas
                  </Link>
                </>
              )}
              {role === 'COORD' && (
                <>
                  <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Coordinación</div>
                  <Link
                    to="/coord/asignaturas"
                    className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    Asignaturas
                  </Link>
                  <Link
                    to="/coord/docentes"
                    className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    Docentes
                  </Link>
                </>
              )}
              {/* Otros roles/links se agregarán luego */}
              {role === 'VCM' && (
                <>
                  <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Vinculación con el medio</div>
                  <Link
                    to="/vcm/empresas"
                    className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    Empresas
                  </Link>
                  <Link
                    to="/vcm/problemas"
                    className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    Problemáticas
                  </Link>
                  <Link
                    to="/vcm/alcances"
                    className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    Alcances
                  </Link>
                  <Link
                    to="/vcm/posible-contraparte"
                    className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    Posible contraparte
                  </Link>
                  <Link
                    to="/vcm/asignaturas"
                    className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    Asignaturas
                  </Link>
                </>
              )}
            </nav>
          </aside>
        ) : null}

        <main className="min-h-[calc(100vh-4rem)] flex-1">
          <Outlet />
        </main>
      </div>
      {isAuthenticated && mobileNavOpen ? (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          <div className="w-64 shrink-0 border-r border-zinc-200 bg-white p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-zinc-800">Menú</div>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm hover:bg-zinc-50"
                aria-label="Cerrar menú"
              >
                ✕
              </button>
            </div>
            <nav className="space-y-1">
              {role === 'ADMIN' && (
                <>
                  <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Administración</div>
                  <Link onClick={() => setMobileNavOpen(false)} to="/usuarios" className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900">Usuarios</Link>
                  <Link onClick={() => setMobileNavOpen(false)} to="/asignaturas" className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900">Asignaturas</Link>
                  <Link onClick={() => setMobileNavOpen(false)} to="/proceso-api" className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900">Proceso API</Link>
                </>
              )}
              {role === 'DAC' && (
                <>
                  <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Departamento Academico</div>
                  <Link onClick={() => setMobileNavOpen(false)} to="/asignaturas" className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900">Asignaturas</Link>
                  <Link onClick={() => setMobileNavOpen(false)} to="/docentes" className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900">Docentes</Link>
                </>
              )}
              {role === 'DOC' && (
                <>
                  <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Docente</div>
                  <Link onClick={() => setMobileNavOpen(false)} to="/mis-asignaturas" className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900">Asignaturas</Link>
                </>
              )}
              {role === 'COORD' && (
                <>
                  <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Coordinación</div>
                  <Link onClick={() => setMobileNavOpen(false)} to="/coord/asignaturas" className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900">Asignaturas</Link>
                  <Link onClick={() => setMobileNavOpen(false)} to="/coord/docentes" className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900">Docentes</Link>
                </>
              )}
              <Link onClick={() => setMobileNavOpen(false)} to="/profile" className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900">Perfil</Link>
              <button
                onClick={() => { handleLogout(); setMobileNavOpen(false) }}
                className="mt-2 block w-full rounded-md bg-red-600 px-3 py-1.5 text-left text-sm font-medium text-white hover:bg-red-700"
              >
                Salir
              </button>
            </nav>
          </div>
          <div className="flex-1 bg-black/30" onClick={() => setMobileNavOpen(false)} />
        </div>
      ) : null}
    </div>
  )
}
