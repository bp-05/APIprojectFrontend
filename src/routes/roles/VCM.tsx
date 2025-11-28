import { useEffect, useMemo, useState} from 'react'
import { listSubjects, listCompanyRequirements, type CompanyRequirement } from '../../api/subjects'
import { listCompanies } from '../../api/companies'

export default function VCM() {
  const [items, setItems] = useState<any[]>([])
  const [requirements, setRequirements] = useState<CompanyRequirement[]>([])
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [subs, , reqs] = await Promise.all([
        listSubjects().catch(() => []),
        listCompanies().catch(() => []),
        listCompanyRequirements().catch(() => []),
      ])
      setItems(subs)
      setRequirements(reqs)
    } catch {
      // Error silencioso
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
    
    // Asignaturas sin cobertura
    const subjectsWithoutCoverage = items.filter((s) => !requirements.some((r) => r.subject === s.id)).length
    
    return {
      total,
      withCompanies,
      coverage,
      uniqueCompanies,
      totalRequirements,
      companiesWithInterest,
      subjectsWithoutCoverage,
    }
  }, [items, requirements])

  return (
    <section className="p-6">
      <div className="mb-6 mt-2 text-center">
        <h1 className="text-2xl font-bold">Panel de Vinculación con el Medio</h1>
        <p className="mt-1 text-sm text-zinc-600">Dashboard de métricas y estadísticas de colaboración con empresas</p>
      </div>

      {/* KPI Cards principales */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          title="Cobertura VCM" 
          value={`${metrics.coverage}%`} 
          tone="red" 
          linkTo="/vcm/asignaturas" 
          subtitle={`${metrics.withCompanies} de ${metrics.total} asignaturas`}
        />
        <KpiCard 
          title="Empresas" 
          value={metrics.uniqueCompanies} 
          tone="blue" 
          linkTo="/vcm/empresas" 
          subtitle="Empresas colaboradoras"
        />
        <KpiCard 
          title="Proyectos" 
          value={metrics.totalRequirements} 
          tone="purple" 
          linkTo="/vcm/proyectos" 
          subtitle="Requerimientos creados"
        />
        <KpiCard 
          title="Con Interés" 
          value={metrics.companiesWithInterest} 
          tone="green" 
          linkTo="/vcm/proyectos" 
          subtitle="Empresas interesadas"
        />
      </div>

      {/* KPI Cards secundarios */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard 
          title="Sin Cobertura" 
          value={metrics.subjectsWithoutCoverage} 
          tone="amber" 
          linkTo="/vcm/asignaturas" 
          subtitle="Asignaturas sin empresa"
        />
        <KpiCard 
          title="Alcances" 
          value="—" 
          tone="zinc" 
          linkTo="/vcm/alcances" 
          subtitle="Gestión de alcances"
        />
        <KpiCard 
          title="Contrapartes" 
          value="—" 
          tone="zinc" 
          linkTo="/vcm/posible-contraparte" 
          subtitle="Posibles contrapartes"
        />
      </div>

      {/* Acceso rápido */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Acceso Rápido</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink href="/vcm/empresas" label="Gestionar Empresas" icon={<IconBuilding />} />
          <QuickLink href="/vcm/proyectos" label="Ver Proyectos" icon={<IconAlert />} />
          <QuickLink href="/vcm/alcances" label="Alcances" icon={<IconTarget />} />
          <QuickLink href="/vcm/asignaturas" label="Asignaturas" icon={<IconBook />} />
        </div>
      </div>
    </section>
  )
}

function KpiCard({ title, value, tone = 'zinc', linkTo, subtitle = 'Total' }: { title: string; value: number | string; tone?: 'zinc' | 'blue' | 'amber' | 'green' | 'purple' | 'red'; linkTo?: string; subtitle?: string }) {
  const ring = {
    zinc: 'ring-zinc-200',
    blue: 'ring-blue-200',
    amber: 'ring-amber-200',
    green: 'ring-green-200',
    purple: 'ring-purple-200',
    red: 'ring-red-200',
  }[tone]
  const badgeBg = {
    zinc: 'bg-zinc-100 text-zinc-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    red: 'bg-red-50 text-red-700',
  }[tone]
  return (
    <div className={`rounded-lg border border-zinc-200 bg-white p-4 shadow-sm ring-1 ${ring}`}>
      <div className="flex items-center justify-between">
        <div className={`rounded px-2 py-0.5 text-xs font-medium ${badgeBg}`}>{title}</div>
        {linkTo ? (
          <a href={linkTo} className="text-xs font-medium text-red-700 hover:underline">Ver detalle</a>
        ) : null}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-zinc-500">{subtitle}</div>
    </div>
  )
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <a 
      href={href} 
      className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm font-medium text-zinc-700 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700"
    >
      <span className="text-zinc-500">{icon}</span>
      <span>{label}</span>
    </a>
  )
}

function IconBuilding() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M3 22h18" />
      <path d="M6 22V7l6-3 6 3v15" />
      <path d="M9 22v-4h6v4" />
      <path d="M9 13h.01" />
      <path d="M15 13h.01" />
      <path d="M12 11h.01" />
    </svg>
  )
}

function IconAlert() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M10.29 3.86 1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12" y2="17" />
    </svg>
  )
}

function IconTarget() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="3" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
    </svg>
  )
}

function IconBook() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22z" />
    </svg>
  )
}
