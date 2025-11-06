import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-hot-toast'
import {
  createCompany,
  deleteCompany,
  listCompanies,
  updateCompany,
  type Company,
} from '../../api/companies'

export default function Empresas() {
  const [items, setItems] = useState<Company[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await listCompanies()
      setItems(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar empresas'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((c) =>
      [c.name, c.email, c.sector, c.phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [items, search])

  function openCreate() {
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(c: Company) {
    setEditing(c)
    setShowForm(true)
  }

  async function onDelete(c: Company) {
    if (!confirm(`¿Eliminar empresa "${c.name}"?`)) return
    await deleteCompany(c.id)
    toast.success('Empresa eliminada')
    await load()
  }

  return (
    <section className="p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Empresas</h1>
          <p className="text-sm text-zinc-600">Gestión de contrapartes</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar…"
            className="w-56 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
          <button
            onClick={openCreate}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Nueva empresa
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
              <Th>Nombre</Th>
              <Th>Correo</Th>
              <Th>Sector</Th>
              <Th>Teléfono</Th>
              <Th>API</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {loading ? (
              <tr><td className="p-4 text-sm text-zinc-600" colSpan={6}>Cargando…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="p-4 text-sm text-zinc-600" colSpan={6}>Sin resultados</td></tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50">
                  <Td>{c.name}</Td>
                  <Td>{c.email}</Td>
                  <Td>{c.sector}</Td>
                  <Td>{c.phone}</Td>
                  <Td>Tipo {c.api_type}</Td>
                  <Td className="text-right">
                    <button
                      onClick={() => openEdit(c)}
                      className="mr-2 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onDelete(c)}
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

      {showForm && (
        <CompanyForm
          initial={editing || undefined}
          onClose={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false)
            await load()
          }}
        />
      )}
    </section>
  )
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-2 text-left text-xs font-semibold text-zinc-600 ${className}`}>{children}</th>
  )
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2 text-sm text-zinc-800 ${className}`}>{children}</td>
}

function CompanyForm({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Company
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const [form, setForm] = useState<Omit<Company, 'id'>>({
    name: initial?.name || '',
    address: initial?.address || '',
    management_address: initial?.management_address || '',
    spys_responsible_name: initial?.spys_responsible_name || '',
    email: initial?.email || '',
    phone: initial?.phone || '',
    employees_count: initial?.employees_count || 0,
    sector: initial?.sector || '',
    api_type: (initial?.api_type as any) || 1,
  })
  const [saving, setSaving] = useState(false)
  const [employeesStr, setEmployeesStr] = useState<string>(String(initial?.employees_count ?? 0))

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const employees_count = Math.max(0, parseInt(employeesStr || '0', 10) || 0)
      const payload = Object.fromEntries(
        Object.entries({ ...form, employees_count }).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]),
      ) as typeof form & { employees_count: number }
      if (initial) {
        await updateCompany(initial.id, payload)
        toast.success('Empresa actualizada')
      } else {
        await createCompany(payload)
        toast.success('Empresa creada')
      }
      await onSaved()
    } catch (err) {
      let msg = 'Error al guardar'
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as any
        if (typeof data === 'string') msg = data
        else if (data && typeof data === 'object') {
          try {
            const parts = Object.entries(data).map(([k, v]) => {
              const val = Array.isArray(v) ? v.join(', ') : String(v)
              return `${k}: ${val}`
            })
            if (parts.length) msg = parts.join(' | ')
          } catch {}
        }
      } else if (err instanceof Error) {
        msg = err.message
      }
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-lg ring-1 ring-black/5 max-h-[calc(100vh-4rem)] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-3">
          <h2 className="text-sm font-semibold text-zinc-900">
            {initial ? 'Editar empresa' : 'Nueva empresa'}
          </h2>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100">
            Cerrar
          </button>
        </div>
        <form className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 sm:px-6" onSubmit={onSubmit}>
          <Text label="Nombre" value={form.name} onChange={(v) => update('name', v)} required />
          <Text label="Correo" value={form.email} onChange={(v) => update('email', v)} type="email" required />
          <Text label="Teléfono" value={form.phone} onChange={(v) => update('phone', v)} />
          <Text label="Sector" value={form.sector} onChange={(v) => update('sector', v)} required />
          <Text label="Dirección" value={form.address} onChange={(v) => update('address', v)} required />
          <Text
            label="Dirección gerencia"
            value={form.management_address}
            onChange={(v) => update('management_address', v)}
          />
          <Text
            label="Responsable SPyS"
            value={form.spys_responsible_name}
            onChange={(v) => update('spys_responsible_name', v)}
          />
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">Empleados</span>
            <input
              value={employeesStr}
              onChange={(e) => setEmployeesStr(e.target.value.replace(/[^0-9]/g, ''))}
              type="number"
              min={0}
              step={1}
              className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
          </label>
          <Select
            label="Tipo API"
            value={String(form.api_type)}
            onChange={(v) => {
              const n = parseInt(v, 10)
              const val = (n === 2 || n === 3) ? (n as 2 | 3) : (1 as 1)
              update('api_type', val as 1 | 2 | 3)
            }}
            options={[
              { value: '1', label: 'Tipo 1' },
              { value: '2', label: 'Tipo 2' },
              { value: '3', label: 'Tipo 3' },
            ]}
          />

          <div className="col-span-full mt-2 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Text({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-zinc-800">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        required={required}
        className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
      />
    </label>
  )
}

// Nota: evitamos definir un componente llamado "Number" para no sombrear el built-in Number()

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-zinc-800">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
