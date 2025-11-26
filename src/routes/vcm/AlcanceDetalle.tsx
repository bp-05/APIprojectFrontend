import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import toast from 'react-hot-toast'
import {
  getEngagementScope,
  updateEngagementScope,
  deleteEngagementScope,
  type CompanyEngagementScope,
} from '../../api/companies'
import { getSubject, type Subject } from '../../api/subjects'

export default function AlcanceDetalle() {
  const navigate = useNavigate()
  const { id } = useParams()
  const alcanceId = Number(id)
  const [alcance, setAlcance] = useState<CompanyEngagementScope | null>(null)
  const [subject, setSubject] = useState<Subject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState<Partial<CompanyEngagementScope>>({})

  useEffect(() => {
    const loadAlcance = async () => {
      try {
        setLoading(true)
        const scope = await getEngagementScope(alcanceId)
        setAlcance(scope)
        setFormData(scope)
        
        // Cargar información de asignatura
        const subj = await getSubject(scope.subject)
        if (subj) setSubject(subj)
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
      await deleteEngagementScope(alcanceId)
      toast.success('Alcance eliminado')
      navigate('/vcm/alcances')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar')
    }
  }

  const handleUpdate = async () => {
    if (!alcance) return
    try {
      await updateEngagementScope(alcanceId, formData as Omit<CompanyEngagementScope, 'id'>)
      setAlcance(prev => prev ? { ...prev, ...formData } as CompanyEngagementScope : null)
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
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Volver
        </button>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <button
                onClick={handleUpdate}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Guardar
              </button>
              <button
                onClick={() => {
                  setEditMode(false)
                  setFormData(alcance)
                }}
                className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditMode(true)}
                className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
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
          {subject && `${subject.name} (${subject.code}-${subject.section})`}
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        {editMode ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">¿Qué beneficios podría aportar un estudiante a su organización?</label>
              <textarea
                value={formData.benefits_from_student || ''}
                onChange={(e) => setFormData({ ...formData, benefits_from_student: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">¿Cuánto tiempo le gustaría disponer para esta experiencia? ¿Podría participar durante el semestre?</label>
              <textarea
                value={formData.time_availability_and_participation || ''}
                onChange={(e) => setFormData({ ...formData, time_availability_and_participation: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">¿Qué horarios de reunión tiene disponible?</label>
              <textarea
                value={formData.meeting_schedule_availability || ''}
                onChange={(e) => setFormData({ ...formData, meeting_schedule_availability: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.has_value_or_research_project || false}
                onChange={(e) => setFormData({ ...formData, has_value_or_research_project: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-600"
              />
              <label className="text-sm text-zinc-700">¿Tiene un proyecto de investigación o de valor agregado?</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.workplace_has_conditions_for_group || false}
                onChange={(e) => setFormData({ ...formData, workplace_has_conditions_for_group: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-600"
              />
              <label className="text-sm text-zinc-700">¿Su lugar de trabajo presenta condiciones para recibir al grupo de estudiantes?</label>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Beneficios que podría aportar un estudiante</h2>
              <p className="mt-2 text-sm text-zinc-900 whitespace-pre-wrap">{alcance.benefits_from_student || '-'}</p>
            </div>
            <div>
              <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Tiempo disponible y participación</h2>
              <p className="mt-2 text-sm text-zinc-900 whitespace-pre-wrap">{alcance.time_availability_and_participation || '-'}</p>
            </div>
            <div>
              <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Horarios de reunión disponibles</h2>
              <p className="mt-2 text-sm text-zinc-900 whitespace-pre-wrap">{alcance.meeting_schedule_availability || '-'}</p>
            </div>
            <div>
              <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">¿Tiene proyecto de investigación o valor agregado?</h2>
              <p className="mt-2 text-sm text-zinc-900">{alcance.has_value_or_research_project ? 'Sí' : 'No'}</p>
            </div>
            <div>
              <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">¿Lugar de trabajo con condiciones para el grupo?</h2>
              <p className="mt-2 text-sm text-zinc-900">{alcance.workplace_has_conditions_for_group ? 'Sí' : 'No'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
