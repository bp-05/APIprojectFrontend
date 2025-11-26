import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from '../lib/toast'
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
} from '../api/companies'

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

export default function EmpresaDetalleAdmin() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form, setForm] = useState<CompanyFormState>(buildInitialForm())
  const [contacts, setContacts] = useState<CounterpartContact[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contactsSaving, setContactsSaving] = useState(false)
  const [contactsError, setContactsError] = useState<string | null>(null)
  const [contactModal, setContactModal] = useState<{ contact: CounterpartContact | null; index?: number } | null>(null)

  const numericId = Number(id)
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
        setContacts(Array.isArray(loadedContacts) ? loadedContacts : [])
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
      await updateCompany(numericId, { ...form, counterpart_contacts: contacts })
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
      navigate('/empresas')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo eliminar la empresa'
      setError(msg)
    } finally {
      setRemoving(false)
    }
  }

  async function handleSaveContact(values: CounterpartContact, index?: number) {
    if (!isValidId) return
    setContactsSaving(true)
    setContactsError(null)
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
      if (index === undefined) {
        const created = await createCounterpartContact(payload)
        toast.success('Contacto creado')
        setContacts((prev) => [...prev, created])
      } else {
        const current = contacts[index]
        const id = current?.id ?? values.id
        if (!id) throw new Error('Contacto sin identificador')
        const updated = await updateCounterpartContact(id, payload)
        toast.success('Contacto actualizado')
        setContacts((prev) => prev.map((c, i) => (i === index ? updated : c)))
      }
      setContactModal(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo guardar el contacto'
      setContactsError(msg)
    } finally {
      setContactsSaving(false)
    }
  }

  async function handleDeleteContact(index: number) {
    if (!isValidId) return
    const target = contacts[index]
    if (!target?.id) return
    if (!confirm('¿Eliminar este contacto?')) return
    setContactsSaving(true)
    setContactsError(null)
    try {
      await deleteCounterpartContact(target.id)
      setContacts((prev) => prev.filter((_, i) => i !== index))
      toast.success('Contacto eliminado')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo eliminar el contacto'
      setContactsError(msg)
    } finally {
      setContactsSaving(false)
    }
  }

  return (
    <section className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-zinc-600">Edición de empresa</p>
          <h1 className="text-xl font-semibold">{form.name || 'Empresa'}</h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/empresas')}
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
              onClick={() => navigate('/empresas')}
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

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Contactos contraparte</h2>
            <p className="text-sm text-zinc-600">Personas vinculadas a esta empresa</p>
          </div>
          <button
            type="button"
            onClick={() => setContactModal({ contact: null })}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
            disabled={contactsSaving}
          >
            Nuevo contacto
          </button>
        </div>
        {contactsError ? (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {contactsError}
          </div>
        ) : null}
        {contacts.length === 0 ? (
          <div className="rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-600">
            Sin contactos registrados.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Nombre</th>
                  <th className="px-4 py-2 text-left font-semibold">RUT</th>
                  <th className="px-4 py-2 text-left font-semibold">Área</th>
                  <th className="px-4 py-2 text-left font-semibold">Rol</th>
                  <th className="px-4 py-2 text-left font-semibold">Correo</th>
                  <th className="px-4 py-2 text-left font-semibold">Teléfono</th>
                  <th className="px-4 py-2 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {contacts.map((contact, index) => (
                  <tr key={contact.id ?? `${contact.email}-${index}`}>
                    <td className="px-4 py-2 text-zinc-800">{contact.name || '-'}</td>
                    <td className="px-4 py-2 text-zinc-800">{contact.rut || '-'}</td>
                    <td className="px-4 py-2 text-zinc-800">{contact.counterpart_area || '-'}</td>
                    <td className="px-4 py-2 text-zinc-800">{contact.role || '-'}</td>
                    <td className="px-4 py-2 text-zinc-800">{contact.email || '-'}</td>
                    <td className="px-4 py-2 text-zinc-800">{contact.phone || '-'}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        className="mr-2 rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                        onClick={() => setContactModal({ contact, index })}
                        disabled={contactsSaving}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteContact(index)}
                        disabled={contactsSaving}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {contactModal ? (
        <ContactDialog
          contact={contactModal.contact}
          saving={contactsSaving}
          onClose={() => setContactModal(null)}
          onSubmit={(values) => handleSaveContact(values, contactModal.index)}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">{contact ? 'Editar contacto' : 'Nuevo contacto'}</h2>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100">
            Cerrar
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
              {saving ? 'Guardando…' : contact ? 'Guardar cambios' : 'Agregar contacto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
