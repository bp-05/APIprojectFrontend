import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { listSubjects, listAreas, listCareers, type Subject, type Area, type Career } from '../../api/subjects'
import { listDocentes, type User } from '../../api/users'

export default function DacDashboard() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [careers, setCareers] = useState<Career[]>([])
  const [teachers, setTeachers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [subjectList, areaList, careerList, teacherList] = await Promise.all([
        listSubjects(),
        listAreas(),
        listCareers(),
        listDocentes({ onlyActive: true }),
      ])
      setSubjects(Array.isArray(subjectList) ? subjectList : [])
      setAreas(Array.isArray(areaList) ? areaList : [])
      setCareers(Array.isArray(careerList) ? careerList : [])
      setTeachers(Array.isArray(teacherList) ? teacherList : [])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo cargar la informacion'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const totalSubjects = subjects.length
  const totalAreas = areas.length
  const totalCareers = careers.length
  const totalTeachers = teachers.length

  const teacherAssignments = useMemo(() => {
    const assignedIds = new Set<number>()
    subjects.forEach((s) => {
      if (typeof s.teacher === 'number') assignedIds.add(s.teacher)
    })
    const assigned = teachers.filter((t) => assignedIds.has(t.id)).length
    const unassigned = Math.max(0, totalTeachers - assigned)
    return { assigned, unassigned }
  }, [subjects, teachers, totalTeachers])

  const subjectsWithoutCareer = useMemo(
    () => subjects.filter((s) => !s.career || !s.career_name),
    [subjects],
  )

  return (
    <section className="space-y-8 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-zinc-900">Panel Departamento Academico</h1>
        <p className="text-sm text-zinc-600">Resumen operativo de asignaturas, docentes, areas y carreras.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Actualizando...' : 'Actualizar'}
        </button>
        {error ? (
          <span className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700">{error}</span>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Asignaturas" value={loading && !totalSubjects ? '--' : totalSubjects} subtitle="Inventario actual" tone="blue" />
        <StatCard title="Areas" value={totalAreas ?? '--'} subtitle="Catalogo" tone="indigo" />
        <StatCard title="Carreras" value={totalCareers ?? '--'} subtitle="Catalogo" tone="violet" />
        <StatCard title="Docentes activos" value={totalTeachers ?? '--'} subtitle="Disponibles para asignar" tone="green" />
        <StatCard title="Docentes asignados" value={teacherAssignments.assigned ?? '--'} subtitle="Con asignatura" tone="emerald" />
        <StatCard title="Docentes sin asignacion" value={teacherAssignments.unassigned ?? '--'} subtitle="Para planificar" tone="amber" />
        <StatCard title="Asignaturas sin carrera" value={subjectsWithoutCareer.length} subtitle="Pendiente de asignar" tone="orange" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <IssuesCard
          title="Asignaturas sin carrera"
          items={subjectsWithoutCareer.map((s) => `${s.code}-${s.section} ${s.name}`)}
          emptyLabel="Todas las asignaturas tienen carrera."
          loading={loading}
        />
      </div>
    </section>
  )
}

type StatTone = 'blue' | 'indigo' | 'violet' | 'green' | 'emerald' | 'amber' | 'orange'

function StatCard({
  title,
  value,
  subtitle,
  tone = 'blue',
}: {
  title: string
  value: ReactNode
  subtitle?: string
  tone?: StatTone
}) {
  const accents: Record<StatTone, string> = {
    blue: 'text-sky-600',
    indigo: 'text-indigo-600',
    violet: 'text-violet-600',
    green: 'text-green-700',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    orange: 'text-orange-600',
  }
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/90 px-4 py-5 shadow-sm">
      <p className="text-sm font-medium text-zinc-500">{title}</p>
      <div className={`mt-3 text-3xl font-semibold ${accents[tone] || accents.blue}`}>{value}</div>
      {subtitle ? <p className="mt-1 text-xs text-zinc-500">{subtitle}</p> : null}
    </div>
  )
}

function IssuesCard({
  title,
  items,
  emptyLabel,
  loading,
}: {
  title: string
  items: string[]
  emptyLabel: string
  loading: boolean
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/90 shadow-sm">
      <div className="border-b border-zinc-100 px-5 py-4">
        <div className="text-sm font-medium text-zinc-900">{title}</div>
        <p className="text-xs text-zinc-500">Detalle rapido para priorizar correcciones.</p>
      </div>
      <div className="px-5 py-4">
        {loading ? (
          <p className="text-sm text-zinc-500">Cargando...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-zinc-500">{emptyLabel}</p>
        ) : (
          <ul className="space-y-2 text-sm text-zinc-800">
            {items.slice(0, 8).map((label, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-red-500" />
                <span className="flex-1">{label}</span>
              </li>
            ))}
            {items.length > 8 ? (
              <li className="text-xs text-zinc-500">+{items.length - 8} mas</li>
            ) : null}
          </ul>
        )}
      </div>
    </div>
  )
}
