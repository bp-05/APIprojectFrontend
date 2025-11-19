import { Link, Outlet, useNavigate, useLocation } from 'react-router'
import { useAuth } from '../store/auth'
import { useEffect, useState } from 'react'
import { pathForRole, roleLabelMap } from './roleMap'
import { nameCase } from '../lib/strings'

export default function Layout() {
  const navigate = useNavigate()
  const { isAuthenticated, logout, user, role, loadMe } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()

  // Estado de colapso del Menú del coordinador con persistencia
  const [coordSidebarCollapsed, setCoordSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('coordSidebarCollapsed')
      if (saved !== null) return JSON.parse(saved)
      if (typeof window !== 'undefined') return window.innerWidth < 1024
    } catch {}
    return false
  })

  useEffect(() => {
    function onResize() {
      try {
        if (window.innerWidth < 1024) {
          setCoordSidebarCollapsed(true)
        } else {
          const saved = localStorage.getItem('coordSidebarCollapsed')
          if (saved !== null) setCoordSidebarCollapsed(JSON.parse(saved))
          else setCoordSidebarCollapsed(false)
        }
      } catch {}
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function toggleCoordSidebar() {
    setCoordSidebarCollapsed((prev) => {
      const next = !prev
      try { localStorage.setItem('coordSidebarCollapsed', JSON.stringify(next)) } catch {}
      return next
    })
  }

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
              aria-label="Abrir men�"
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
          <aside className={`hidden shrink-0 border-r border-zinc-200 bg-white/70 p-4 md:block ${role === 'COORD' ? (coordSidebarCollapsed ? 'w-20' : 'w-64') : 'w-64'}`}>
            <nav className="space-y-1">
              {role === 'COORD' && (
                <>
                  <div className="mb-2 flex items-center justify-between px-2">
                    <div className={`text-xs font-semibold uppercase tracking-wide text-zinc-500 ${coordSidebarCollapsed ? 'hidden' : ''}`}>Coordinador</div>
                    <button
                      type="button"
                      onClick={toggleCoordSidebar}
                      className="inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                      aria-label={coordSidebarCollapsed ? '>' : '<'}
                      title={coordSidebarCollapsed ? '>' : '<'}
                    >
                      <span className="text-xs">{coordSidebarCollapsed ? '>' : '<'}</span>
                    </button>
                  </div>
                  <SidebarItem to="/coord/asignaturas" icon={<IconFolder />} collapsed={!!coordSidebarCollapsed} active={location.pathname.startsWith('/coord/asignaturas')} label="Asignaturas" />
                  <SidebarItem to="/coord/gantt" icon={<IconCalendar />} collapsed={!!coordSidebarCollapsed} active={location.pathname.startsWith('/coord/gantt')} label="Gantt" />
                  <SidebarItem to="/coord/reportes" icon={<IconChart />} collapsed={!!coordSidebarCollapsed} active={location.pathname.startsWith('/coord/reportes')} label="Reportes" />
                  <SidebarItem to="/coord/notificaciones" icon={<IconBell />} collapsed={!!coordSidebarCollapsed} active={location.pathname.startsWith('/coord/notificaciones')} label="Notificaciones" />
                </>
              )}
              {role !== 'COORD' && ( <>
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
                  <Link
                    to="/empresas"
                    className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    Empresas
                  </Link>
                  <Link
                    to="/problematicas"
                    className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    Problemáticas
                  </Link>
                </>
              )}
              {role === 'DAC' && (
                <>
                  <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Departamento Académico</div>
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
              {role === 'DC' && (
                <>
                  <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Director de area/carrera</div>
                  <Link
                    to="/dc/asignaturas"
                    className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    Asignaturas
                  </Link>
                  <Link
                    to="/dc/empresas"
                    className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    Empresas
                  </Link>
                </>
              )}
              {/* Otros roles/links */}
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
              </>)}
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
                  <Link onClick={() => setMobileNavOpen(false)} to="/empresas" className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900">Empresas</Link>
                  <Link onClick={() => setMobileNavOpen(false)} to="/problematicas" className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900">Problemáticas</Link>
                </>
              )}
              {role === 'DAC' && (
                <>
                  <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Departamento Académico</div>
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
              {role === 'DC' && (
                <>
                  <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Director de area/carrera</div>
                  <Link onClick={() => setMobileNavOpen(false)} to="/dc/asignaturas" className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900">Asignaturas</Link>
                  <Link onClick={() => setMobileNavOpen(false)} to="/dc/empresas" className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900">Empresas</Link>
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

function SidebarItem({ to, icon, label, active, collapsed }: { to: string; icon: any; label: string; active?: boolean; collapsed?: boolean }) {
  const base = 'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors'
  const cls = active
    ? `${base} border border-red-200 bg-red-50 text-red-700`
    : `${base} text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900`
  return (
    <Link to={to} className={cls} title={label} aria-label={label}>
      <span className="inline-flex h-5 w-5 items-center justify-center text-current">{icon}</span>
      <span className={collapsed ? 'hidden' : 'block'}>{label}</span>
    </Link>
  )
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M3 11l9-8 9 8" />
      <path d="M9 22V12h6v10" />
    </svg>
  )
}

function IconFolder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M3 7h5l2 3h11v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IconChart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function IconBell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M18 8a6 6 0 00-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}








