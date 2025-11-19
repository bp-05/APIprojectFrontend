import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { useLocation, useNavigate } from 'react-router'
import {
  listCompanies,
  listProblemStatements,
  createCompany,
  updateCompany,
  deleteCompany,
  type Company,
  type CounterpartContact,
  type ProblemStatement,
} from '../../api/companies'

export default function EmpresasVCM() {
  const [items, setItems] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [editing, setEditing] = useState<Company | null>(null)
  const [contactHints, setContactHints] = useState<Map<number, CounterpartContact>>(new Map())
  const navigate = useNavigate()
  const location = useLocation()
  const isVCMView = location.pathname.startsWith('/vcm')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [data, problems] = await Promise.all([
        listCompanies(),
        listProblemStatements().catch(() => []),
      ])
      setItems(data)
      setContactHints(buildContactMap(problems))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudieron cargar empresas'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((c) => [c.name, c.email, c.phone, c.sector].some((v) => String(v || '').toLowerCase().includes(q)))
  }, [items, search])

  const handleRowClick = useCallback(
    (event: React.MouseEvent<HTMLTableRowElement>, companyId: number) => {
      if (isVCMView) return
      const target = event.target as HTMLElement
      if (target.closest('button,a,input,select,textarea,[role="button"]')) return
      navigate(`/empresas/${companyId}`)
    },
    [isVCMView, navigate]
  )

  const columnCount = isVCMView ? 6 : 5

  function openCreate() {
    setEditing({
      id: 0,
      name: '',
      email: '',
      phone: '',
      address: '',
      management_address: '',
      employees_count: 0,
      sector: '',
      counterpart_contacts: [],
    } as Company)
  }

  function openEdit(c: Company) {
    setEditing({ ...c, counterpart_contacts: c.counterpart_contacts || [] })
  }

  async function onDelete(c: Company) {
    if (!confirm(`¿Eliminar empresa "${c.name}"?`)) return
    try {
      await deleteCompany(c.id)
      toast.success('Empresa eliminada')
      await load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo eliminar'
      toast.error(msg)
    }
  }

  return (
    <section className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Empresas</h1>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar"
            className="w-64 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
          <button onClick={openCreate} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">Nueva empresa</button>
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
              <Th>Teléfono</Th>
              <Th>Sector</Th>
              <Th>Responsable</Th>
              {isVCMView ? <Th className="text-right">Acciones</Th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {loading ? (
              <tr><td className="p-4 text-sm text-zinc-600" colSpan={columnCount}>Cargando…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="p-4 text-sm text-zinc-600" colSpan={columnCount}>Sin resultados</td></tr>
            ) : (
              filtered.map((c) => (
                <tr
                  key={c.id}
                  className={`hover:bg-zinc-50 ${isVCMView ? '' : 'cursor-pointer'}`}
                  onClick={isVCMView ? undefined : (event) => handleRowClick(event, c.id)}
                >
                  <Td>{c.name}</Td>
                  <Td>{c.email || '—'}</Td>
                  <Td>{c.phone || '—'}</Td>
                  <Td>{c.sector || '—'}</Td>
                  <Td>{renderContactSummary(contactHints.get(c.id))}</Td>
                  {isVCMView ? (
                    <Td className="text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(c)} className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50 shadow-sm">Editar</button>
                        <button onClick={() => onDelete(c)} className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 shadow-sm">Eliminar</button>
                      </div>
                    </Td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing ? (
        <EmpresaModal
          initial={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load() }}
        />
      ) : null}
    </section>
  )
}

export function EmpresaModal({ initial, onClose, onSaved }: { initial: Company | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Company>(
    initial ?? {
      id: 0,
      name: '',
      email: '',
      phone: '',
      address: '',
      management_address: '',
      employees_count: 0,
      sector: '',
      counterpart_contacts: [],
    } as Company,
  )
  const [employeesStr, setEmployeesStr] = useState<string>(String(initial?.employees_count ?? 0))
  const [saving, setSaving] = useState(false)

  function update<K extends keyof Company>(k: K, v: Company[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    // Validaciones
    if (!form.name.trim()) {
      toast.error('Ingresa el nombre de la Empresa')
      return
    }
    if (!form.sector.trim()) {
      toast.error('Ingresa el Sector')
      return
    }
    if (!form.address.trim()) {
      toast.error('Ingresa la Dirección')
      return
    }
    
    setSaving(true)
    try {
      const payload: Omit<Company, 'id'> = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        management_address: form.management_address,
        employees_count: Number(employeesStr || 0),
        sector: form.sector,
        counterpart_contacts: Array.isArray(form.counterpart_contacts) ? form.counterpart_contacts : [],
      }
      if (initial?.id) {
        await updateCompany(initial.id, payload)
        toast.success('Empresa actualizada')
      } else {
        await createCompany(payload)
        toast.success('Empresa creada')
      }
      onSaved()
    } catch (err) {
      let msg = 'No se pudo guardar'
      if ((err as any)?.response?.data) {
        try {
          const parts = Object.entries((err as any).response.data as Record<string, any>).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
          if (parts.length) msg = parts.join(' | ')
        } catch {}
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
          <h2 className="text-sm font-semibold text-zinc-900">{initial ? 'Editar empresa' : 'Nueva empresa'}</h2>
          {/* Sin botón Cerrar en el header para unificar formato */}
        </div>
        <form className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 sm:px-6" onSubmit={onSubmit}>
          <Text label="Nombre" value={form.name} onChange={(v) => update('name', v)} required />
          <Text label="Correo" value={form.email} onChange={(v) => update('email', v)} type="email" placeholder="empresa@dominio.cl" required />
          <Text label="Teléfono" value={form.phone} onChange={(v) => update('phone', v)} type="tel" placeholder="+56 9 1234 5678" />
          <Text label="Sector" value={form.sector} onChange={(v) => update('sector', v)} required />
          <Text label="Dirección" value={form.address} onChange={(v) => update('address', v)} required />
          <Text label="Dirección gerencia" value={form.management_address} onChange={(v) => update('management_address', v)} />
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

          <div className="col-span-full mt-2 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm">Cancelar</button>
            <button type="submit" disabled={saving} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2 text-left text-xs font-semibold text-zinc-600 ${className}`}>{children}</th>
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2 text-sm text-zinc-800 ${className}`}>{children}</td>
}

function buildContactMap(problems: ProblemStatement[]): Map<number, CounterpartContact> {
  const map = new Map<number, CounterpartContact>()
  problems.forEach((p) => {
    const normalized = normalizeContact(p.counterpart_contacts?.[0] || null)
    if (normalized) {
      map.set(p.company, normalized)
    }
  })
  return map
}

function normalizeContact(contact?: CounterpartContact | null): CounterpartContact | null {
  if (!contact) return null
  const normalized: CounterpartContact = {
    name: contact.name?.trim() || '',
    rut: contact.rut?.trim() || '',
    phone: contact.phone?.trim() || '',
    email: contact.email?.trim() || '',
    counterpart_area: contact.counterpart_area?.trim() || '',
    role: contact.role?.trim() || '',
  }
  if (
    !normalized.name &&
    !normalized.email &&
    !normalized.phone &&
    !normalized.counterpart_area &&
    !normalized.role
  ) {
    return null
  }
  return normalized
}

function renderContactSummary(contact?: CounterpartContact) {
  const normalized = normalizeContact(contact)
  if (!normalized) {
    return <span className="text-xs text-zinc-500">Sin responsable</span>
  }
  return (
    <div className="text-sm text-zinc-800">
      <div className="font-medium">{normalized.name || 'Sin nombre'}</div>
      <div className="text-xs text-zinc-600">{normalized.role || normalized.counterpart_area || 'Sin cargo'}</div>
      <div className="text-xs text-zinc-600">{normalized.email || normalized.phone || 'Sin datos de contacto'}</div>
    </div>
  )
}

function Text({
  label,
  value,
  onChange,
  type = 'text',
  required,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  placeholder?: string
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-zinc-800">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        required={required}
        placeholder={placeholder}
        className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
      />
    </label>
  )
}

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
