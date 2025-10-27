import { Link, Outlet } from 'react-router'
import { useUI } from '../store/ui'

export default function Layout() {
  const { sidebarOpen, toggleSidebar } = useUI()
  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, Arial, sans-serif' }}>
      <header style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Link to="/">Home</Link>
        <Link to="/login">Login</Link>
        <button onClick={toggleSidebar} style={{ marginLeft: 'auto' }}>
          {sidebarOpen ? 'Cerrar Sidebar' : 'Abrir Sidebar'}
        </button>
      </header>
      <main>
        <Outlet />
      </main>
      {sidebarOpen && (
        <aside style={{ marginTop: 16, padding: 8, border: '1px solid #ddd' }}>
          Sidebar de ejemplo (estado en Zustand)
        </aside>
      )}
    </div>
  )
}
