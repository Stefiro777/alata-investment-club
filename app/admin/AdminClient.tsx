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

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mb-8">
      <h2 className="font-serif text-2xl font-bold text-[#0a0a0a]">{title}</h2>
      <div className="w-10 h-0.5 bg-[#1a4a3a] mt-2" />
    </div>
  )
}

export default function AdminClient({
  items,
}: {
  items: Contenuto[]
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  // News & Events form state
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

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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

  const navItems = [
    { label: 'News & Events', id: 'news-events' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-8 py-10 space-y-16">

      {/* ── Quick-nav pills ── */}
      <nav className="flex flex-wrap gap-2">
        {navItems.map(({ label, id }) => (
          <button
            key={id}
            onClick={() => scrollTo(id)}
            className="px-5 py-2 text-xs font-medium tracking-wide border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white transition-colors duration-150 rounded-full"
          >
            {label}
          </button>
        ))}
      </nav>

      {/* ══════════════════════════════════════
          News & Events
      ══════════════════════════════════════ */}
      <section id="news-events" ref={formRef}>
        <SectionHeading title="News & Events" />

        <div className="bg-white border border-black/10 p-8 space-y-10">

          {/* Create / Edit form */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs tracking-[0.2em] uppercase text-[#6b7280]">
                {editingId !== null ? 'Modifica card' : 'Nuova card'}
              </p>
              {editingId !== null && (
                <button
                  onClick={cancelEdit}
                  className="text-xs text-[#6b7280] hover:text-[#0a0a0a] tracking-wide transition-colors"
                >
                  ✕ Annulla modifica
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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
                  Card {editingId !== null ? 'aggiornata' : 'creata'} con successo.
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
          </div>

          {/* Divider */}
          <div className="border-t border-black/10" />

          {/* Items list */}
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-[#6b7280] mb-4">Card esistenti</p>
            {items.length === 0 ? (
              <p className="text-[#6b7280] text-sm">Nessuna card presente.</p>
            ) : (
              <div className="space-y-px bg-black/5 rounded-sm">
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
          </div>

        </div>
      </section>

    </div>
  )
}
