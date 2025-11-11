import { useEffect, useState } from 'react'

type Prospect = {
  id: string
  company_name: string
  sector?: string
  interest_collaborate?: boolean
  responsible_name?: string
  // Campos opcionales que pueden venir desde otras vistas
  worked_before?: boolean
  can_develop_activities?: boolean
  willing_design_project?: boolean
  interaction_type?: string
  has_guide?: boolean
  can_receive_alternance?: boolean
  alternance_students_quota?: number | null
}

function getProspects(): Prospect[] {
  try {
    const raw = localStorage.getItem('vcm_posibles_contrapartes')
    const arr = raw ? JSON.parse(raw) : []
    if (Array.isArray(arr)) {
      return arr.map((p: any) => ({
        id: String(p.id ?? crypto.randomUUID()),
        company_name: String(p.company_name ?? ''),
        sector: typeof p.sector === 'string' ? p.sector : '',
        interest_collaborate: !!p.interest_collaborate,
        responsible_name: typeof p.responsible_name === 'string' ? p.responsible_name : undefined,
        worked_before: !!p.worked_before,
        can_develop_activities: !!p.can_develop_activities,
        willing_design_project: !!p.willing_design_project,
        interaction_type: typeof p.interaction_type === 'string' ? p.interaction_type : '',
        has_guide: !!p.has_guide,
        can_receive_alternance: !!p.can_receive_alternance,
        alternance_students_quota:
          typeof p.alternance_students_quota === 'number' || p.alternance_students_quota === null
            ? p.alternance_students_quota
            : null,
      }))
    }
    return []
  } catch {
    return []
  }
}

export default function PosibleContraparte() {
  const [items, setItems] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewing, setViewing] = useState<Prospect | null>(null)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [assignName, setAssignName] = useState('')
  const [companies, setCompanies] = useState<any[]>([])

  useEffect(() => {
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        setItems(getProspects())
        // Cargar empresas para traer Responsable SPyS como fuente
        const mod = await import('../../api/companies')
        const emps = await mod.listCompanies()
        setCompanies(emps)
      } catch {
        // ignorar errores de empresas
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  function openAssign(p: Prospect) {
    setAssigningId(p.id)
    const candidate = companies.find(
      (c) => String(c.name).trim().toLowerCase() === (p.company_name || '').trim().toLowerCase(),
    )
    const fromCompany = String(candidate?.spys_responsible_name || '').trim()
    setAssignName(fromCompany)
  }

  function saveAssign() {
    const name = assignName.trim()
    try {
      const raw = localStorage.getItem('vcm_posibles_contrapartes')
      const arr = raw ? JSON.parse(raw) : []
      if (Array.isArray(arr)) {
        const idx = arr.findIndex((x: any) => String(x.id) === String(assigningId))
        if (idx >= 0) {
          arr[idx] = { ...arr[idx], responsible_name: name }
          localStorage.setItem('vcm_posibles_contrapartes', JSON.stringify(arr))
          setItems(getProspects())
        }
      }
    } finally {
      setAssigningId(null)
      setAssignName('')
    }
  }

  return (
    <section className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Posible contraparte</h1>
      </div>

      {error ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <Th className="uppercase tracking-wide">Empresa</Th>
              <Th className="uppercase tracking-wide">Sector</Th>
              <Th className="uppercase tracking-wide">Interés</Th>
              <Th className="uppercase tracking-wide">Responsable</Th>
              <Th className="text-right uppercase tracking-wide">Acciones</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {loading ? (
              <tr><td className="p-4 text-sm text-zinc-600" colSpan={5}>Cargando…</td></tr>
            ) : items.length === 0 ? (
              <tr><td className="p-4 text-sm text-zinc-600" colSpan={5}>Sin registros</td></tr>
            ) : (
              items.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50">
                  <Td>{r.company_name || '—'}</Td>
                  <Td>{r.sector || '—'}</Td>
                  <Td><YesNoPill value={!!r.interest_collaborate} /></Td>
                  <Td>
                    {r.responsible_name && r.responsible_name.trim() ? (
                      r.responsible_name
                    ) : (
                      <button
                        onClick={() => openAssign(r)}
                        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50"
                      >
                        Asignar
                      </button>
                    )}
                  </Td>
                  <Td className="text-right">
                    <button
                      onClick={() => setViewing(r)}
                      className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50"
                    >
                      Ver
                    </button>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {assigningId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/5">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-3">
              <h2 className="text-sm font-semibold text-zinc-900">Asignar responsable</h2>
              <button onClick={() => { setAssigningId(null); setAssignName('') }} className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100">Cerrar</button>
            </div>
            <div className="px-6 py-4">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-800">Nombre (desde Responsable SPyS en Empresas)</span>
                <input
                  value={assignName}
                  disabled
                  className="block w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-700"
                  placeholder="No encontrado en Empresas"
                />
                {!assignName && (
                  <span className="mt-1 block text-xs text-zinc-600">No se encontró Responsable SPyS para esta empresa. Revise el nombre en Empresas.</span>
                )}
              </label>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button onClick={() => { setAssigningId(null); setAssignName('') }} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm">Cancelar</button>
                <button onClick={saveAssign} disabled={!assignName.trim()} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/5">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-3">
              <h2 className="text-sm font-semibold text-zinc-900">Detalle de contraparte</h2>
              <button onClick={() => setViewing(null)} className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100">Cerrar</button>
            </div>
            <div className="px-6 py-4">
              <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                <Item label="Empresa">{viewing.company_name || '—'}</Item>
                <Item label="Sector">{viewing.sector || '—'}</Item>
                <Item label="Interés de colaborar"><YesNoPill value={!!viewing.interest_collaborate} /></Item>
                <Item label="Trabajó anteriormente"><YesNoPill value={!!viewing.worked_before} /></Item>
                <Item label="Puede desarrollar actividades"><YesNoPill value={!!viewing.can_develop_activities} /></Item>
                <Item label="Tiene proyecto para diseño"><YesNoPill value={!!viewing.willing_design_project} /></Item>
                <Item label="Tipo de interacción">{viewing.interaction_type || '—'}</Item>
                <Item label="Cuenta con Maestro Guía"><YesNoPill value={!!viewing.has_guide} /></Item>
                <Item label="Puede recibir alternancia"><YesNoPill value={!!viewing.can_receive_alternance} /></Item>
                <Item label="Cupos alternancia (nivel 3)">{
                  viewing.can_receive_alternance ? (viewing.alternance_students_quota ?? '—') : '—'
                }</Item>
              </dl>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2 text-left text-xs font-semibold text-zinc-600 ${className}`}>{children}</th>
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2 text-sm text-zinc-800 ${className}`}>{children}</td>
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="text-sm">
      <dt className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="text-zinc-900">{children}</dd>
    </div>
  )
}

function YesNoPill({ value }: { value: boolean }) {
  const color = value ? 'green' : 'red'
  const bg = value ? 'bg-green-50' : 'bg-red-50'
  const text = value ? 'text-green-700' : 'text-red-700'
  const border = value ? 'border-green-200' : 'border-red-200'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border ${border} ${bg} px-2 py-0.5 text-xs ${text}`}>
      <span className={`h-2 w-2 rounded-full ${value ? 'bg-green-500' : 'bg-red-500'}`} />
      {value ? 'Sí' : 'No'}
    </span>
  )
}
