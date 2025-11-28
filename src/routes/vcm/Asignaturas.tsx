import { useEffect, useMemo, useState, type ReactNode, useCallback } from 'react'
import { listSubjects, type Subject, listSubjectCodeSections, listCompanyRequirements, type CompanyRequirement } from '../../api/subjects'
import { listCompanies, type Company } from '../../api/companies'
import { useNavigate } from 'react-router'

export default function AsignaturasVCM() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Subject[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [requirements, setRequirements] = useState<CompanyRequirement[]>([])

  const handleRowClick = useCallback(
    (event: React.MouseEvent<HTMLTableRowElement>, subjectId: number) => {
      const target = event.target as HTMLElement
      if (target.closest('button, a, input, select, textarea, [role="button"]')) return
      navigate(`/vcm/asignaturas/${subjectId}`)
    },
    [navigate]
  )

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
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? items.filter((s) => s.code?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q)) : items
  }, [items, search])

  function getStatusBadge(subjectId: number) {
    const m = getMetricsForSubject(subjectId)
    if (m.companies > 0) {
      return <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">✓ Con empresa</span>
    }
    return <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">○ Sin empresa</span>
  }

  function getMetricsForSubject(subjectId: number) {
    return {
      companies: requirements.filter((r) => r.subject === subjectId).length,
    }
  }

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
              <Th>Estado</Th>
              <Th className="text-center">Empresas</Th>
              <Th>Posibles contrapartes</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {loading ? (
              <tr><td className="p-4 text-sm text-zinc-600" colSpan={6}>Cargando…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="p-4 text-sm text-zinc-600" colSpan={6}>Sin resultados</td></tr>
            ) : (
              filtered.map((s) => {
                const m = getMetricsForSubject(s.id)
                return (
                  <tr
                    key={s.id}
                    className="cursor-pointer hover:bg-zinc-50"
                    onClick={(event) => handleRowClick(event, s.id)}
                  >
                    <Td>
                      <span className="text-red-700 font-medium">{s.code}{s.section ? `-${s.section}` : ''}</span>
                    </Td>
                    <Td>{s.name}</Td>
                    <Td>{s.career_name || '-'}</Td>
                    <Td>{getStatusBadge(s.id)}</Td>
                    <Td className="text-center">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                        {m.companies}
                      </span>
                    </Td>
                    <Td>{renderCounterparts(s)}</Td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )

  function renderCounterparts(subject: Subject) {
    const byCompanyId = new Map(companies.map((c) => [c.id, c]))
    
    // Obtener nombres de empresas del servidor (requirements)
    const backendNames = requirements
      .filter((r) => r.subject === subject.id)
      .map((r) => byCompanyId.get(r.company)?.name)
      .filter(Boolean) as string[]

    const unique = Array.from(new Set(backendNames))

    if (!unique.length) return '—'

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

