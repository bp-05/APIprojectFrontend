import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { listSubjects, type Subject, exportSubjectAPISheet, exportSubjectProyectoAPI } from '../../api/subjects'
import { listProblemStatements, type ProblemStatement } from '../../api/companies'
import { useEffect } from 'react'

export default function Fichas() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [problemStatements, setProblemStatements] = useState<ProblemStatement[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null)
  const [selectedSubjectProyecto, setSelectedSubjectProyecto] = useState<number | null>(null)
  const [selectedProblemStatement, setSelectedProblemStatement] = useState<number | null>(null)

  async function loadSubjects() {
    setLoading(true)
    try {
      const data = await listSubjects()
      setSubjects(data)
    } catch (e) {
      toast.error('Error al cargar asignaturas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSubjects()
  }, [])

  // Cargar problemStatements cuando se selecciona una asignatura para Proyecto API
  useEffect(() => {
    async function loadProblemStatements() {
      if (!selectedSubjectProyecto) {
        setProblemStatements([])
        setSelectedProblemStatement(null)
        return
      }
      try {
        const data = await listProblemStatements({ subject: selectedSubjectProyecto })
        setProblemStatements(data)
        // Auto-seleccionar el primer problema si solo hay uno
        if (data.length === 1) {
          setSelectedProblemStatement(data[0].id)
        } else {
          setSelectedProblemStatement(null)
        }
      } catch (e) {
        toast.error('Error al cargar proyectos')
        setProblemStatements([])
      }
    }
    loadProblemStatements()
  }, [selectedSubjectProyecto])

  async function handleExportFichaAPI() {
    if (!selectedSubject) {
      toast.error('Selecciona una asignatura')
      return
    }

    const subject = subjects.find(s => s.id === selectedSubject)
    if (!subject) {
      toast.error('Asignatura no encontrada')
      return
    }

    try {
      toast.loading('Generando archivo Excel...')
      const blob = await exportSubjectAPISheet(selectedSubject)
      
      // Crear enlace de descarga
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Ficha_API_${subject.code}_${subject.section}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.dismiss()
      toast.success('Archivo descargado exitosamente')
    } catch (error) {
      toast.dismiss()
      const msg = error instanceof Error ? error.message : 'Error al descargar archivo'
      toast.error(msg)
    }
  }

  async function handleExportProyectoAPI() {
    if (!selectedSubjectProyecto) {
      toast.error('Selecciona una asignatura')
      return
    }

    if (!selectedProblemStatement) {
      toast.error('Selecciona un proyecto')
      return
    }

    const subject = subjects.find(s => s.id === selectedSubjectProyecto)
    if (!subject) {
      toast.error('Asignatura no encontrada')
      return
    }

    const problemStatement = problemStatements.find(p => p.id === selectedProblemStatement)
    if (!problemStatement) {
      toast.error('Proyecto no encontrado')
      return
    }

    try {
      toast.loading('Generando archivo Excel...')
      const blob = await exportSubjectProyectoAPI(selectedSubjectProyecto, selectedProblemStatement)
      
      // Crear enlace de descarga
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Proyecto_API_${subject.code}_${subject.section}_Proyecto${problemStatement.id}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.dismiss()
      toast.success('Archivo descargado exitosamente')
    } catch (error) {
      toast.dismiss()
      const msg = error instanceof Error ? error.message : 'Error al descargar archivo'
      toast.error(msg)
    }
  }

  return (
    <section className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Exportar Fichas</h1>
        <p className="text-sm text-zinc-600">Descarga fichas y documentos de asignaturas</p>
      </div>

      {/* Sección: Ficha API */}
      <div className="mb-8 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <h2 className="text-base font-semibold text-zinc-900">Ficha API</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Exporta la ficha completa de una asignatura con Aprendizaje en Proyectos Integradores
          </p>
        </div>
        <div className="p-6">
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-zinc-700">Asignatura</label>
            <select
              value={selectedSubject ?? ''}
              onChange={(e) => setSelectedSubject(Number(e.target.value) || null)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              disabled={loading}
            >
              <option value="">Seleccionar asignatura...</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code}-{s.section} - {s.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleExportFichaAPI}
            disabled={!selectedSubject || loading}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Descargar Ficha API</span>
          </button>
        </div>
      </div>

      {/* Sección: Proyecto API */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <h2 className="text-base font-semibold text-zinc-900">Proyecto API</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Exporta la documentación de un proyecto específico de la asignatura
          </p>
        </div>
        <div className="p-6">
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-zinc-700">Asignatura</label>
            <select
              value={selectedSubjectProyecto ?? ''}
              onChange={(e) => setSelectedSubjectProyecto(Number(e.target.value) || null)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              disabled={loading}
            >
              <option value="">Seleccionar asignatura...</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code}-{s.section} - {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-zinc-700">Proyecto</label>
            <select
              value={selectedProblemStatement ?? ''}
              onChange={(e) => setSelectedProblemStatement(Number(e.target.value) || null)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              disabled={!selectedSubjectProyecto || problemStatements.length === 0}
            >
              <option value="">
                {!selectedSubjectProyecto
                  ? 'Primero selecciona una asignatura'
                  : problemStatements.length === 0
                  ? 'Sin proyectos disponibles'
                  : 'Seleccionar proyecto...'}
              </option>
              {problemStatements.map((p) => (
                <option key={p.id} value={p.id}>
                  Proyecto #{p.id} - {p.problem_definition.substring(0, 50)}
                  {p.problem_definition.length > 50 ? '...' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportProyectoAPI}
            disabled={!selectedSubjectProyecto || !selectedProblemStatement || loading}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Descargar Proyecto API</span>
          </button>
        </div>
      </div>
    </section>
  )
}
