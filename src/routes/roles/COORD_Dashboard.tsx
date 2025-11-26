import { useEffect, useMemo, useState } from 'react'
import { listSubjects, type Subject } from '../../api/subjects'
import { listPeriodPhaseSchedules, type PeriodPhaseSchedule } from '../../api/periods'
import { usePeriodStore } from '../../store/period'

export default function COORD_DASH() {
  const [items, setItems] = useState<Subject[]>([])
  const [lsVersion, setLsVersion] = useState(0)
  const [cycleVersion, setCycleVersion] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterInput, setFilterInput] = useState('')
  const [filters, setFilters] = useState<Array<{ key: 'docente' | 'carrera' | 'area'; value?: string }>>([])
  const [adminPhases, setAdminPhases] = useState<PeriodPhaseSchedule[]>([])
  const [showPhasesModal, setShowPhasesModal] = useState<number | null>(null)
  const season = usePeriodStore((s) => s.season)
  const year = usePeriodStore((s) => s.year)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [data, phases] = await Promise.all([
        listSubjects(),
        listPeriodPhaseSchedules({ period_year: year, period_season: season }),
      ])
      setItems(Array.isArray(data) ? data : [])
      setAdminPhases(phases || [])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar proyectos'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [season, year])

  // Escuchar cambios de estado local de proyectos para sincronizar KPIs
  useEffect(() => {
    function onCustom() { setLsVersion((v) => v + 1) }
    function onStorage(e: StorageEvent) { if (e.key === 'coordSubjectStatus') setLsVersion((v) => v + 1) }
    window.addEventListener('coordSubjectStatusChanged', onCustom as any)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('coordSubjectStatusChanged', onCustom as any)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  // Escuchar cambios del ciclo (fechas inicio/fin) guardados localmente
  useEffect(() => {
    function onCycleCustom() { setCycleVersion((v) => v + 1) }
    function onCycleStorage(e: StorageEvent) { if (e.key === 'coordSubjectCycle') setCycleVersion((v) => v + 1) }
    window.addEventListener('coordSubjectCycleChanged', onCycleCustom as any)
    window.addEventListener('storage', onCycleStorage)
    return () => {
      window.removeEventListener('coordSubjectCycleChanged', onCycleCustom as any)
      window.removeEventListener('storage', onCycleStorage)
    }
  }, [])

  const active = useMemo(() => items.filter((s) => !!s.teacher), [items])

  // KPI: Conteo por estado de proyecto (considera estado local guardado)
  type ProjectState = 'Borrador' | 'Enviada' | 'Observada' | 'Aprobada'
  function readLocalStatus(): Record<number, { status: ProjectState }> {
    try { return JSON.parse(localStorage.getItem('coordSubjectStatus') || '{}') } catch { return {} }
  }
  const localStatusMap = useMemo(() => readLocalStatus(), [lsVersion])
  function mapStatus(s: any): ProjectState {
    const local = (localStatusMap as any)[s.id]?.status as ProjectState | undefined
    if (local) return local
    const raw = String(s?.project_status || s?.status || '').toLowerCase()
    if (raw.includes('observ')) return 'Observada'
    if (raw.includes('apro') || raw.includes('aprob')) return 'Aprobada'
    if (raw.includes('env')) return 'Enviada'
    if (!s?.teacher) return 'Borrador'
    return 'Enviada'
  }

  const kpi = useMemo(() => {
    const result: Record<ProjectState, number> = { Borrador: 0, Enviada: 0, Observada: 0, Aprobada: 0 }
    for (const s of items) {
      const st = mapStatus(s)
      result[st] = (result[st] ?? 0) + 1
    }
    return result
  }, [items, localStatusMap])

  // Función para obtener estados guardados localmente en Gantt
  function readGanttMarks(): Record<number, Record<number, string>> {
    try { return JSON.parse(localStorage.getItem('coordGanttMarks') || '{}') } catch { return {} }
  }

  // Función para calcular % de atraso de una asignatura
  function calculateSubjectDelayPct(subject: Subject): number {
    const ganttMarks = readGanttMarks()
    const subjectMarks = ganttMarks[subject.id] || {}
    
    let delayCount = 0
    let totalPhases = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let phaseNum = 1; phaseNum <= 3; phaseNum++) {
      const phaseMark = subjectMarks[phaseNum]
      
      // Buscar la fecha de inicio y término para esta fase
      const phaseSchedule = adminPhases.find(p => {
        const phaseKey = String(p.phase || '').toLowerCase()
        return phaseNum === 1 ? phaseKey === 'formulacion'
             : phaseNum === 2 ? phaseKey === 'gestion'
             : phaseNum === 3 ? phaseKey === 'validacion'
             : false
      })

      if (phaseSchedule && phaseSchedule.start_date && phaseSchedule.end_date) {
        totalPhases++
        const startDate = new Date(phaseSchedule.start_date)
        startDate.setHours(0, 0, 0, 0)
        const endDate = new Date(phaseSchedule.end_date)
        endDate.setHours(0, 0, 0, 0)
        
        if (phaseMark !== 'rz') {
          if (today < startDate || today > endDate) {
            delayCount++
          }
        }
      }
    }

    if (totalPhases === 0) return 0
    return Math.round((delayCount / totalPhases) * 100)
  }

  // % con atraso (cálculo basado en fases atrasadas por fechas asignadas)
  const delayedPct = useMemo(() => {
    if (!items.length || !adminPhases.length) return 0

    const delayScores = items.map(s => calculateSubjectDelayPct(s))
    if (delayScores.length === 0) return 0
    const avg = delayScores.reduce((a, b) => a + b, 0) / delayScores.length
    return Math.round(avg)
  }, [items, adminPhases, cycleVersion])

  // Escuchar cambios en el almacenamiento local para actualizar KPIs
  function riskScore(s: any) {
    let score = 0
    const st = mapStatus(s)
    if (st === 'Observada') score += 3
    if (!s?.teacher) score += 2
    if (!s?.career_name) score += 1
    if (!s?.area_name) score += 1
    
    // Agregar puntuación por atraso
    const delayPct = calculateSubjectDelayPct(s)
    if (delayPct >= 50) score += 4  // Alto riesgo por atraso significativo
    else if (delayPct >= 30) score += 2  // Riesgo moderado
    
    return score
  }
  // Función para obtener detalles del riesgo
  function getRiskDetails(s: Subject, score: number): string[] {
    const details: string[] = []
    const st = mapStatus(s)
    if (st === 'Observada') details.push('Estado: Observada')
    if (!s?.teacher) details.push('Sin docente asignado')
    if (!s?.career_name) details.push('Sin carrera asignada')
    if (!s?.area_name) details.push('Sin área asignada')
    
    const delayPct = calculateSubjectDelayPct(s)
    if (delayPct >= 50) details.push(`${delayPct}% de fases en atraso`)
    else if (delayPct >= 30) details.push(`${delayPct}% de fases en atraso`)
    
    return details
  }

  // Clasificación de riesgo y listado (solo proyectos con riesgo > 0)
  function riskLevel(score: number): 'Sin riesgo' | 'Bajo' | 'Medio' | 'Alto' {
    if (score <= 0) return 'Sin riesgo'
    if (score <= 2) return 'Bajo'
    if (score <= 4) return 'Medio'
    return 'Alto'
  }
  const allRisk = useMemo(() => {
    return items
      .map((s) => ({ s, score: riskScore(s) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
  }, [items])
  const topRisk = useMemo(() => allRisk.slice(0, 1), [allRisk])
  const [showExpandedRisk, setShowExpandedRisk] = useState(false)
  const [showRiskModal, setShowRiskModal] = useState(false)

  useEffect(() => {
    try {
      ;(window as any).kpi = kpi
      ;(window as any).delayedPct = delayedPct
    } catch {}
  }, [kpi, delayedPct])

  function norm(s: string) {
    try { return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase() } catch { return s.toLowerCase() }
  }

  const filtered = useMemo(() => {
    if (!filters.length) return active
    return active.filter((s) => {
      return filters.every((f) => {
        const key = f.key
        const val = (f.value || '').trim()
        if (key === 'docente') {
          if (!val) return !!s.teacher
          return norm(s.teacher_name || '').includes(norm(val))
        }
        if (key === 'carrera') {
          if (!val) return !!s.career_name
          return norm(s.career_name || '').includes(norm(val))
        }
        if (key === 'area') {
          if (!val) return !!s.area_name
          return norm(s.area_name || '').includes(norm(val))
        }
        return true
      })
    })
  }, [active, filters])

  // Lectura de fechas de ciclo locales (desde "Editar ciclo")
  type LocalCycle = { phase: 'Fase 1' | 'Fase 2' | 'Fase 3'; start?: string; end?: string; phases?: Record<'Fase 1' | 'Fase 2' | 'Fase 3', { start?: string; end?: string }> }
  function readLocalCycle(): Record<number, LocalCycle> {
    try { return JSON.parse(localStorage.getItem('coordSubjectCycle') || '{}') } catch { return {} as any }
  }
  const localCycleMap = useMemo(() => readLocalCycle(), [cycleVersion])
  const phaseKpi = useMemo(() => {
    const res: Record<'Fase 1' | 'Fase 2' | 'Fase 3', number> = { 'Fase 1': 0, 'Fase 2': 0, 'Fase 3': 0 }
    for (const s of items as any[]) {
      const p = (localCycleMap as any)[s.id]?.phase as 'Fase 1' | 'Fase 2' | 'Fase 3' | undefined
      if (p === 'Fase 1' || p === 'Fase 2' || p === 'Fase 3') res[p] = (res[p] || 0) + 1
    }
    return res
  }, [items, localCycleMap])

  useEffect(() => {
    try { (window as any).phaseKpi = phaseKpi } catch {}
  }, [phaseKpi])

  function addFilterFromInput() {
    const raw = filterInput.trim()
    if (!raw) return
    let keyStr = raw
    let val = ''
    const idx = raw.indexOf(':')
    if (idx !== -1) {
      keyStr = raw.slice(0, idx)
      val = raw.slice(idx + 1).trim()
    }
    const k = norm(keyStr)
    let key: 'docente' | 'carrera' | 'area' | null = null
    if (k === 'docente') key = 'docente'
    else if (k === 'carrera') key = 'carrera'
    else if (k === 'area' || k === 'ǭrea') key = 'area'
    if (!key) {
      // Si no coincide, intentar interpretarlo como búsqueda por docente
      setFilters((fs) => [...fs, { key: 'docente', value: raw }])
      setFilterInput('')
      return
    }
    setFilters((fs) => [...fs, { key, value: val }])
    setFilterInput('')
  }

  function removeFilter(i: number) {
    setFilters((fs) => fs.filter((_, idx) => idx !== i))
  }

  return (
    <section className="p-6">
      <div className="mb-6 mt-2 flex items-center justify-between">
        <h1 className="text-2xl">Panel de Coordinador</h1>
        <div className="flex gap-2">
          <button onClick={exportCsvPhases} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            CSV
          </button>
          <button onClick={exportPdfPhases} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            PDF
          </button>
        </div>
      </div>
      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Fase 1: Formulación de requerimientos" value={phaseKpi['Fase 1']} tone="zinc" linkTo="/coord/asignaturas?filter=fase1" />
        <KpiCard title="Fase 2: Gestión de Requerimientos" value={phaseKpi['Fase 2']} tone="blue" linkTo="/coord/asignaturas?filter=fase2" />
        <KpiCard title="Fase 3: Validación de requerimientos" value={phaseKpi['Fase 3']} tone="amber" linkTo="/coord/asignaturas?filter=fase3" />
        <KpiCard title="Proyectos Completados" value={kpi.Aprobada} tone="green" linkTo="/coord/asignaturas?filter=aprobada" />
      </div>

      {/* KPIs avanzados */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <KpiCard title="% con atraso" value={`${delayedPct}%`} tone="amber" linkTo="/coord/asignaturas?filter=atraso" subtitle="Sobre el total de proyectos" />
        <div className="relative">
          <div className={`rounded-lg border border-zinc-200 bg-white p-4 shadow-sm ring-1 ring-zinc-200 ${showExpandedRisk ? 'absolute z-50 w-full' : ''}`}>
            <div className="mb-2 flex items-center justify-between">
              <div className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Proyectos en Riesgo</div>
              <button onClick={() => setShowRiskModal(true)} className="text-xs font-medium text-red-700 hover:underline">Ver detalle</button>
            </div>
            {topRisk.length === 0 ? (
              <div className="text-sm text-zinc-600">Sin datos</div>
            ) : (
              <div className={showExpandedRisk ? 'max-h-96 overflow-y-auto' : ''}>
                <ul className="space-y-2">
                  {(showExpandedRisk ? allRisk : topRisk).map(({ s, score }) => (
                    <li key={(s as any).id} className="flex items-center justify-between text-sm">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{s.name}</div>
                        <div className="truncate text-xs text-zinc-500">{s.code}-{s.section}</div>
                      </div>
                      {(() => {
                        const lvl = riskLevel(score)
                        const cls = lvl === 'Alto'
                          ? 'bg-red-50 text-red-700'
                          : lvl === 'Medio' || lvl === 'Bajo'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-zinc-100 text-zinc-700'
                        return <span className={`ml-2 rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{lvl}</span>
                      })()}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-3 border-t border-zinc-200" />
            <div className="mt-2 flex justify-center">
              <button
                onClick={() => setShowExpandedRisk((v) => !v)}
                aria-label="Alternar lista completa de proyectos en riesgo"
                title={showExpandedRisk ? 'Colapsar' : 'Ver más'}
                className="inline-flex items-center rounded-full border border-zinc-300 bg-white p-1 text-zinc-700 hover:bg-zinc-50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`h-4 w-4 transform transition-transform ${showExpandedRisk ? 'rotate-180' : ''}`}
                >
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Proyectos en Riesgo Detallado */}
      {showRiskModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" onClick={() => setShowRiskModal(false)}>
          <div className="w-full max-w-3xl rounded-lg border border-zinc-200 bg-white shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between border-b border-zinc-200 p-4">
              <h2 className="text-lg font-semibold">Proyectos en Riesgo</h2>
              <button onClick={() => setShowRiskModal(false)} className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50">Cerrar</button>
            </div>
            <div className="max-h-[70vh] overflow-auto p-4">
              {allRisk.length === 0 ? (
                <div className="text-sm text-zinc-600">No hay proyectos en riesgo</div>
              ) : (
                <div className="space-y-4">
                  {allRisk.map(({ s, score }) => {
                    const lvl = riskLevel(score)
                    const details = getRiskDetails(s, score)
                    const cls = lvl === 'Alto'
                      ? 'border-red-200 bg-red-50'
                      : lvl === 'Medio' || lvl === 'Bajo'
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-zinc-200 bg-zinc-50'
                    const headCls = lvl === 'Alto'
                      ? 'text-red-700'
                      : lvl === 'Medio' || lvl === 'Bajo'
                      ? 'text-amber-700'
                      : 'text-zinc-700'
                    const badgeCls = lvl === 'Alto'
                      ? 'bg-red-100 text-red-700'
                      : lvl === 'Medio' || lvl === 'Bajo'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-zinc-100 text-zinc-700'
                    return (
                      <div key={(s as any).id} className={`rounded-lg border-2 p-4 ${cls}`}>
                        <div className="mb-2 flex items-start justify-between">
                          <div>
                            <h3 className={`font-semibold ${headCls}`}>{s.name}</h3>
                            <p className="text-xs text-zinc-600">{s.code}-{s.section}</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${badgeCls}`}>{lvl}</span>
                        </div>
                        <div className="text-sm">
                          <p className="mb-2 font-medium text-zinc-700">Motivos del riesgo:</p>
                          <ul className="space-y-1 pl-4">
                            {details.map((detail, idx) => (
                              <li key={idx} className="list-disc text-zinc-600">{detail}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Proyectos API en curso</h1>
          <p className="text-sm text-zinc-600">Listado de proyectos activos asignados a docentes</p>
        </div>
        <div>
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
          >
            Filtrar
          </button>
        </div>
      </div>

      {filterOpen ? (
        <div className="mb-4 rounded-lg border border-zinc-200 bg-white p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {filters.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                {f.key}{f.value ? `: ${f.value}` : ''}
                <button onClick={() => removeFilter(i)} className="rounded-full border border-red-200 bg-white px-1 text-red-700 hover:bg-red-50">×</button>
              </span>
            ))}
          </div>
          <input
            value={filterInput}
            onChange={(e) => setFilterInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFilterFromInput() } }}
            placeholder="Ej: docente: juan | carrera: informatica | area: informatica"
            className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
        </div>
      ) : null}

      {error ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <Th>Docente</Th>
              <Th>Asignatura</Th>
              <Th>Área</Th>
              <Th>Carrera</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {loading ? (
              <tr>
                <td className="p-4 text-sm text-zinc-600" colSpan={4}>Cargando…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="p-4 text-sm text-zinc-600" colSpan={4}>No hay proyectos activos</td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} onClick={() => setShowPhasesModal(s.id)} className="cursor-pointer hover:bg-zinc-100 transition-colors">
                  <Td>{s.teacher_name || '-'}</Td>
                  <Td>
                    <div className="text-sm">{s.name}</div>
                    <div className="text-xs text-zinc-500">{s.code}-{s.section}</div>
                  </Td>
                  <Td>{s.area_name || '-'}</Td>
                  <Td>{s.career_name || '-'}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showPhasesModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" onClick={() => setShowPhasesModal(null)}>
          <div className="w-full max-w-2xl rounded-lg border border-zinc-200 bg-white p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Fechas de fases asignadas</h2>
              <button onClick={() => setShowPhasesModal(null)} className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50">Cerrar</button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {adminPhases.length === 0 ? (
                <div className="text-sm text-zinc-600">Sin fases configuradas</div>
              ) : (
                sortPhases(adminPhases).map((phase) => (
                  <div key={phase.id} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-xs font-medium text-zinc-600">Fase:</div>
                        <div className="text-zinc-800">{formatPhaseName(phase.phase)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-zinc-600">Fecha de inicio:</div>
                        <div className="text-zinc-800">{formatDate(phase.start_date) || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-zinc-600">Fecha de término:</div>
                        <div className="text-zinc-800">{formatDate(phase.end_date) || '-'}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )

  function formatPhaseName(phase: string): string {
    const labels: Record<string, string> = {
      'inicio': 'Inicio',
      'formulacion': 'Formulación de requerimientos',
      'gestion': 'Gestión de requerimientos',
      'validacion': 'Validación de requerimientos',
      'completado': 'Completado',
    }
    return labels[phase] || phase
  }

  function sortPhases(phases: PeriodPhaseSchedule[]): PeriodPhaseSchedule[] {
    const order = ['inicio', 'formulacion', 'gestion', 'validacion', 'completado']
    return [...phases].sort((a, b) => {
      const indexA = order.indexOf(a.phase)
      const indexB = order.indexOf(b.phase)
      return indexA - indexB
    })
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return ''
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return ''
      return d.toLocaleDateString('es-CL')
    } catch {
      return ''
    }
  }
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

function KpiCard({ title, value, tone = 'zinc', linkTo, subtitle = 'Total de proyectos' }: { title: string; value: number | string; tone?: 'zinc' | 'blue' | 'amber' | 'green'; linkTo?: string; subtitle?: string }) {
  const ring = {
    zinc: 'ring-zinc-200',
    blue: 'ring-blue-200',
    amber: 'ring-amber-200',
    green: 'ring-green-200',
  }[tone]
  const badgeBg = {
    zinc: 'bg-zinc-100 text-zinc-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-green-50 text-green-700',
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

function exportCsv() {
  const rows = [
    ['Métrica', 'Valor'],
    ['Borrador', String((window as any).kpi?.Borrador ?? '')],
    ['Enviada', String((window as any).kpi?.Enviada ?? '')],
    ['Observada', String((window as any).kpi?.Observada ?? '')],
    ['Aprobada', String((window as any).kpi?.Aprobada ?? '')],
    ['% con atraso', String((window as any).delayedPct ?? '')],
  ]
  const csv = rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `kpis_coordinador_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function exportPdf() {
  const w = window.open('', '_blank')
  if (!w) return
  const d = new Date()
  const html = `<!doctype html><html><head><meta charset="utf-8" /><title>KPIs Coordinador</title>
    <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif;padding:24px;color:#111} h1{font-size:20px;margin:0 0 12px} table{border-collapse:collapse;width:100%} th,td{border:1px solid #ddd;padding:8px;text-align:left} th{background:#f5f5f5}</style>
  </head><body>
    <h1>KPIs Coordinador</h1>
    <div>Fecha: ${d.toLocaleString()}</div>
    <table style="margin-top:12px">
      <thead><tr><th>Métrica</th><th>Valor</th></tr></thead>
      <tbody>
        <tr><td>Borrador</td><td>${(window as any).kpi?.Borrador ?? ''}</td></tr>
        <tr><td>Enviada</td><td>${(window as any).kpi?.Enviada ?? ''}</td></tr>
        <tr><td>Observada</td><td>${(window as any).kpi?.Observada ?? ''}</td></tr>
        <tr><td>Aprobada</td><td>${(window as any).kpi?.Aprobada ?? ''}</td></tr>
        <tr><td>% con atraso</td><td>${(window as any).delayedPct ?? ''}%</td></tr>
      </tbody>
    </table>
    <script>window.onload = () => setTimeout(() => window.print(), 300)</script>
  </body></html>`
  w.document.open()
  w.document.write(html)
  w.document.close()
}

function exportCsvPhases() {
  const rows = [
    ['Métrica', 'Valor'],
    ['Fase 1: Formulación de requerimientos', String((window as any).phaseKpi?.['Fase 1'] ?? '')],
    ['Fase 2: Gestión de Requerimientos', String((window as any).phaseKpi?.['Fase 2'] ?? '')],
    ['Fase 3: Validación de requerimientos', String((window as any).phaseKpi?.['Fase 3'] ?? '')],
    ['Aprobada', String((window as any).kpi?.Aprobada ?? '')],
    ['% con atraso', String((window as any).delayedPct ?? '')],
  ]
  const csv = rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `kpis_coordinador_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function exportPdfPhases() {
  const w = window.open('', '_blank')
  if (!w) return
  const d = new Date()
  const html = `<!doctype html><html><head><meta charset="utf-8" /><title>KPIs Coordinador</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background: #f9fafb;
        padding: 40px 20px;
        color: #1f2937;
        min-height: 100vh;
      }
      .container {
        max-width: 900px;
        margin: 0 auto;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        overflow: hidden;
      }
      .header {
        background: white;
        border-bottom: 1px solid #d1d5db;
        padding: 32px 24px;
        text-align: left;
      }
      .header h1 {
        font-size: 28px;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 4px;
      }
      .header p {
        font-size: 14px;
        color: #6b7280;
      }
      .content {
        padding: 32px 24px;
      }
      .meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid #e5e7eb;
      }
      .meta-item {
        font-size: 13px;
        color: #6b7280;
      }
      .meta-item strong {
        color: #1f2937;
        font-weight: 600;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 0;
      }
      th {
        background: #f3f4f6;
        color: #1f2937;
        padding: 12px 16px;
        text-align: left;
        font-weight: 600;
        font-size: 13px;
        border-bottom: 2px solid #d1d5db;
      }
      td {
        padding: 12px 16px;
        border-bottom: 1px solid #e5e7eb;
        font-size: 13px;
      }
      tbody tr:hover {
        background-color: #f9fafb;
      }
      tbody tr:last-child td {
        border-bottom: 1px solid #e5e7eb;
      }
      .metric {
        color: #374151;
        font-weight: 500;
      }
      .value {
        color: #1f2937;
        font-weight: 600;
        font-size: 14px;
      }
      .footer {
        text-align: center;
        padding: 16px 24px;
        background: #f3f4f6;
        border-top: 1px solid #e5e7eb;
        font-size: 11px;
        color: #9ca3af;
      }
      .print-hint {
        text-align: center;
        padding: 12px 24px;
        background: #fee2e2;
        border-bottom: 1px solid #fecaca;
        font-size: 12px;
        color: #991b1b;
      }
      @media print {
        body { background: white; padding: 0; }
        .container { box-shadow: none; border-radius: 0; }
        .print-hint { display: none; }
      }
    </style>
  </head><body>
    <div class="container">
      <div class="header">
        <h1>KPIs Coordinador</h1>
        <p>Reporte de Métricas y Desempeño</p>
      </div>
      <div class="print-hint">
        Usa Ctrl+P o Cmd+P para imprimir este documento como PDF
      </div>
      <div class="content">
        <div class="meta">
          <div class="meta-item"><strong>Período:</strong> ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          <div class="meta-item"><strong>Hora:</strong> ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Métrica</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="metric">Fase 1: Formulación de requerimientos</td>
              <td class="value">${(window as any).phaseKpi?.['Fase 1'] ?? '-'} proyectos</td>
            </tr>
            <tr>
              <td class="metric">Fase 2: Gestión de Requerimientos</td>
              <td class="value">${(window as any).phaseKpi?.['Fase 2'] ?? '-'} proyectos</td>
            </tr>
            <tr>
              <td class="metric">Fase 3: Validación de requerimientos</td>
              <td class="value">${(window as any).phaseKpi?.['Fase 3'] ?? '-'} proyectos</td>
            </tr>
            <tr>
              <td class="metric">Aprobada</td>
              <td class="value">${(window as any).kpi?.Aprobada ?? '-'} proyectos</td>
            </tr>
            <tr>
              <td class="metric">% con atraso</td>
              <td class="value">${(window as any).delayedPct ?? '-'}%</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="footer">
        API Projects Management System - Documento generado automáticamente
      </div>
    </div>
  </body></html>`
  w.document.open()
  w.document.write(html)
  w.document.close()
}
