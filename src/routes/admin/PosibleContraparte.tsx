import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from '../../lib/toast'
import { listCompanyRequirements, type CompanyRequirement, listSubjects, type Subject } from '../../api/subjects'

type SubjectWithCount = Subject & {
  counterpartCount: number
}

export default function AdminPosibleContraparte() {
  const navigate = useNavigate()
  const [items, setItems] = useState<CompanyRequirement[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [requirements, subjectsData] = await Promise.all([
        listCompanyRequirements(),
        listSubjects()
      ])
      
      setItems(requirements)
      setSubjects(subjectsData)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar datos'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const subjectsWithCount = useMemo<SubjectWithCount[]>(() => {
    return subjects.map(s => ({
      ...s,
      counterpartCount: items.filter(item => item.subject === s.id).length
    })).filter(s => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        s.code.toLowerCase().includes(q) ||
        s.section.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q)
      )
    })
  }, [subjects, items, search])

  return (
    <section className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Posibles Contrapartes por Asignatura</h1>
          <p className="text-sm text-zinc-600">Selecciona una asignatura para gestionar sus contrapartes</p>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar asignatura..."
          className="w-72 max-w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
        />
      </div>

      {loading ? (
        <p className="p-4 text-sm text-zinc-600">Cargando asignaturas...</p>
      ) : subjectsWithCount.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
          <p className="text-sm text-zinc-600">
            {search ? 'No se encontraron asignaturas con ese criterio' : 'No hay asignaturas disponibles'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subjectsWithCount.map((subject) => (
            <div
              key={subject.id}
              onClick={() => navigate(`/admin/posible-contraparte/${subject.id}`)}
              className="cursor-pointer rounded-lg border border-zinc-200 bg-white p-4 hover:border-red-300 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-zinc-900">
                    {subject.code}-{subject.section}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-600 line-clamp-2">{subject.name}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                    <span>{subject.period_code}</span>
                    <span>•</span>
                    <span>{subject.campus}</span>
                  </div>
                </div>
                <div className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-sm font-semibold text-red-600">
                  {subject.counterpartCount}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
