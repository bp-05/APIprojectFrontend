import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { getSubject, updateSubject, listCompanyRequirements, type CompanyRequirement, type Subject } from '../../api/subjects'
import { listDocentes, type User as AppUser, getTeacher } from '../../api/users'
import { listProblemStatements, getCompany, type ProblemStatement } from '../../api/companies'
import { nameCase } from '../../lib/strings'

export default function AsignaturaCoordDetalle() {
  const { id } = useParams()
  const subjectId = Number(id)
  const navigate = useNavigate()

  const [subject, setSubject] = useState<Subject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [teacher, setTeacher] = useState<AppUser | null>(null)
  const [teacherError, setTeacherError] = useState<string | null>(null)
  const [editingTeacher, setEditingTeacher] = useState(false)
  const [teachers, setTeachers] = useState<AppUser[]>([])
  const [teacherSel, setTeacherSel] = useState<number | ''>('')

  const [companyId, setCompanyId] = useState<number | null>(null)
  const [companyName, setCompanyName] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function fetchAll() {
      setLoading(true)
      setError(null)
      try {
        const [s, probs, reqs] = await Promise.all([
          getSubject(subjectId),
          listProblemStatements({ subject: subjectId }),
          listCompanyRequirements(),
        ])
        if (!mounted) return
        setSubject(s)

        let compId: number | null = null
        if (Array.isArray(probs) && probs.length > 0) compId = probs[0].company
        else if (Array.isArray(reqs) && reqs.length > 0) {
          const r = (reqs as CompanyRequirement[]).find((r) => r.subject === subjectId)
          if (r) compId = r.company
        }
        setCompanyId(compId)
        if (compId) {
          try {
            const c = await getCompany(compId)
            if (mounted) setCompanyName(c.name)
          } catch {
            if (mounted) setCompanyName(null)
          }
        } else {
          setCompanyName(null)
        }

        if (s.teacher) {
          try {
            const t = await getTeacher(s.teacher)
            if (mounted) setTeacher(t)
          } catch {
            if (mounted) setTeacher(null)
          }
        } else {
          setTeacher(null)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'No se pudo cargar la información'
        setError(msg)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    if (!Number.isFinite(subjectId)) {
      setError('ID de asignatura inválido')
      setLoading(false)
      return
    }
    fetchAll()
    return () => { mounted = false }
  }, [id])

  async function startEditTeacher() {
    setTeacherError(null)
    setEditingTeacher(true)
    try {
      const data = await listDocentes()
      setTeachers(data)
      setTeacherSel(subject?.teacher ?? '')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudieron cargar docentes'
      setTeacherError(msg)
    }
  }

  async function saveTeacher() {
    if (!subject) return
    setTeacherError(null)
    try {
      await updateSubject(subject.id, { teacher: teacherSel === '' ? null : Number(teacherSel) })
      const s = await getSubject(subject.id)
      setSubject(s)
      if (s.teacher) {
        try {
          const t = await getTeacher(s.teacher)
          setTeacher(t)
        } catch {
          setTeacher(null)
        }
      } else {
        setTeacher(null)
      }
      setEditingTeacher(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo guardar el docente'
      setTeacherError(msg)
    }
  }

  async function removeTeacher() {
    if (!subject) return
    setTeacherError(null)
    try {
      await updateSubject(subject.id, { teacher: null })
      const s = await getSubject(subject.id)
      setSubject(s)
      setTeacher(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo eliminar el docente'
      setTeacherError(msg)
    }
  }

  return (
    <section className="p-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Detalle de asignatura</h1>
          {subject ? (
            <p className="text-sm text-zinc-600">{subject.name} — {subject.code}-{subject.section}</p>
          ) : null}
        </div>
        <Link to="/coord/asignaturas" className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50">Volver</Link>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="text-sm text-zinc-600">Cargando…</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <Th>Docente</Th>
                  <Th>Asignatura</Th>
                  <Th>Empresa</Th>
                  <Th className="text-right">Acciones</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {subject ? (
                  <tr className="hover:bg-zinc-50">
                    <Td>
                      {subject.teacher ? (
                        <>
                          <div className="font-medium">{nameCase(subject.teacher_name || '')}</div>
                          <div className="text-xs text-zinc-600">{teacher?.email || '-'}</div>
                          <div className="mt-2 flex gap-2">
                            <button onClick={() => startEditTeacher()} className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50">Editar</button>
                            <button onClick={() => removeTeacher()} className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700">Eliminar</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-zinc-600">Sin docente asignado</div>
                          <div className="mt-2">
                            <button onClick={() => startEditTeacher()} className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700">Agregar docente</button>
                          </div>
                        </>
                      )}
                    </Td>
                    <Td>
                      <div className="text-sm">{subject.name}</div>
                      <div className="text-xs text-zinc-500">{subject.code}-{subject.section}</div>
                    </Td>
                    <Td>{companyName || '-'}</Td>
                    <Td className="text-right">
                      <button
                        onClick={() => companyId && navigate(`/coord/asignaturas/${subject.id}/empresa/${companyId}`)}
                        disabled={!companyId}
                        className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        Ver Empresa
                      </button>
                    </Td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {editingTeacher && subject ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <EditTeacherPanel
                currentId={subject.teacher ?? null}
                teachers={teachers}
                selected={teacherSel}
                onChangeSelected={setTeacherSel}
                onCancel={() => setEditingTeacher(false)}
                onSave={() => saveTeacher()}
              />
            </div>
          ) : null}
        </div>
      )}
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

function EditTeacherPanel({ currentId, teachers, selected, onChangeSelected, onCancel, onSave }: {
  currentId: number | null
  teachers: AppUser[]
  selected: number | ''
  onChangeSelected: (v: number | '') => void
  onCancel: () => void
  onSave: () => void
}) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    if (!search) return teachers
    const q = search.toLowerCase()
    return teachers.filter((u) => [u.email, u.first_name, u.last_name].some((v) => String(v || '').toLowerCase().includes(q)))
  }, [teachers, search])

  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <div className="mb-2 grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-zinc-700">Buscar docente</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" placeholder="Nombre o correo" />
        </div>
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-zinc-700">Docentes</label>
          <select
            value={selected === '' ? '' : Number(selected)}
            onChange={(e) => onChangeSelected(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            size={6}
          >
            <option value="">Seleccione…</option>
            {currentId && !teachers.some((u) => u.id === currentId) ? (
              <option value={currentId}>Docente #{currentId}</option>
            ) : null}
            {filtered.map((u) => (
              <option key={u.id} value={u.id}>
                {nameCase(`${u.first_name} ${u.last_name}`)} — {u.email}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50">Cancelar</button>
        <button type="button" onClick={onSave} className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">Guardar</button>
      </div>
    </div>
  )
}
