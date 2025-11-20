import { useEffect, useMemo, useState } from 'react'
import { listSubjects } from '../../api/subjects'
import { listProblemStatements, getCompany, type Company, type ProblemStatement } from '../../api/companies'

export default function EmpresasDoc() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const subjects = await listSubjects()
        const subjectIds = Array.isArray(subjects) ? subjects.map((s) => s.id) : []
        const problemLists = await Promise.all(
          subjectIds.map((id) => listProblemStatements({ subject: id }).catch(() => [] as ProblemStatement[]))
        )
        const companyIds = new Set<number>()
        problemLists.flat().forEach((p) => { if (p.company) companyIds.add(p.company) })
        const companyData = await Promise.all(
          Array.from(companyIds).map((id) => getCompany(id).catch(() => null))
        )
        setCompanies(companyData.filter((c): c is Company => !!c))
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'No se pudieron cargar las empresas'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return companies
    return companies.filter((c) =>
      [c.name, c.email, c.sector || ''].some((v) => v?.toLowerCase().includes(term))
    )
  }, [companies, search])

  return (
    <section className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Empresas asociadas</h1>
          <p className="text-sm text-zinc-600">Empresas vinculadas a tus asignaturas a través de proyectos.</p>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, sector o email"
          className="w-72 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
        />
      </div>

      {error ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <Th>Nombre</Th>
              <Th>Email</Th>
              <Th>Teléfono</Th>
              <Th>Sector</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {loading ? (
              <tr>
                <td className="p-4 text-sm text-zinc-600" colSpan={4}>Cargando...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="p-4 text-sm text-zinc-600" colSpan={4}>Sin resultados</td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50">
                  <Td>{c.name}</Td>
                  <Td>{c.email || '-'}</Td>
                  <Td>{c.phone || '-'}</Td>
                  <Td>{c.sector || '-'}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Th({ children, className = '' }: { children: any; className?: string }) {
  return (
    <th className={`px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 ${className}`}>
      {children}
    </th>
  )
}

function Td({ children, className = '' }: { children: any; className?: string }) {
  return <td className={`px-4 py-2 text-sm text-zinc-800 ${className}`}>{children}</td>
}
