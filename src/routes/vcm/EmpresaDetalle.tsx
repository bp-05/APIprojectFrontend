import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import toast from 'react-hot-toast'
import { listCompanies, updateCompany, type Company } from '../../api/companies'

export default function EmpresaDetalleVCM() {
  const navigate = useNavigate()
  const { id } = useParams()
  const empresaId = Number(id)
  const [empresa, setEmpresa] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    management_address: '',
    email: '',
    phone: '',
    employees_count: '',
    sector: '',
  })

  useEffect(() => {
    const loadEmpresa = async () => {
      try {
        setLoading(true)
        const companies = await listCompanies()
        const found = companies.find(c => c.id === empresaId)
        if (found) {
          setEmpresa(found)
          setFormData({
            name: found.name || '',
            address: found.address || '',
            management_address: found.management_address || '',
            email: found.email || '',
            phone: found.phone || '',
            employees_count: String(found.employees_count || ''),
            sector: found.sector || '',
          })
        } else {
          setError('Empresa no encontrada')
        }
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar la empresa')
      } finally {
        setLoading(false)
      }
    }
    loadEmpresa()
  }, [empresaId])

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta empresa? Esta acción no se puede deshacer.')) return
    try {
      // Implement delete API call when available
      toast.success('Empresa eliminada')
      navigate('/vcm/empresas')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar')
    }
  }

  const handleUpdate = async () => {
    if (!empresa) return
    try {
      const employeeCount = parseInt(formData.employees_count, 10)
      if (isNaN(employeeCount) || employeeCount < 0) {
        toast.error('La cantidad de empleados debe ser un número válido')
        return
      }
      
      await updateCompany(empresa.id, {
        ...formData,
        employees_count: employeeCount,
      })
      
      setEmpresa(prev => prev ? { ...prev, ...formData, employees_count: employeeCount } : null)
      toast.success('Empresa actualizada')
      setEditMode(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al actualizar')
    }
  }

  if (loading) return <div className="p-8 text-center">Cargando...</div>
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>
  if (!empresa) return <div className="p-8 text-center">Empresa no encontrada</div>

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/vcm/empresas')}
          className="text-sm text-red-600 hover:underline"
        >
          Volver
        </button>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <button
                onClick={handleUpdate}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Guardar
              </button>
              <button
                onClick={() => {
                  setEditMode(false)
                  setFormData({
                    name: empresa.name || '',
                    address: empresa.address || '',
                    management_address: empresa.management_address || '',
                    email: empresa.email || '',
                    phone: empresa.phone || '',
                    employees_count: String(empresa.employees_count || ''),
                    sector: empresa.sector || '',
                  })
                }}
                className="rounded-md bg-gray-300 px-4 py-2 text-sm font-medium text-black hover:bg-gray-400"
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditMode(true)}
                className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
              >
                Editar
              </button>
              <button
                onClick={handleDelete}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Eliminar
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-zinc-900">{empresa.name}</h1>
        <p className="text-sm text-zinc-600">ID: {empresa.id}</p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        {editMode ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Nombre de la Empresa</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Correo Electrónico</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Teléfono</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Sector</label>
              <input
                type="text"
                value={formData.sector}
                onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Dirección</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Dirección Administrativa</label>
              <input
                type="text"
                value={formData.management_address}
                onChange={(e) => setFormData({ ...formData, management_address: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Cantidad de Empleados</label>
              <input
                type="number"
                min="0"
                value={formData.employees_count}
                onChange={(e) => setFormData({ ...formData, employees_count: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Correo Electrónico</h2>
              <p className="mt-1 text-sm text-zinc-900">{empresa.email || '—'}</p>
            </div>
            <div>
              <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Teléfono</h2>
              <p className="mt-1 text-sm text-zinc-900">{empresa.phone || '—'}</p>
            </div>
            <div>
              <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Sector</h2>
              <p className="mt-1 text-sm text-zinc-900">{empresa.sector || '—'}</p>
            </div>
            <div>
              <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Cantidad de Empleados</h2>
              <p className="mt-1 text-sm text-zinc-900">{empresa.employees_count || '—'}</p>
            </div>
            <div className="md:col-span-2">
              <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Dirección</h2>
              <p className="mt-1 text-sm text-zinc-900">{empresa.address || '—'}</p>
            </div>
            <div className="md:col-span-2">
              <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Dirección Administrativa</h2>
              <p className="mt-1 text-sm text-zinc-900">{empresa.management_address || '—'}</p>
            </div>
          </div>
        )}
      </div>

      {empresa.counterpart_contacts && empresa.counterpart_contacts.length > 0 && (
        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Contactos de Contraparte</h2>
          <div className="space-y-3">
            {empresa.counterpart_contacts.map((contact, idx) => (
              <div key={contact.id || idx} className="border border-zinc-200 rounded p-4 hover:bg-zinc-50">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-zinc-900">{contact.name}</h3>
                    <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="font-medium text-zinc-600">RUT:</span> {contact.rut}
                      </div>
                      <div>
                        <span className="font-medium text-zinc-600">Rol:</span> {contact.role}
                      </div>
                      <div>
                        <span className="font-medium text-zinc-600">Área:</span> {contact.counterpart_area}
                      </div>
                      <div>
                        <span className="font-medium text-zinc-600">Email:</span> {contact.email}
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium text-zinc-600">Teléfono:</span> {contact.phone}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
