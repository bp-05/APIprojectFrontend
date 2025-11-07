import { useEffect, useMemo, useState } from 'react'
import { listDocentes, type User as AppUser } from '../../api/users'
import { listSubjectCodeSections, type BasicSubject, updateSubject } from '../../api/subjects'
import { nameCase } from '../../lib/strings'
import { toast } from 'react-hot-toast'

export default function DocentesCoord() {
  const [teachers, setTeachers] = useState<AppUser[]>([])
  const [subjects, setSubjects] = useState<BasicSubject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [teacherSel, setTeacherSel] = useState<number | ''>('')
  const [codeSel, setCodeSel] = useState<string>('')
  const [sectionSel, setSectionSel] = useState<string>('')

  const [searchTeacher, setSearchTeacher] = useState('')
  const [searchCode, setSearchCode] = useState('')
  const [showForm, setShowForm] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [t, s] = await Promise.all([listDocentes(), listSubjectCodeSections()])
      setTeachers(t)
      setSubjects(s)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar datos'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const teacherOptions = useMemo(() => {
    const data = !searchTeacher
      ? teachers
      : teachers.filter((u) => [u.email, u.first_name, u.last_name].some((v) => String(v || '').toLowerCase().includes(searchTeacher.toLowerCase())))
    return data.sort((a, b) => nameCase(`${a.first_name} ${a.last_name}`).localeCompare(nameCase(`${b.first_name} ${b.last_name}`)))
  }, [teachers, searchTeacher])

  const uniqueCodes = useMemo(() => {
    const codes = Array.from(new Set(subjects.map((s) => s.code)))
    const filtered = !searchCode ? codes : codes.filter((c) => c.toLowerCase().includes(searchCode.toLowerCase()))
    return filtered.sort()
  }, [subjects, searchCode])

  const sectionsForCode = useMemo(() => {
    if (!codeSel) return []
    return subjects.filter((s) => s.code === codeSel).map((s) => s.section)
  }, [subjects, codeSel])

  const subjectIdSelected = useMemo(() => {
    if (!codeSel || !sectionSel) return null
    const found = subjects.find((s) => s.code === codeSel && s.section === sectionSel)
    return found?.id ?? null
  }, [subjects, codeSel, sectionSel])

  async function assign() {
    setError(null)
    if (teacherSel === '' || !subjectIdSelected) {
      setError('Seleccione docente, asignatura y sección')
      return
    }
    setLoading(true)
    try {
      await updateSubject(subjectIdSelected, { teacher: Number(teacherSel) })
      setTeacherSel('')
      setCodeSel('')
      setSectionSel('')
      toast.success('Docente asignado')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo asignar docente'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="p-6">
      <div className="mb-2">
        <h1 className="text-xl font-semibold">Docentes</h1>
        <p className="text-sm text-zinc-600">Asignar docentes a nuevos proyectos (asignatura + sección)</p>
      </div>

      <div className="mb-5 flex items-center gap-2">
        <button className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white">Docentes</button>
      </div>

      {error ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      {!showForm ? (
        <div className="flex items-center justify-center py-16">
          <button
            onClick={() => setShowForm(true)}
            aria-label="Agregar"
            title="Agregar asignación"
            className="flex h-14 w-14 items-center justify-center rounded-full border border-zinc-300 bg-white text-2xl text-red-600 hover:bg-zinc-50"
          >
            +
          </button>
        </div>
      ) : (
      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="mb-2 text-sm font-semibold text-zinc-800">1. Seleccionar docente</div>
          <label className="mb-1 block text-xs font-medium text-zinc-700">Buscar</label>
          <input value={searchTeacher} onChange={(e) => setSearchTeacher(e.target.value)} className="mb-2 w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" placeholder="Nombre o correo" />
          <select
            value={teacherSel === '' ? '' : Number(teacherSel)}
            onChange={(e) => setTeacherSel(e.target.value === '' ? '' : Number(e.target.value))}
            className="h-40 w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
            size={8}
          >
            <option value="">Seleccione…</option>
            {teacherOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {nameCase(`${u.first_name} ${u.last_name}`)} — {u.email}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="mb-2 text-sm font-semibold text-zinc-800">2. Seleccionar asignatura</div>
          <label className="mb-1 block text-xs font-medium text-zinc-700">Buscar por código</label>
          <input value={searchCode} onChange={(e) => setSearchCode(e.target.value)} className="mb-2 w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" placeholder="Código" />
          <label className="mb-1 block text-xs font-medium text-zinc-700">Código</label>
          <select value={codeSel} onChange={(e) => { setCodeSel(e.target.value); setSectionSel('') }} className="mb-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" size={8}>
            <option value="">Seleccione…</option>
            {uniqueCodes.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="mb-2 text-sm font-semibold text-zinc-800">3. Seleccionar sección</div>
          <label className="mb-1 block text-xs font-medium text-zinc-700">Sección</label>
          <select value={sectionSel} onChange={(e) => setSectionSel(e.target.value)} disabled={!codeSel} className="mb-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10" size={8}>
            <option value="">Seleccione…</option>
            {sectionsForCode.map((sec) => (
              <option key={sec} value={sec}>{sec}</option>
            ))}
          </select>

          <div className="flex items-center justify-between">
            <button onClick={() => setShowForm(false)} type="button" className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50">Cancelar</button>
            <button onClick={assign} disabled={loading} className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-60">
              {loading ? 'Asignando…' : 'Asignar docente'}
            </button>
          </div>
        </div>
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

