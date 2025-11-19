import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'react-hot-toast'
import { deleteCompany, getCompany, type Company } from '../api/companies'
import { EmpresaModal } from './vcm/Empresas'

export default function EmpresaDetalleAdmin() {
  const { id } = useParams()
  const companyId = Number(id)
  const navigate = useNavigate()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadCompany = useCallback(async () => {
    if (!Number.isFinite(companyId)) {
      setError('ID de empresa inválido')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getCompany(companyId)
      setCompany(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo cargar la empresa'
      setError(msg)
      setCompany(null)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    void loadCompany()
  }, [loadCompany])

  const info = useMemo(() => {
    if (!company) return []
    return [
      { label: 'Nombre', value: company.name },
      { label: 'Correo', value: company.email || '—' },
      { label: 'Teléfono', value: company.phone || '—' },
      { label: 'Dirección comercial', value: company.address || '—' },
      { label: 'Dirección gerencia', value: company.management_address || '—' },
      { label: 'Cantidad de empleados', value: company.employees_count ?? '—' },
      { label: 'Sector', value: company.sector || '—' },
    ]
  }, [company])

  const contacts = useMemo(() => company?.counterpart_contacts || [], [company])

  async function handleDelete() {
    if (!company || deleting) return
    if (!confirm(`¿Eliminar empresa "${company.name}"?`)) return
    setDeleting(true)
    try {
      await deleteCompany(company.id)
      toast.success('Empresa eliminada')
      navigate('/empresas')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo eliminar la empresa'
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-500">
            <Link to="/empresas" className="text-red-600 hover:underline">
              &larr; Volver al listado
            </Link>
          </p>
          <h1 className="text-xl font-semibold">Empresa</h1>
          {company ? <p className="text-sm text-zinc-600">{company.name}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(true)}
            disabled={!company}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-60"
          >
            Editar
          </button>
          <button
            onClick={handleDelete}
            disabled={!company || deleting}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-60"
          >
            {deleting ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600">Cargando empresa…</div>
      ) : company ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {info.map((row) => (
              <div key={row.label} className="rounded-lg border border-zinc-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{row.label}</div>
                <div className="mt-1 text-sm text-zinc-800">{String(row.value ?? '—')}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
            <h2 className="text-base font-semibold text-zinc-900">Contactos registrados</h2>
            {contacts.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-600">Sin contactos registrados.</p>
            ) : (
              <ul className="mt-3 divide-y divide-zinc-100">
                {contacts.map((contact, index) => (
                  <li key={contact.id ?? `${contact.email}-${index}`} className="py-3">
                    <div className="text-sm font-medium text-zinc-900">{contact.name || 'Sin nombre'}</div>
                    <div className="text-xs text-zinc-600">
                      {contact.role || contact.counterpart_area || 'Sin rol indicado'}
                    </div>
                    <div className="text-xs text-zinc-600">
                      {contact.email || contact.phone || 'Sin datos de contacto'}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}

      {company && editing ? (
        <EmpresaModal
          initial={company}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false)
            await loadCompany()
          }}
        />
      ) : null}
    </section>
  )
}
