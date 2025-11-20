import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router'
import {
  listCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  createCounterpartContact,
  type Company,
  type CounterpartContact,
} from '../../api/companies'

function calculateRutDv(rut: string): string {
  const digits = rut.replace(/\D/g, '')
  if (digits.length < 7) return ''
  
  let sum = 0
  let multiplier = 2
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += parseInt(digits[i]) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }
  
  const dv = 11 - (sum % 11)
  if (dv === 11) return '0'
  if (dv === 10) return 'K'
  return String(dv)
}

function formatRutInput(value: string): string {
  if (!value) return ''
  
  const input = value.toUpperCase()
  
  let cleaned = ''
  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    if (/[0-9K.\-]/.test(char)) {
      cleaned += char
    }
  }
  
  const withoutHyphen = cleaned.replace('-', '')
  
  let numPart = ''
  let dvPart = ''
  
  for (let i = 0; i < withoutHyphen.length; i++) {
    const char = withoutHyphen[i]
    if (/[0-9]/.test(char) && numPart.length < 8) {
      numPart += char
    } else if (/[0-9K]/.test(char)) {
      dvPart += char
    }
  }
  
  dvPart = dvPart.slice(0, 1)
  
  let formatted = ''
  if (numPart.length <= 2) {
    formatted = numPart
  } else if (numPart.length <= 5) {
    formatted = numPart.slice(0, 2) + '.' + numPart.slice(2)
  } else {
    formatted = numPart.slice(0, 2) + '.' + numPart.slice(2, 5) + '.' + numPart.slice(5, 8)
  }
  
  if (numPart.length === 8 && dvPart) {
    formatted += '-' + dvPart
  } else if (numPart.length === 8 && dvPart === '') {
    formatted += '-'
  }
  
  return formatted
}

function validateContactField(key: keyof CounterpartContact, value: string): Partial<Record<string, string>> {
  const errors: Partial<Record<string, string>> = {}
  
  if (key === 'name' && value) {
    // Validar que tenga nombre Y apellido (al menos un espacio)
    const trimmed = value.trim()
    const parts = trimmed.split(/\s+/).filter(p => p.length > 0)
    
    if (parts.length < 2) {
      errors.name = 'Ingresa nombre y apellido'
    } else {
      // Validar que solo contenga letras y espacios
      if (!/^[a-záéíóúñ\s]+$/i.test(trimmed)) {
        errors.name = 'Solo se permiten letras y espacios'
      }
    }
  }
  
  if (key === 'rut' && value) {
    const rutDigits = value.replace(/\D/g, '')
    const rutFull = value.toUpperCase()
    const hasK = /K/.test(rutFull)
    
    if (rutDigits.length < 8) {
      return errors // Aún está incompleto
    }
    
    const numPart = rutDigits.slice(0, 8)
    const dvCharacter = hasK ? 'K' : rutDigits.slice(8, 9)
    
    if (!dvCharacter) {
      return errors // Aún falta el DV
    }
    
    const expectedDv = calculateRutDv(numPart)
    if (dvCharacter !== expectedDv) {
      errors.rut = 'RUT inválido'
    }
  }
  
  if (key === 'phone' && value) {
    const phoneDigits = String(value).replace(/\D/g, '')
    if (phoneDigits.length > 0 && phoneDigits.length !== 8) {
      return errors // Aún está incompleto
    }
  }
  
  if (key === 'email' && value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.(cl|com|org|net|edu|gov)$/i
    if (!emailRegex.test(value)) {
      errors.email = 'Email inválido. Ej: usuario@empresa.cl'
    }
  }
  
  return errors
}

export default function EmpresasVCM() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [editing, setEditing] = useState<Company | null>(null)
  const [assigningContact, setAssigningContact] = useState<Company | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [data] = await Promise.all([
        listCompanies(),
      ])
      setItems(data)
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
    (event: React.MouseEvent<HTMLTableRowElement>, empresaId: number) => {
      const target = event.target as HTMLElement
      if (target.closest('button, a, input, select, textarea, [role="button"]')) return
      navigate(`/vcm/empresas/${empresaId}`)
    },
    [navigate]
  )

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
      api_type: 1,
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
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {loading ? (
              <tr><td className="p-4 text-sm text-zinc-600" colSpan={5}>Cargando…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="p-4 text-sm text-zinc-600" colSpan={5}>Sin resultados</td></tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50 cursor-pointer" onClick={(event) => handleRowClick(event, c.id)}>
                  <Td>{c.name}</Td>
                  <Td>{c.email || '—'}</Td>
                  <Td>{c.phone || '—'}</Td>
                  <Td>{c.sector || '—'}</Td>
                  <Td>{renderResponsibleColumn(c, () => setAssigningContact(c))}</Td>
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

      {assigningContact ? (
        <AsignarResponsableModal
          company={assigningContact}
          onClose={() => setAssigningContact(null)}
          onSaved={async () => { setAssigningContact(null); await load() }}
        />
      ) : null}
    </section>
  )
}

function EmpresaModal({ initial, onClose, onSaved }: { initial: Company | null; onClose: () => void; onSaved: () => void }) {
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
      api_type: 1,
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
    if (!form.email.trim()) {
      toast.error('Ingresa el Correo')
      return
    }
    if (!form.phone.trim()) {
      toast.error('Ingresa el Teléfono')
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
    if (!form.management_address.trim()) {
      toast.error('Ingresa la Dirección de Gerencia')
      return
    }
    if (!employeesStr.trim() || Number(employeesStr) <= 0) {
      toast.error('Ingresa el número de Empleados (mayor a 0)')
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
        employees_count: Number(employeesStr),
        sector: form.sector,
        api_type: form.api_type,
        counterpart_contacts: [],
      }

      if (initial?.id) {
        // Editar empresa
        await updateCompany(initial.id, payload)
        toast.success('Empresa actualizada')
      } else {
        // Crear empresa
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
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-lg ring-1 ring-black/5 max-h-[calc(100vh-4rem)] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-3">
          <h2 className="text-sm font-semibold text-zinc-900">{initial ? 'Editar empresa' : 'Nueva empresa'}</h2>
        </div>
        <form className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 sm:px-6" onSubmit={onSubmit}>
          <Text label="Nombre" value={form.name} onChange={(v) => update('name', v)} required />
          <Text label="Correo" value={form.email} onChange={(v) => update('email', v)} type="email" placeholder="empresa@dominio.cl" required />
          <Text label="Teléfono" value={form.phone} onChange={(v) => update('phone', v)} type="tel" placeholder="+56 9 1234 5678" required />
          <Text label="Sector" value={form.sector} onChange={(v) => update('sector', v)} required />
          <Text label="Dirección" value={form.address} onChange={(v) => update('address', v)} required />
          <Text label="Dirección gerencia" value={form.management_address} onChange={(v) => update('management_address', v)} required />
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">Empleados *</span>
            <input
              value={employeesStr}
              onChange={(e) => setEmployeesStr(e.target.value.replace(/[^0-9]/g, ''))}
              type="number"
              min={1}
              step={1}
              className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              required
            />
          </label>

          {/* Botones de Guardar/Cancelar */}
          <div className="col-span-full mt-4 flex items-center justify-end gap-2 border-t border-zinc-200 pt-4">
            <button type="button" onClick={onClose} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm">Cancelar</button>
            <button type="submit" disabled={saving} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>

          {/* Sección de Contactos Contrapartes (solo visualización) */}
          {initial?.id && (
            <div className="col-span-full mt-6 border-t border-zinc-200 pt-4">
              <h3 className="mb-3 text-sm font-semibold text-zinc-900">Contactos Contrapartes</h3>
              {initial.counterpart_contacts && initial.counterpart_contacts.length > 0 ? (
                <div className="space-y-2">
                  {initial.counterpart_contacts.map((contact, idx) => (
                    <div key={idx} className="flex items-start rounded-md border border-zinc-200 bg-zinc-50 p-3">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-zinc-900">{contact.name}</div>
                        <div className="text-xs text-zinc-600">{contact.role || contact.counterpart_area || '—'}</div>
                        <div className="text-xs text-zinc-600">{contact.email || contact.phone || '—'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">Sin contactos asignados. Usa el botón "Asignar responsable" en la tabla para agregar uno.</p>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

function AsignarResponsableModal({ company, onClose, onSaved }: { company: Company; onClose: () => void; onSaved: () => void }) {
  const [editingContact, setEditingContact] = useState<(CounterpartContact & { tempId?: string }) | null>(null)

  function updateContact<K extends keyof CounterpartContact>(key: K, value: CounterpartContact[K]) {
    setEditingContact((prev) => {
      if (!prev) return null
      
      let nextVal: CounterpartContact[K] = value

      if (key === 'rut') {
        nextVal = formatRutInput(String(value || '')) as CounterpartContact[K]
      } else if (key === 'email') {
        nextVal = String(value || '').trim().toLowerCase() as CounterpartContact[K]
      } else if (key === 'name') {
        nextVal = String(value || '').replace(/[^a-záéíóúñ\s]/gi, '') as CounterpartContact[K]
      }

      return { ...prev, [key]: nextVal }
    })
  }

  function openAddContact() {
    setEditingContact({
      tempId: Date.now().toString(),
      name: '',
      rut: '',
      phone: '',
      email: '',
      counterpart_area: '',
      role: '',
    })
  }

  async function saveContact() {
    if (!editingContact) return
    
    // Validar nombre
    const nameError = validateContactField('name', editingContact.name)
    if (nameError.name) {
      toast.error(nameError.name)
      return
    }
    
    // Validar email
    if (!editingContact.email.trim()) {
      toast.error('El email es requerido')
      return
    }
    const emailError = validateContactField('email', editingContact.email)
    if (emailError.email) {
      toast.error(emailError.email)
      return
    }

    // Validar teléfono
    if (!editingContact.phone.trim()) {
      toast.error('El teléfono es requerido')
      return
    }
    const phoneDigits = editingContact.phone.replace(/\D/g, '')
    if (phoneDigits.length !== 8) {
      toast.error('El teléfono debe tener 8 dígitos')
      return
    }

    // Validar área
    if (!editingContact.counterpart_area.trim()) {
      toast.error('El área en la empresa es requerida')
      return
    }

    // Validar cargo
    if (!editingContact.role.trim()) {
      toast.error('El cargo es requerido')
      return
    }

    try {
      const phoneToSave = `+56 9 ${editingContact.phone}`
      
      await createCounterpartContact({
        name: editingContact.name,
        rut: editingContact.rut,
        phone: phoneToSave,
        email: editingContact.email,
        counterpart_area: editingContact.counterpart_area,
        role: editingContact.role,
        company: company.id,
      })
      
      toast.success('Responsable asignado')
      setEditingContact(null)
      await onSaved()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo asignar responsable'
      toast.error(msg)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-lg ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-3">
          <h3 className="text-sm font-semibold text-zinc-900">Asignar responsable - {company.name}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid gap-3 px-4 py-4 sm:px-6">
          {!editingContact ? (
            <>
              <p className="text-sm text-zinc-600 mb-3">
                {company.counterpart_contacts?.length === 0
                  ? 'No hay responsables asignados. Crea uno nuevo.'
                  : `Responsable actual: ${company.counterpart_contacts?.[0]?.name || 'Sin nombre'}`}
              </p>
              <button
                onClick={openAddContact}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Nuevo responsable
              </button>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-zinc-600">Nombre y Apellido *</label>
                <input
                  type="text"
                  value={editingContact.name}
                  onChange={(e) => updateContact('name', e.target.value)}
                  placeholder="Juan Pérez"
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
                  autoFocus
                  required
                />
                {editingContact.name && validateContactField('name', editingContact.name).name && (
                  <p className="text-xs text-red-600">{validateContactField('name', editingContact.name).name}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-zinc-600">RUT</label>
                <input
                  type="text"
                  value={editingContact.rut}
                  onChange={(e) => updateContact('rut', e.target.value)}
                  placeholder="12.345.678-9"
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
                />
                {editingContact.rut && validateContactField('rut', editingContact.rut).rut && (
                  <p className="text-xs text-red-600">{validateContactField('rut', editingContact.rut).rut}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-zinc-600">Email *</label>
                <input
                  type="email"
                  value={editingContact.email}
                  onChange={(e) => updateContact('email', e.target.value)}
                  placeholder="juan.perez@empresa.cl"
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
                  required
                />
                {editingContact.email && validateContactField('email', editingContact.email).email && (
                  <p className="text-xs text-red-600">{validateContactField('email', editingContact.email).email}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-zinc-600">Teléfono *</label>
                <div className="flex gap-0">
                  <span className="flex items-center bg-zinc-100 rounded-l-md border border-zinc-300 border-r-0 px-3 py-2 text-sm font-medium text-zinc-700">+56 9</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editingContact.phone.replace(/[^\d]/g, '')}
                    onChange={(e) => {
                      const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 8)
                      updateContact('phone', onlyDigits)
                    }}
                    placeholder="1234 5678"
                    maxLength={8}
                    className="flex-1 rounded-r-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-zinc-600">Área en la empresa *</label>
                <input
                  type="text"
                  value={editingContact.counterpart_area}
                  onChange={(e) => updateContact('counterpart_area', e.target.value)}
                  placeholder="Recursos Humanos"
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-zinc-600">Cargo *</label>
                <input
                  type="text"
                  value={editingContact.role}
                  onChange={(e) => updateContact('role', e.target.value)}
                  placeholder="Gerente de Proyectos"
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
                  required
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-200 px-6 py-3">
          {editingContact ? (
            <>
              <button
                onClick={() => setEditingContact(null)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={saveContact}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                Guardar responsable
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm"
            >
              Cerrar
            </button>
          )}
        </div>
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

function renderResponsibleColumn(company: Company, onAssign: () => void) {
  const contact = company.counterpart_contacts?.[0]
  
  if (!contact || (!contact.name && !contact.email)) {
    return (
      <button
        onClick={onAssign}
        className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
      >
        Asignar responsable
      </button>
    )
  }
  
  return (
    <button
      onClick={onAssign}
      className="text-left hover:underline"
    >
      <div className="text-sm font-medium text-zinc-900">{contact.name || 'Sin nombre'}</div>
      <div className="text-xs text-zinc-600">{contact.role || contact.counterpart_area || '—'}</div>
      <div className="text-xs text-zinc-600">{contact.email || contact.phone || '—'}</div>
    </button>
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
        onChange={(e) => {
          let newValue = e.target.value
          if (type === 'tel') {
            newValue = newValue.replace(/\D/g, '')
          }
          onChange(newValue)
        }}
        type={type}
        required={required}
        placeholder={placeholder}
        inputMode={type === 'tel' ? 'numeric' : undefined}
        className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
      />
    </label>
  )
}
