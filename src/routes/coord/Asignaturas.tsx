import { useEffect, useMemo, useState } from 'react'
import { listSubjects, listDescriptorsBySubject, type Subject, type Descriptor } from '../../api/subjects'
import { useNavigate, useSearchParams, Link } from 'react-router'

export default function AsignaturasCoord() {
  const [items, setItems] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterInput, setFilterInput] = useState('')
  const [advFilters, setAdvFilters] = useState<Array<{ kind: 'phase'; value: string }>>([])
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

  const filtered = useMemo(() => {
    let arr = items
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
    // Aplicar filtros avanzados (chips)
    if (advFilters.length > 0) {
      const phaseVals = advFilters.filter((f) => f.kind === 'phase').map((f) => f.value.toLowerCase())
      arr = arr.filter((s) => {
        if (phaseVals.length) {
          const phase = (s.phase || 'inicio').toLowerCase()
          if (!phaseVals.includes(phase)) return false
        }
        return true
      })
    }
    if (!search) return arr
    const q = search.toLowerCase()
    return arr.filter((s) =>
      [s.code, s.section, s.name, s.campus, s.area_name || '', s.career_name || '', s.semester_name || '']
        .some((v) => String(v || '').toLowerCase().includes(q))
    )
  }, [items, search, searchParams, advFilters])

  function openView(s: Subject) {
    navigate(`/coord/asignaturas/${s.id}`)
  }

  // Utilities para filtros avanzados
  function addFilterFromInput() {
    const raw = filterInput.trim()
    if (!raw) return
    const tokens = raw.split(',').map((t) => t.trim()).filter(Boolean)
    const next: Array<{ kind: 'phase'; value: string }> = []
    for (const t of tokens) {
      const k = t.toLowerCase()
      // Fases
      if (['inicio','formulacion','formulación','gestion','gestión','validacion','validación','completado'].includes(k)) {
        const map: Record<string, string> = { 
          inicio: 'inicio', 
          formulacion: 'formulacion', 
          'formulación': 'formulacion',
          gestion: 'gestion',
          'gestión': 'gestion',
          validacion: 'validacion',
          'validación': 'validacion',
          completado: 'completado'
        }
        next.push({ kind: 'phase', value: map[k] })
        continue
      }
    }
    if (next.length) {
      setAdvFilters((prev) => {
        const exists = (f: { kind: 'phase'; value: string }) => prev.some((p) => p.kind === f.kind && p.value === f.value)
        return [...prev, ...next.filter((f) => !exists(f))]
      })
      setFilterInput('')
    }
  }

  // Obtener label de fase
  function getPhaseLabel(phase: string): string {
    const labels: Record<string, string> = {
      'inicio': 'Inicio',
      'formulacion': 'Formulación',
      'gestion': 'Gestión',
      'validacion': 'Validación',
      'completado': 'Completado',
    }
    return labels[phase] || phase
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
            placeholder="Buscar asignatura por código, sección o nombre"
            className="w-72 max-w-full truncate rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Botón Todos */}
        <button
          onClick={() => {
            setSearchParams((prev) => { const p = new URLSearchParams(prev); p.delete('filter'); return p })
            setAdvFilters([])
          }}
          className={`rounded-full border px-3 py-1 text-xs ${!searchParams.get('filter') && advFilters.length === 0 ? 'border-red-300 bg-red-50 text-red-700' : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'}`}
        >
          Todos
        </button>
        {/* Chips de filtros agregados */}
        {advFilters.map((f, i) => (
          <span key={i} className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
            Fase: {getPhaseLabel(f.value)}
            <button
              onClick={() => setAdvFilters((fs) => fs.filter((_, idx) => idx !== i))}
              className="rounded-full border border-red-200 bg-white px-1 text-red-700 hover:bg-red-50"
              title="Quitar filtro"
            >
              ×
            </button>
          </span>
        ))}
        <div className="ml-auto" />
        {/* Input y acción para agregar filtrado */}
        <input
          value={filterInput}
          onChange={(e) => setFilterInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFilterFromInput() } }}
          placeholder="Filtrar por fase (inicio, formulacion, etc.)"
          className="w-72 max-w-full truncate rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
        />
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


