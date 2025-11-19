import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { listSubjects, listCompanyRequirements, type CompanyRequirement } from '../../api/subjects'
import { listCompanies, type Company } from '../../api/companies'

export default function VCM() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [requirements, setRequirements] = useState<CompanyRequirement[]>([])

  async function load() {
    setLoading(true)
    try {
      const [subs, comps, reqs] = await Promise.all([
        listSubjects().catch(() => []),
        listCompanies().catch(() => []),
        listCompanyRequirements().catch(() => []),
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

  // Métricas KPI calculadas
  const metrics = useMemo(() => {
    const total = items.length
    const withCompanies = items.filter((s) => requirements.some((r) => r.subject === s.id)).length
    const coverage = total > 0 ? Math.round((withCompanies / total) * 100) : 0
    
    // Total de empresas únicas
    const uniqueCompanies = new Set(requirements.map((r) => r.company)).size
    
    // Total de requerimientos
    const totalRequirements = requirements.length
    
    // Empresas con interés
    const companiesWithInterest = requirements.filter((r) => r.interest_collaborate === true).length
    
    // Promedio de empresas por asignatura
    const avgCompaniesPerSubject = withCompanies > 0 ? Math.round((totalRequirements / withCompanies) * 100) / 100 : 0
    
    // Asignaturas sin cobertura
    const subjectsWithoutCoverage = items.filter((s) => !requirements.some((r) => r.subject === s.id)).length
    
    return {
      total,
      withCompanies,
      coverage,
      uniqueCompanies,
      totalRequirements,
      companiesWithInterest,
      avgCompaniesPerSubject,
      subjectsWithoutCoverage,
    }
  }, [items, requirements])

  return (
    <section className="p-6">
      <h1 className="mb-6 text-xl font-semibold">Panel Vinculación con el medio</h1>

      {/* Dashboard de KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <DashCard label="Cobertura VCM" value={`${metrics.coverage}%`} subtext={`${metrics.withCompanies}/${metrics.total}`} color="red" />
        <DashCard label="Empresas" value={metrics.uniqueCompanies} subtext="colaboradoras" color="blue" />
        <DashCard label="Total Requerimientos" value={metrics.totalRequirements} subtext="creados" color="purple" />
        <DashCard label="Promedio por Asignatura" value={metrics.avgCompaniesPerSubject} subtext="empresas/asignatura" color="green" />
      </div>

      {/* Segunda fila de KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <DashCard label="Con Interés" value={metrics.companiesWithInterest} subtext="requerimientos" color="emerald" />
        <DashCard label="Sin Cobertura" value={metrics.subjectsWithoutCoverage} subtext={`de ${metrics.total} asignaturas`} color="amber" />
        <DashCard label="Tasa de Interés" value={metrics.totalRequirements > 0 ? `${Math.round((metrics.companiesWithInterest / metrics.totalRequirements) * 100)}%` : '—'} subtext="del total" color="cyan" />
      </div>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-sm text-zinc-600">Acceso exclusivo de Vinculación con el medio. Utiliza los menús laterales para gestionar empresas, problemas, alcances y posibles contrapartes.</p>
      </div>
    </section>
  )
}

function DashCard({ label, value, subtext, color }: { label: string; value: string | number; subtext: string; color: 'red' | 'blue' | 'purple' | 'green' | 'emerald' | 'amber' | 'cyan' }) {
  const colorMap = {
    red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
    green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
  }
  const c = colorMap[color]
  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} p-4`}>
      <div className={`text-xs font-medium ${c.text}`}>{label}</div>
      <div className={`mt-2 text-2xl font-bold ${c.text}`}>{value}</div>
      <div className="text-xs text-zinc-500">{subtext}</div>
    </div>
  )
}
