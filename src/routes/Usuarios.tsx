import { useEffect, useMemo, useState } from 'react'
import { createUser, deleteUser, listUsers, updateUser, type User } from '../api/users'
import { toast } from 'react-hot-toast'
import { listRoles as fetchRoles } from '../api/roles'
import { nameCase } from '../lib/strings'
import { roleLabelMap } from './roleMap'
import { useAuth } from '../store/auth'
import type { UserRole } from '../store/auth'

export default function Usuarios() {
  const [items, setItems] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const { user: me } = useAuth()

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await listUsers(search || undefined)
      setItems(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar usuarios'
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
    return items.filter((u) =>
      [u.email, u.first_name, u.last_name]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q))
    )
  }, [items, search])

  async function onDelete(u: User) {
    if (!confirm(`¿Eliminar usuario ${u.email}?`)) return
    await deleteUser(u.id)
    toast.success('Usuario eliminado')
    await load()
  }

  return (
    <section className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Usuarios</h1>
          <p className="text-sm text-zinc-600">Gestión de cuentas de usuario</p>
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
            Nuevo usuario
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <Th>Correo</Th>
              <Th>Nombre</Th>
              <Th>Rol</Th>
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
                  <Td>{labelForRole(u.role)}</Td>
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
                      disabled={me?.id === u.id}
                      className="mr-2 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={me?.id === u.id ? 'No puedes editar tu propio usuario' : 'Editar usuario'}
                    >
                      Editar
                    </button>
                    <button
                      onClick={async () => {
                        if (me?.id === u.id) return
                        await updateUser(u.id, { is_active: !u.is_active })
                        toast.success(u.is_active === false ? 'Usuario activado' : 'Usuario desactivado')
                        await load()
                      }}
                      disabled={me?.id === u.id}
                      className="mr-2 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={me?.id === u.id ? 'No puedes desactivarte a ti mismo' : (u.is_active === false ? 'Activar' : 'Desactivar')}
                    >
                      {u.is_active === false ? 'Activar' : 'Desactivar'}
                    </button>
                    <button
                      onClick={() => {
                        if (me?.id === u.id) return
                        onDelete(u)
                      }}
                      disabled={me?.id === u.id}
                      className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={me?.id === u.id ? 'No puedes eliminarte a ti mismo' : 'Eliminar usuario'}
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
        <CreateUserDialog
          onClose={() => setShowCreate(false)}
          onCreated={async () => {
            setShowCreate(false)
            await load()
          }}
        />
      ) : null}

      {editing ? (
        <EditUserDialog
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            await load()
          }}
        />
      ) : null}
    </section>
  )
}

function Th({ children, className = '' }: { children: any; className?: string }) {
  return (
    <th className={`px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 ${className}`}>
      {children}
    </th>
  )
}

function EditUserDialog({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: () => void }) {
  const [firstName, setFirstName] = useState(user.first_name || '')
  const [lastName, setLastName] = useState(user.last_name || '')
  const [role, setRole] = useState<string>(user.role || '')
  const [active, setActive] = useState<boolean>(user.is_active)
  const [roles, setRoles] = useState<string[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setRolesLoading(true)
    fetchRoles()
      .then((list) => mounted && setRoles(list))
      .catch(() => {})
      .finally(() => setRolesLoading(false))
    return () => {
      mounted = false
    }
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (!role) {
        setLoading(false)
        setError('Seleccione un rol')
        return
      }
      if ((password && !password2) || (!password && password2)) {
        setLoading(false)
        setError('Debe ingresar contraseña y confirmación')
        return
      }
      if (password && password2 && password !== password2) {
        setLoading(false)
        setError('Las contraseñas no coinciden')
        return
      }
      await updateUser(user.id, {
        first_name: firstName,
        last_name: lastName,
        role,
        is_active: active,
        ...(password ? { password, password2 } : {}),
      })
      toast.success('Usuario actualizado')
      await onSaved()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al actualizar usuario'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Editar usuario</h2>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100">Cerrar</button>
        </div>
        {error ? (
          <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}
        <form className="grid grid-cols-2 gap-3" onSubmit={onSubmit}>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-700">Correo</label>
            <input value={user.email} disabled className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-500" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Nombre</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Apellido</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-700">Rol</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            >
              <option value="" disabled={rolesLoading}>
                {rolesLoading ? 'Cargando roles…' : 'Seleccione…'}
              </option>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {labelForRole(r)}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input id="active-edit" type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <label htmlFor="active-edit" className="text-xs text-zinc-700">Activo</label>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Nueva contraseña (opcional)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Confirmar contraseña</label>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
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

function Td({ children, className = '' }: { children: any; className?: string }) {
  return <td className={`px-4 py-2 text-sm text-zinc-800 ${className}`}>{children}</td>
}

function labelForRole(role: string | null | undefined): string {
  if (!role) return '-'
  const key = role as UserRole
  return roleLabelMap[key] || role
}

function CreateUserDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState<string>('')
  const [roles, setRoles] = useState<string[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [active, setActive] = useState(true)
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setRolesLoading(true)
    fetchRoles()
      .then((list) => {
        if (mounted) setRoles(list)
      })
      .catch(() => {})
      .finally(() => setRolesLoading(false))
    return () => {
      mounted = false
    }
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (!role) {
        setLoading(false)
        setError('Seleccione un rol')
        return
      }
      if (!password || !password2) {
        setLoading(false)
        setError('Debe ingresar contraseña y confirmación')
        return
      }
      if (password !== password2) {
        setLoading(false)
        setError('Las contraseñas no coinciden')
        return
      }
      await createUser({
        email,
        first_name: firstName,
        last_name: lastName,
        role,
        is_active: active,
        password,
        password2,
      })
      toast.success('Usuario creado')
      await onCreated()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al crear usuario'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Nuevo usuario</h2>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100">Cerrar</button>
        </div>
        {error ? (
          <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}
        <form className="grid grid-cols-2 gap-3" onSubmit={onSubmit}>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-700">Correo</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Nombre</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Apellido</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-700">Rol</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            >
              <option value="" disabled={rolesLoading}>
                {rolesLoading ? 'Cargando roles…' : 'Seleccione…'}
              </option>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {labelForRole(r)}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input id="active" type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <label htmlFor="active" className="text-xs text-zinc-700">Activo</label>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Confirmar contraseña</label>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
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
