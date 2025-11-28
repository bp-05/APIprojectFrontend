import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { createSubject, listSubjects, updateSubject, type Subject, listAreas, listSemesters, type Area, type SemesterLevel, uploadDescriptor, processDescriptor, type Descriptor, listDescriptorsBySubject, listCareers, type Career, getSubject } from '../api/subjects'
import { listDocentes, type User as AppUser } from '../api/users'
import { nameCase } from '../lib/strings'
import { toast } from '../lib/toast'
import { usePeriodStore } from '../store/period'
import { useAuth } from '../store/auth'
import { apiBaseUrl } from '../lib/env'

export default function Asignaturas() {
  const periodSeason = usePeriodStore((state) => state.season)
  const periodYear = usePeriodStore((state) => state.year)
  const accessToken = useAuth((state) => state.accessToken)
  const [items, setItems] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [createMode, setCreateMode] = useState<'none' | 'choose' | 'manual' | 'auto'>('none')
  const navigate = useNavigate()
  const upsertSubject = useCallback((subject: Subject) => {
    setItems((prev) => {
      if (!prev || prev.length === 0) return [subject]
      const index = prev.findIndex((entry) => entry.id === subject.id)
      if (index === -1) {
        const next = [...prev, subject]
        next.sort(compareSubjectsByCodeSection)
        return next
      }
      const next = prev.slice()
      next[index] = subject
      return next
    })
  }, [])
  const removeSubject = useCallback((subjectId: number) => {
    setItems((prev) => prev.filter((entry) => entry.id !== subjectId))
  }, [])

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

  useEffect(() => {
    if (!accessToken) return
    const expectedSeason = (periodSeason || '').toUpperCase()
    let cancelled = false
    let retryHandle: ReturnType<typeof setTimeout> | null = null
    let controller: AbortController | null = null

    async function syncSubject(subjectId: number) {
      try {
        const subject = await getSubject(subjectId)
        if (cancelled || !subject) return
        const subjectSeason = (subject.period_season || '').toUpperCase()
        if (subject.period_year !== periodYear || subjectSeason !== expectedSeason) {
          removeSubject(subject.id)
          return
        }
        upsertSubject(subject)
      } catch {
        // Ignorar errores de permisos o subjects inexistentes
      }
    }

    const handleMessage = (data: string) => {
      if (cancelled) return
      try {
        const payload = JSON.parse(data || '{}')
        const subjectId = Number(payload.subject_id)
        if (!subjectId) return
        const eventType = String(payload.event || '').toLowerCase()
        const payloadYear = typeof payload.period_year === 'number' ? payload.period_year : null
        const payloadSeason = typeof payload.period_season === 'string' ? payload.period_season.toUpperCase() : null
        const matchesPeriod =
          payloadYear === null ||
          (payloadYear === periodYear && (!payloadSeason || payloadSeason === expectedSeason))
        if (!matchesPeriod) {
          if (eventType === 'deleted') {
            removeSubject(subjectId)
          }
          return
        }
        if (eventType === 'deleted') {
          removeSubject(subjectId)
          return
        }
        if (eventType === 'descriptor_processed') {
          const code =
            payload.code ||
            payload.subject_code ||
            (typeof payload.subject === 'object' && payload.subject?.code) ||
            null
          const label = code ? `Asignatura ${code}` : 'Asignatura'
          toast.success(`${label} procesada exitosamente.`)
        }
        void syncSubject(subjectId)
      } catch {
        // Ignorar payload inválido
      }
    }

    const handleError = () => {
      if (cancelled) return
      if (controller) {
        controller.abort()
        controller = null
      }
      retryHandle = window.setTimeout(connect, 5000)
    }

    async function connect() {
      if (cancelled || !accessToken) return
      const baseUrl = apiBaseUrl()
      const normalized = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
      const url = `${normalized}/subjects/stream/?token=${encodeURIComponent(accessToken)}`
      
      try {
        controller = new AbortController()
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        })
        
        if (!response.ok) {
          handleError()
          return
        }

        const reader = response.body?.getReader()
        if (!reader) {
          handleError()
          return
        }

        const decoder = new TextDecoder()
        let buffer = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            if (cancelled) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data) handleMessage(data)
              }
            }
          }
        } catch {
          if (!cancelled) handleError()
        }
      } catch {
        if (!cancelled) retryHandle = window.setTimeout(connect, 5000)
      }
    }

    connect()

    return () => {
      cancelled = true
      if (retryHandle) window.clearTimeout(retryHandle)
      if (controller) controller.abort()
    }
  }, [accessToken, periodSeason, periodYear, removeSubject, upsertSubject])

  const filtered = useMemo(() => {
    if (!search) return items
    const q = search.toLowerCase()
    return items.filter((s) =>
      [
        s.code,
        s.section,
        s.name,
        s.campus,
        s.area_name || '',
        s.career_name || '',
        s.semester_name || '',
      ].some((v) => String(v || '').toLowerCase().includes(q))
    )
  }, [items, search])

  const handleRowClick = useCallback(
    (event: React.MouseEvent<HTMLTableRowElement>, subjectId: number) => {
      const target = event.target as HTMLElement
      if (target.closest('button, a, input, select, textarea, [role="button"]')) return
      navigate(`/asignaturas/${subjectId}`)
    },
    [navigate]
  )

  return (
    <section className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Asignaturas</h1>
          <p className="text-sm text-zinc-600">Gestión de asignaturas (solo entidad principal)</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, sección o nombre…"
            className="w-72 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
          <button
            onClick={() => setCreateMode('choose')}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Nueva asignatura
          </button>
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
              <Th>Periodo</Th>
              <Th>Nombre</Th>
              <Th>Área</Th>
              <Th>Carrera</Th>
              <Th>Docente</Th>
              <Th className="text-right">Total estudiantes</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {loading ? (
              <tr>
                <td className="p-4 text-sm text-zinc-600" colSpan={9}>Cargando…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="p-4 text-sm text-zinc-600" colSpan={9}>Sin resultados</td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr
                  key={s.id}
                  className="cursor-pointer hover:bg-zinc-50"
                  onClick={(event) => handleRowClick(event, s.id)}
                >
                  <Td>
                    <DescriptorCell subject={s} onChanged={load} />
                  </Td>
                  <Td>{s.code}</Td>
                  <Td>{s.section}</Td>
                  <Td>{s.period_code || `${s.period_season}-${s.period_year}`}</Td>
                  <Td>{s.name}</Td>
                  <Td>{s.area_name}</Td>
                  <Td>
                    {s.career ? (
                      s.career_name || '-'
                    ) : (
                      <AssignCareerButton subject={s} onAssigned={load} />
                    )}
                  </Td>
                  <Td>
                    {s.teacher ? (
                      s.teacher_name || '-'
                    ) : (
                      <AssignButton subject={s} onAssigned={load} />
                    )}
                  </Td>
                  <Td className="text-right">
                    {typeof s.total_students === 'number' ? s.total_students : '-'}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {createMode === 'choose' ? (
        <CreateSubjectModeDialog
          onManual={() => setCreateMode('manual')}
          onAuto={() => setCreateMode('auto')}
          onClose={() => setCreateMode('none')}
        />
      ) : null}

      {createMode === 'manual' ? (
        <CreateSubjectDialog
          onClose={() => setCreateMode('none')}
          onCreated={async () => {
            setCreateMode('none')
            await load()
          }}
        />
      ) : null}

      {createMode === 'auto' ? (
        <UploadDescriptorAutoDialog
          onClose={() => setCreateMode('none')}
          onUploaded={() => {
            setCreateMode('none')
          }}
        />
      ) : null}

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

function AssignCareerButton({ subject, onAssigned }: { subject: Subject; onAssigned: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50"
      >
        Asignar
      </button>
      {open ? (
        <AssignCareerDialog
          subject={subject}
          onClose={() => setOpen(false)}
          onAssigned={async () => {
            setOpen(false)
            await onAssigned()
          }}
        />
      ) : null}
    </>
  )
}

function AssignCareerDialog({ subject, onClose, onAssigned }: { subject: Subject; onClose: () => void; onAssigned: () => void }) {
  const [careers, setCareers] = useState<Career[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    listCareers()
      .then((data) => {
        if (!mounted) return
        // sugerencia: priorizar carreras del área de la asignatura
        const sameArea = data.filter((c) => c.area === subject.area)
        const others = data.filter((c) => c.area !== subject.area)
        setCareers([...sameArea, ...others])
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [subject.area])

  const filtered = useMemo(() => {
    if (!search) return careers
    const q = search.toLowerCase()
    return careers.filter((c) => [c.name, c.area_name || ''].some((v) => String(v || '').toLowerCase().includes(q)))
  }, [careers, search])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (selected === '') {
        setLoading(false)
        setError('Seleccione una carrera')
        return
      }
      await updateSubject(subject.id, { career: Number(selected) })
      toast.success('Carrera asignada')
      await onAssigned()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al asignar carrera'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Asignar carrera</h2>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100">Cerrar</button>
        </div>
        {error ? (
          <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}
        <form className="grid grid-cols-2 gap-3" onSubmit={onSubmit}>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-700">Buscar</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" placeholder="Nombre o área…" />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-700">Carreras disponibles</label>
            <select value={selected} onChange={(e) => setSelected(e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" size={6}>
              <option value="">Seleccione…</option>
              {filtered.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.area_name ? `— ${c.area_name}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50">Cancelar</button>
            <button type="submit" disabled={loading} className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-60">{loading ? 'Asignando…' : 'Asignar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}


function CreateSubjectDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [code, setCode] = useState('')
  const [section, setSection] = useState('1')
  const [name, setName] = useState('')
  const [hours, setHours] = useState<number | ''>('')
  const [totalStudents, setTotalStudents] = useState<number | ''>('')
  const [apiType, setApiType] = useState<number | ''>('')
  const [campus, setCampus] = useState('Chillán')
  const [shift, setShift] = useState<'diurna' | 'vespertina'>('diurna')
  const [area, setArea] = useState<number | ''>('')
  const [semester, setSemester] = useState<number | ''>('')
  const [areas, setAreas] = useState<Area[]>([])
  const [semesters, setSemesters] = useState<SemesterLevel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const periodSeason = usePeriodStore((s) => s.season)
  const periodYear = usePeriodStore((s) => s.year)

  useEffect(() => {
    let mounted = true
    Promise.all([listAreas(), listSemesters()])
      .then(([a, s]) => {
        if (!mounted) return
        setAreas(a)
        setSemesters(s)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (!code || !section || !name || hours === '' || apiType === '' || area === '' || semester === '') {
        setLoading(false)
        setError('Complete todos los campos')
        return
      }
      await createSubject({
        code,
        section,
        name,
        hours: Number(hours),
        total_students: totalStudents === '' ? null : Number(totalStudents),
        api_type: Number(apiType),
        campus,
        shift,
        area: Number(area),
        semester: Number(semester),
        period_season: periodSeason,
        period_year: periodYear,
      })
      toast.success('Asignatura creada')
      await onCreated()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al crear asignatura'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Nueva asignatura</h2>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100">Cerrar</button>
        </div>
        {error ? (
          <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}
        <form className="grid grid-cols-2 gap-3" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Código</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Sección</label>
            <input value={section} onChange={(e) => setSection(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-700">Nombre</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Campus</label>
            <input value={campus} onChange={(e) => setCampus(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Jornada</label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value as 'diurna' | 'vespertina')}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            >
              <option value="diurna">Diurna</option>
              <option value="vespertina">Vespertina</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Horas</label>
            <input type="number" value={hours} onChange={(e) => setHours(e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Total estudiantes (opcional)</label>
            <input
              type="number"
              min={0}
              value={totalStudents}
              onChange={(e) => setTotalStudents(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Tipo API</label>
            <select value={apiType} onChange={(e) => setApiType(e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10">
              <option value="">Seleccione…</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Área</label>
            <select value={area} onChange={(e) => setArea(e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10">
              <option value="">Seleccione…</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Semestre</label>
            <select value={semester} onChange={(e) => setSemester(e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10">
              <option value="">Seleccione…</option>
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50">Cancelar</button>
            <button type="submit" disabled={loading} className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-60">{loading ? 'Creando…' : 'Crear'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function EditSubjectDialog({ subject, onClose, onSaved }: { subject: Subject; onClose: () => void; onSaved: () => void }) {
  const [code, setCode] = useState(subject.code)
  const [section, setSection] = useState(subject.section)
  const [name, setName] = useState(subject.name)
  const [campus, setCampus] = useState(subject.campus)
  const [shift, setShift] = useState<'diurna' | 'vespertina'>((subject.shift as 'diurna' | 'vespertina') || 'diurna')
  const [hours, setHours] = useState<number | ''>(subject.hours)
  const [totalStudents, setTotalStudents] = useState<number | ''>(subject.total_students ?? '')
  const [apiType, setApiType] = useState<number | ''>(subject.api_type)
  const [area, setArea] = useState<number | ''>(subject.area)
  const [semester, setSemester] = useState<number | ''>(subject.semester)
  const [career, setCareer] = useState<number | ''>(subject.career ?? '')
  const [areas, setAreas] = useState<Area[]>([])
  const [semesters, setSemesters] = useState<SemesterLevel[]>([])
  const [careers, setCareers] = useState<Career[]>([])
  const [teachers, setTeachers] = useState<AppUser[]>([])
  const [teacherSel, setTeacherSel] = useState<number | ''>(subject.teacher ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    Promise.all([listAreas(), listSemesters(), listCareers(), listDocentes({ onlyActive: true })])
      .then(([a, s, c, t]) => {
        if (!mounted) return
        setAreas(a)
        setSemesters(s)
        setCareers(c)
        setTeachers(t)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (!code || !section || !name || hours === '' || apiType === '' || area === '' || semester === '') {
        setLoading(false)
        setError('Complete todos los campos')
        return
      }
      await updateSubject(subject.id, {
        code,
        section,
        name,
        campus,
        shift,
        hours: Number(hours),
        total_students: totalStudents === '' ? null : Number(totalStudents),
        api_type: Number(apiType),
        career: career === '' ? null : Number(career),
        area: Number(area),
        semester: Number(semester),
        teacher: teacherSel === '' ? null : Number(teacherSel),
      })
      toast.success('Asignatura actualizada')
      await onSaved()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al actualizar asignatura'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Editar asignatura</h2>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100">Cerrar</button>
        </div>
        {error ? (
          <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}
        <form className="grid grid-cols-2 gap-3" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Código</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Sección</label>
            <input value={section} onChange={(e) => setSection(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-700">Nombre</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Campus</label>
            <input value={campus} onChange={(e) => setCampus(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Jornada</label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value as 'diurna' | 'vespertina')}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            >
              <option value="diurna">Diurna</option>
              <option value="vespertina">Vespertina</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Horas</label>
            <input type="number" value={hours} onChange={(e) => setHours(e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Total estudiantes (opcional)</label>
            <input
              type="number"
              min={0}
              value={totalStudents}
              onChange={(e) => setTotalStudents(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Tipo API</label>
            <select value={apiType} onChange={(e) => setApiType(e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10">
              <option value="">Seleccione…</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Semestre</label>
            <select value={semester} onChange={(e) => setSemester(e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10">
              <option value="">Seleccione…</option>
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-700">Docente</label>
            <div className="flex items-center gap-2">
              <select
                value={teacherSel === '' ? '' : Number(teacherSel)}
                onChange={(e) => setTeacherSel(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
              >
                <option value="">Sin docente</option>
                {teacherSel !== '' && subject.teacher && !teachers.some((u) => u.id === subject.teacher) ? (
                  <option value={subject.teacher}>
                    {subject.teacher_name || `Docente #${subject.teacher}`}
                  </option>
                ) : null}
                {teachers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {nameCase(`${u.first_name} ${u.last_name}`)} ({u.email})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setTeacherSel('')}
                className="shrink-0 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50"
                title="Quitar docente"
              >
                Quitar
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Área</label>
            <select value={area} onChange={(e) => setArea(e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10">
              <option value="">Seleccione…</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Carrera</label>
            <select value={career} onChange={(e) => setCareer(e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10">
              <option value="">Sin carrera</option>
              {careers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50">Cancelar</button>
            <button type="submit" disabled={loading} className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-60">{loading ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
function AssignButton({ subject, onAssigned }: { subject: Subject; onAssigned: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50"
      >
        Asignar
      </button>
      {open ? (
        <AssignTeacherDialog
          subject={subject}
          onClose={() => setOpen(false)}
          onAssigned={async () => {
            setOpen(false)
            await onAssigned()
          }}
        />
      ) : null}
    </>
  )
}

function AssignTeacherDialog({ subject, onClose, onAssigned }: { subject: Subject; onClose: () => void; onAssigned: () => void }) {
  const [teachers, setTeachers] = useState<AppUser[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    listDocentes({ onlyActive: true })
      .then((data) => mounted && setTeachers(data))
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  const filtered = useMemo(() => {
    if (!search) return teachers
    const q = search.toLowerCase()
    return teachers.filter((u) => [u.email, u.first_name, u.last_name].some((v) => String(v || '').toLowerCase().includes(q)))
  }, [teachers, search])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (selected === '') {
        setLoading(false)
        setError('Seleccione un docente')
        return
      }
      await updateSubject(subject.id, { teacher: Number(selected) })
      toast.success('Docente asignado')
      await onAssigned()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al asignar docente'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Asignar docente</h2>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100">Cerrar</button>
        </div>
        {error ? (
          <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}
        <form className="grid grid-cols-2 gap-3" onSubmit={onSubmit}>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-700">Buscar</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" placeholder="Nombre o correo…" />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-700">Docentes disponibles</label>
            <select value={selected} onChange={(e) => setSelected(e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" size={6}>
              <option value="">Seleccione…</option>
              {filtered.map((u) => (
                <option key={u.id} value={u.id}>
                  {nameCase(`${u.first_name} ${u.last_name}`)} ({u.email})
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50">Cancelar</button>
            <button type="submit" disabled={loading} className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-60">{loading ? 'Asignando…' : 'Asignar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
function DescriptorCell({ subject, onChanged }: { subject: Subject; onChanged: () => void }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Descriptor[] | null>(null)
  const pollRef = useRef<any>(null)

  async function refreshDescriptors(): Promise<Descriptor[]> {
    try {
      const data = await listDescriptorsBySubject(subject.id)
      const filtered = Array.isArray(data) ? data.filter((d) => d.subject === subject.id) : []
      setItems(filtered)
      return filtered
    } catch {
      setItems([])
      return []
    }
  }

  useEffect(() => {
    let mounted = true
    listDescriptorsBySubject(subject.id)
      .then((data) => {
        if (!mounted) return
        // Asegura filtrar por asignatura por si el backend no procesa el parámetro
        const filtered = Array.isArray(data) ? data.filter((d) => d.subject === subject.id) : []
        setItems(filtered)
      })
      .catch(() => { if (mounted) setItems([]) })
    return () => { mounted = false }
  }, [subject.id])

  // Refresh once when dialog closes (after upload)
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => { void refreshDescriptors() }, 600)
      return () => clearTimeout(t)
    }
  }, [open])

  // Poll until descriptor is processed
  useEffect(() => {
    if (!items || items.length === 0) return
    const hasPending = items.some((d) => !d.processed_at)
    if (!hasPending) {
      if (pollRef.current) { clearInterval(pollRef.current as any); pollRef.current = null }
      return
    }
    if (pollRef.current) return
    const started = Date.now()
    pollRef.current = setInterval(async () => {
      const latest = await refreshDescriptors()
      const pending = latest.some((d) => !d.processed_at)
      const timeout = Date.now() - started > 120000
      if (!pending || timeout) {
        clearInterval(pollRef.current as any)
        pollRef.current = null
        if (!pending) {
          try { await onChanged() } catch {}
        }
      }
    }, 5000) as any
    return () => { if (pollRef.current) { clearInterval(pollRef.current as any); pollRef.current = null } }
  }, [items, onChanged])

  const hasDescriptor = !!items && items.length > 0
  const last: Descriptor | undefined = hasDescriptor ? items![items!.length - 1] : undefined

  if (items === null) {
    return <span className="inline-block h-3 w-3 rounded-sm bg-zinc-300 animate-pulse" title="Cargando…" />
  }

  if (hasDescriptor && last) {
    const url = last.file
    return (
      <div className="flex items-center gap-2">
        <span title={last.processed_at ? 'Procesado' : 'Pendiente'} className={`inline-block h-3 w-3 rounded-sm ${last.processed_at ? 'bg-green-600' : 'bg-zinc-400'}`} />
        <a href={url} target="_blank" rel="noreferrer" className="text-xs text-red-700 hover:underline">Ver</a>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-zinc-400 text-zinc-600 hover:bg-zinc-50"
        title="Subir descriptor (PDF)"
      >
        +
      </button>
      {open ? (
        <UploadDescriptorDialog
          subject={subject}
          onClose={() => setOpen(false)}
          onUploaded={async () => {
            setOpen(false)
            await onChanged()
          }}
        />
      ) : null}
    </>
  )
}

function UploadDescriptorDialog({ subject, onClose, onUploaded }: { subject: Subject; onClose: () => void; onUploaded: () => void }) {
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
      // Backend actual: firma uploadDescriptor(file, subjectId?)
      const d = await uploadDescriptor(file, subject.id)
      toast.success('Descriptor subido')
      // Disparar procesamiento asíncrono
      try {
        await processDescriptor(d.id)
        toast.success('Procesamiento iniciado')
      } catch (_) {
        // ignorar si falla el disparo; el archivo ya quedó subido
      }
      await onUploaded()
    } catch (e: any) {
      // Mostrar mensaje devuelto por el backend si existe
      const backendMsg =
        (e?.response?.data && (e.response.data.detail || e.response.data.error)) ||
        (typeof e?.response?.data === 'string' ? e.response.data : null)
      const msg = backendMsg || (e instanceof Error ? e.message : 'Error al subir descriptor')
      setError(String(msg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg">
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
                e.preventDefault(); setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault(); setDragOver(false)
                const f = e.dataTransfer.files?.[0]; if (f) setFile(f)
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
            <button type="submit" disabled={loading} className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-60">{loading ? 'Subiendo…' : 'Subir'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
function CreateSubjectModeDialog({ onManual, onAuto, onClose }: { onManual: () => void; onAuto: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Nueva asignatura</h2>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100">Cerrar</button>
        </div>
        <p className="mb-4 text-sm text-zinc-700">Elige cómo crear la asignatura:</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onManual} className="rounded-md border border-zinc-300 bg-white px-3 py-3 text-sm hover:bg-zinc-50">Manual</button>
          <button onClick={onAuto} className="rounded-md bg-red-600 px-3 py-3 text-sm font-medium text-white hover:bg-red-700">Automática</button>
        </div>
        <p className="mt-3 text-xs text-zinc-500">Automática: sube un descriptor (PDF) y el sistema completará la asignatura con IA.</p>
      </div>
    </div>
  )
}

function UploadDescriptorAutoDialog({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const autoFileInputRef = useRef<HTMLInputElement | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!file) {
      setError('Seleccione un archivo PDF')
      return
    }
    const name = file.name.toLowerCase()
    if (!name.endsWith('.pdf')) {
      setError('El archivo debe ser PDF')
      return
    }
    try {
      setLoading(true)
      const descriptor = await uploadDescriptor(file, null)
      toast.success('Descriptor subido; procesaremos la asignatura automáticamente.')
      try {
        await processDescriptor(descriptor.id)
      } catch {}
      onClose()
      await onUploaded()
    } catch (e: any) {
      const backendMsg =
        (e?.response?.data && (e.response.data.detail || e.response.data.error)) ||
        (typeof e?.response?.data === 'string' ? e.response.data : null)
      const msg = backendMsg || (e instanceof Error ? e.message : 'Error al subir descriptor')
      setError(String(msg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Crear automática desde descriptor</h2>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100">Cerrar</button>
        </div>
        {error ? (
          <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}
        <form className="space-y-3" onSubmit={onSubmit}>
          <div>
            <input
              ref={autoFileInputRef as any}
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <div
              onClick={() => {
                (autoFileInputRef as any)?.current?.click()
              }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault(); setDragOver(false)
                const f = e.dataTransfer.files?.[0]; if (f) setFile(f)
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
              <p className="text-xs text-zinc-500">Solo archivos PDF. El sistema creará la asignatura automáticamente.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50">Cancelar</button>
            <button type="submit" disabled={loading} className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-60">{loading ? 'Subiendo…' : 'Subir y procesar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function compareSubjectsByCodeSection(a: Subject, b: Subject) {
  const codeCompare = a.code.localeCompare(b.code, 'es', { sensitivity: 'base', numeric: true })
  if (codeCompare !== 0) return codeCompare
  return String(a.section).localeCompare(String(b.section), 'es', { sensitivity: 'base', numeric: true })
}
