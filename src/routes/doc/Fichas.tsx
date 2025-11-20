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
      link.download = `Proyecto_API_${subject.code}_${subject.section}.xlsx`
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
        <p className="text-sm text-zinc-600">Descarga fichas y documentos de tus asignaturas</p>
      </div>

      {/* Sección: Ficha API */}
      <div className="mb-8 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-4">
          <h2 className="text-base font-semibold text-zinc-900">Ficha API</h2>
          <p className="text-sm text-zinc-600">Exporta la Ficha API completa de una asignatura en formato Excel</p>
        </div>
        
        <div className="p-6">
          {loading ? (
            <p className="text-sm text-zinc-600">Cargando asignaturas...</p>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Selecciona una asignatura
                </label>
                <select
                  value={selectedSubject || ''}
                  onChange={(e) => setSelectedSubject(Number(e.target.value) || null)}
                  className="block w-full max-w-md rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
                >
                  <option value="">-- Selecciona una asignatura --</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code}-{s.section} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleExportFichaAPI}
                disabled={!selectedSubject}
                className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg 
                  className="h-5 w-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                  />
                </svg>
                Descargar Ficha API
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sección: Proyecto API */}
      <div className="mb-8 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-4">
          <h2 className="text-base font-semibold text-zinc-900">Proyecto API</h2>
          <p className="text-sm text-zinc-600">Exporta la Ficha de Proyecto API de una asignatura en formato Excel</p>
        </div>
        
        <div className="p-6">
          {loading ? (
            <p className="text-sm text-zinc-600">Cargando asignaturas...</p>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Selecciona una asignatura
                </label>
                <select
                  value={selectedSubjectProyecto || ''}
                  onChange={(e) => setSelectedSubjectProyecto(Number(e.target.value) || null)}
                  className="block w-full max-w-md rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
                >
                  <option value="">-- Selecciona una asignatura --</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code}-{s.section} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedSubjectProyecto && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Selecciona un proyecto
                  </label>
                  <select
                    value={selectedProblemStatement || ''}
                    onChange={(e) => setSelectedProblemStatement(Number(e.target.value) || null)}
                    className="block w-full max-w-md rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
                  >
                    <option value="">-- Selecciona un proyecto --</option>
                    {problemStatements.map((p) => (
                      <option key={p.id} value={p.id}>
                        Proyecto #{p.id} - {p.problem_to_address ? p.problem_to_address.substring(0, 50) + '...' : 'Sin descripción'}
                      </option>
                    ))}
                  </select>
                  {problemStatements.length === 0 && (
                    <p className="mt-2 text-sm text-amber-600">Esta asignatura no tiene proyectos asociados</p>
                  )}
                </div>
              )}

              <button
                onClick={handleExportProyectoAPI}
                disabled={!selectedSubjectProyecto || !selectedProblemStatement}
                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg 
                  className="h-5 w-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                  />
                </svg>
                Descargar Proyecto API
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Espacio para futuras secciones */}
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
        <p className="text-sm text-zinc-500">Más secciones de exportación se agregarán aquí próximamente</p>
      </div>
    </section>
  )
}
