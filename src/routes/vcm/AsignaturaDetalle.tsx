import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router'
import { toast } from '../../lib/toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useAuth } from '../../store/auth'
import {
  getSubject,
  type Subject,
  listCompanyRequirements,
  type CompanyRequirement,
  updateCompanyRequirement,
  listApi2Completions,
  type Api2Completion,
  listApi3Completions,
  type Api3Completion,
  listAlternances,
  type Api3Alternance,
  createAlternance,
  updateAlternance,
  listSubjectCompetencies,
  type SubjectCompetency,
  listSubjectUnits,
  type SubjectUnit,
  listBoundaryConditions,
  type CompanyBoundaryCondition,
} from '../../api/subjects'
import { listCompanies, type Company, listProblemStatements, type ProblemStatement } from '../../api/companies'

type Prospect = { id: string; company_name: string }
type SubjectProspects = Record<number, string[]>

export default function AsignaturaVCMDetalle() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { role } = useAuth()
  const subjectId = Number(id)
  const isVCM = role === 'VCM'

  const [subject, setSubject] = useState<Subject | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [requirements, setRequirements] = useState<CompanyRequirement[]>([])
  const [api2Completion, setApi2Completion] = useState<Api2Completion | null>(null)
  const [api3Completion, setApi3Completion] = useState<Api3Completion | null>(null)
  const [alternance, setAlternance] = useState<Api3Alternance | null>(null)
  const [competencies, setCompetencies] = useState<SubjectCompetency[]>([])
  const [units, setUnits] = useState<SubjectUnit[]>([])
  const [boundaryCondition, setBoundaryCondition] = useState<CompanyBoundaryCondition | null>(null)
  const [problemStatements, setProblemStatements] = useState<ProblemStatement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [prospects, setProspects] = useState<Prospect[]>(() => loadProspects())
  const [subjectProspects, setSubjectProspects] = useState<SubjectProspects>(() => loadSubjectProspects())
  const [editingReq, setEditingReq] = useState<{req: CompanyRequirement; form: {quota: string; can: boolean}} | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<SubjectUnit | null>(null)
  const [selectedProblem, setSelectedProblem] = useState<ProblemStatement | null>(null)
  const [showAlternanceModal, setShowAlternanceModal] = useState(false)
  const [alternanceForm, setAlternanceForm] = useState({
    student_role: '',
    students_quota: '',
    tutor_name: '',
    tutor_email: '',
    alternance_hours: '',
  })
  const [savingAlternance, setSavingAlternance] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    info: true,
    competencies: true,
    units: false,
    boundary: false,
    requirements: false,
    problems: false,
    api2: false,
    api3: false,
    alternancia: false,
  })

  async function loadData() {
    try {
      setLoading(true)
      setError(null)
      const [s, comps, reqs, api2, api3, alts, comp, u, bc, problems] = await Promise.all([
        getSubject(subjectId),
        listCompanies().catch(() => [] as Company[]),
        listCompanyRequirements().catch(() => [] as CompanyRequirement[]),
        listApi2Completions({ subject: subjectId }).catch(() => []),
        listApi3Completions({ subject: subjectId }).catch(() => []),
        listAlternances({ subject: subjectId }).catch(() => []),
        listSubjectCompetencies(subjectId).catch(() => [] as SubjectCompetency[]),
        listSubjectUnits(subjectId).catch(() => [] as SubjectUnit[]),
        listBoundaryConditions().catch(() => [] as CompanyBoundaryCondition[]),
        listProblemStatements({ subject: subjectId }).catch(() => []),
      ])
      setSubject(s)
      setCompanies(comps)
      setRequirements(reqs)
      setApi2Completion(api2[0] ?? null)
      setApi3Completion(api3[0] ?? null)
      setAlternance(alts[0] ?? null)
      setCompetencies(comp)
      setUnits(u)
      setProblemStatements(problems)
      // Seleccionar primera unidad por defecto
      if (u.length > 0) setSelectedUnit(u[0])
      // Buscar boundary condition para esta asignatura
      const bc_for_subject = bc.find(b => b.subject === subjectId)
      setBoundaryCondition(bc_for_subject ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar la asignatura')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!Number.isFinite(subjectId)) {
      setError('Asignatura inválida')
      setLoading(false)
      return
    }
    loadData()
  }, [subjectId])

  useEffect(() => {
    const handler = () => {
      setProspects(loadProspects())
      setSubjectProspects(loadSubjectProspects())
    }
    window.addEventListener('vcm:prospects-updated', handler)
    return () => window.removeEventListener('vcm:prospects-updated', handler)
  }, [])

  const counterpartNames = useMemo(() => {
    if (!subject) return [] as string[]
    return resolveCounterparts(subject.id, companies, requirements, prospects, subjectProspects)
  }, [subject, companies, requirements, prospects, subjectProspects])

  const subjectProblems = useMemo(() => {
    if (!subject) return [] as ProblemStatement[]
    return problemStatements.filter(p => p.subject === subject.id)
  }, [subject, problemStatements])

  const apiType = subject?.api_type ?? null
  const showApi2 = apiType === 2
  const showApi3 = apiType === 3
  const acceptsAlternance = useMemo(() => {
    if (!subject || !showApi3) return false
    return requirements.some((r) => r.subject === subject.id && r.can_receive_alternance)
  }, [requirements, subject, showApi3])

  async function saveRequirement(req: CompanyRequirement, quotaStr: string, can: boolean) {
    if (!subject) return
    
    // Validar cuota si está habilitada
    if (can) {
      const quota = parseInt(quotaStr.trim(), 10)
      if (!quotaStr.trim() || isNaN(quota) || quota <= 0) {
        toast.error('Ingresa una cantidad válida de estudiantes para alternancia')
        return
      }
    }
    
    try {
      const quota = quotaStr.trim() === '' || !can ? 0 : Number(quotaStr)
      const payload = { ...req, alternance_students_quota: quota }
      await updateCompanyRequirement(req.id, payload)
      setRequirements(reqs => reqs.map(r => r.id === req.id ? { ...r, alternance_students_quota: quota } : r))
      setEditingReq(null)
      toast.success('Datos del requerimiento guardados')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar'
      toast.error(msg)
    }
  }

  async function saveAlternance() {
    if (!subject) return

    // Validaciones
    if (!alternanceForm.student_role.trim()) {
      toast.error('Ingresa el rol del estudiante')
      return
    }
    if (!alternanceForm.students_quota.trim()) {
      toast.error('Ingresa la cantidad de cupos')
      return
    }
    const quota = parseInt(alternanceForm.students_quota.trim(), 10)
    if (isNaN(quota) || quota <= 0) {
      toast.error('La cantidad de cupos debe ser mayor a 0')
      return
    }
    if (!alternanceForm.tutor_name.trim()) {
      toast.error('Ingresa el nombre del tutor')
      return
    }
    if (!alternanceForm.tutor_email.trim()) {
      toast.error('Ingresa el correo del tutor')
      return
    }
    if (!alternanceForm.alternance_hours.trim()) {
      toast.error('Ingresa las horas de alternancia')
      return
    }
    const hours = parseInt(alternanceForm.alternance_hours.trim(), 10)
    if (isNaN(hours) || hours <= 0) {
      toast.error('Las horas de alternancia deben ser mayor a 0')
      return
    }

    setSavingAlternance(true)
    try {
      const payload = {
        subject: subject.id,
        student_role: alternanceForm.student_role.trim(),
        students_quota: quota,
        tutor_name: alternanceForm.tutor_name.trim(),
        tutor_email: alternanceForm.tutor_email.trim(),
        alternance_hours: hours,
      }

      if (alternance?.id) {
        await updateAlternance(alternance.id, payload)
        setAlternance(prev => prev ? { ...prev, ...payload } : null)
        toast.success('Alternancia actualizada')
      } else {
        const created = await createAlternance(payload)
        setAlternance(created)
        toast.success('Alternancia creada')
      }

      setShowAlternanceModal(false)
      setAlternanceForm({
        student_role: '',
        students_quota: '',
        tutor_name: '',
        tutor_email: '',
        alternance_hours: '',
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar'
      toast.error(msg)
    } finally {
      setSavingAlternance(false)
    }
  }

  function openAlternanceModal() {
    if (alternance) {
      setAlternanceForm({
        student_role: alternance.student_role || '',
        students_quota: alternance.students_quota ? String(alternance.students_quota) : '',
        tutor_name: alternance.tutor_name || '',
        tutor_email: alternance.tutor_email || '',
        alternance_hours: alternance.alternance_hours ? String(alternance.alternance_hours) : '',
      })
    }
    setShowAlternanceModal(true)
  }

  if (loading) {
    return <div className="p-6"><p className="text-sm text-zinc-600">Cargando asignatura...</p></div>
  }

  if (error || !subject) {
    return (
      <div className="p-6">
        <button className="mb-3 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50" onClick={() => navigate(-1)}>Volver</button>
        <p className="text-sm text-red-600">{error || 'No se encontro la asignatura solicitada.'}</p>
      </div>
    )
  }

  async function generatePDF() {
    if (!subject) {
      toast.error('No se pudo generar el reporte')
      return
    }

    const toastId = toast.loading('Generando reporte PDF...')

    try {
      const now = new Date()
      const dateStr = now.toLocaleDateString('es-ES') + ', ' + now.toLocaleTimeString('es-ES')
      const showApi2 = subject.api_type === 2
      const showApi3 = subject.api_type === 3

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      let yPos = 20

      // Encabezado
      pdf.setFillColor(196, 30, 58)
      pdf.rect(0, 0, pageWidth, 15, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('REPORTE DE ASIGNATURA - VCM', pageWidth / 2, 10, { align: 'center' })
      pdf.setTextColor(0, 0, 0)
      pdf.setFont('helvetica', 'normal')

      // Información de la asignatura
      autoTable(pdf, {
        startY: yPos,
        head: [['Campo', 'Valor']],
        body: [
          ['Asignatura', subject.name || '-'],
          ['Código', `${subject.code}-${subject.section}`],
          ['Carrera', subject.career_name || '-'],
          ['Área', subject.area_name || '-'],
          ['Docente', subject.teacher_name || '-'],
          ['Tipo API', `API ${subject.api_type || 1}`]
        ],
        theme: 'striped',
        headStyles: { fillColor: [196, 30, 58], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 }
      })

      yPos = (pdf as any).lastAutoTable.finalY + 10

      // Competencias
      if (competencies.length > 0) {
        pdf.setFillColor(196, 30, 58)
        pdf.rect(14, yPos, pageWidth - 28, 8, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'bold')
        pdf.text(`COMPETENCIAS TÉCNICAS (${competencies.length})`, 16, yPos + 5.5)
        pdf.setTextColor(0, 0, 0)
        pdf.setFont('helvetica', 'normal')
        yPos += 10

        autoTable(pdf, {
          startY: yPos,
          head: [['Nº', 'Descripción']],
          body: competencies.map(c => [c.number.toString(), c.description || '-']),
          theme: 'grid',
          headStyles: { fillColor: [245, 245, 245], textColor: 0, fontStyle: 'bold' },
          styles: { fontSize: 8 },
          columnStyles: { 0: { cellWidth: 15 } },
          margin: { left: 14, right: 14 }
        })
        yPos = (pdf as any).lastAutoTable.finalY + 10
      } else {
        pdf.setFillColor(240, 240, 240)
        pdf.rect(14, yPos, pageWidth - 28, 10, 'F')
        pdf.setFontSize(9)
        pdf.text('Sin competencias técnicas registradas', pageWidth / 2, yPos + 6, { align: 'center' })
        yPos += 15
      }

      // Unidades
      if (yPos > 250) { pdf.addPage(); yPos = 20 }
      if (units.length > 0) {
        pdf.setFillColor(196, 30, 58)
        pdf.rect(14, yPos, pageWidth - 28, 8, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'bold')
        pdf.text(`UNIDADES DE ASIGNATURA (${units.length})`, 16, yPos + 5.5)
        pdf.setTextColor(0, 0, 0)
        pdf.setFont('helvetica', 'normal')
        yPos += 10

        autoTable(pdf, {
          startY: yPos,
          head: [['Unidad', 'Horas', 'Aprendizaje Esperado']],
          body: units.map(u => [
            `Unidad ${u.number}`,
            u.unit_hours?.toString() || '-',
            u.expected_learning ? (u.expected_learning.substring(0, 60) + (u.expected_learning.length > 60 ? '...' : '')) : '-'
          ]),
          theme: 'grid',
          headStyles: { fillColor: [245, 245, 245], textColor: 0, fontStyle: 'bold' },
          styles: { fontSize: 8 },
          columnStyles: { 1: { cellWidth: 20 } },
          margin: { left: 14, right: 14 }
        })
        yPos = (pdf as any).lastAutoTable.finalY + 10
      } else {
        pdf.setFillColor(240, 240, 240)
        pdf.rect(14, yPos, pageWidth - 28, 10, 'F')
        pdf.setFontSize(9)
        pdf.text('Sin unidades de asignatura registradas', pageWidth / 2, yPos + 6, { align: 'center' })
        yPos += 15
      }

      // Condiciones Límite
      if (yPos > 250) { pdf.addPage(); yPos = 20 }
      if (boundaryCondition) {
        pdf.setFillColor(196, 30, 58)
        pdf.rect(14, yPos, pageWidth - 28, 8, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'bold')
        pdf.text('CONDICIONES LÍMITE DE EMPRESA', 16, yPos + 5.5)
        pdf.setTextColor(0, 0, 0)
        pdf.setFont('helvetica', 'normal')
        yPos += 12

        const tipos = [
          boundaryCondition.large_company && 'Gran Empresa',
          boundaryCondition.medium_company && 'Mediana Empresa',
          boundaryCondition.small_company && 'Pequeña Empresa',
          boundaryCondition.family_enterprise && 'Empresa Familiar',
          boundaryCondition.not_relevant && 'No Relevante'
        ].filter(Boolean).join(', ') || 'No especificado'

        pdf.setFillColor(249, 249, 249)
        pdf.rect(14, yPos, pageWidth - 28, 15, 'F')
        pdf.setDrawColor(196, 30, 58)
        pdf.setLineWidth(1)
        pdf.line(14, yPos, 14, yPos + 15)
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Tipos de Empresa:', 18, yPos + 5)
        pdf.setFont('helvetica', 'normal')
        const lines = pdf.splitTextToSize(tipos, pageWidth - 32)
        pdf.text(lines, 18, yPos + 10)
        yPos += 20
      } else {
        pdf.setFillColor(240, 240, 240)
        pdf.rect(14, yPos, pageWidth - 28, 10, 'F')
        pdf.setFontSize(9)
        pdf.text('Sin condiciones límite registradas', pageWidth / 2, yPos + 6, { align: 'center' })
        yPos += 15
      }

      // Posibles Contrapartes
      if (yPos > 250) { pdf.addPage(); yPos = 20 }
      const reqFiltered = requirements.filter(r => r.subject === subject.id)
      if (reqFiltered.length > 0) {
        pdf.setFillColor(196, 30, 58)
        pdf.rect(14, yPos, pageWidth - 28, 8, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'bold')
        pdf.text(`POSIBLES CONTRAPARTES (${reqFiltered.length})`, 16, yPos + 5.5)
        pdf.setTextColor(0, 0, 0)
        pdf.setFont('helvetica', 'normal')
        yPos += 10

        autoTable(pdf, {
          startY: yPos,
          head: [['Empresa', 'Sector', 'Trabajado', 'Interés']],
          body: reqFiltered.map(req => {
            const company = companies.find(c => c.id === req.company)
            return [
              company?.name || `Empresa ${req.company}`,
              req.sector || '-',
              req.worked_before ? 'Sí' : 'No',
              req.interest_collaborate ? 'Sí' : 'No'
            ]
          }),
          theme: 'grid',
          headStyles: { fillColor: [245, 245, 245], textColor: 0, fontStyle: 'bold' },
          styles: { fontSize: 8 },
          columnStyles: { 2: { cellWidth: 20 }, 3: { cellWidth: 20 } },
          margin: { left: 14, right: 14 }
        })
        yPos = (pdf as any).lastAutoTable.finalY + 10
      } else {
        pdf.setFillColor(240, 240, 240)
        pdf.rect(14, yPos, pageWidth - 28, 10, 'F')
        pdf.setFontSize(9)
        pdf.text('Sin posibles contrapartes registradas', pageWidth / 2, yPos + 6, { align: 'center' })
        yPos += 15
      }

      // API 2
      if (showApi2) {
        if (yPos > 250) { pdf.addPage(); yPos = 20 }
        pdf.setFillColor(196, 30, 58)
        pdf.rect(14, yPos, pageWidth - 28, 8, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'bold')
        pdf.text('API TIPO 2 - INFORMACIÓN DEL PROYECTO', 16, yPos + 5.5)
        pdf.setTextColor(0, 0, 0)
        pdf.setFont('helvetica', 'normal')
        yPos += 10

        if (api2Completion) {
          const api2Data = [
            api2Completion.project_goal_students && ['Objetivo para estudiantes', api2Completion.project_goal_students],
            api2Completion.deliverables_at_end && ['Entregables al final', api2Completion.deliverables_at_end],
            api2Completion.company_expected_participation && ['Participación esperada', api2Completion.company_expected_participation],
            api2Completion.other_activities && ['Otras actividades', api2Completion.other_activities]
          ].filter(Boolean) as string[][]

          if (api2Data.length > 0) {
            autoTable(pdf, {
              startY: yPos,
              head: [['Campo', 'Contenido']],
              body: api2Data,
              theme: 'grid',
              headStyles: { fillColor: [245, 245, 245], textColor: 0, fontStyle: 'bold' },
              styles: { fontSize: 8 },
              columnStyles: { 0: { cellWidth: 50 } },
              margin: { left: 14, right: 14 }
            })
            yPos = (pdf as any).lastAutoTable.finalY + 10
          } else {
            pdf.setFillColor(240, 240, 240)
            pdf.rect(14, yPos, pageWidth - 28, 10, 'F')
            pdf.setFontSize(9)
            pdf.text('Sin información registrada', pageWidth / 2, yPos + 6, { align: 'center' })
            yPos += 15
          }
        } else {
          pdf.setFillColor(240, 240, 240)
          pdf.rect(14, yPos, pageWidth - 28, 10, 'F')
          pdf.setFontSize(9)
          pdf.text('Sin información registrada', pageWidth / 2, yPos + 6, { align: 'center' })
          yPos += 15
        }
      }

      // API 3
      if (showApi3) {
        if (yPos > 250) { pdf.addPage(); yPos = 20 }
        pdf.setFillColor(196, 30, 58)
        pdf.rect(14, yPos, pageWidth - 28, 8, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'bold')
        pdf.text('API TIPO 3 - INFORMACIÓN DEL PROYECTO', 16, yPos + 5.5)
        pdf.setTextColor(0, 0, 0)
        pdf.setFont('helvetica', 'normal')
        yPos += 10

        if (api3Completion) {
          const api3Data = [
            api3Completion.project_goal_students && ['Objetivo para estudiantes', api3Completion.project_goal_students],
            api3Completion.deliverables_at_end && ['Entregables al final', api3Completion.deliverables_at_end],
            api3Completion.expected_student_role && ['Rol esperado del estudiante', api3Completion.expected_student_role],
            api3Completion.other_activities && ['Otras actividades', api3Completion.other_activities],
            api3Completion.master_guide_expected_support && ['Apoyo maestro guía', api3Completion.master_guide_expected_support]
          ].filter(Boolean) as string[][]

          if (api3Data.length > 0) {
            autoTable(pdf, {
              startY: yPos,
              head: [['Campo', 'Contenido']],
              body: api3Data,
              theme: 'grid',
              headStyles: { fillColor: [245, 245, 245], textColor: 0, fontStyle: 'bold' },
              styles: { fontSize: 8 },
              columnStyles: { 0: { cellWidth: 50 } },
              margin: { left: 14, right: 14 }
            })
            yPos = (pdf as any).lastAutoTable.finalY + 10
          } else {
            pdf.setFillColor(240, 240, 240)
            pdf.rect(14, yPos, pageWidth - 28, 10, 'F')
            pdf.setFontSize(9)
            pdf.text('Sin información registrada', pageWidth / 2, yPos + 6, { align: 'center' })
            yPos += 15
          }
        } else {
          pdf.setFillColor(240, 240, 240)
          pdf.rect(14, yPos, pageWidth - 28, 10, 'F')
          pdf.setFontSize(9)
          pdf.text('Sin información registrada', pageWidth / 2, yPos + 6, { align: 'center' })
          yPos += 15
        }

        // Alternancia
        if (acceptsAlternance && alternance) {
          if (yPos > 250) { pdf.addPage(); yPos = 20 }
          pdf.setFillColor(196, 30, 58)
          pdf.rect(14, yPos, pageWidth - 28, 8, 'F')
          pdf.setTextColor(255, 255, 255)
          pdf.setFontSize(11)
          pdf.setFont('helvetica', 'bold')
          pdf.text('ALTERNANCIA (API 3)', 16, yPos + 5.5)
          pdf.setTextColor(0, 0, 0)
          pdf.setFont('helvetica', 'normal')
          yPos += 10

          const alternanceData = [
            alternance.student_role && ['Rol del estudiante', alternance.student_role],
            alternance.students_quota && ['Cupos', `${alternance.students_quota} estudiantes`],
            alternance.tutor_name && ['Tutor', alternance.tutor_name],
            alternance.tutor_email && ['Correo tutor', alternance.tutor_email],
            alternance.alternance_hours && ['Horas de alternancia', `${alternance.alternance_hours} horas`]
          ].filter(Boolean) as string[][]

          if (alternanceData.length > 0) {
            autoTable(pdf, {
              startY: yPos,
              body: alternanceData,
              theme: 'grid',
              styles: { fontSize: 8 },
              columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' } },
              margin: { left: 14, right: 14 }
            })
            yPos = (pdf as any).lastAutoTable.finalY + 10
          }
        }
      }

      // Footer
      const finalY = pdf.internal.pageSize.getHeight() - 10
      pdf.setFontSize(8)
      pdf.setTextColor(150, 150, 150)
      pdf.text(`Generado: ${dateStr}`, pageWidth - 14, finalY, { align: 'right' })

      pdf.save(`Reporte_${subject.code}-${subject.section}.pdf`)
      toast.dismiss(toastId)
      toast.success('Reporte descargado exitosamente')
    } catch (error) {
      console.error('Error al generar PDF:', error)
      toast.dismiss(toastId)
      toast.error('Error al generar el PDF. Intenta nuevamente.')
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <button className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50" onClick={() => navigate(-1)}>Volver</button>
        <button
          onClick={generatePDF}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
        >
          Descargar Reporte PDF
        </button>
      </div>

      <div id="pdf-content">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900">{subject.name}</h1>
          <p className="text-sm text-zinc-600">{subject.code}-{subject.section} · {subject.career_name || 'Carrera sin definir'}</p>
        </div>

      <div className="rounded-lg border border-zinc-200 bg-white mb-6 p-4">
        <h2 className="text-base font-semibold text-zinc-900 mb-4">Información de la asignatura</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DetailItem label="Código">{subject.code}</DetailItem>
          <DetailItem label="Sección">{subject.section}</DetailItem>
          <DetailItem label="Carrera">{subject.career_name || '-'}</DetailItem>
          <DetailItem label="Área">{subject.area_name || '-'}</DetailItem>
          <DetailItem label="Semestre">{subject.semester_name || '-'}</DetailItem>
          <DetailItem label="Campus">{subject.campus || '-'}</DetailItem>
          <DetailItem label="Jornada">{subject.shift || '-'}</DetailItem>
          <DetailItem label="Horas">{subject.hours || '-'}</DetailItem>
          <DetailItem label="Docente">{subject.teacher_name || '-'}</DetailItem>
          <DetailItem label="Tipo API">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              subject.api_type === 3 ? 'bg-purple-100 text-purple-700' :
              subject.api_type === 2 ? 'bg-blue-100 text-blue-700' :
              'bg-green-100 text-green-700'
            }`}>
              API {subject.api_type || 1}
            </span>
          </DetailItem>
        </dl>

        <div className="mt-6">
          <h3 className="text-base font-semibold text-zinc-900">Posibles contrapartes</h3>
          {counterpartNames.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {counterpartNames.map((name) => (
                <span key={name} className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100 px-3 py-0.5 text-sm text-zinc-700">{name}</span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">Sin contrapartes registradas.</p>
          )}
        </div>
      </div>

      {/* Competencias técnicas */}
      {competencies.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white mb-6">
          <button
            onClick={() => setExpandedSections(prev => ({ ...prev, competencies: !prev.competencies }))}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-50 transition-colors"
          >
            <h2 className="text-base font-semibold text-zinc-900">Competencias técnicas</h2>
            <span className={`inline-block transition-transform ${expandedSections.competencies ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {expandedSections.competencies && (
            <div className="border-t border-zinc-200 p-4">
              <div className="space-y-2">
                {competencies.map((comp) => (
                  <div key={comp.id} className="rounded-lg border border-zinc-200 bg-white p-3">
                    <p className="text-sm text-zinc-700">
                      <span className="font-semibold text-zinc-900">Competencia {comp.number}:</span> {comp.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Unidades de la asignatura */}
      {units.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white mb-6">
          <button
            onClick={() => setExpandedSections(prev => ({ ...prev, units: !prev.units }))}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-50 transition-colors"
          >
            <h2 className="text-base font-semibold text-zinc-900">Unidades de la asignatura ({units.length})</h2>
            <span className={`inline-block transition-transform ${expandedSections.units ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {expandedSections.units && (
            <div className="border-t border-zinc-200 p-4">
              {units.length > 1 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {units.map((unit) => (
                    <button
                      key={unit.id}
                      onClick={() => setSelectedUnit(unit)}
                      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                        (selectedUnit?.id === unit.id || (!selectedUnit && unit.id === units[0].id))
                          ? 'bg-red-600 text-white'
                          : 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      Unidad {unit.number}
                    </button>
                  ))}
                </div>
              )}
              {units.length > 1 ? (
                <div className="space-y-4 border-t border-zinc-200 pt-4">
                  {(selectedUnit || units[0]) && (() => {
                    const unit = selectedUnit || units[0]
                    return (
                      <>
                        {unit.expected_learning && (
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-2">Aprendizaje esperado</label>
                            <p className="text-sm text-zinc-700 whitespace-pre-wrap">{unit.expected_learning}</p>
                          </div>
                        )}
                        {unit.unit_hours && (
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-2">Horas de la unidad</label>
                            <p className="text-sm text-zinc-700">{unit.unit_hours}h</p>
                          </div>
                        )}
                        {unit.activities_description && (
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-2">Descripción general de actividades</label>
                            <p className="text-sm text-zinc-700 whitespace-pre-wrap">{unit.activities_description}</p>
                          </div>
                        )}
                        {unit.evaluation_evidence && (
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-2">Evidencia sistema de evaluación</label>
                            <p className="text-sm text-zinc-700 whitespace-pre-wrap">{unit.evaluation_evidence}</p>
                          </div>
                        )}
                        {unit.evidence_detail && (
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-2">Detalle de evidencia</label>
                            <p className="text-sm text-zinc-700 whitespace-pre-wrap">{unit.evidence_detail}</p>
                          </div>
                        )}
                        {unit.counterpart_link && (
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-2">Vínculo con contraparte</label>
                            <p className="text-sm text-zinc-700 whitespace-pre-wrap">{unit.counterpart_link}</p>
                          </div>
                        )}
                        {unit.place_mode_type && (
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-2">Lugar/Modo</label>
                            <p className="text-sm text-zinc-700">{unit.place_mode_type}</p>
                          </div>
                        )}
                        {unit.counterpart_participant_name && (
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-2">Participante de contraparte</label>
                            <p className="text-sm text-zinc-700">{unit.counterpart_participant_name}</p>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              ) : (
                <div className="space-y-4">
                  {units[0] && (
                    <>
                      {units[0].expected_learning && (
                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 mb-2">Aprendizaje esperado</label>
                          <p className="text-sm text-zinc-700 whitespace-pre-wrap">{units[0].expected_learning}</p>
                        </div>
                      )}
                      {units[0].unit_hours && (
                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 mb-2">Horas de la unidad</label>
                          <p className="text-sm text-zinc-700">{units[0].unit_hours}h</p>
                        </div>
                      )}
                      {units[0].activities_description && (
                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 mb-2">Descripción general de actividades</label>
                          <p className="text-sm text-zinc-700 whitespace-pre-wrap">{units[0].activities_description}</p>
                        </div>
                      )}
                      {units[0].evaluation_evidence && (
                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 mb-2">Evidencia sistema de evaluación</label>
                          <p className="text-sm text-zinc-700 whitespace-pre-wrap">{units[0].evaluation_evidence}</p>
                        </div>
                      )}
                      {units[0].evidence_detail && (
                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 mb-2">Detalle de evidencia</label>
                          <p className="text-sm text-zinc-700 whitespace-pre-wrap">{units[0].evidence_detail}</p>
                        </div>
                      )}
                      {units[0].counterpart_link && (
                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 mb-2">Vínculo con contraparte</label>
                          <p className="text-sm text-zinc-700 whitespace-pre-wrap">{units[0].counterpart_link}</p>
                        </div>
                      )}
                      {units[0].place_mode_type && (
                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 mb-2">Lugar/Modo</label>
                          <p className="text-sm text-zinc-700">{units[0].place_mode_type}</p>
                        </div>
                      )}
                      {units[0].counterpart_participant_name && (
                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 mb-2">Participante de contraparte</label>
                          <p className="text-sm text-zinc-700">{units[0].counterpart_participant_name}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Condiciones de borde de la empresa */}
      {boundaryCondition && (
        <div className="rounded-lg border border-zinc-200 bg-white mb-6">
          <button
            onClick={() => setExpandedSections(prev => ({ ...prev, boundary: !prev.boundary }))}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-50 transition-colors"
          >
            <h2 className="text-base font-semibold text-zinc-900">Condiciones de borde</h2>
            <span className={`inline-block transition-transform ${expandedSections.boundary ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {expandedSections.boundary && (
            <div className="border-t border-zinc-200 p-4">
              <div className="space-y-3 text-sm">
                <div>
                  <h4 className="font-semibold text-zinc-900 mb-1">Tipo de Empresas</h4>
                  <div className="flex flex-wrap gap-2">
                    {boundaryCondition.large_company && <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">Gran Empresa</span>}
                    {boundaryCondition.medium_company && <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">Mediana Empresa</span>}
                    {boundaryCondition.small_company && <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">Pequeña Empresa</span>}
                    {boundaryCondition.family_enterprise && <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">Empresa Familiar</span>}
                    {boundaryCondition.not_relevant && <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">No Relevante</span>}
                  </div>
                </div>
                {boundaryCondition.company_type_description && (
                  <div>
                    <h4 className="font-semibold text-zinc-900 mb-1">Descripción de Tipo de Empresa</h4>
                    <p className="text-zinc-700 whitespace-pre-wrap">{boundaryCondition.company_type_description}</p>
                  </div>
                )}
                {boundaryCondition.company_requirements_for_level_2_3 && (
                  <div>
                    <h4 className="font-semibold text-zinc-900 mb-1">Requerimientos para API 2/3</h4>
                    <p className="text-zinc-700 whitespace-pre-wrap">{boundaryCondition.company_requirements_for_level_2_3}</p>
                  </div>
                )}
                {boundaryCondition.project_minimum_elements && (
                  <div>
                    <h4 className="font-semibold text-zinc-900 mb-1">Elementos Mínimos del Proyecto</h4>
                    <p className="text-zinc-700 whitespace-pre-wrap">{boundaryCondition.project_minimum_elements}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Requerimientos de empresas */}
      {requirements.filter(r => r.subject === subject.id).length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white mb-6">
          <button
            onClick={() => setExpandedSections(prev => ({ ...prev, requirements: !prev.requirements }))}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-50 transition-colors"
          >
            <h2 className="text-base font-semibold text-zinc-900">Requerimientos de empresas</h2>
            <span className={`inline-block transition-transform ${expandedSections.requirements ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {expandedSections.requirements && (
            <div className="border-t border-zinc-200 p-4">
              <div className="space-y-3">
                {requirements.filter(r => r.subject === subject.id).map((req) => {
                  const company = companies.find(c => c.id === req.company)
                  return (
                    <div key={req.id} className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-red-900">{company?.name || `Empresa ${req.company}`}</h3>
                          <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                            <p><span className="font-medium">Sector:</span> {req.sector || '-'}</p>
                            <p><span className="font-medium">Ha trabajado:</span> {req.worked_before ? 'Sí' : 'No'}</p>
                            <p><span className="font-medium">Desea colaborar:</span> {req.interest_collaborate ? 'Sí' : 'No'}</p>
                            <p><span className="font-medium">Tipo interacción:</span> {req.interaction_type ? (Array.isArray(req.interaction_type) ? req.interaction_type.join(', ') : req.interaction_type) : '-'}</p>
                          </div>
                          {req.can_receive_alternance && (
                            <div className="mt-3 rounded bg-green-100 p-2">
                              <p className="text-sm font-medium text-green-700">? Acepta alternancia</p>
                              <p className="text-xs text-green-600 mt-1">Cupos disponibles: {req.alternance_students_quota || 0} estudiantes</p>
                            </div>
                          )}
                        </div>
                        {isVCM && (
                          <button
                            onClick={() => setEditingReq({ req, form: { quota: String(req.alternance_students_quota || ''), can: req.can_receive_alternance } })}
                            className="ml-4 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                          >
                            Editar
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Editar Requerimiento */}
      {editingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
          <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">Editar Cupos de Alternancia</h3>
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={editingReq.form.can}
                    onChange={(e) => {
                      setEditingReq({
                        ...editingReq,
                        form: { ...editingReq.form, can: e.target.checked, quota: !e.target.checked ? '' : editingReq.form.quota }
                      })
                    }}
                    className="rounded border-zinc-300"
                  />
                  <span className="text-sm font-medium">Acepta alternancia</span>
                </label>
              </div>
              {editingReq.form.can && (
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Cupos de estudiantes</label>
                  <input
                    type="number"
                    min="0"
                    value={editingReq.form.quota}
                    onChange={(e) => setEditingReq({...editingReq, form: {...editingReq.form, quota: e.target.value}})}
                    placeholder="0"
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
                  />
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setEditingReq(null)}
                  className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => saveRequirement(editingReq.req, editingReq.form.quota, editingReq.form.can)}
                  className="flex-1 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proyectos */}
      {subjectProblems.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white mb-6">
          <button
            onClick={() => setExpandedSections(prev => ({ ...prev, problems: !prev.problems }))}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-50 transition-colors"
          >
            <h2 className="text-base font-semibold text-zinc-900">Proyectos ({subjectProblems.length})</h2>
            <span className={`inline-block transition-transform ${expandedSections.problems ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {expandedSections.problems && (
            <div className="border-t border-zinc-200 p-4">
              {subjectProblems.length > 1 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {subjectProblems.map((problem, index) => (
                    <button
                      key={problem.id}
                      onClick={() => setSelectedProblem(problem)}
                      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                        (selectedProblem?.id === problem.id || (!selectedProblem && index === 0))
                          ? 'bg-red-600 text-white'
                          : 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      Proyecto {index + 1}
                    </button>
                  ))}
                </div>
              )}
              {subjectProblems.length > 1 ? (
                <div className="rounded-lg border border-zinc-200 bg-white p-4 border-t border-zinc-200 pt-4">
                  {(selectedProblem || subjectProblems[0]) && (() => {
                    const problem = selectedProblem || subjectProblems[0]
                    const company = companies.find(c => c.id === problem.company)
                    return (
                      <div 
                        className="cursor-pointer hover:shadow-sm transition-all"
                        onClick={() => navigate(`/vcm/proyectos/${problem.id}`)}
                      >
                        <h3 className="font-semibold text-zinc-900 mb-3">{problem.problem_to_address}</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="font-medium text-zinc-700">Empresa:</span>
                            <p className="text-zinc-600">{company?.name || `Empresa ${problem.company}`}</p>
                          </div>
                          <div>
                            <span className="font-medium text-zinc-700">Área relacionada:</span>
                            <p className="text-zinc-600">{problem.related_area || '-'}</p>
                          </div>
                          <div className="col-span-2">
                            <span className="font-medium text-zinc-700">¿Por qué es importante?</span>
                            <p className="text-zinc-600">{problem.why_important?.substring(0, 80)}...</p>
                          </div>
                          <div className="col-span-2">
                            <span className="font-medium text-zinc-700">Partes interesadas:</span>
                            <p className="text-zinc-600">{problem.stakeholders?.substring(0, 80)}...</p>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              ) : (
                <div className="rounded-lg border border-zinc-200 bg-white p-4">
                  {subjectProblems[0] && (() => {
                    const problem = subjectProblems[0]
                    const company = companies.find(c => c.id === problem.company)
                    return (
                      <div 
                        className="cursor-pointer hover:shadow-sm transition-all"
                        onClick={() => navigate(`/vcm/proyectos/${problem.id}`)}
                      >
                        <h3 className="font-semibold text-zinc-900 mb-3">{problem.problem_to_address}</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="font-medium text-zinc-700">Empresa:</span>
                            <p className="text-zinc-600">{company?.name || `Empresa ${problem.company}`}</p>
                          </div>
                          <div>
                            <span className="font-medium text-zinc-700">Área relacionada:</span>
                            <p className="text-zinc-600">{problem.related_area || '-'}</p>
                          </div>
                          <div className="col-span-2">
                            <span className="font-medium text-zinc-700">¿Por qué es importante?</span>
                            <p className="text-zinc-600">{problem.why_important?.substring(0, 80)}...</p>
                          </div>
                          <div className="col-span-2">
                            <span className="font-medium text-zinc-700">Partes interesadas:</span>
                            <p className="text-zinc-600">{problem.stakeholders?.substring(0, 80)}...</p>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* API 2 Completion */}
      {showApi2 && (
        <div className="rounded-lg border border-zinc-200 bg-white mb-6">
          <button
            onClick={() => setExpandedSections(prev => ({ ...prev, api2: !prev.api2 }))}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-50 transition-colors"
          >
            <h2 className="text-base font-semibold text-zinc-900">API Tipo 2</h2>
            <span className={`inline-block transition-transform ${expandedSections.api2 ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {expandedSections.api2 && (
            <div className="border-t border-zinc-200 p-4">
              {api2Completion ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <CompletionBox label="Objetivo para estudiantes" value={api2Completion.project_goal_students} color="border-blue-200 bg-blue-50" />
                  <CompletionBox label="Entregables al final" value={api2Completion.deliverables_at_end} color="border-blue-200 bg-blue-50" />
                  <CompletionBox label="Participación esperada" value={api2Completion.company_expected_participation} color="border-blue-200 bg-blue-50" />
                  <CompletionBox label="Otras actividades" value={api2Completion.other_activities} color="border-blue-200 bg-blue-50" />
                </div>
              ) : (
                <p className="text-sm text-zinc-600">Sin información registrada.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* API 3 Completion */}
      {showApi3 && (
        <div className="rounded-lg border border-zinc-200 bg-white mb-6">
          <button
            onClick={() => setExpandedSections(prev => ({ ...prev, api3: !prev.api3 }))}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-50 transition-colors"
          >
            <h2 className="text-base font-semibold text-zinc-900">API Tipo 3</h2>
            <span className={`inline-block transition-transform ${expandedSections.api3 ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {expandedSections.api3 && (
            <div className="border-t border-zinc-200 p-4 space-y-6">
              {/* API 3 Completion Info */}
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 mb-3">Información del Proyecto</h3>
                {api3Completion ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <CompletionBox label="Objetivo para estudiantes" value={api3Completion.project_goal_students} color="border-purple-200 bg-purple-50" />
                    <CompletionBox label="Entregables al final" value={api3Completion.deliverables_at_end} color="border-purple-200 bg-purple-50" />
                    <CompletionBox label="Rol esperado del estudiante" value={api3Completion.expected_student_role} color="border-purple-200 bg-purple-50" />
                    <CompletionBox label="Otras actividades" value={api3Completion.other_activities} color="border-purple-200 bg-purple-50" />
                    <CompletionBox label="Apoyo maestro guía" value={api3Completion.master_guide_expected_support} color="border-purple-200 bg-purple-50" />
                  </div>
                ) : (
                  <p className="text-sm text-zinc-600">Sin información registrada.</p>
                )}
              </div>

              {/* API 3 Alternancia */}
              <div className="border-t border-zinc-200 pt-6">
                <h3 className="text-sm font-semibold text-zinc-900 mb-3">Alternancia</h3>
                {alternance ? (
                  <>
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 mb-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <TextBlock label="Rol del estudiante" value={alternance.student_role} />
                        <TextBlock label="Cupos" value={alternance.students_quota ? `${alternance.students_quota} estudiantes` : '-'} />
                        <TextBlock label="Tutor" value={alternance.tutor_name} />
                        <TextBlock label="Correo tutor" value={alternance.tutor_email} />
                        <TextBlock label="Horas de alternancia" value={alternance.alternance_hours ? `${alternance.alternance_hours} horas` : '-'} />
                      </div>
                    </div>
                    {isVCM && (
                      <button
                        onClick={openAlternanceModal}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                      >
                        Editar
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm text-zinc-600 mb-4">Sin datos de alternancia registrados.</p>
                    {isVCM && (
                      <button
                        onClick={openAlternanceModal}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                      >
                        Crear Alternancia
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal para crear/editar Alternancia */}
      {showAlternanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
            <div className="border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">
                {alternance ? 'Editar Alternancia' : 'Crear Alternancia'}
              </h2>
              <button
                onClick={() => setShowAlternanceModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                ?
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Rol del estudiante</label>
                <input
                  type="text"
                  value={alternanceForm.student_role}
                  onChange={(e) => setAlternanceForm({ ...alternanceForm, student_role: e.target.value })}
                  placeholder="Ej: Asistente de desarrollo"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Cupos de estudiantes</label>
                <input
                  type="number"
                  value={alternanceForm.students_quota}
                  onChange={(e) => setAlternanceForm({ ...alternanceForm, students_quota: e.target.value })}
                  placeholder="Ej: 2"
                  min={1}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Nombre del tutor</label>
                <input
                  type="text"
                  value={alternanceForm.tutor_name}
                  onChange={(e) => setAlternanceForm({ ...alternanceForm, tutor_name: e.target.value })}
                  placeholder="Ej: Juan Pérez"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Correo del tutor</label>
                <input
                  type="email"
                  value={alternanceForm.tutor_email}
                  onChange={(e) => setAlternanceForm({ ...alternanceForm, tutor_email: e.target.value })}
                  placeholder="Ej: juan@empresa.cl"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Horas de alternancia por semana</label>
                <input
                  type="number"
                  value={alternanceForm.alternance_hours}
                  onChange={(e) => setAlternanceForm({ ...alternanceForm, alternance_hours: e.target.value })}
                  placeholder="Ej: 30"
                  min={1}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
                />
              </div>
            </div>
            <div className="border-t border-zinc-200 px-6 py-4 flex gap-2 justify-end">
              <button
                onClick={() => setShowAlternanceModal(false)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancelar
              </button>
              <button
                onClick={saveAlternance}
                disabled={savingAlternance}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {savingAlternance ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-zinc-600">{label}</dt>
      <dd className="text-sm text-zinc-900">{children}</dd>
    </div>
  )
}

function CompletionBox({ label, value, color = 'border-zinc-200 bg-white' }: { label: string; value?: string | null; color?: string }) {
  return (
    <div className={`rounded-lg border p-4 ${color}`}>
      <div className="text-xs font-semibold text-zinc-900 mb-2">{label}</div>
      <div className="text-sm text-zinc-700 whitespace-pre-line">{value?.trim() ? value : '—'}</div>
    </div>
  )
}

function TextBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs font-medium text-zinc-600">{label}</div>
      <div className="text-sm text-zinc-900">{value?.trim() ? value : '—'}</div>
    </div>
  )
}

function resolveCounterparts(
  subjectId: number,
  companies: Company[],
  requirements: CompanyRequirement[],
  prospects: Prospect[],
  subjectProspects: SubjectProspects
): string[] {
  const byCompanyId = new Map(companies.map((c) => [c.id, c]))
  const byReqId = new Map(requirements.map((r) => [r.id, r]))

  const ids = subjectProspects[subjectId] || []
  const localNames = ids.map((id) => {
    if (id.startsWith('db:')) {
      const rid = Number(id.slice(3))
      const req = byReqId.get(rid)
      if (req && req.subject === subjectId) return byCompanyId.get(req.company)?.name
      return undefined
    }
    if (id.startsWith('dbco:')) {
      const cid = Number(id.slice(5))
      return byCompanyId.get(cid)?.name
    }
    return prospects.find((p) => p.id === id)?.company_name
  }).filter(Boolean) as string[]

  const backendNames = requirements
    .filter((r) => r.subject === subjectId)
    .map((r) => byCompanyId.get(r.company)?.name)
    .filter(Boolean) as string[]

  return Array.from(new Set(localNames.length ? localNames : backendNames))
}

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

function loadSubjectProspects(): SubjectProspects {
  try {
    const raw = localStorage.getItem('vcm_subject_prospects')
    const obj = raw ? JSON.parse(raw) : {}
    return obj && typeof obj === 'object' ? obj : {}
  } catch {
    return {}
  }
}
