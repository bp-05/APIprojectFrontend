import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'react-hot-toast'
import { deleteCompany, getCompany, updateCompany, type Company } from '../../api/companies'

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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      await updateCompany(numericId, form)
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
    </section>
  )
}
