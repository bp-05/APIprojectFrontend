import { useEffect, useMemo, useState } from 'react'
import { createTeacher, deleteTeacher, listDocentes, updateTeacher, type User } from '../api/users'
import { toast } from 'react-hot-toast'
import { nameCase } from '../lib/strings'
 

export default function Docentes() {
  const [items, setItems] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await listDocentes({ search })
      setItems(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar docentes'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    if (!search) return items
    const q = search.toLowerCase()
    return items.filter((u) => [u.email, u.first_name, u.last_name].filter(Boolean).some((s) => String(s).toLowerCase().includes(q)))
  }, [items, search])

  async function onDelete(u: User) {
    if (!confirm(`¿Eliminar docente ${u.email}?`)) return
    try {
      await deleteTeacher(u.id)
      toast.success('Docente eliminado')
      await load()
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo eliminar')
    }
  }

  return (
    <section className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Docentes</h1>
          <p className="text-sm text-zinc-600">Gestión de docentes (rol DOC)</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar…"
            className="w-56 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Nuevo docente
          </button>
        </div>
      </div>

      {error ? <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <Th>Correo</Th>
              <Th>Nombre</Th>
              <Th>Estado</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {loading ? (
              <tr>
                <td className="p-4 text-sm text-zinc-600" colSpan={6}>Cargando…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="p-4 text-sm text-zinc-600" colSpan={6}>Sin resultados</td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50">
                  <Td>{u.email}</Td>
                  <Td>{nameCase(`${u.first_name ?? ''} ${u.last_name ?? ''}`)}</Td>
                  <Td>
                    {u.is_active === false ? (
                      <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">Inactivo</span>
                    ) : (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">Activo</span>
                    )}
                  </Td>
                  <Td className="text-right">
                    <button
                      onClick={() => setEditing(u)}
                      className="mr-2 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onDelete(u)}
                      className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                    >
                      Eliminar
                    </button>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreate ? (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={async () => {
            setShowCreate(false)
            await load()
          }}
        />
      ) : null}

      {editing ? (
        <EditModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            await load()
          }}
        />
      ) : null}

      {/* Backend permite CRUD para ADMIN y DAC en /teachers/ */}
    </section>
  )
}

function Th({ children, className = '' }: { children: any; className?: string }) {
  return (
    <th scope="col" className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-zinc-600 ${className}`}>
      {children}
    </th>
  )
}

function Td({ children, className = '' }: { children: any; className?: string }) {
  return <td className={`px-4 py-2 text-sm text-zinc-800 ${className}`}>{children}</td>
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await createTeacher({ email, first_name: firstName, last_name: lastName, password, password2, is_active: true })
      toast.success('Docente creado')
      await onCreated()
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo crear')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-lg">
        <h2 className="mb-3 text-lg font-semibold">Nuevo docente</h2>
        <form className="grid grid-cols-2 gap-3" onSubmit={onSubmit}>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-700">Correo</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Nombre</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Apellido</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Confirmar contraseña</label>
            <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
          </div>
          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50">Cancelar</button>
            <button type="submit" disabled={loading} className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-60">{loading ? 'Creando…' : 'Crear'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditModal({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: () => Promise<void> }) {
  const [firstName, setFirstName] = useState(user.first_name)
  const [lastName, setLastName] = useState(user.last_name)
  const [isActive, setIsActive] = useState(user.is_active)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await updateTeacher(user.id, { first_name: firstName, last_name: lastName, is_active: isActive })
      toast.success('Docente actualizado')
      await onSaved()
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-lg">
        <h2 className="mb-3 text-lg font-semibold">Editar docente</h2>
        <form className="grid grid-cols-2 gap-3" onSubmit={onSubmit}>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-700">Correo</label>
            <input value={user.email} disabled className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Nombre</label>
            <input value={firstName ?? ''} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Apellido</label>
            <input value={lastName ?? ''} onChange={(e) => setLastName(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input id="active" type="checkbox" checked={!!isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <label htmlFor="active" className="text-xs text-zinc-700">Activo</label>
          </div>
          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50">Cancelar</button>
            <button type="submit" disabled={loading} className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-60">{loading ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
