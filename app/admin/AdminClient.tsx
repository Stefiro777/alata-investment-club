'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Contenuto = {
  id: number
  titolo: string
  descrizione: string | null
  tipo: string
  data_pubblicazione: string | null
  link: string | null
  foto_url: string | null
}

export default function AdminClient({
  items,
  adminUsers,
  superadmin,
}: {
  items: Contenuto[]
  adminUsers: string[]
  superadmin: string
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  // Form state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [currentFotoUrl, setCurrentFotoUrl] = useState<string | null>(null)
  const [titolo, setTitolo] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [data, setData] = useState('')
  const [link, setLink] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // Admin users state
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [addingAdmin, setAddingAdmin] = useState(false)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [removingEmail, setRemovingEmail] = useState<string | null>(null)

  function startEdit(item: Contenuto) {
    setEditingId(item.id)
    setCurrentFotoUrl(item.foto_url)
    setTitolo(item.titolo)
    setDescrizione(item.descrizione ?? '')
    setData(item.data_pubblicazione ?? '')
    setLink(item.link ?? '')
    setFormError(null)
    setFormSuccess(false)
    if (fileRef.current) fileRef.current.value = ''
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function cancelEdit() {
    setEditingId(null)
    setCurrentFotoUrl(null)
    setTitolo('')
    setDescrizione('')
    setData('')
    setLink('')
    setFormError(null)
    setFormSuccess(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    setFormSuccess(false)

    const supabase = createClient()
    let foto_url: string | null = currentFotoUrl

    const file = fileRef.current?.files?.[0]
    if (file) {
      const path = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('news-images')
        .upload(path, file, { upsert: false })

      if (uploadError) {
        setFormError(`Upload failed: ${uploadError.message}`)
        setSubmitting(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('news-images')
        .getPublicUrl(uploadData.path)

      foto_url = publicUrl
    }

    if (editingId !== null) {
      const { error } = await supabase.from('contenuti').update({
        titolo,
        descrizione: descrizione || null,
        data_pubblicazione: data || null,
        link: link || null,
        foto_url,
      }).eq('id', editingId)

      if (error) {
        setFormError(`Update failed: ${error.message}`)
        setSubmitting(false)
        return
      }
    } else {
      const { error } = await supabase.from('contenuti').insert({
        titolo,
        descrizione: descrizione || null,
        tipo: 'evento',
        data_pubblicazione: data || null,
        link: link || null,
        foto_url,
      })

      if (error) {
        setFormError(`Insert failed: ${error.message}`)
        setSubmitting(false)
        return
      }
    }

    cancelEdit()
    setFormSuccess(true)
    setSubmitting(false)
    router.refresh()
  }

  async function handleDelete(id: number) {
    setDeletingId(id)
    const supabase = createClient()
    await supabase.from('contenuti').delete().eq('id', id)
    if (editingId === id) cancelEdit()
    setDeletingId(null)
    router.refresh()
  }

  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault()
    const email = newAdminEmail.trim().toLowerCase()
    if (!email) return
    setAddingAdmin(true)
    setAdminError(null)

    const supabase = createClient()
    const { error } = await supabase.from('admin_users').insert({ email })

    if (error) {
      setAdminError(error.message)
    } else {
      setNewAdminEmail('')
      router.refresh()
    }
    setAddingAdmin(false)
  }

  async function handleRemoveAdmin(email: string) {
    setRemovingEmail(email)
    const supabase = createClient()
    await supabase.from('admin_users').delete().eq('email', email)
    setRemovingEmail(null)
    router.refresh()
  }

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-8 py-12 space-y-16">

      {/* ── Create / Edit form ── */}
      <section ref={formRef}>
        <div className="mb-8 border-b border-[#e5e5e5] pb-4 flex items-end justify-between">
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-[#6b7280] mb-1">
              {editingId !== null ? 'Modifica' : 'Nuovo'}
            </p>
            <h2 className="font-serif text-2xl font-bold text-[#0a0a0a]">
              {editingId !== null ? 'Modifica Card' : 'Aggiungi Card'}
            </h2>
          </div>
          {editingId !== null && (
            <button
              onClick={cancelEdit}
              className="text-xs text-[#6b7280] hover:text-[#0a0a0a] tracking-wide transition-colors"
            >
              ✕ Annulla modifica
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-[#e5e5e5] p-8 space-y-6">
          <div>
            <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">
              Titolo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={titolo}
              onChange={e => setTitolo(e.target.value)}
              className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">
              Descrizione
            </label>
            <textarea
              value={descrizione}
              onChange={e => setDescrizione(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors resize-none"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">
                Data pubblicazione
              </label>
              <input
                type="date"
                value={data}
                onChange={e => setData(e.target.value)}
                className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">
                Link esterno (opzionale)
              </label>
              <input
                type="url"
                value={link}
                onChange={e => setLink(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">
              Foto {editingId !== null ? '(lascia vuoto per mantenere quella attuale)' : '(opzionale)'}
            </label>
            {currentFotoUrl && (
              <p className="text-xs text-[#6b7280] mb-2 truncate">Attuale: {currentFotoUrl}</p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="w-full text-sm text-[#6b7280] file:mr-4 file:py-2 file:px-4 file:border file:border-[#1a4a3a] file:text-xs file:font-medium file:tracking-wide file:uppercase file:text-[#1a4a3a] file:bg-white hover:file:bg-[#1a4a3a] hover:file:text-white file:transition-colors file:cursor-pointer"
            />
          </div>

          {formError && (
            <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{formError}</p>
          )}
          {formSuccess && (
            <p className="text-[#1a4a3a] text-xs border-l-2 border-[#1a4a3a] pl-3 py-1">
              {editingId !== null ? 'Card aggiornata con successo.' : 'Card creata con successo.'}
            </p>
          )}

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-sm font-medium tracking-wide px-8 py-3 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving…' : editingId !== null ? 'Aggiorna' : 'Salva'}
            </button>
            {editingId !== null && (
              <button
                type="button"
                onClick={cancelEdit}
                className="text-sm text-[#6b7280] hover:text-[#0a0a0a] tracking-wide transition-colors"
              >
                Annulla
              </button>
            )}
          </div>
        </form>
      </section>

      {/* ── Existing items ── */}
      <section>
        <div className="mb-8 border-b border-[#e5e5e5] pb-4">
          <p className="text-xs tracking-[0.2em] uppercase text-[#6b7280] mb-1">Esistenti</p>
          <h2 className="font-serif text-2xl font-bold text-[#0a0a0a]">News &amp; Events</h2>
        </div>

        {items.length === 0 ? (
          <p className="text-[#6b7280] text-sm">Nessuna card presente.</p>
        ) : (
          <div className="space-y-px bg-[#e5e5e5]">
            {items.map(item => (
              <div
                key={item.id}
                className={`bg-white px-6 py-5 flex items-start justify-between gap-6 ${editingId === item.id ? 'ring-1 ring-[#1a4a3a]' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  {item.data_pubblicazione && (
                    <p className="text-xs text-[#6b7280] tracking-widest uppercase mb-1">
                      {new Date(item.data_pubblicazione).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                  <p className="font-serif text-base font-medium text-[#0a0a0a] truncate">{item.titolo}</p>
                  {item.descrizione && (
                    <p className="text-[#6b7280] text-xs mt-1 line-clamp-1">{item.descrizione}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => startEdit(item)}
                    disabled={editingId === item.id}
                    className="border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Modifica
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="border border-red-300 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {deletingId === item.id ? '…' : 'Elimina'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Admin Users ── */}
      <section>
        <div className="mb-8 border-b border-[#e5e5e5] pb-4">
          <p className="text-xs tracking-[0.2em] uppercase text-[#6b7280] mb-1">Accessi</p>
          <h2 className="font-serif text-2xl font-bold text-[#0a0a0a]">Admin Users</h2>
        </div>

        <form onSubmit={handleAddAdmin} className="flex gap-3 mb-6">
          <input
            type="email"
            required
            value={newAdminEmail}
            onChange={e => setNewAdminEmail(e.target.value)}
            placeholder="nuova@email.com"
            className="flex-1 px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
          />
          <button
            type="submit"
            disabled={addingAdmin}
            className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium tracking-wide px-6 py-3 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {addingAdmin ? '…' : 'Aggiungi admin'}
          </button>
        </form>

        {adminError && (
          <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1 mb-4">{adminError}</p>
        )}

        <div className="space-y-px bg-[#e5e5e5]">
          {adminUsers.map(email => (
            <div key={email} className="bg-white px-6 py-4 flex items-center justify-between gap-6">
              <span className="text-sm text-[#0a0a0a] font-medium">
                {email}
                {email === superadmin && (
                  <span className="ml-2 text-xs text-[#1a4a3a] tracking-widest uppercase">superadmin</span>
                )}
              </span>
              {email !== superadmin && (
                <button
                  onClick={() => handleRemoveAdmin(email)}
                  disabled={removingEmail === email}
                  className="flex-shrink-0 border border-red-300 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {removingEmail === email ? '…' : 'Rimuovi'}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
