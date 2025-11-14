import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { listSubjects, type Subject, listSubjectCodeSections, listCompanyRequirements, type CompanyRequirement } from '../../api/subjects'
import { listCompanies, type Company } from '../../api/companies'
import { useNavigate } from 'react-router'

type Prospect = { id: string; company_name: string }

export default function AsignaturasVCM() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Subject[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [requirements, setRequirements] = useState<CompanyRequirement[]>([])
  const [prospects, setProspects] = useState<Prospect[]>(() => loadProspects())
  const [subjectProspects, setSubjectProspects] = useState<Record<number, string[]>>(() => loadSubjectProspects())

  async function load() {
    setLoading(true)
    try {
      let subs: Subject[] = []
      try {
        subs = await listSubjects()
      } catch (_) {
        const basics = await listSubjectCodeSections().catch(() => [] as any[])
        subs = (basics || []).map((b: any) => ({ id: b.id, code: b.code, section: b.section, name: b.name })) as Subject[]
      }
      const [comps, reqs] = await Promise.all([
        listCompanies().catch(() => [] as Company[]),
        listCompanyRequirements().catch(() => [] as CompanyRequirement[]),
      ])
      setItems(subs)
      setCompanies(comps)
      setRequirements(reqs)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const handler = () => {
      try {
        setProspects(loadProspects())
        setSubjectProspects(loadSubjectProspects())
      } catch {}
    }
    window.addEventListener('vcm:prospects-updated', handler)
    return () => window.removeEventListener('vcm:prospects-updated', handler)
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((s) => [s.code, s.section, s.name, s.career_name].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)))
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
              <Th>Código</Th>
              <Th>Nombre</Th>
              <Th>Carrera</Th>
              <Th>Posibles contrapartes</Th>
              <Th className="text-right">Acción</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {loading ? (
              <tr><td className="p-4 text-sm text-zinc-600" colSpan={5}>Cargando…</td></tr>
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
                  <Td>{s.career_name || '-'}</Td>
                  <Td>{renderCounterparts(s)}</Td>
                  <Td className="text-right">
                    <button
                      className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                      onClick={() => navigate(`/vcm/asignaturas/${s.id}`)}
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

  function renderCounterparts(subject: Subject) {
    const byCompanyId = new Map(companies.map((c) => [c.id, c]))
    const byReqId = new Map(requirements.map((r) => [r.id, r]))

    const ids = subjectProspects[subject.id] || []
    const localNames = ids.map((id) => {
      if (id.startsWith('db:')) {
        const rid = Number(id.slice(3))
        const req = byReqId.get(rid)
        if (req && req.subject === subject.id) return byCompanyId.get(req.company)?.name
        return undefined
      }
      if (id.startsWith('dbco:')) {
        const cid = Number(id.slice(5))
        return byCompanyId.get(cid)?.name
      }
      return prospects.find((p) => p.id === id)?.company_name
    }).filter(Boolean) as string[]

    const backendNames = requirements
      .filter((r) => r.subject === subject.id)
      .map((r) => byCompanyId.get(r.company)?.name)
      .filter(Boolean) as string[]

    const names = localNames.length ? localNames : backendNames
    const unique = Array.from(new Set(names))

    if (!unique.length) return '-'

    return (
      <div className="flex flex-wrap gap-1" title={unique.join(', ')}>
        {unique.slice(0, 3).map((n) => (
          <span key={n} className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-700">
            {n}
          </span>
        ))}
        {unique.length > 3 && (
          <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-600">
            +{unique.length - 3}
          </span>
        )}
      </div>
    )
  }
}

function Th({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-2 text-left text-xs font-semibold text-zinc-600 ${className}`}>{children}</th>
  )
}
function Td({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-2 text-sm text-zinc-800 ${className}`}>{children}</td>
}

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

