import { useEffect, useMemo, useState, Fragment, useRef, useLayoutEffect } from 'react'
import type React from 'react'
import { toast } from 'react-hot-toast'
import { listSubjects, type Subject, listSubjectUnits, type SubjectUnit, updateSubjectUnit, listDescriptorsBySubject, type Descriptor, createSubjectUnit, uploadDescriptor, processDescriptor } from '../api/subjects'

export default function MisAsignaturas() {
  const [items, setItems] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [managing, setManaging] = useState<Subject | null>(null)
  const [units, setUnits] = useState<SubjectUnit[] | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<SubjectUnit | null>(null)

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

  async function openManage(subject: Subject) {
    setManaging(subject)
    setUnits(null)
    setSelectedUnit(null)
    try {
      const data = await listSubjectUnits(subject.id)
      setUnits(data)
      setSelectedUnit(data[0] ?? null)
    } catch (e) {
      setUnits([])
    }
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
            placeholder="Buscar por Código, Sección o nombre…"
            className="w-72 max-w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
          />
        </div>
      </div>

      {error ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      {!managing ? (
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
                <Th>Semestre</Th>
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
                <Fragment key={s.id}>
                  <tr className="hover:bg-zinc-50">
                    <Td>
                      <DescriptorCellDoc subject={s} />
                    </Td>
                    <Td>{s.code}</Td>
                    <Td>{s.section}</Td>
                    <Td>{s.name}</Td>
                    <Td>{s.area_name}</Td>
                    <Td>{s.career_name || '-'}</Td>
                    <Td>{s.semester_name}</Td>
                    <Td className="text-right">
                      <button
                        onClick={() => openManage(s)}
                        className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                      >
                        Gestionar
                      </button>
                    </Td>
                  </tr>
                </Fragment>
              ))
            )}
          </tbody>
          </table>
        </div>
      ) : null}

      {managing ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <ManageSubjectPanel
            subject={managing!}
            units={units}
            selectedUnit={selectedUnit}
            onSelectUnit={setSelectedUnit}
            onUnitsReload={async () => {
              const data = await listSubjectUnits(managing.id)
              setUnits(data)
              if (data.length && !data.find((u) => u.id === selectedUnit?.id)) setSelectedUnit(data[0])
            }}
            onClose={() => { setManaging(null); setUnits(null); setSelectedUnit(null) }}
          />
        </div>
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
          onClick={() => setOpen(true)}
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
                {file ? <span className="font-medium">{file.name}</span> : 'Haz clic o arrastra un PDF aqui'}
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
function ManageSubjectPanel({ subject, units, selectedUnit, onSelectUnit, onUnitsReload, onClose }: {
  subject: Subject
  units: SubjectUnit[] | null
  selectedUnit: SubjectUnit | null
  onSelectUnit: (u: SubjectUnit | null) => void
  onUnitsReload: () => Promise<void>
  onClose: () => void
}) {
  const [showCreateUnits, setShowCreateUnits] = useState(false)
  const [unitsCount, setUnitsCount] = useState<number>(1)
  const [confirmed, setConfirmed] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  async function handleCreateUnits(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    if (!confirmed) return
    if (unitsCount < 1 || unitsCount > 4) {
      setCreateError('Debe elegir entre 1 y 4 unidades')
      return
    }
    try {
      setCreating(true)
      for (let i = 1; i <= unitsCount; i++) {
        await createSubjectUnit({ subject: subject.id, number: i })
      }
      await onUnitsReload()
      setShowCreateUnits(false)
      setUnitsCount(1)
      setConfirmed(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudieron crear las unidades'
      setCreateError(msg)
    } finally {
      setCreating(false)
    }
  }
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Gestionar {subject.name} - {subject.code} - {subject.section}</div>
          <div className="text-xs text-zinc-600">Unidades existentes</div>
        </div>
        <button onClick={onClose} className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50">Cerrar</button>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {units === null ? (
          <span className="text-xs text-zinc-600">Cargando…</span>
        ) : units.length === 0 ? (
          !showCreateUnits ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-600">Esta asignatura no tiene unidades.</span>
              <button
                type="button"
                className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                onClick={() => setShowCreateUnits(true)}
              >
                Añadir unidades
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreateUnits} className="w-full max-w-sm space-y-3 rounded-md border border-zinc-200 bg-white p-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">¿Cuántas unidades?</label>
                <select
                  className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
                  value={unitsCount}
                  onChange={(e) => setUnitsCount(Number(e.target.value))}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <label className="inline-flex items-center gap-2 text-xs text-zinc-700">
                <input
                  type="checkbox"
                  className="h-3 w-3 rounded border-zinc-300"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                Confirmo que después no se podrán modificar el número de unidades
              </label>

              {createError ? (
                <div className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">{createError}</div>
              ) : null}

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="rounded-md bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!confirmed || creating}
                >
                  {creating ? 'Creando…' : 'Crear'}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => { setShowCreateUnits(false); setConfirmed(false); setUnitsCount(1); setCreateError(null) }}
                  disabled={creating}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )
        ) : (
          units.map((u) => (
            <button
              key={u.id}
              onClick={() => onSelectUnit(u)}
              className={`rounded-md px-3 py-1 text-xs ${selectedUnit?.id === u.id ? 'bg-red-600 text-white' : 'border border-zinc-300 bg-white hover:bg-zinc-50'}`}
            >
              Unidad {u.number}
            </button>
          ))
        )}
      </div>
      {selectedUnit ? (
        <UnitForm unit={selectedUnit} onSaved={onUnitsReload} onClose={onClose} />
      ) : null}
    </div>
  )
}

function UnitForm({ unit, onSaved, onClose }: { unit: SubjectUnit; onSaved: () => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState<Partial<SubjectUnit>>({
    expected_learning: unit.expected_learning ?? '',
    unit_hours: unit.unit_hours ?? undefined,
    activities_description: unit.activities_description ?? '',
    evaluation_evidence: unit.evaluation_evidence ?? '',
    evidence_detail: unit.evidence_detail ?? '',
    counterpart_link: unit.counterpart_link ?? '',
    place_mode_type: unit.place_mode_type ?? '',
    counterpart_participant_name: unit.counterpart_participant_name ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  type UnitEditableKey =
    | 'expected_learning'
    | 'unit_hours'
    | 'activities_description'
    | 'evaluation_evidence'
    | 'evidence_detail'
    | 'counterpart_link'
    | 'place_mode_type'
    | 'counterpart_participant_name'
  const [editingKey, setEditingKey] = useState<UnitEditableKey | null>(null)

  function set<K extends keyof SubjectUnit>(key: K, val: any) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  // Sync form state when switching units
  useEffect(() => {
    setForm({
      expected_learning: unit.expected_learning ?? '',
      unit_hours: unit.unit_hours ?? undefined,
      activities_description: unit.activities_description ?? '',
      evaluation_evidence: unit.evaluation_evidence ?? '',
      evidence_detail: unit.evidence_detail ?? '',
      counterpart_link: unit.counterpart_link ?? '',
      place_mode_type: unit.place_mode_type ?? '',
      counterpart_participant_name: unit.counterpart_participant_name ?? '',
    })
    setEditingKey(null)
  }, [unit?.id])

  async function onSubmit(e:React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await updateSubjectUnit(unit.id, form)
      await onSaved()
      setEditingKey(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo guardar la unidad'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  async function onSaveAndExit() {
    setError(null)
    setSaving(true)
    try {
      await updateSubjectUnit(unit.id, form)
      await onSaved()
      setEditingKey(null)
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo guardar la unidad'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-700">Aprendizaje esperado</label>
        <AutoTextarea
          value={(form.expected_learning as any) ?? ''}
          onChange={(e) => set('expected_learning', e.target.value)}
          onFocus={() => setEditingKey('expected_learning')}
           readOnly={editingKey !== 'expected_learning'}
          className={`px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 rounded-md border ${editingKey === 'expected_learning' ? 'border-zinc-300 bg-white' : 'border-zinc-200 bg-zinc-50'}`}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-700">Horas de la unidad</label>
        <input
          type="number"
          min={0}
          value={form.unit_hours ?? ''}
          onChange={(e) => set('unit_hours', e.target.value ? Number(e.target.value) : null)}
          onFocus={() => setEditingKey('unit_hours')}
           readOnly={editingKey !== 'unit_hours'}
          className={`w-full px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 rounded-md border ${editingKey === 'unit_hours' ? 'border-zinc-300 bg-white' : 'border-zinc-200 bg-zinc-50'}`}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-700">Descripción general de actividades</label>
        <AutoTextarea
          value={(form.activities_description as any) ?? ''}
          onChange={(e) => set('activities_description', e.target.value)}
          onFocus={() => setEditingKey('activities_description')}
           readOnly={editingKey !== 'activities_description'}
          className={`px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 rounded-md border ${editingKey === 'activities_description' ? 'border-zinc-300 bg-white' : 'border-zinc-200 bg-zinc-50'}`}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-700">Evidencia sistema de evaluación (descriptor de asignatura)</label>
        <AutoTextarea
          value={(form.evaluation_evidence as any) ?? ''}
          onChange={(e) => set('evaluation_evidence', e.target.value)}
          onFocus={() => setEditingKey('evaluation_evidence')}
           readOnly={editingKey !== 'evaluation_evidence'}
          className={`px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 rounded-md border ${editingKey === 'evaluation_evidence' ? 'border-zinc-300 bg-white' : 'border-zinc-200 bg-zinc-50'}`}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-700">Detalle evidencia / entregable (esperado por la contraparte)  </label>
        <AutoTextarea
          value={(form.evidence_detail as any) ?? ''}
          onChange={(e) => set('evidence_detail', e.target.value)}
          onFocus={() => setEditingKey('evidence_detail')}
           readOnly={editingKey !== 'evidence_detail'}
          className={`px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 rounded-md border ${editingKey === 'evidence_detail' ? 'border-zinc-300 bg-white' : 'border-zinc-200 bg-zinc-50'}`}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-700">Vinculación directa con contraparte (N°semana y objetivo)</label>
        <AutoTextarea
          value={(form.counterpart_link as any) ?? ''}
          onChange={(e) => set('counterpart_link', e.target.value)}
          onFocus={() => setEditingKey('counterpart_link')}
           readOnly={editingKey !== 'counterpart_link'}
          className={`px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 rounded-md border ${editingKey === 'counterpart_link' ? 'border-zinc-300 bg-white' : 'border-zinc-200 bg-zinc-50'}`}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-700">Lugar, modalidad y tipo de actividad</label>
        <input
          value={form.place_mode_type as any}
          onChange={(e) => set('place_mode_type', e.target.value)}
          onFocus={() => setEditingKey('place_mode_type')}
           readOnly={editingKey !== 'place_mode_type'}
          className={`w-full px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 rounded-md border ${editingKey === 'place_mode_type' ? 'border-zinc-300 bg-white' : 'border-zinc-200 bg-zinc-50'}`}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-700">Nombre participante contraparte</label>
        <input
          value={form.counterpart_participant_name as any}
          onChange={(e) => set('counterpart_participant_name', e.target.value)}
          onFocus={() => setEditingKey('counterpart_participant_name')}
           readOnly={editingKey !== 'counterpart_participant_name'}
          className={`w-full px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 rounded-md border ${editingKey === 'counterpart_participant_name' ? 'border-zinc-300 bg-white' : 'border-zinc-200 bg-zinc-50'}`}
        />
      </div>
      <div className="mt-1 flex justify-end gap-2">
        <button type="submit" disabled={saving} className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-60">
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" onClick={onSaveAndExit} disabled={saving} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-60">
          Guardar y salir
        </button>
      </div>
    </form>
  )
}

function AutoTextarea({ className = '', value, onChange, ...rest }:React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handler = () => {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return (
    <textarea
      ref={ref}
      value={value as any}
      onChange={onChange}
      rows={1}
      className={`w-full resize-none overflow-hidden ${className}`}
      {...rest}
    />
  )
}
































