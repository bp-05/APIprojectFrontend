import { useEffect, useMemo, useState, useRef, type ReactNode } from 'react'
import type React from 'react'
import { toast } from 'react-hot-toast'
import { listSubjects, type Subject, listSubjectUnits, type SubjectUnit, updateSubjectUnit, listDescriptorsBySubject, type Descriptor, createSubjectUnit, uploadDescriptor, processDescriptor, listSubjectCompetencies, type SubjectCompetency, getBoundaryConditionBySubject, type CompanyBoundaryCondition, getApiType2CompletionBySubject, type ApiType2Completion, getApiType3CompletionBySubject, type ApiType3Completion } from '../../api/subjects'
import { listProblemStatements, type ProblemStatement, getCompany } from '../../api/companies'

type PanelMode = 'list' | 'view' | 'manage-units' | 'manage-projects'

export default function MisAsignaturas() {
  const [items, setItems] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<PanelMode>('list')
  const [selected, setSelected] = useState<Subject | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [manageUnitsSubject, setManageUnitsSubject] = useState<Subject | null>(null)
  const [manageProjectsSubject, setManageProjectsSubject] = useState<Subject | null>(null)

  const [competencies, setCompetencies] = useState<SubjectCompetency[]>([])
  const [boundary, setBoundary] = useState<CompanyBoundaryCondition | null>(null)
  const [api2, setApi2] = useState<ApiType2Completion | null>(null)
  const [api3, setApi3] = useState<ApiType3Completion | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await listSubjects()
      setItems(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar asignaturas'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered: Subject[] = useMemo(() => {
    if (!search) return items
    const q = search.toLowerCase()
    return items.filter((s) =>
      [s.code, s.section, s.name, s.campus].some((v) => String(v || '').toLowerCase().includes(q))
    )
  }, [items, search])

  async function handleSelect(subject: Subject) {
    setSelected(subject)
    setMode('view')
    setDetailLoading(true)
    try {
      const [comp, bc, a2, a3] = await Promise.all([
        listSubjectCompetencies(subject.id).catch(() => []),
        getBoundaryConditionBySubject(subject.id).catch(() => null),
        getApiType2CompletionBySubject(subject.id).catch(() => null),
        getApiType3CompletionBySubject(subject.id).catch(() => null),
      ])
      setCompetencies(Array.isArray(comp) ? comp : [])
      setBoundary(bc)
      setApi2(a2)
      setApi3(a3)
    } catch (_) {
      // ignorar
    } finally {
      setDetailLoading(false)
    }
  }

  const handleClose = () => {
    setMode('list')
    setSelected(null)
    setCompetencies([])
    setBoundary(null)
    setApi2(null)
    setApi3(null)
  }

  if (mode === 'view' && selected) {
    return (
      <SubjectDetailView
        subject={selected}
        loading={detailLoading}
        onClose={handleClose}
        competencies={competencies}
        boundary={boundary}
        api2={api2}
        api3={api3}
      />
    )
  }

  if (mode === 'manage-units' && manageUnitsSubject) {
    return (
      <ManageUnitsView
        subject={manageUnitsSubject}
        onClose={() => {
          setMode('list')
          setManageUnitsSubject(null)
        }}
      />
    )
  }

  if (mode === 'manage-projects' && manageProjectsSubject) {
    return (
      <ManageProjectsView
        key={manageProjectsSubject.id}
        subject={manageProjectsSubject}
        onClose={() => {
          setMode('list')
          setManageProjectsSubject(null)
        }}
      />
    )
  }

  return (
    <section className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Mis asignaturas</h1>
          <p className="text-sm text-zinc-600">Asignaturas API donde eres docente</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, sección o nombre…"
            className="w-72 max-w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
        </div>
      </div>

      {error ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <Th>Descriptor</Th>
              <Th>Código</Th>
              <Th>Sección</Th>
              <Th>Nombre</Th>
              <Th>Área</Th>
              <Th>Carrera</Th>
              <Th className="text-right">Proyectos</Th>
              <Th className="text-right">Proceso API</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {loading ? (
              <tr>
                <td className="p-4 text-sm text-zinc-600" colSpan={8}>Cargando…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="p-4 text-sm text-zinc-600" colSpan={8}>Sin resultados</td>
              </tr>
            ) : (
              filtered.map((s: Subject) => (
                <tr
                  key={s.id}
                  className="transition-colors hover:bg-zinc-50"
                >
                  <Td onClick={() => handleSelect(s)} className="cursor-pointer">
                    <DescriptorCellDoc subject={s} />
                  </Td>
                  <Td onClick={() => handleSelect(s)} className="cursor-pointer">{s.code}</Td>
                  <Td onClick={() => handleSelect(s)} className="cursor-pointer">{s.section}</Td>
                  <Td onClick={() => handleSelect(s)} className="cursor-pointer">{s.name}</Td>
                  <Td onClick={() => handleSelect(s)} className="cursor-pointer">{s.area_name}</Td>
                  <Td onClick={() => handleSelect(s)} className="cursor-pointer">{s.career_name || '-'}</Td>
                  <Td className="text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setManageProjectsSubject(s)
                        setMode('manage-projects')
                      }}
                      className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                    >
                      Gestionar
                    </button>
                  </Td>
                  <Td className="text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setManageUnitsSubject(s)
                        setMode('manage-units')
                      }}
                      className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                    >
                      Gestionar
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

function Th({ children, className = '' }: { children: any; className?: string }) {
  return (
    <th className={`px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 ${className}`}>
      {children}
    </th>
  )
}

function Td({ children, className = '', onClick }: { children: any; className?: string; onClick?: () => void }) {
  return <td onClick={onClick} className={`px-4 py-2 text-sm text-zinc-800 ${className}`}>{children}</td>
}

function DescriptorCellDoc({ subject }: { subject: Subject }) {
  const [items, setItems] = useState<Descriptor[] | null>(null)
  const [open, setOpen] = useState(false)

  async function refresh() {
    try {
      const data = await listDescriptorsBySubject(subject.id)
      const filtered = Array.isArray(data) ? data.filter((d) => d.subject === subject.id) : []
      setItems(filtered)
    } catch {
      setItems([])
    }
  }

  useEffect(() => {
    let mounted = true
    listDescriptorsBySubject(subject.id)
      .then((data) => {
        if (!mounted) return
        const filtered = Array.isArray(data) ? data.filter((d) => d.subject === subject.id) : []
        setItems(filtered)
      })
      .catch(() => {
        if (mounted) setItems([])
      })
    return () => {
      mounted = false
    }
  }, [subject.id])

  if (items === null) {
    return <span className="inline-block h-3 w-3 animate-pulse rounded-sm bg-zinc-300" title="Cargando." />
  }

  if (!items.length) {
    return (
      <>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setOpen(true)
          }}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-zinc-400 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          title="Subir descriptor (PDF)"
        >
          +
        </button>
        {open ? (
          <UploadDescriptorDialogDoc
            subject={subject}
            onClose={() => setOpen(false)}
            onUploaded={async () => {
              await refresh()
              setOpen(false)
            }}
          />
        ) : null}
      </>
    )
  }

  const last = items[items.length - 1]
  return (
    <div className="flex items-center gap-2">
      <span
        title={last.processed_at ? 'Procesado' : 'Pendiente'}
        className={`inline-block h-3 w-3 rounded-sm ${last.processed_at ? 'bg-green-600' : 'bg-zinc-400'}`}
      />
      <a
        href={last.file}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-medium text-red-700 hover:underline"
        title="Ver descriptor"
        onClick={(e) => e.stopPropagation()}
      >
        Ver
      </a>
    </div>
  )
}

function UploadDescriptorDialogDoc({ subject, onClose, onUploaded }: { subject: Subject; onClose: () => void; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [dragOver, setDragOver] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!file) {
      setError('Seleccione un archivo PDF')
      return
    }
    const ext = file.name.toLowerCase()
    if (!ext.endsWith('.pdf')) {
      setError('El archivo debe ser PDF')
      return
    }
    try {
      setLoading(true)
      const d = await uploadDescriptor(file, subject.id)
      toast.success('Descriptor subido')
      try {
        await processDescriptor(d.id)
        toast.success('Procesamiento iniciado')
      } catch (_) {
        // ignorar si falla el disparo; el archivo ya quedo subido
      }
      await onUploaded()
    } catch (e) {
      let backendMsg: string | null = null
      const backend: any = (e as any)?.response?.data ?? null
      if (backend && typeof backend === 'object') {
        backendMsg = (backend as any).detail || (backend as any).error || (backend as any).file || null
      } else if (typeof backend === 'string') {
        backendMsg = backend
      }
      const msg = backendMsg || (e instanceof Error ? e.message : 'Error al subir descriptor')
      setError(String(msg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Subir descriptor (PDF)</h2>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100">Cerrar</button>
        </div>
        {error ? (
          <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}
        <form className="space-y-3" onSubmit={onSubmit}>
          <div>
            <input
              ref={fileInputRef as any}
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <div
              onClick={() => {
                (fileInputRef as any)?.current?.click()
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                const f = e.dataTransfer.files?.[0]
                if (f) setFile(f)
              }}
              role="button"
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed ${dragOver ? 'border-red-500 bg-red-50' : 'border-zinc-300 bg-zinc-50'} px-4 py-8 text-center hover:bg-zinc-100`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6H16a4 4 0 010 8h-1m-4-8v10m0 0l-3-3m3 3l3-3" />
              </svg>
              <div className="text-sm text-zinc-700">
                {file ? <span className="font-medium">{file.name}</span> : 'Haz clic o arrastra un PDF aquí'}
              </div>
              <p className="text-xs text-zinc-500">Solo archivos PDF.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50">Cancelar</button>
            <button type="submit" disabled={loading} className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-60">{loading ? 'Subiendo...' : 'Subir'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SubjectDetailView({
  subject,
  loading,
  onClose,
  competencies,
  boundary,
  api2,
  api3,
}: {
  subject: Subject
  loading: boolean
  onClose: () => void
  competencies: SubjectCompetency[]
  boundary: CompanyBoundaryCondition | null
  api2: ApiType2Completion | null
  api3: ApiType3Completion | null
}) {
  const [openInfo, setOpenInfo] = useState(true)
  const [openCompetencies, setOpenCompetencies] = useState(false)
  const [openBoundary, setOpenBoundary] = useState(false)
  const [openApi2, setOpenApi2] = useState(false)
  const [openApi3, setOpenApi3] = useState(false)

  useEffect(() => {
    setOpenInfo(true)
    setOpenCompetencies(false)
    setOpenBoundary(false)
    setOpenApi2(false)
    setOpenApi3(false)
  }, [subject.id, subject.api_type])

  return (
    <section className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">{subject.name}</h1>
          <p className="text-sm text-zinc-600">
            {subject.code}-{subject.section} - {formatPeriod(subject)}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:border-zinc-400"
        >
          Cerrar
        </button>
      </div>
      <CollapsibleSection
        title="Información de la asignatura"
        open={openInfo}
        onToggle={() => setOpenInfo((v) => !v)}
      >
        {loading ? (
          <div className="mb-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
            Actualizando información...
          </div>
        ) : null}
        <dl className="grid gap-4 sm:grid-cols-2">
          <DetailRow label="Código" value={subject.code} />
          <DetailRow label="Sección" value={subject.section} />
          <DetailRow label="Campus" value={subject.campus || '-'} />
          <DetailRow label="Jornada" value={subject.shift || '-'} />
          <DetailRow label="Horas" value={subject.hours} />
          <DetailRow label="Total estudiantes" value={subject.total_students ?? '-'} />
          <DetailRow label="Tipo API" value={subject.api_type} />
          <DetailRow label="Fase" value={phaseLabel(subject.phase)} />
          <DetailRow label="Área" value={subject.area_name || '-'} />
          <DetailRow label="Carrera" value={subject.career_name || '-'} />
          <DetailRow label="Docente" value={subject.teacher_name || '-'} />
          <DetailRow label="Periodo" value={formatPeriod(subject)} />
        </dl>
      </CollapsibleSection>

      <CollapsibleSection
        title="Competencias técnicas"
        open={openCompetencies}
        onToggle={() => setOpenCompetencies((v) => !v)}
      >
        {competencies.length === 0 ? (
          <p className="text-sm text-zinc-600">Sin competencias registradas.</p>
        ) : (
          <ul className="space-y-2">
            {competencies.map((c) => (
              <li key={c.id} className="rounded-md border border-dashed border-zinc-300 bg-white/70 px-3 py-2 text-sm text-zinc-800">
                {c.description}
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Condiciones de borde"
        open={openBoundary}
        onToggle={() => setOpenBoundary((v) => !v)}
      >
        {boundary ? (
          <div className="space-y-2 text-sm text-zinc-800">
            <p><strong>Empresa grande:</strong> {boundary.large_company ? 'Sí' : 'No'}</p>
            <p><strong>Empresa mediana:</strong> {boundary.medium_company ? 'Sí' : 'No'}</p>
            <p><strong>Empresa pequeña:</strong> {boundary.small_company ? 'Sí' : 'No'}</p>
            <p><strong>Empresa familiar:</strong> {boundary.family_enterprise ? 'Sí' : 'No'}</p>
            <p><strong>No relevante:</strong> {boundary.not_relevant ? 'Sí' : 'No'}</p>
            <p><strong>Tipo / descripción:</strong> {boundary.company_type_description || '-'}</p>
            <p><strong>Requisitos nivel 2/3:</strong> {boundary.company_requirements_for_level_2_3 || '-'}</p>
            <p><strong>Elementos mínimos:</strong> {boundary.project_minimum_elements || '-'}</p>
          </div>
        ) : (
          <p className="text-sm text-zinc-600">Sin condiciones registradas.</p>
        )}
      </CollapsibleSection>

      {subject.api_type === 2 ? (
        <CollapsibleSection
          title="API Tipo 2"
          open={openApi2}
          onToggle={() => setOpenApi2((v) => !v)}
        >
          {api2 ? (
            <div className="space-y-2 text-sm text-zinc-800">
              <InfoRow label="Objetivo del proyecto" value={api2.project_goal_students} />
              <InfoRow label="Entregables" value={api2.deliverables_at_end} />
              <InfoRow label="Participación esperada" value={api2.company_expected_participation} />
              <InfoRow label="Otras actividades" value={api2.other_activities} />
            </div>
          ) : (
            <p className="text-sm text-zinc-600">Sin información de API 2.</p>
          )}
        </CollapsibleSection>
      ) : null}

      {subject.api_type === 3 ? (
        <CollapsibleSection
          title="API Tipo 3"
          open={openApi3}
          onToggle={() => setOpenApi3((v) => !v)}
        >
          {api3 ? (
            <div className="space-y-2 text-sm text-zinc-800">
              <InfoRow label="Objetivo del proyecto" value={api3.project_goal_students} />
              <InfoRow label="Entregables" value={api3.deliverables_at_end} />
              <InfoRow label="Rol esperado del estudiante" value={api3.expected_student_role} />
              <InfoRow label="Otras actividades" value={api3.other_activities} />
              <InfoRow label="Apoyo esperado de guía maestro" value={api3.master_guide_expected_support} />
            </div>
          ) : (
            <p className="text-sm text-zinc-600">Sin información de API 3.</p>
          )}
        </CollapsibleSection>
      ) : null}
    </section>
  )
}

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-zinc-50"
      >
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-zinc-900">{title}</span>
          <span className="text-xs text-zinc-500">{open ? 'Ocultar' : 'Mostrar'}</span>
        </div>
        <span className="text-lg text-zinc-500">{open ? '▾' : '▸'}</span>
      </button>
      {open ? <div className="border-t border-zinc-100 p-4 sm:p-6">{children}</div> : null}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: any }) {
  const display = value === undefined || value === null || value === '' ? '-' : value
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-sm text-zinc-900">{display}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
      <span className="text-sm text-zinc-900">{value || '-'}</span>
    </div>
  )
}

function phaseLabel(v: string) {
  const map: Record<string, string> = {
    inicio: 'Inicio',
    formulacion: 'Formulación',
    gestion: 'Gestión',
    validacion: 'Validación',
    completado: 'Completado',
  }
  return map[v] || v
}

function formatPeriod(subject: Subject) {
  if (subject.period_code) return subject.period_code
  const season = subject.period_season ? subject.period_season.toUpperCase() : ''
  const year = subject.period_year ? String(subject.period_year) : ''
  return [season, year].filter(Boolean).join('-') || 'Sin periodo'
}

function ManageUnitsView({ subject, onClose }: { subject: Subject; onClose: () => void }) {
  const [units, setUnits] = useState<SubjectUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedUnits, setExpandedUnits] = useState<Set<number>>(new Set())
  const [showInitDialog, setShowInitDialog] = useState(false)

  async function loadUnits() {
    setLoading(true)
    setError(null)
    try {
      const data = await listSubjectUnits(subject.id)
      setUnits(Array.isArray(data) ? data.sort((a, b) => a.number - b.number) : [])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar unidades'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUnits()
  }, [subject.id])

  function toggleUnit(unitId: number) {
    setExpandedUnits((prev) => {
      const next = new Set(prev)
      if (next.has(unitId)) {
        next.delete(unitId)
      } else {
        next.add(unitId)
      }
      return next
    })
  }

  const hasUnits = units.length > 0

  return (
    <section className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Gestionar unidades</h1>
          <p className="text-sm text-zinc-600">
            {subject.code}-{subject.section} — {subject.name}
          </p>
        </div>
        <div className="flex gap-2">
          {!loading && !hasUnits ? (
            <button
              onClick={() => setShowInitDialog(true)}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              Inicializar unidades
            </button>
          ) : null}
          <button
            onClick={onClose}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Cerrar
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-600">
          Cargando unidades…
        </div>
      ) : units.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center">
          <p className="text-sm text-zinc-600 mb-2">
            Esta asignatura aún no tiene unidades configuradas.
          </p>
          <p className="text-sm text-zinc-500">
            Haz clic en "Inicializar unidades" para comenzar.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {units.map((unit) => {
            const isExpanded = expandedUnits.has(unit.id)
            return (
              <div
                key={unit.id}
                className="overflow-hidden rounded-lg border border-zinc-200 bg-white transition hover:border-zinc-300"
              >
                <button
                  onClick={() => toggleUnit(unit.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-zinc-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base font-semibold text-zinc-900">Unidad {unit.number}</span>
                    {unit.expected_learning ? (
                      <span className="text-xs text-zinc-500">
                        {unit.expected_learning.substring(0, 60)}
                        {unit.expected_learning.length > 60 ? '...' : ''}
                      </span>
                    ) : (
                      <span className="text-xs italic text-zinc-400">Sin contenido</span>
                    )}
                  </div>
                  <span className="text-lg text-zinc-500">{isExpanded ? '▾' : '▸'}</span>
                </button>
                {isExpanded ? (
                  <div className="border-t border-zinc-100 p-4">
                    <UnitExpandedContent unit={unit} onSaved={loadUnits} />
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      {showInitDialog ? (
        <InitializeUnitsDialog
          subject={subject}
          onClose={() => setShowInitDialog(false)}
          onInitialized={async () => {
            await loadUnits()
            setShowInitDialog(false)
          }}
        />
      ) : null}
    </section>
  )
}

function InitializeUnitsDialog({
  subject,
  onClose,
  onInitialized,
}: {
  subject: Subject
  onClose: () => void
  onInitialized: () => void
}) {
  const [unitCount, setUnitCount] = useState<number>(4)
  const [confirmed, setConfirmed] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!confirmed) {
      toast.error('Debes confirmar para continuar')
      return
    }

    setCreating(true)
    setError(null)
    try {
      // Crear todas las unidades vacías
      const promises = []
      for (let i = 1; i <= unitCount; i++) {
        promises.push(
          createSubjectUnit({
            subject: subject.id,
            number: i,
            expected_learning: null,
            unit_hours: null,
            activities_description: null,
            evaluation_evidence: null,
            evidence_detail: null,
            counterpart_link: null,
            place_mode_type: null,
            counterpart_participant_name: null,
          })
        )
      }
      await Promise.all(promises)
      toast.success(`${unitCount} unidades creadas correctamente`)
      onInitialized()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al crear unidades'
      setError(msg)
      toast.error(msg)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Inicializar unidades</h2>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100">
            Cerrar
          </button>
        </div>

        {error ? (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-800">
            <strong>Importante:</strong> Una vez confirmado el número de unidades, no podrás modificarlo posteriormente.
            Solo podrás editar el contenido de cada unidad.
          </p>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-semibold text-zinc-700">
            ¿Cuántas unidades tendrá esta asignatura?
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((num) => (
              <button
                key={num}
                onClick={() => setUnitCount(num)}
                className={`rounded-md border px-4 py-2 text-sm font-medium transition ${
                  unitCount === num
                    ? 'border-red-600 bg-red-50 text-red-700'
                    : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-500">Las asignaturas pueden tener entre 1 y 4 unidades</p>
        </div>

        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-600"
            />
            <span className="text-sm text-zinc-700">
              Confirmo que esta asignatura tendrá <strong>{unitCount}</strong> {unitCount === 1 ? 'unidad' : 'unidades'}
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
          >
            Cancelar
          </button>
          <button
            disabled={!confirmed || creating}
            onClick={handleCreate}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {creating ? 'Creando...' : 'Crear unidades'}
          </button>
        </div>
      </div>
    </div>
  )
}

function UnitExpandedContent({ unit, onSaved }: { unit: SubjectUnit; onSaved: () => void }) {
  const [formData, setFormData] = useState({
    expected_learning: unit.expected_learning || '',
    unit_hours: unit.unit_hours ?? '',
    activities_description: unit.activities_description || '',
    evaluation_evidence: unit.evaluation_evidence || '',
    evidence_detail: unit.evidence_detail || '',
    counterpart_link: unit.counterpart_link || '',
    place_mode_type: unit.place_mode_type || '',
    counterpart_participant_name: unit.counterpart_participant_name || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await updateSubjectUnit(unit.id, {
        expected_learning: formData.expected_learning || null,
        unit_hours: formData.unit_hours === '' ? null : Number(formData.unit_hours),
        activities_description: formData.activities_description || null,
        evaluation_evidence: formData.evaluation_evidence || null,
        evidence_detail: formData.evidence_detail || null,
        counterpart_link: formData.counterpart_link || null,
        place_mode_type: formData.place_mode_type || null,
        counterpart_participant_name: formData.counterpart_participant_name || null,
      })
      toast.success('Unidad actualizada')
      onSaved()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al actualizar unidad'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}
      
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Aprendizaje esperado
          </label>
          <textarea
            value={formData.expected_learning}
            onChange={(e) => setFormData({ ...formData, expected_learning: e.target.value })}
            rows={3}
            placeholder="Describe el aprendizaje esperado de esta unidad..."
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Horas de la unidad
          </label>
          <input
            type="number"
            min="0"
            value={formData.unit_hours}
            onChange={(e) => setFormData({ ...formData, unit_hours: e.target.value === '' ? '' : e.target.value })}
            placeholder="0"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Lugar, modalidad y tipo de actividad
          </label>
          <input
            type="text"
            value={formData.place_mode_type}
            onChange={(e) => setFormData({ ...formData, place_mode_type: e.target.value })}
            placeholder="Ej: Presencial, Virtual, Híbrido..."
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Descripción general de actividades
          </label>
          <textarea
            value={formData.activities_description}
            onChange={(e) => setFormData({ ...formData, activities_description: e.target.value })}
            rows={3}
            placeholder="Describe las actividades que se realizarán en esta unidad..."
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Evidencia sistema de evaluación (descriptor de asignatura)
          </label>
          <textarea
            value={formData.evaluation_evidence}
            onChange={(e) => setFormData({ ...formData, evaluation_evidence: e.target.value })}
            rows={3}
            placeholder="Describe las evidencias que se evaluarán..."
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Detalle evidencia / entregable (esperado por la contraparte)
          </label>
          <textarea
            value={formData.evidence_detail}
            onChange={(e) => setFormData({ ...formData, evidence_detail: e.target.value })}
            rows={3}
            placeholder="Proporciona detalles adicionales sobre las evidencias..."
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Nombre participante contraparte
          </label>
          <input
            type="text"
            value={formData.counterpart_participant_name}
            onChange={(e) => setFormData({ ...formData, counterpart_participant_name: e.target.value })}
            placeholder="Nombre completo..."
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Vinculación directa con contraparte (N° semana y objetivo)
          </label>
          <input
            type="text"
            value={formData.counterpart_link}
            onChange={(e) => setFormData({ ...formData, counterpart_link: e.target.value })}
            placeholder="Numero de la semana y objetivo"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

function ManageProjectsView({
  subject,
  onClose,
}: {
  subject: Subject
  onClose: () => void
}) {
  const [projects, setProjects] = useState<(ProblemStatement & { company_name?: string })[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set())

  async function loadProjects() {
    setLoading(true)
    setError(null)
    setProjects([]) // Limpiar proyectos anteriores
    setExpandedProjects(new Set()) // Resetear secciones expandidas
    
    console.log('Cargando proyectos para asignatura:', subject.id, subject.code, subject.section)
    
    try {
      const data = await listProblemStatements({ subject: subject.id })
      console.log('Proyectos obtenidos:', data.length, data)
      
      // Cargar nombres de empresas
      const projectsWithCompanyNames = await Promise.all(
        data.map(async (project) => {
          let companyName = 'Empresa desconocida'
          if (project.company) {
            try {
              const company = await getCompany(project.company)
              companyName = company.name
            } catch (err) {
              console.error(`Error cargando empresa ${project.company}:`, err)
            }
          }
          return {
            ...project,
            company_name: companyName,
          }
        })
      )
      
      console.log('Proyectos con nombres de empresas:', projectsWithCompanyNames)
      setProjects(projectsWithCompanyNames)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar proyectos'
      console.error('Error al cargar proyectos:', e)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [subject.id])

  function toggleProject(projectId: number) {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

  return (
    <section className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Gestionar proyectos</h1>
          <p className="text-sm text-zinc-600">
            {subject.code}-{subject.section} — {subject.name}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Cerrar
        </button>
      </div>

      {error ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-600">
          Cargando proyectos…
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center">
          <p className="text-sm text-zinc-600">
            No hay proyectos asignados a esta asignatura.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const isExpanded = expandedProjects.has(project.id)
            return (
              <div
                key={project.id}
                className="overflow-hidden rounded-lg border border-zinc-200 bg-white transition hover:border-zinc-300"
              >
                <button
                  onClick={() => toggleProject(project.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-zinc-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base font-semibold text-zinc-900">{project.company_name || 'Empresa desconocida'}</span>
                    {project.problem_definition ? (
                      <span className="text-xs text-zinc-500">
                        {project.problem_definition.substring(0, 80)}
                        {project.problem_definition.length > 80 ? '...' : ''}
                      </span>
                    ) : (
                      <span className="text-xs italic text-zinc-400">Sin definición</span>
                    )}
                  </div>
                  <span className="text-lg text-zinc-500">{isExpanded ? '▾' : '▸'}</span>
                </button>
                {isExpanded ? (
                  <div className="border-t border-zinc-100 p-4">
                    <ProjectExpandedContent project={project} />
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function ProjectExpandedContent({ project }: { project: ProblemStatement }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600">
          Problema a abordar
        </label>
        <p className="text-sm text-zinc-800">{project.problem_to_address || '-'}</p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600">
          ¿Por qué es importante?
        </label>
        <p className="text-sm text-zinc-800">{project.why_important || '-'}</p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600">
          Stakeholders
        </label>
        <p className="text-sm text-zinc-800">{project.stakeholders || '-'}</p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600">
          Área relacionada
        </label>
        <p className="text-sm text-zinc-800">{project.related_area || '-'}</p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600">
          Beneficios (corto, mediano y largo plazo)
        </label>
        <p className="text-sm text-zinc-800">{project.benefits_short_medium_long_term || '-'}</p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600">
          Definición del problema
        </label>
        <p className="text-sm text-zinc-800">{project.problem_definition || '-'}</p>
      </div>
    </div>
  )
}
