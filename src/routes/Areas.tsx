import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'react-hot-toast'
import { createArea, deleteArea, listAreas, updateArea, type Area } from '../api/subjects'

type ModalState = { mode: 'create' } | { mode: 'edit'; area: Area }

export default function Areas() {
  const [items, setItems] = useState<Area[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<ModalState | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await listAreas()
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudieron cargar las áreas'
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
    return items.filter((a) => a.name.toLowerCase().includes(term))
  }, [items, search])

  function openCreate() {
    setModal({ mode: 'create' })
  }

  function openEdit(area: Area) {
    setModal({ mode: 'edit', area })
  }

  async function handleDelete(area: Area) {
    if (!window.confirm(`¿Eliminar el área "${area.name}"? Esta acción no se puede deshacer.`)) return
    try {
      await deleteArea(area.id)
      toast.success('Área eliminada')
      await load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo eliminar el área'
      toast.error(msg)
    }
  }

  return (
    <section className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Áreas</h1>
          <p className="text-sm text-zinc-600">Gestiona las áreas académicas disponibles.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar área..."
            className="w-64 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
          <button
            onClick={openCreate}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Nueva área
          </button>
        </div>
      </div>

      {error ? <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <Th>Nombre</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <tr>
                <td className="p-4 text-sm text-zinc-600" colSpan={2}>
                  Cargando...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="p-4 text-sm text-zinc-600" colSpan={2}>
                  Sin resultados
                </td>
              </tr>
            ) : (
              filtered.map((area) => (
                <tr
                  key={area.id}
                  className="cursor-pointer hover:bg-zinc-50"
                  onClick={() => openEdit(area)}
                >
                  <Td>{area.name}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(area) }}
                        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); void handleDelete(area) }}
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
        <AreaModal
          mode={modal.mode}
          area={modal.mode === 'edit' ? modal.area : undefined}
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

function AreaModal({
  mode,
  area,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit'
  area?: Area
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(area?.name || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Ingresa un nombre')
      return
    }
    try {
      setLoading(true)
      if (mode === 'create') {
        await createArea({ name: name.trim() })
        toast.success('Área creada')
      } else if (area) {
        await updateArea(area.id, { name: name.trim() })
        toast.success('Área actualizada')
      }
      onSaved()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo guardar el área'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">{mode === 'create' ? 'Nueva área' : 'Editar área'}</h2>
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
