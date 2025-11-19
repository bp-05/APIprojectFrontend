import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'react-hot-toast'
import {
  createCareer,
  deleteCareer,
  listAreas,
  listCareers,
  updateCareer,
  type Area,
  type Career,
} from '../api/subjects'

type ModalState = { mode: 'create' } | { mode: 'edit'; career: Career }

export default function Carreras() {
  const [items, setItems] = useState<Career[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<ModalState | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [careerData, areaData] = await Promise.all([listCareers(), listAreas()])
      setItems(Array.isArray(careerData) ? careerData : [])
      setAreas(Array.isArray(areaData) ? areaData : [])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudieron cargar las carreras'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return items
    return items.filter((c) => {
      const areaName = c.area_name || ''
      return c.name.toLowerCase().includes(term) || areaName.toLowerCase().includes(term)
    })
  }, [items, search])

  function openCreate() {
    setModal({ mode: 'create' })
  }

  function openEdit(career: Career) {
    setModal({ mode: 'edit', career })
  }

  async function handleDelete(career: Career) {
    if (!window.confirm(`¿Eliminar la carrera "${career.name}"? Esta acción no se puede deshacer.`)) return
    try {
      await deleteCareer(career.id)
      toast.success('Carrera eliminada')
      await load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo eliminar la carrera'
      toast.error(msg)
    }
  }

  return (
    <section className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Carreras</h1>
          <p className="text-sm text-zinc-600">Gestiona las carreras y su relación con áreas.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar carrera o área..."
            className="w-72 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
          <button
            onClick={openCreate}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Nueva carrera
          </button>
        </div>
      </div>

      {error ? <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <Th>Nombre</Th>
              <Th>Área</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <tr>
                <td className="p-4 text-sm text-zinc-600" colSpan={3}>
                  Cargando...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="p-4 text-sm text-zinc-600" colSpan={3}>
                  Sin resultados
                </td>
              </tr>
            ) : (
              filtered.map((career) => (
                <tr
                  key={career.id}
                  className="cursor-pointer hover:bg-zinc-50"
                  onClick={() => openEdit(career)}
                >
                  <Td>{career.name}</Td>
                  <Td>{career.area_name || '-'}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(career) }}
                        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); void handleDelete(career) }}
                        className="rounded-md border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal ? (
        <CareerModal
          mode={modal.mode}
          career={modal.mode === 'edit' ? modal.career : undefined}
          areas={areas}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null)
            await load()
          }}
        />
      ) : null}
    </section>
  )
}

function CareerModal({
  mode,
  career,
  areas,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit'
  career?: Career
  areas: Area[]
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(career?.name || '')
  const [area, setArea] = useState<number | ''>(career?.area ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim() || area === '') {
      setError('Completa nombre y área')
      return
    }
    try {
      setLoading(true)
      const payload = { name: name.trim(), area: Number(area) }
      if (mode === 'create') {
        await createCareer(payload)
        toast.success('Carrera creada')
      } else if (career) {
        await updateCareer(career.id, payload)
        toast.success('Carrera actualizada')
      }
      onSaved()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo guardar la carrera'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">{mode === 'create' ? 'Nueva carrera' : 'Editar carrera'}</h2>
          <button
            onClick={onClose}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Cerrar
          </button>
        </div>
        {error ? (
          <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}
        <form className="space-y-3" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Área</label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            >
              <option value="">Selecciona un área</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Th({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 ${className}`}>
      {children}
    </th>
  )
}

function Td({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-2 text-sm text-zinc-800 ${className}`}>{children}</td>
}
