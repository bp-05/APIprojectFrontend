import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import toast from 'react-hot-toast'
import { listCompanies, type Company } from '../../api/companies'
import { getSubject, type Subject } from '../../api/subjects'

interface EngagementScope {
  id: number
  scope_description: string
  benefits: string
  subject: number
  company: number
}

// Simulación temporal - reemplazar con API real cuando esté disponible
async function listEngagementScopes() {
  return [] as EngagementScope[]
}

export default function AlcanceDetalle() {
  const navigate = useNavigate()
  const { id } = useParams()
  const alcanceId = Number(id)
  const [alcance, setAlcance] = useState<EngagementScope | null>(null)
  const [subject, setSubject] = useState<Subject | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({
    scope_description: '',
    benefits: '',
  })

  useEffect(() => {
    const loadAlcance = async () => {
      try {
        setLoading(true)
        const scopes = await listEngagementScopes()
        const found = scopes.find(a => a.id === alcanceId)
        
        if (found) {
          setAlcance(found)
          setFormData({
            scope_description: found.scope_description || '',
            benefits: found.benefits || '',
          })
          
          // Cargar información de empresa y asignatura
          const [companies, subj] = await Promise.all([
            listCompanies(),
            getSubject(found.subject),
          ])
          
          const foundCompany = companies.find(c => c.id === found.company)
          if (foundCompany) setCompany(foundCompany)
          if (subj) setSubject(subj)
        } else {
          setError('Alcance no encontrado')
        }
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar el alcance')
      } finally {
        setLoading(false)
      }
    }
    loadAlcance()
  }, [alcanceId])

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar este alcance? Esta acción no se puede deshacer.')) return
    try {
      // Implementar llamada a API cuando esté disponible
      toast.success('Alcance eliminado')
      navigate('/vcm/alcances')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar')
    }
  }

  const handleUpdate = async () => {
    if (!alcance) return
    try {
      // Implementar llamada a API cuando esté disponible
      setAlcance(prev => prev ? { ...prev, ...formData } : null)
      toast.success('Alcance actualizado')
      setEditMode(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al actualizar')
    }
  }

  if (loading) return <div className="p-8 text-center">Cargando...</div>
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>
  if (!alcance) return <div className="p-8 text-center">Alcance no encontrado</div>

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/vcm/alcances')}
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
                    scope_description: alcance.scope_description || '',
                    benefits: alcance.benefits || '',
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
        <h1 className="text-3xl font-bold text-zinc-900">Alcance #{alcance.id}</h1>
        <p className="text-sm text-zinc-600 mt-2">
          {subject?.name && company?.name && `${subject.name} · ${company.name}`}
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        {editMode ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Descripción del alcance</label>
              <textarea
                value={formData.scope_description}
                onChange={(e) => setFormData({ ...formData, scope_description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Beneficios</label>
              <textarea
                value={formData.benefits}
                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {alcance.scope_description && (
              <div>
                <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Descripción del alcance</h2>
                <p className="mt-2 text-sm text-zinc-900 whitespace-pre-wrap">{alcance.scope_description}</p>
              </div>
            )}
            {alcance.benefits && (
              <div>
                <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Beneficios</h2>
                <p className="mt-2 text-sm text-zinc-900 whitespace-pre-wrap">{alcance.benefits}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
