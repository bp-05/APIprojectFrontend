import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import toast from 'react-hot-toast'
import { listProblemStatements, updateProblemStatement, deleteProblemStatement, type ProblemStatement } from '../../api/companies'
import { listCompanies, type Company } from '../../api/companies'
import { getSubject, type Subject } from '../../api/subjects'

export default function ProblemaDetalle() {
  const navigate = useNavigate()
  const { id } = useParams()
  const problemaId = Number(id)
  const [problema, setProblema] = useState<ProblemStatement | null>(null)
  const [subject, setSubject] = useState<Subject | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({
    problem_to_address: '',
    why_important: '',
    stakeholders: '',
    related_area: '',
    benefits_short_medium_long_term: '',
    problem_definition: '',
  })

  useEffect(() => {
    const loadProblema = async () => {
      try {
        setLoading(true)
        const problems = await listProblemStatements()
        const found = problems.find(p => p.id === problemaId)
        
        if (found) {
          setProblema(found)
          setFormData({
            problem_to_address: found.problem_to_address || '',
            why_important: found.why_important || '',
            stakeholders: found.stakeholders || '',
            related_area: found.related_area || '',
            benefits_short_medium_long_term: found.benefits_short_medium_long_term || '',
            problem_definition: found.problem_definition || '',
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
          setError('Proyecto no encontrado')
        }
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar el proyecto')
      } finally {
        setLoading(false)
      }
    }
    loadProblema()
  }, [problemaId])

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar este proyecto? Esta acción no se puede deshacer.')) return
    try {
      await deleteProblemStatement(problemaId)
      toast.success('Proyecto eliminado')
      navigate('/vcm/proyectos')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar')
    }
  }

  const handleUpdate = async () => {
    if (!problema) return
    try {
      await updateProblemStatement(problema.id, formData)
      setProblema(prev => prev ? { ...prev, ...formData } : null)
      toast.success('Proyecto actualizado')
      setEditMode(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al actualizar')
    }
  }

  if (loading) return <div className="p-8 text-center">Cargando...</div>
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>
  if (!problema) return <div className="p-8 text-center">Proyecto no encontrado</div>

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/vcm/proyectos')}
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
                    problem_to_address: problema.problem_to_address || '',
                    why_important: problema.why_important || '',
                    stakeholders: problema.stakeholders || '',
                    related_area: problema.related_area || '',
                    benefits_short_medium_long_term: problema.benefits_short_medium_long_term || '',
                    problem_definition: problema.problem_definition || '',
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
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
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
        <h1 className="text-3xl font-bold text-zinc-900">Proyecto #{problema.id}</h1>
        <p className="text-sm text-zinc-600 mt-2">
          {subject?.name && company?.name && `${subject.name} · ${company.name}`}
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        {editMode ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Problema a Abordar</label>
              <textarea
                value={formData.problem_to_address}
                onChange={(e) => setFormData({ ...formData, problem_to_address: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">¿Por Qué es Importante?</label>
              <textarea
                value={formData.why_important}
                onChange={(e) => setFormData({ ...formData, why_important: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Partes Interesadas</label>
              <textarea
                value={formData.stakeholders}
                onChange={(e) => setFormData({ ...formData, stakeholders: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Área Relacionada</label>
              <input
                type="text"
                value={formData.related_area}
                onChange={(e) => setFormData({ ...formData, related_area: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Beneficios (Corto, Medio y Largo Plazo)</label>
              <textarea
                value={formData.benefits_short_medium_long_term}
                onChange={(e) => setFormData({ ...formData, benefits_short_medium_long_term: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Definición del Problema</label>
              <textarea
                value={formData.problem_definition}
                onChange={(e) => setFormData({ ...formData, problem_definition: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {problema.problem_to_address && (
              <div>
                <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Problema a Abordar</h2>
                <p className="mt-2 text-sm text-zinc-900 whitespace-pre-wrap">{problema.problem_to_address}</p>
              </div>
            )}
            {problema.why_important && (
              <div>
                <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">¿Por Qué es Importante?</h2>
                <p className="mt-2 text-sm text-zinc-900 whitespace-pre-wrap">{problema.why_important}</p>
              </div>
            )}
            {problema.problem_definition && (
              <div>
                <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Definición del Problema</h2>
                <p className="mt-2 text-sm text-zinc-900 whitespace-pre-wrap">{problema.problem_definition}</p>
              </div>
            )}
            {problema.stakeholders && (
              <div>
                <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Partes Interesadas</h2>
                <p className="mt-2 text-sm text-zinc-900 whitespace-pre-wrap">{problema.stakeholders}</p>
              </div>
            )}
            {problema.related_area && (
              <div>
                <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Área Relacionada</h2>
                <p className="mt-2 text-sm text-zinc-900">{problema.related_area}</p>
              </div>
            )}
            {problema.benefits_short_medium_long_term && (
              <div>
                <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Beneficios (Corto, Medio y Largo Plazo)</h2>
                <p className="mt-2 text-sm text-zinc-900 whitespace-pre-wrap">{problema.benefits_short_medium_long_term}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
