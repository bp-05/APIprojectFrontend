import { Link, Outlet, useNavigate, useLocation } from 'react-router'
import { useAuth } from '../store/auth'
import { useEffect, useState, type ReactNode } from 'react'
import { pathForRole, roleLabelMap } from './roleMap'
import { nameCase } from '../lib/strings'
import { fetchLatestPeriodCode } from '../api/periods'
import { usePeriodStore } from '../store/period'

type SidebarLinkItem = {
  to: string
  label: string
  icon: ReactNode
  matchPrefix?: string
  showOnDesktop?: boolean
  showOnMobile?: boolean
}

type SidebarSection = { title: string; items: SidebarLinkItem[] }
type AppRole = 'ADMIN' | 'DAC' | 'DOC' | 'DC' | 'VCM' | 'COORD'

const SIDEBAR_SECTIONS: Record<AppRole, SidebarSection[]> = {
  ADMIN: [
    {
      title: 'Administración',
      items: [
        { to: '/usuarios', label: 'Usuarios', icon: <IconUsers />, matchPrefix: '/usuarios' },
        { to: '/asignaturas', label: 'Asignaturas', icon: <IconBook />, matchPrefix: '/asignaturas' },
        { to: '/areas', label: 'Áreas', icon: <IconGrid />, matchPrefix: '/areas' },
        { to: '/carreras', label: 'Carreras', icon: <IconLayers />, matchPrefix: '/carreras' },
        { to: '/proceso-api', label: 'Proceso API', icon: <IconWorkflow />, matchPrefix: '/proceso-api' },
        { to: '/admin/periodos', label: 'Gestionar periodos', icon: <IconCalendar />, matchPrefix: '/admin/periodos' },
        { to: '/empresas', label: 'Empresas', icon: <IconBuilding />, matchPrefix: '/empresas' },
        { to: '/admin/proyectos', label: 'Proyectos', icon: <IconTarget />, matchPrefix: '/admin/proyectos' },
        { to: '/admin/alcances', label: 'Alcances contrapartes', icon: <IconTarget />, matchPrefix: '/admin/alcances' },
        { to: '/admin/posible-contraparte', label: 'Posibles Contrapartes', icon: <IconHandshake />, matchPrefix: '/admin/posible-contraparte' },
        { to: '/admin/fichas', label: 'Fichas', icon: <IconFileText />, matchPrefix: '/admin/fichas' },
      ],
    },
  ],
  DAC: [
    {
      title: 'Departamento Académico',
      items: [
        { to: '/asignaturas', label: 'Asignaturas', icon: <IconBook />, matchPrefix: '/asignaturas' },
        { to: '/areas', label: 'Áreas', icon: <IconGrid />, matchPrefix: '/areas' },
        { to: '/carreras', label: 'Carreras', icon: <IconLayers />, matchPrefix: '/carreras' },
        { to: '/docentes', label: 'Docentes', icon: <IconUsers />, matchPrefix: '/docentes' },
      ],
    },
  ],
  DOC: [
    {
      title: 'Docente',
      items: [
        { to: '/mis-asignaturas', label: 'Asignaturas', icon: <IconBook />, matchPrefix: '/mis-asignaturas' },
        { to: '/doc/empresas', label: 'Empresas', icon: <IconBuilding />, matchPrefix: '/doc/empresas' },
        { to: '/doc/fichas', label: 'Fichas', icon: <IconFileText />, matchPrefix: '/doc/fichas' },
      ],
    },
  ],
  DC: [
    {
      title: 'Director de área/carrera',
      items: [
        { to: '/dc/asignaturas', label: 'Asignaturas', icon: <IconBook />, matchPrefix: '/dc/asignaturas' },
        { to: '/dc/empresas', label: 'Empresas', icon: <IconBuilding />, matchPrefix: '/dc/empresas' },
        { to: '/dc/proyectos', label: 'Proyectos', icon: <IconTarget />, matchPrefix: '/dc/proyectos' },
        { to: '/dc/alcances', label: 'Alcances contrapartes', icon: <IconTarget />, matchPrefix: '/dc/alcances' },
        { to: '/dc/posible-contraparte', label: 'Posibles Contrapartes', icon: <IconHandshake />, matchPrefix: '/dc/posible-contraparte' },
        { to: '/dc/fichas', label: 'Fichas', icon: <IconFileText />, matchPrefix: '/dc/fichas' },
      ],
    },
  ],
  VCM: [
    {
      title: 'Vinculación con el medio',
      items: [
        { to: '/vcm/empresas', label: 'Empresas', icon: <IconBuilding />, matchPrefix: '/vcm/empresas' },
        { to: '/vcm/proyectos', label: 'Proyectos', icon: <IconAlert />, matchPrefix: '/vcm/proyectos' },
        { to: '/vcm/alcances', label: 'Alcances contrapartes', icon: <IconTarget />, matchPrefix: '/vcm/alcances' },
        { to: '/vcm/posible-contraparte', label: 'Posible contraparte', icon: <IconHandshake />, matchPrefix: '/vcm/posible-contraparte' },
        { to: '/vcm/asignaturas', label: 'Asignaturas', icon: <IconBook />, matchPrefix: '/vcm/asignaturas' },
        { to: '/vcm/fichas', label: 'Fichas', icon: <IconFileText />, matchPrefix: '/vcm/fichas' },
      ],
    },
  ],
  COORD: [
    {
      title: 'Coordinador',
      items: [
        { to: '/coord/asignaturas', label: 'Asignaturas', icon: <IconFolder />, matchPrefix: '/coord/asignaturas' },
        { to: '/coord/gantt', label: 'Gantt', icon: <IconCalendar />, matchPrefix: '/coord/gantt' },
        // { to: '/coord/reportes', label: 'Reportes', icon: <IconChart />, matchPrefix: '/coord/reportes' },
        // { to: '/coord/notificaciones', label: 'Notificaciones', icon: <IconBell />, matchPrefix: '/coord/notificaciones' },
        { to: '/coord/fichas', label: 'Fichas', icon: <IconFileText />, matchPrefix: '/coord/fichas' },
        { to: '/coord/docentes', label: 'Docentes', icon: <IconUsers />, matchPrefix: '/coord/docentes', showOnDesktop: false },
      ],
    },
  ],
}

function isRoleWithSidebar(role: string | null | undefined): role is AppRole {
  return typeof role === 'string' && role in SIDEBAR_SECTIONS
}

export default function Layout() {
  const navigate = useNavigate()
  const { isAuthenticated, logout, user, role, loadMe } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()
  const currentPeriod = usePeriodStore((s) => s.periodCode)
  const setPeriodFromCode = usePeriodStore((s) => s.setPeriodFromCode)
  const syncPeriodFromServer = usePeriodStore((s) => s.syncFromServer)

  const sidebarSections = isRoleWithSidebar(role) ? SIDEBAR_SECTIONS[role] : undefined
  const collapseStorageKey = role ? `sidebarCollapsed:${role}` : 'sidebarCollapsed:default'
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(collapseStorageKey)
      if (saved !== null) return JSON.parse(saved)
      if (typeof window !== 'undefined') return window.innerWidth < 1024
    } catch {}
    return false
  })
  const collapseEnabled = !!sidebarSections?.length

  useEffect(() => {
    function onResize() {
      try {
        if (window.innerWidth < 1024) {
          setSidebarCollapsed(true)
        } else {
          const saved = localStorage.getItem(collapseStorageKey)
          if (saved !== null) setSidebarCollapsed(JSON.parse(saved))
          else setSidebarCollapsed(false)
        }
      } catch {}
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [collapseStorageKey])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(collapseStorageKey)
      if (saved !== null) {
        setSidebarCollapsed(JSON.parse(saved))
      } else if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setSidebarCollapsed(true)
      } else {
        setSidebarCollapsed(false)
      }
    } catch {}
  }, [collapseStorageKey])

  function toggleSidebarCollapse() {
    setSidebarCollapsed((prev) => {
      const next = !prev
      try { localStorage.setItem(collapseStorageKey, JSON.stringify(next)) } catch {}
      return next
    })
  }

  useEffect(() => {
    if (isAuthenticated && !user) {
      loadMe().catch(() => {})
    }
  }, [isAuthenticated, user, loadMe])

  useEffect(() => {
    if (!isAuthenticated) return
    let ignore = false
    async function loadPeriod() {
      const synced = await syncPeriodFromServer().catch(() => null)
      if (!ignore && !synced) {
        try {
          const remotePeriod = await fetchLatestPeriodCode()
          if (remotePeriod) setPeriodFromCode(remotePeriod)
        } catch {}
      }
    }
    loadPeriod()
    return () => {
      ignore = true
    }
  }, [isAuthenticated, setPeriodFromCode, syncPeriodFromServer])

  function handleLogout() {
    logout()
    navigate('/login')
  }
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-4">
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
            <Link to={pathForRole(role)} className="group flex items-center gap-2 hover:text-red-600">
              <img src="/favicon.ico" alt="Logo" className="h-6 w-6 rounded-sm transition-transform duration-150 group-hover:scale-105" />
              <div className="text-sm font-semibold tracking-wide text-zinc-800 group-hover:text-red-600">Gestor API</div>
            </Link>
          </div>

          {isAuthenticated && (
            <div className="flex items-center gap-3">
              {/* Periodo actual */}
              <div className="hidden items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 sm:flex">
                <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs text-zinc-500">Periodo:</span>
                  <span className="text-sm font-semibold text-zinc-900">{currentPeriod}</span>
                </div>
              </div>

              {/* Usuario y rol - Clickable para ir al perfil */}
              <Link
                to="/profile"
                className="hidden items-center gap-2 rounded-lg border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 px-3 py-1.5 transition-all hover:border-zinc-300 hover:shadow-sm lg:flex"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-sm font-semibold text-red-700">
                  {(user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-zinc-900">
                    {nameCase(user?.full_name || `${user?.first_name ?? ''} ${user?.last_name ?? ''}`) || user?.username}
                  </span>
                  {role && (
                    <span className="text-xs text-zinc-600">
                      {roleLabelMap[role] || role}
                    </span>
                  )}
                </div>
              </Link>

              {/* Botón de salir */}
              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-red-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
              >
                <span>Salir</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </header>


      <div className="flex">
        {isAuthenticated ? (
          <aside
            className={`hidden shrink-0 border-r border-zinc-200 bg-white/70 p-4 md:block ${
              collapseEnabled ? (sidebarCollapsed ? 'w-20' : 'w-64') : 'w-64'
            }`}
          >
            <nav className="space-y-6">
              {sidebarSections?.map((section, idx) => {
                const visibleItems = section.items.filter((item) => item.showOnDesktop !== false)
                if (visibleItems.length === 0) return null
                const action =
                  collapseEnabled && idx === 0 ? (
                    <button
                      type="button"
                      onClick={toggleSidebarCollapse}
                      className="inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                      aria-label={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
                      title={sidebarCollapsed ? '>' : '<'}
                    >
                      <span className="text-xs">{sidebarCollapsed ? '>' : '<'}</span>
                    </button>
                  ) : null
                return (
                  <SidebarSectionBlock
                    key={`${section.title}-${idx}`}
                    title={section.title}
                    collapsed={collapseEnabled ? sidebarCollapsed : false}
                    action={action}
                  >
                    {visibleItems.map((item) => (
                      <SidebarItem
                        key={item.to}
                        to={item.to}
                        icon={item.icon}
                        label={item.label}
                        collapsed={collapseEnabled ? sidebarCollapsed : false}
                        active={isSidebarItemActive(location.pathname, item)}
                      />
                    ))}
                  </SidebarSectionBlock>
                )
              })}
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

                ?

              </button>

            </div>

            <nav className="space-y-4">

              {sidebarSections?.map((section, idx) => {

                const visibleItems = section.items.filter((item) => item.showOnMobile !== false)

                if (visibleItems.length === 0) return null

                return (

                  <div key={`${section.title}-mobile-${idx}`}>

                    <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{section.title}</div>

                    <div className="space-y-1">

                      {visibleItems.map((item) => (

                        <Link

                          key={item.to}

                          onClick={() => setMobileNavOpen(false)}

                          to={item.to}

                          className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"

                        >

                          {item.label}

                        </Link>

                      ))}

                    </div>

                  </div>

                )

              })}

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

function SidebarSectionBlock({
  title,
  collapsed,
  action,
  children,
}: {
  title: string
  collapsed?: boolean
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-2">
        <div className={`text-xs font-semibold uppercase tracking-wide text-zinc-500 ${collapsed ? 'hidden' : ''}`}>{title}</div>
        {action}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function SidebarItem({ to, icon, label, active, collapsed }: { to: string; icon: ReactNode; label: string; active?: boolean; collapsed?: boolean }) {
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

function isSidebarItemActive(pathname: string, item: SidebarLinkItem) {
  // Evitar marcar como activo el listado de asignaturas DC cuando estamos en un detalle
  if (item.matchPrefix === '/dc/asignaturas' && /^\/dc\/asignaturas\/\d+/.test(pathname)) return false
  if (item.matchPrefix) return pathname.startsWith(item.matchPrefix)
  return pathname === item.to
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

// IconChart e IconBell comentados temporalmente - se usarán cuando se implementen Reportes y Notificaciones
// function IconChart() {
//   return (
//     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
//       <line x1="18" y1="20" x2="18" y2="10" />
//       <line x1="12" y1="20" x2="12" y2="4" />
//       <line x1="6" y1="20" x2="6" y2="14" />
//     </svg>
//   )
// }

// function IconBell() {
//   return (
//     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
//       <path d="M18 8a6 6 0 00-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
//       <path d="M13.73 21a2 2 0 0 1-3.46 0" />
//     </svg>
//   )
// }

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="3" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a3 3 0 0 1 0 5.74" />
    </svg>
  )
}

function IconBook() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22z" />
    </svg>
  )
}

function IconWorkflow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="15" y="3" width="6" height="6" rx="1" />
      <rect x="9" y="15" width="6" height="6" rx="1" />
      <path d="M6 9v2a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9" />
    </svg>
  )
}

function IconBuilding() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M3 22h18" />
      <path d="M6 22V7l6-3 6 3v15" />
      <path d="M9 22v-4h6v4" />
      <path d="M9 13h.01" />
      <path d="M15 13h.01" />
      <path d="M12 11h.01" />
    </svg>
  )
}

function IconAlert() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M10.29 3.86 1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12" y2="17" />
    </svg>
  )
}

function IconTarget() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="3" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
    </svg>
  )
}

function IconHandshake() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M4 16l2 2h3l3 3 5-5" />
      <path d="M14 7l-1.5-1.5a2.12 2.12 0 00-3 0L4 11" />
      <path d="M14 7l2-2 4 4-6 6" />
      <path d="M6 18l1.5-1.5" />
      <path d="M8.5 16l1.5-1.5" />
      <path d="M10.5 14l2.5 2.5" />
    </svg>
  )
}

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function IconLayers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M12 2l9 4-9 4-9-4 9-4z" />
      <path d="M3 10l9 4 9-4" />
      <path d="M3 15l9 4 9-4" />
    </svg>
  )
}

function IconFileText() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </svg>
  )
}








