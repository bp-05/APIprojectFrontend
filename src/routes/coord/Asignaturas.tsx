import { useEffect, useMemo, useState } from 'react'
import { listSubjects, listDescriptorsBySubject, type Subject, type Descriptor } from '../../api/subjects'
import { useNavigate, useSearchParams, Link } from 'react-router'

export default function AsignaturasCoord() {
  const [items, setItems] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await listSubjects()
      setItems(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar asignaturas'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // Mapeo de fase para búsqueda
  const PHASE_LABELS: Record<string, string> = {
    'inicio': 'Inicio',
    'formulacion': 'Formulación',
    'gestion': 'Gestión',
    'validacion': 'Validación',
    'completado': 'Completado',
  }

  const filtered = useMemo(() => {
    let arr = items
    
    // Filtro desde URL (ej: desde KPI cards del dashboard)
    const f = (searchParams.get('filter') || '').toLowerCase()
    if (f) {
      if (['fase1','fase2','fase3'].includes(f)) {
        const targetPhase = f === 'fase1' ? 'formulacion' : f === 'fase2' ? 'gestion' : 'validacion'
        arr = arr.filter((s: any) => s.phase === targetPhase)
      } else if (f === 'inicio') {
        arr = arr.filter((s: any) => s.phase === 'inicio')
      } else if (f === 'completado') {
        arr = arr.filter((s: any) => s.phase === 'completado')
      }
    }
    
    // Búsqueda unificada (código, nombre, sección, área, carrera, semestre, fase)
    if (!search) return arr
    const q = search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    
    return arr.filter((s) => {
      const phaseLabel = PHASE_LABELS[s.phase || 'inicio'] || s.phase || ''
      const searchFields = [
        s.code,
        s.section,
        s.name,
        s.campus,
        s.area_name || '',
        s.career_name || '',
        s.semester_name || '',
        phaseLabel,
        s.phase || 'inicio'
      ]
      return searchFields.some((v) => 
        String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
      )
    })
  }, [items, search, searchParams])

  function openView(s: Subject) {
    navigate(`/coord/asignaturas/${s.id}`)
  }

  // Obtener label de fase
  function getPhaseLabel(phase: string): string {
    return PHASE_LABELS[phase] || phase
  }

  return (
    <section className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Asignaturas</h1>
          <p className="text-sm text-zinc-600">Asignaturas registradas en la base de datos</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, nombre, área, carrera, fase..."
            className="w-80 max-w-full truncate rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Botón Todos - solo visible si hay filtro en URL */}
        {searchParams.get('filter') && (
          <button
            onClick={() => {
              setSearchParams((prev) => { const p = new URLSearchParams(prev); p.delete('filter'); return p })
            }}
            className="rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs text-red-700 hover:bg-red-100"
          >
            ✕ Quitar filtro: {getPhaseLabel(searchParams.get('filter') === 'fase1' ? 'formulacion' : searchParams.get('filter') === 'fase2' ? 'gestion' : searchParams.get('filter') === 'fase3' ? 'validacion' : searchParams.get('filter') || '')}
          </button>
        )}
      </div>

      {error ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <Th>Descriptor</Th>
              <Th>Código</Th>
              <Th>Sección</Th>
              <Th>Nombre</Th>
              <Th>Área</Th>
              <Th>Carrera</Th>
              <Th>Semestre</Th>
              <Th>Fase</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {loading ? (
              <tr>
                <td className="p-4 text-sm text-zinc-600" colSpan={9}>Cargando…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="p-4 text-sm text-zinc-600" colSpan={9}>Sin resultados</td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr
                  key={s.id}
                  className="cursor-pointer hover:bg-zinc-50"
                  onClick={() => openView(s)}
                >
                  <Td>
                    <DescriptorCell subject={s} />
                  </Td>
                  <Td>{s.code}</Td>
                  <Td>{s.section}</Td>
                  <Td>{s.name}</Td>
                  <Td>{s.area_name}</Td>
                  <Td>{s.career_name || '-'}</Td>
                  <Td>{s.semester_name}</Td>
                  <Td>
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                      {getPhaseLabel(s.phase || 'inicio')}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <Link
                      to={`/coord/estado?id=${s.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 hover:bg-zinc-50"
                    >
                      Ver fase
                    </Link>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// Componentes auxiliares
function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={`bg-zinc-50 px-3 py-2 text-left text-xs font-semibold text-zinc-700 ${className || ''}`}>{children}</th>
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 text-sm text-zinc-700 ${className || ''}`}>{children}</td>
}

interface DescriptorCellProps {
  subject: Subject
}

function DescriptorCell({ subject }: DescriptorCellProps) {
  const [descriptors, setDescriptors] = useState<Descriptor[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await listDescriptorsBySubject(subject.id)
      setDescriptors(data || [])
      return data || []
    } catch (e) {
      console.error(e)
      const msg = e instanceof Error ? e.message : 'No se pudieron cargar los descriptores'
      setError(msg)
      return []
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [subject.id])

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (loading) return
    const list = descriptors ?? await load()
    const file = list?.find((d) => d.file)?.file || null
    if (file) window.open(file, '_blank', 'noreferrer')
    else setError('Sin descriptores disponibles')
  }

  if (loading && descriptors === null) {
    return <span className="text-xs text-gray-400">Cargando…</span>
  }

  if (error) {
    return <span className="text-xs text-red-600">{error}</span>
  }

  if (descriptors !== null && descriptors.length === 0) {
    return <span className="text-xs text-gray-500">Sin descriptor</span>
  }

  return (
    <div>
      <button
        onClick={handleClick}
        className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline"
        disabled={loading}
      >
        {loading ? 'Cargando…' : 'Ver descriptor'}
      </button>
    </div>
  )
}


