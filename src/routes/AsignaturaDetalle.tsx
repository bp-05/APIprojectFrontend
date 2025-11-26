import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { deleteSubject, getSubject, type Subject } from '../api/subjects'
import { toast } from '../lib/toast'
import { EditSubjectDialog } from './Asignaturas'

export default function AsignaturaDetalle() {
  const { id } = useParams()
  const subjectId = Number(id)
  const navigate = useNavigate()

  const [subject, setSubject] = useState<Subject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadSubject = useCallback(async () => {
    if (!Number.isFinite(subjectId)) {
      setError('ID de asignatura inválido')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getSubject(subjectId)
      setSubject(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo cargar la asignatura'
      setError(msg)
      setSubject(null)
    } finally {
      setLoading(false)
    }
  }, [subjectId])

  useEffect(() => {
    void loadSubject()
  }, [loadSubject])

  const info = useMemo(() => {
    if (!subject) return []
    return [
      { label: 'Código', value: subject.code },
      { label: 'Sección', value: subject.section },
      { label: 'Periodo', value: subject.period_code || `${subject.period_season}-${subject.period_year}` },
      { label: 'Nombre', value: subject.name },
      { label: 'Área', value: subject.area_name || subject.area },
      { label: 'Carrera', value: subject.career_name || subject.career || '-' },
      { label: 'Semestre', value: subject.semester_name || subject.semester },
      { label: 'Campus', value: subject.campus },
      { label: 'Jornada', value: subject.shift },
      { label: 'Horas', value: subject.hours },
      { label: 'Tipo API', value: subject.api_type },
      { label: 'Total estudiantes', value: subject.total_students ?? '-' },
      { label: 'Docente', value: subject.teacher_name || (subject.teacher ? `ID ${subject.teacher}` : '-') },
    ]
  }, [subject])

  async function handleDelete() {
    if (!subject || deleting) return
    if (!confirm(`¿Eliminar asignatura ${subject.code}-${subject.section}?`)) return
    setDeleting(true)
    try {
      await deleteSubject(subject.id)
      toast.success('Asignatura eliminada')
      navigate('/asignaturas')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo eliminar la asignatura'
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <Link
          to="/asignaturas"
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
        >
          Volver
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(true)}
            disabled={!subject}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-60"
          >
            Editar
          </button>
          <button
            onClick={handleDelete}
            disabled={!subject || deleting}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-60"
          >
            {deleting ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>

      <div className="mb-4">
        <h1 className="text-xl font-semibold">Detalle de asignatura</h1>
        {subject ? <p className="text-sm text-zinc-600">{subject.name}</p> : null}
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600">Cargando asignatura…</div>
      ) : subject ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {info.map((row) => (
            <div key={row.label} className="rounded-lg border border-zinc-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{row.label}</div>
              <div className="mt-1 text-sm text-zinc-800">{String(row.value ?? '-')}</div>
            </div>
          ))}
        </div>
      ) : null}

      {subject && editing ? (
        <EditSubjectDialog
          subject={subject}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false)
            await loadSubject()
          }}
        />
      ) : null}
    </section>
  )
}
