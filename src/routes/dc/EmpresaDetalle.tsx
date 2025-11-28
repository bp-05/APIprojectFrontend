import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from '../../lib/toast'
import {
  deleteCompany,
  getCompany,
  updateCompany,
  listCounterpartContacts,
  createCounterpartContact,
  updateCounterpartContact,
  deleteCounterpartContact,
  type Company,
  type CounterpartContact,
} from '../../api/companies'

type CompanyFormState = Pick<
  Company,
  'name' | 'address' | 'management_address' | 'email' | 'phone' | 'employees_count' | 'sector'
>

function buildInitialForm(): CompanyFormState {
  return {
    name: '',
    address: '',
    management_address: '',
    email: '',
    phone: '',
    employees_count: 0,
    sector: '',
  }
}

export default function EmpresaDetalleDC() {
  const { companyId } = useParams<{ companyId: string }>()
  const navigate = useNavigate()
  const [form, setForm] = useState<CompanyFormState>(buildInitialForm())
  const [contact, setContact] = useState<CounterpartContact | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contactSaving, setContactSaving] = useState(false)
  const [contactError, setContactError] = useState<string | null>(null)
  const [contactModal, setContactModal] = useState(false)

  const numericId = Number(companyId)
  const isValidId = Number.isFinite(numericId)

  useEffect(() => {
    async function loadCompany() {
      if (!isValidId) {
        setError('Empresa no encontrada')
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const data = await getCompany(numericId)
        setForm({
          name: data.name || '',
          address: data.address || '',
          management_address: data.management_address || '',
          email: data.email || '',
          phone: data.phone || '',
          employees_count: data.employees_count ?? 0,
          sector: data.sector || '',
        })
        const loadedContacts = await listCounterpartContacts({ company: numericId })
        // Solo tomamos el primer contacto (único contacto por empresa)
        const firstContact = Array.isArray(loadedContacts) && loadedContacts.length > 0 ? loadedContacts[0] : null
        setContact(firstContact)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'No se pudo cargar la empresa'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }
    loadCompany()
  }, [isValidId, numericId])

  function handleChange(field: keyof CompanyFormState, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: field === 'employees_count' ? Number(value) || 0 : value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValidId) return
    setSaving(true)
    setError(null)
    try {
      await updateCompany(numericId, { ...form })
      toast.success('Empresa actualizada')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo actualizar la empresa'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!isValidId) return
    if (!confirm(`¿Eliminar la empresa ${form.name || ''}?`)) return
    setRemoving(true)
    setError(null)
    try {
      await deleteCompany(numericId)
      toast.success('Empresa eliminada')
      navigate('/dc/empresas')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo eliminar la empresa'
      setError(msg)
    } finally {
      setRemoving(false)
    }
  }

  async function handleSaveContact(values: CounterpartContact) {
    if (!isValidId) return
    setContactSaving(true)
    setContactError(null)
    try {
      const payload = {
        name: values.name.trim(),
        rut: values.rut.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        counterpart_area: values.counterpart_area.trim(),
        role: values.role.trim(),
        company: numericId,
      }
      if (contact?.id) {
        // Editar contacto existente
        const updated = await updateCounterpartContact(contact.id, payload)
        toast.success('Contacto actualizado')
        setContact(updated)
      } else {
        // Crear nuevo contacto
        const created = await createCounterpartContact(payload)
        toast.success('Contacto asignado')
        setContact(created)
      }
      setContactModal(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo guardar el contacto'
      setContactError(msg)
    } finally {
      setContactSaving(false)
    }
  }

  async function handleDeleteContact() {
    if (!contact?.id) return
    if (!confirm('¿Eliminar este contacto?')) return
    setContactSaving(true)
    setContactError(null)
    try {
      await deleteCounterpartContact(contact.id)
      setContact(null)
      toast.success('Contacto eliminado')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo eliminar el contacto'
      setContactError(msg)
    } finally {
      setContactSaving(false)
    }
  }

  return (
    <section className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/dc/empresas')}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
        >
          Volver
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={removing || loading}
          className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          {removing ? 'Eliminando...' : 'Eliminar'}
        </button>
      </div>

      <div className="mb-4">
        <p className="text-sm text-zinc-600">Edición de empresa</p>
        <h1 className="text-xl font-semibold">{form.name || 'Empresa'}</h1>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="text-sm text-zinc-600">Cargando…</div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-700">Nombre</label>
            <input
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Correo</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Teléfono</label>
            <input
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Sector</label>
            <input
              value={form.sector}
              onChange={(e) => handleChange('sector', e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Empleados</label>
            <input
              type="number"
              min={0}
              value={form.employees_count}
              onChange={(e) => handleChange('employees_count', e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-700">Dirección principal</label>
            <input
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-700">Dirección gerencia</label>
            <input
              value={form.management_address}
              onChange={(e) => handleChange('management_address', e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
          </div>
          <div className="lg:col-span-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => navigate('/dc/empresas')}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      )}

      {/* Sección de Contacto (único) */}
      <section className="mt-8">
        <div className="mb-3">
          <h2 className="text-base font-semibold text-zinc-900">Contacto de la empresa</h2>
          <p className="text-sm text-zinc-600">Persona de contacto vinculada a esta empresa</p>
        </div>

        {contactError ? (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {contactError}
          </div>
        ) : null}

        {contact ? (
          // Mostrar contacto existente
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-zinc-500">Nombre</div>
                <div className="text-sm font-medium text-zinc-800">{contact.name || '-'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-zinc-500">RUT</div>
                <div className="text-sm text-zinc-800">{contact.rut || '-'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-zinc-500">Correo</div>
                <div className="text-sm text-zinc-800">{contact.email || '-'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-zinc-500">Teléfono</div>
                <div className="text-sm text-zinc-800">{contact.phone || '-'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-zinc-500">Área</div>
                <div className="text-sm text-zinc-800">{contact.counterpart_area || '-'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-zinc-500">Rol</div>
                <div className="text-sm text-zinc-800">{contact.role || '-'}</div>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setContactModal(true)}
                disabled={contactSaving}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-60"
              >
                Editar contacto
              </button>
              <button
                type="button"
                onClick={handleDeleteContact}
                disabled={contactSaving}
                className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                Eliminar contacto
              </button>
            </div>
          </div>
        ) : (
          // Sin contacto - mostrar botón para asignar
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
            <div className="mb-2 text-sm text-zinc-600">Esta empresa no tiene un contacto asignado</div>
            <button
              type="button"
              onClick={() => setContactModal(true)}
              disabled={contactSaving}
              className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60"
            >
              Asignar contacto
            </button>
          </div>
        )}
      </section>

      {/* Modal de contacto */}
      {contactModal ? (
        <ContactDialog
          contact={contact}
          saving={contactSaving}
          onClose={() => setContactModal(false)}
          onSubmit={handleSaveContact}
        />
      ) : null}
    </section>
  )
}

function ContactDialog({
  contact,
  saving,
  onClose,
  onSubmit,
}: {
  contact: CounterpartContact | null
  saving: boolean
  onClose: () => void
  onSubmit: (values: CounterpartContact) => Promise<void>
}) {
  const [form, setForm] = useState<CounterpartContact>({
    id: contact?.id,
    name: contact?.name ?? '',
    rut: contact?.rut ?? '',
    phone: contact?.phone ?? '',
    email: contact?.email ?? '',
    counterpart_area: contact?.counterpart_area ?? '',
    role: contact?.role ?? '',
  })

  function handleChange(field: keyof CounterpartContact, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onSubmit(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">{contact ? 'Editar contacto' : 'Asignar contacto'}</h2>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-700">Nombre</label>
            <input
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">RUT</label>
            <input
              value={form.rut}
              onChange={(e) => handleChange('rut', e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Teléfono</label>
            <input
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Correo</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Área</label>
            <input
              value={form.counterpart_area}
              onChange={(e) => handleChange('counterpart_area', e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-700">Rol</label>
            <input
              value={form.role}
              onChange={(e) => handleChange('role', e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
          </div>
          <div className="md:col-span-2 mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-60"
            >
              {saving ? 'Guardando…' : contact ? 'Guardar cambios' : 'Asignar contacto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
