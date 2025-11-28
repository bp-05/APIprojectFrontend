import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { toast } from '../../lib/toast'
import {
  getProblemStatement,
  updateProblemStatement,
  deleteProblemStatement,
  type ProblemStatement,
  type Company,
  getCompany,
} from '../../api/companies'
import { getSubject, type Subject } from '../../api/subjects'

export default function AdminProyectoDetalle() {
  const navigate = useNavigate()
  const { id } = useParams()
  const proyectoId = Number(id)
  const [proyecto, setProyecto] = useState<ProblemStatement | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [subject, setSubject] = useState<Subject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState<Partial<ProblemStatement>>({})

  useEffect(() => {
    const loadProyecto = async () => {
      try {
        setLoading(true)
        const proj = await getProblemStatement(proyectoId)
        setProyecto(proj)
        setFormData(proj)
        
        if (proj.company) {
          const comp = await getCompany(proj.company)
          setCompany(comp)
        }
        
        if (proj.subject) {
          const subj = await getSubject(proj.subject)
          setSubject(subj)
        }
        
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar el proyecto')
      } finally {
        setLoading(false)
      }
    }
    loadProyecto()
  }, [proyectoId])

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar este proyecto? Esta acción no se puede deshacer.')) return
    try {
      await deleteProblemStatement(proyectoId)
      toast.success('Proyecto eliminado')
      navigate('/admin/proyectos')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar')
    }
  }

  const handleUpdate = async () => {
    if (!proyecto) return
    try {
      await updateProblemStatement(proyectoId, formData as Omit<ProblemStatement, 'id'>)
      setProyecto(prev => prev ? { ...prev, ...formData } as ProblemStatement : null)
      toast.success('Proyecto actualizado')
      setEditMode(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al actualizar')
    }
  }

  if (loading) return <div className="p-8 text-center">Cargando...</div>
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>
  if (!proyecto) return <div className="p-8 text-center">Proyecto no encontrado</div>

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/proyectos')}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
        >
          Volver
        </button>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <button
                onClick={handleUpdate}
                className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
              >
                Guardar
              </button>
              <button
                onClick={() => {
                  setEditMode(false)
                  setFormData(proyecto)
                }}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditMode(true)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
              >
                Editar
              </button>
              <button
                onClick={handleDelete}
                className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
              >
                Eliminar
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Proyecto #{proyecto.id}</h1>
        <div className="mt-2 space-y-1">
          {company && <p className="text-sm text-zinc-600">Empresa: {company.name}</p>}
          {subject && <p className="text-sm text-zinc-600">Asignatura: {subject.name} ({subject.code}-{subject.section})</p>}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-6">
        {editMode ? (
          <>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">¿Cuál es el proyecto que necesitamos abordar?</label>
              <textarea
                value={formData.problem_to_address || ''}
                onChange={(e) => setFormData({ ...formData, problem_to_address: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">¿Por qué este proyecto es importante para nosotros?</label>
              <textarea
                value={formData.why_important || ''}
                onChange={(e) => setFormData({ ...formData, why_important: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">¿Para quiénes es relevante? ¿A quién concierne?</label>
              <textarea
                value={formData.stakeholders || ''}
                onChange={(e) => setFormData({ ...formData, stakeholders: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">¿Qué área está más directamente relacionada?</label>
              <textarea
                value={formData.related_area || ''}
                onChange={(e) => setFormData({ ...formData, related_area: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">¿Cómo y en qué nos beneficiaría en el corto, mediano y largo plazo?</label>
              <textarea
                value={formData.benefits_short_medium_long_term || ''}
                onChange={(e) => setFormData({ ...formData, benefits_short_medium_long_term: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Define el proyecto a trabajar en la asignatura</label>
              <textarea
                value={formData.problem_definition || ''}
                onChange={(e) => setFormData({ ...formData, problem_definition: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Proyecto a abordar</h2>
              <p className="mt-2 text-sm text-zinc-900 whitespace-pre-wrap">{proyecto.problem_to_address || '-'}</p>
            </div>
            <div>
              <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Importancia del proyecto</h2>
              <p className="mt-2 text-sm text-zinc-900 whitespace-pre-wrap">{proyecto.why_important || '-'}</p>
            </div>
            <div>
              <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Stakeholders</h2>
              <p className="mt-2 text-sm text-zinc-900 whitespace-pre-wrap">{proyecto.stakeholders || '-'}</p>
            </div>
            <div>
              <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Área relacionada</h2>
              <p className="mt-2 text-sm text-zinc-900 whitespace-pre-wrap">{proyecto.related_area || '-'}</p>
            </div>
            <div>
              <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Beneficios a corto, mediano y largo plazo</h2>
              <p className="mt-2 text-sm text-zinc-900 whitespace-pre-wrap">{proyecto.benefits_short_medium_long_term || '-'}</p>
            </div>
            <div>
              <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Definición del proyecto</h2>
              <p className="mt-2 text-sm text-zinc-900 whitespace-pre-wrap">{proyecto.problem_definition || '-'}</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
