import { useEffect, useMemo, useState } from 'react'
}
                        if (id.startsWith('dbco:')) {
                          const cid = Number(id.slice(5))
                          return byCompanyId.get(cid)?.name
                        }
import { useEffect, useMemo, useState } from 'react'
import { listSubjects, type Subject, listCompanyRequirements, type CompanyRequirement } from '../../api/subjects'
import { listCompanies, type Company } from '../../api/companies'
import { useNavigate } from 'react-router'

export default function DocentesVCM() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Subject[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [subjectProspects, setSubjectProspects] = useState<Record<number, string[]>>({})
  const [companies, setCompanies] = useState<Company[]>([])
  const [requirements, setRequirements] = useState<CompanyRequirement[]>([])
  // selecciÃ³n de posibles contrapartes ahora va en el detalle

  async function load() {
    setLoading(true)
    try {
      const [subs, comps, reqs] = await Promise.all([
        listSubjects(),
        listCompanies().catch(() => [] as Company[]),
        listCompanyRequirements().catch(() => [] as CompanyRequirement[]),
      ])
      setItems(subs)
      setCompanies(comps)
      setRequirements(reqs)
      setProspects(loadProspects())
      setSubjectProspects(loadSubjectProspects())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((s) =>
      [s.code, s.section, s.name, s.career_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [items, search])

  return (
    <section className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Asignaturas</h1>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="Buscar"
          className="w-56 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <Th>CÃ³digo</Th>
              <Th>Nombre</Th>
              <Th>Carrera</Th>
              <Th>Posibles contrapartes</Th>
              <Th className="text-right">AcciÃ³n</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {loading ? (
              <tr><td className="p-4 text-sm text-zinc-600" colSpan={5}>Cargandoâ€¦</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="p-4 text-sm text-zinc-600" colSpan={5}>Sin resultados</td></tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50">
                  <Td>
                    <button
                      className="text-left font-medium text-red-700 hover:underline"
                      onClick={() => navigate(`/vcm/asignaturas/${s.id}`)}
                    >
                      {s.code}-{s.section}
                    </button>
                  </Td>
                  <Td>{s.name}</Td>
                  <Td>{s.career_name || 'â€”'}</Td>
                  <Td>
                    {(() => {
                      // Solo mostrar las contrapartes seleccionadas en Asignatura (localStorage)
                      // Resolver nombres tanto para ids locales como para ids de BD (prefijo 'db:')
                      const ids = subjectProspects[s.id] || []
                      if (!ids.length) return 'â€”'
                      const byCompanyId = new Map(companies.map((c) => [c.id, c]))
                      const byReqId = new Map(requirements.map((r) => [r.id, r]))
                      const names = ids.map((id) => {
                        if (id.startsWith('db:')) {
                          const rid = Number(id.slice(3))
                          const req = byReqId.get(rid)
                          if (req && req.subject === s.id) {
                            return byCompanyId.get(req.company)?.name
                          }
                          return undefined
                        }
                        return prospects.find((p) => p.id === id)?.company_name
                      }).filter(Boolean) as string[]
                      return names.length ? Array.from(new Set(names)).join(', ') : 'â€”'
                    })()}
                  </Td>
                  <Td className="text-right">
                    <button
                      onClick={() => navigate(`/vcm/asignaturas/${s.id}`)}
                      className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
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
    </section>
  )
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-2 text-left text-xs font-semibold text-zinc-600 ${className}`}>{children}</th>
  )
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2 text-sm text-zinc-800 ${className}`}>{children}</td>
}

// Read-only helpers to show selected prospects per subject
type Prospect = { id: string; company_name: string }

function loadProspects(): Prospect[] {
  try {
    const raw = localStorage.getItem('vcm_posibles_contrapartes')
    const arr = raw ? JSON.parse(raw) : []
    if (Array.isArray(arr)) {
      return arr.map((p: any) => ({ id: String(p.id), company_name: String(p.company_name || '') }))
    }
    return []
  } catch {
    return []
  }
}

function loadSubjectProspects(): Record<number, string[]> {
  try {
    const raw = localStorage.getItem('vcm_subject_prospects')
    const obj = raw ? JSON.parse(raw) : {}
    return obj && typeof obj === 'object' ? obj : {}
  } catch {
    return {}
  }
}

