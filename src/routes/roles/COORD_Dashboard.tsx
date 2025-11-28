import { useEffect, useMemo, useState } from 'react'
import { listSubjects, type Subject } from '../../api/subjects'
import { usePeriodStore } from '../../store/period'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function COORD_DASH() {
  const [items, setItems] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterInput, setFilterInput] = useState('')
  const [filters, setFilters] = useState<Array<{ key: 'docente' | 'carrera' | 'area'; value?: string }>>([])
  const season = usePeriodStore((s) => s.season)
  const year = usePeriodStore((s) => s.year)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await listSubjects()
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar proyectos'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [season, year])

  const active = useMemo(() => items.filter((s) => !!s.teacher), [items])

  // Mapeo de fase del backend a fase del frontend
  const PHASE_MAP: Record<string, string> = {
    'inicio': 'Inicio',
    'formulacion': 'Formulación',
    'gestion': 'Gestión',
    'validacion': 'Validación',
    'completado': 'Completado',
  }
  
  // KPI: Conteo por fase
  const phaseKpi = useMemo(() => {
    const res: Record<string, number> = { 
      'Inicio': 0, 
      'Formulación': 0, 
      'Gestión': 0, 
      'Validación': 0, 
      'Completado': 0 
    }
    for (const s of items as any[]) {
      const backendPhase = s.phase || 'inicio'
      const mappedPhase = PHASE_MAP[backendPhase] || 'Inicio'
      res[mappedPhase] = (res[mappedPhase] || 0) + 1
    }
    return res
  }, [items])

  // Datos para el gráfico de barras
  const chartData = useMemo(() => {
    return [
      { name: 'Inicio', value: phaseKpi['Inicio'], color: '#71717a' },
      { name: 'Formulación', value: phaseKpi['Formulación'], color: '#3b82f6' },
      { name: 'Gestión', value: phaseKpi['Gestión'], color: '#f59e0b' },
      { name: 'Validación', value: phaseKpi['Validación'], color: '#a855f7' },
      { name: 'Completado', value: phaseKpi['Completado'], color: '#22c55e' },
    ]
  }, [phaseKpi])

  useEffect(() => {
    try { (window as any).phaseKpi = phaseKpi } catch {}
  }, [phaseKpi])

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
    else if (k === 'area' || k === 'área') key = 'area'
    if (!key) {
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

  function exportPdf() {
    try {
      const now = new Date()
      const dateStr = now.toLocaleDateString('es-ES') + ', ' + now.toLocaleTimeString('es-ES')
      const phases = ['Inicio', 'Formulación', 'Gestión', 'Validación', 'Completado']

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 15
      let y = margin

      // PÁGINA 1 - Encabezado y resumen
      
      // Encabezado rojo
      pdf.setFillColor(196, 30, 58)
      pdf.rect(0, 0, pageWidth, 15, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text('REPORTE DE PROYECTOS API - COORDINADOR', pageWidth / 2, 10, { align: 'center' })
      
      y = 20
      pdf.setTextColor(100, 100, 100)
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Generado el: ${dateStr}`, margin, y)
      y += 2
      
      // Línea separadora
      pdf.setDrawColor(196, 30, 58)
      pdf.setLineWidth(0.5)
      pdf.line(margin, y, pageWidth - margin, y)
      y += 10

      // Cuadro de información general
      pdf.setFillColor(249, 249, 249)
      pdf.setDrawColor(200, 200, 200)
      pdf.setLineWidth(0.1)
      pdf.rect(margin, y, pageWidth - 2 * margin, 25, 'FD')
      
      // Borde izquierdo rojo
      pdf.setDrawColor(196, 30, 58)
      pdf.setLineWidth(3)
      pdf.line(margin, y, margin, y + 25)
      
      pdf.setTextColor(0, 0, 0)
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'bold')
      
      const infoY = y + 8
      pdf.text('Total de Proyectos:', margin + 5, infoY)
      pdf.setFont('helvetica', 'normal')
      pdf.text(String(items.length), margin + 50, infoY)
      
      pdf.setFont('helvetica', 'bold')
      pdf.text('Proyectos Activos:', pageWidth / 2 + 5, infoY)
      pdf.setFont('helvetica', 'normal')
      pdf.text(String(active.length), pageWidth / 2 + 50, infoY)
      
      const infoY2 = infoY + 8
      pdf.setFont('helvetica', 'bold')
      pdf.text('Período:', margin + 5, infoY2)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`${season} ${year}`, margin + 50, infoY2)
      
      pdf.setFont('helvetica', 'bold')
      pdf.text('Fecha de Generación:', pageWidth / 2 + 5, infoY2)
      pdf.setFont('helvetica', 'normal')
      pdf.text(now.toLocaleDateString('es-ES'), pageWidth / 2 + 50, infoY2)
      
      y += 32

      // Título tabla de resumen
      pdf.setFillColor(196, 30, 58)
      pdf.rect(margin, y, pageWidth - 2 * margin, 8, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.text('RESUMEN POR FASE', margin + 3, y + 5.5)
      y += 10

      // Tabla de resumen usando autoTable
      const summaryData = phases.map(phase => ({
        fase: phase,
        cantidad: phaseKpi[phase] || 0,
        porcentaje: active.length > 0 ? Math.round((phaseKpi[phase] || 0) / active.length * 100) : 0
      }))
      
      summaryData.push({
        fase: 'TOTAL',
        cantidad: active.length,
        porcentaje: 100
      })

      autoTable(pdf, {
        startY: y,
        head: [['Fase', 'Cantidad de Proyectos', 'Porcentaje']],
        body: summaryData.map(row => [row.fase, row.cantidad, `${row.porcentaje}%`]),
        theme: 'grid',
        headStyles: {
          fillColor: [245, 245, 245],
          textColor: [51, 51, 51],
          fontStyle: 'bold',
          lineColor: [196, 30, 58],
          lineWidth: 0.5
        },
        bodyStyles: {
          textColor: [0, 0, 0]
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250]
        },
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { halign: 'center' },
          2: { halign: 'center' }
        },
        margin: { left: margin, right: margin }
      })

      // Actualizar posición Y después de la tabla
      y = (pdf as any).lastAutoTable.finalY + 10

      // NUEVA PÁGINA - Detalle de proyectos
      pdf.addPage()
      y = margin

      // Título detalle
      pdf.setFillColor(196, 30, 58)
      pdf.rect(margin, y, pageWidth - 2 * margin, 8, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.text('DETALLE DE PROYECTOS POR FASE', margin + 3, y + 5.5)
      y += 12

      // Procesar cada fase
      for (const phaseName of phases) {
        const subjectsInPhase = active.filter(s => {
          const backendPhase = s.phase || 'inicio'
          return PHASE_MAP[backendPhase] === phaseName
        })

        // Verificar espacio para título de fase (necesitamos al menos 20mm)
        if (y > pageHeight - 30) {
          pdf.addPage()
          y = margin
        }

        // Título de fase con fondo gris y borde rojo
        pdf.setFillColor(245, 245, 245)
        pdf.setDrawColor(200, 200, 200)
        pdf.setLineWidth(0.1)
        pdf.rect(margin, y, pageWidth - 2 * margin, 8, 'FD')
        
        pdf.setDrawColor(196, 30, 58)
        pdf.setLineWidth(3)
        pdf.line(margin, y, margin, y + 8)
        
        pdf.setTextColor(51, 51, 51)
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'bold')
        pdf.text(`${phaseName} (${subjectsInPhase.length} proyectos)`, margin + 5, y + 5.5)
        y += 12

        if (subjectsInPhase.length === 0) {
          // Mostrar mensaje cuando no hay proyectos
          pdf.setFillColor(240, 240, 240)
          pdf.setDrawColor(220, 220, 220)
          pdf.setLineWidth(0.1)
          pdf.rect(margin, y, pageWidth - 2 * margin, 10, 'FD')
          
          pdf.setTextColor(100, 100, 100)
          pdf.setFontSize(9)
          pdf.setFont('helvetica', 'italic')
          pdf.text('No hay proyectos en esta fase', pageWidth / 2, y + 6, { align: 'center' })
          y += 15
          continue
        }

        // Procesar cada asignatura
        for (const subject of subjectsInPhase) {
          // Verificar espacio para tarjeta (necesitamos ~30mm)
          if (y > pageHeight - 40) {
            pdf.addPage()
            y = margin
          }

          // Tarjeta de asignatura
          const cardHeight = 30
          
          // Fondo de la tarjeta
          pdf.setFillColor(250, 250, 250)
          pdf.setDrawColor(224, 224, 224)
          pdf.setLineWidth(0.1)
          pdf.rect(margin, y, pageWidth - 2 * margin, cardHeight, 'FD')
          
          // Borde izquierdo rojo
          pdf.setDrawColor(196, 30, 58)
          pdf.setLineWidth(2)
          pdf.line(margin, y, margin, y + cardHeight)

          // Título de la tarjeta
          pdf.setTextColor(196, 30, 58)
          pdf.setFontSize(9)
          pdf.setFont('helvetica', 'bold')
          const cardTitle = `${subject.code}-${subject.section} - ${subject.name || 'Sin nombre'}`
          const titleLines = pdf.splitTextToSize(cardTitle, pageWidth - 2 * margin - 8)
          pdf.text(titleLines, margin + 4, y + 5)
          
          // Detalles en dos columnas
          pdf.setTextColor(0, 0, 0)
          pdf.setFontSize(8)
          
          const col1X = margin + 4
          const col2X = pageWidth / 2 + 5
          let detailY = y + (titleLines.length > 1 ? 12 : 11)

          // Fila 1
          pdf.setFont('helvetica', 'bold')
          pdf.text('Docente:', col1X, detailY)
          pdf.setFont('helvetica', 'normal')
          const teacherText = subject.teacher_name || 'Sin asignar'
          const teacherLines = pdf.splitTextToSize(teacherText, 60)
          pdf.text(teacherLines, col1X + 18, detailY)
          
          pdf.setFont('helvetica', 'bold')
          pdf.text('Área:', col2X, detailY)
          pdf.setFont('helvetica', 'normal')
          const areaText = subject.area_name || 'Sin área'
          const areaLines = pdf.splitTextToSize(areaText, 60)
          pdf.text(areaLines, col2X + 12, detailY)
          detailY += Math.max(teacherLines.length, areaLines.length) * 4

          // Fila 2
          pdf.setFont('helvetica', 'bold')
          pdf.text('Carrera:', col1X, detailY)
          pdf.setFont('helvetica', 'normal')
          const careerText = subject.career_name || 'Sin carrera'
          const careerLines = pdf.splitTextToSize(careerText, 60)
          pdf.text(careerLines, col1X + 18, detailY)
          
          pdf.setFont('helvetica', 'bold')
          pdf.text('Tipo API:', col2X, detailY)
          pdf.setFont('helvetica', 'normal')
          pdf.text(`API ${subject.api_type || 'N/A'}`, col2X + 16, detailY)
          detailY += Math.max(careerLines.length, 1) * 4

          // Fila 3
          pdf.setFont('helvetica', 'bold')
          pdf.text('Cupo:', col1X, detailY)
          pdf.setFont('helvetica', 'normal')
          pdf.text(String(subject.total_students ?? 'No especificado'), col1X + 18, detailY)
          
          pdf.setFont('helvetica', 'bold')
          pdf.text('Fase:', col2X, detailY)
          pdf.setFont('helvetica', 'normal')
          pdf.text(phaseName, col2X + 12, detailY)

          y += cardHeight + 3
        }

        y += 2
      }

      // Footer en todas las páginas
      const totalPages = pdf.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i)
        pdf.setFontSize(7)
        pdf.setTextColor(150, 150, 150)
        pdf.setFont('helvetica', 'italic')
        pdf.text('Reporte generado automáticamente por el Sistema de Gestión de Proyectos API', margin, pageHeight - 8)
        pdf.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 20, pageHeight - 8)
      }

      pdf.save(`Reporte_Coordinador_${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (error) {
      console.error('Error al generar PDF:', error)
      alert('Error al generar el PDF. Por favor, intente nuevamente.')
    }
  }

  // Obtener label de fase
  function getPhaseLabel(phase: string): string {
    return PHASE_MAP[phase] || phase
  }

  return (
    <section className="p-6">
      <div className="mb-6 mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Panel de Coordinador</h1>
        <div className="flex gap-2">
          <button onClick={exportPdf} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            PDF
          </button>
        </div>
      </div>

      {/* KPI Cards por Fase */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard title="Inicio" value={phaseKpi['Inicio']} tone="zinc" linkTo="/coord/asignaturas?filter=inicio" />
        <KpiCard title="Formulación" value={phaseKpi['Formulación']} tone="blue" linkTo="/coord/asignaturas?filter=fase1" />
        <KpiCard title="Gestión" value={phaseKpi['Gestión']} tone="amber" linkTo="/coord/asignaturas?filter=fase2" />
        <KpiCard title="Validación" value={phaseKpi['Validación']} tone="purple" linkTo="/coord/asignaturas?filter=fase3" />
        <KpiCard title="Completado" value={phaseKpi['Completado']} tone="green" linkTo="/coord/asignaturas?filter=completado" />
      </div>

      {/* Gráfico de barras */}
      <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Distribución por Fase</h2>
        <div style={{ width: '100%', height: 256, minHeight: 256 }}>
          {!loading && (
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis 
                  allowDecimals={false}
                  domain={[0, (dataMax: number) => Math.max(10, Math.ceil(dataMax * 1.1))]}
                  tickFormatter={(value) => Math.round(value).toString()}
                />
                <Tooltip formatter={(value: number) => [value, 'Asignaturas']} />
                <Bar dataKey="value" name="Asignaturas" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Asignaturas API en curso</h2>
          <p className="text-sm text-zinc-600">Listado de asignaturas activas asignadas a docentes</p>
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
            placeholder="Ej: docente: juan | carrera: informática | area: informática"
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
              <Th>Fase</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {loading ? (
              <tr>
                <td className="p-4 text-sm text-zinc-600" colSpan={5}>Cargando…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="p-4 text-sm text-zinc-600" colSpan={5}>No hay proyectos activos</td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50">
                  <Td>{s.teacher_name || '-'}</Td>
                  <Td>
                    <div className="text-sm">{s.name}</div>
                    <div className="text-xs text-zinc-500">{s.code}-{s.section}</div>
                  </Td>
                  <Td>{s.area_name || '-'}</Td>
                  <Td>{s.career_name || '-'}</Td>
                  <Td>
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                      {getPhaseLabel(s.phase || 'inicio')}
                    </span>
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

function KpiCard({ title, value, tone = 'zinc', linkTo, subtitle = 'Total de asignaturas' }: { title: string; value: number | string; tone?: 'zinc' | 'blue' | 'amber' | 'green' | 'purple'; linkTo?: string; subtitle?: string }) {
  const ring = {
    zinc: 'ring-zinc-200',
    blue: 'ring-blue-200',
    amber: 'ring-amber-200',
    green: 'ring-green-200',
    purple: 'ring-purple-200',
  }[tone]
  const badgeBg = {
    zinc: 'bg-zinc-100 text-zinc-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
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

