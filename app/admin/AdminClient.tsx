'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import PhotoUpload, { PhotoEntry } from './PhotoUpload'

type Contenuto = {
  id: number
  titolo: string
  descrizione: string | null
  short_description: string | null
  full_description: string | null
  tag: string | null
  tipo: string
  data_pubblicazione: string | null
  link: string | null
  immagine_url: string | null
  photos: string[] | null
}

const TAG_OPTIONS = ['Aperitif', 'Event', 'Team Building', 'Career Talk']

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mb-8">
      <h2 className="font-serif text-2xl font-bold text-[#0a0a0a]">{title}</h2>
      <div className="w-10 h-0.5 bg-[#1a4a3a] mt-2" />
    </div>
  )
}

export default function AdminClient({ items }: { items: Contenuto[] }) {
  const router = useRouter()
  const formRef = useRef<HTMLDivElement>(null)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [titolo, setTitolo] = useState('')
  const [data, setData] = useState('')
  const [link, setLink] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [fullDescription, setFullDescription] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [photoEntries, setPhotoEntries] = useState<PhotoEntry[]>([])
  const [photoUploadKey, setPhotoUploadKey] = useState(0)
  const [initialPhotosForUpload, setInitialPhotosForUpload] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function startEdit(item: Contenuto) {
    const existingPhotos = (item.photos as string[] | null) ?? (item.immagine_url ? [item.immagine_url] : [])
    setEditingId(item.id)
    setTitolo(item.titolo)
    setData(item.data_pubblicazione ?? '')
    setLink(item.link ?? '')
    setShortDescription(item.short_description ?? '')
    setFullDescription(item.full_description ?? '')
    setTag(item.tag ?? null)
    setInitialPhotosForUpload(existingPhotos)
    setPhotoEntries(existingPhotos.map(url => ({ type: 'existing', url })))
    setPhotoUploadKey(k => k + 1)
    setFormError(null)
    setFormSuccess(false)
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function cancelEdit() {
    setEditingId(null)
    setTitolo('')
    setData('')
    setLink('')
    setShortDescription('')
    setFullDescription('')
    setTag(null)
    setInitialPhotosForUpload([])
    setPhotoEntries([])
    setPhotoUploadKey(k => k + 1)
    setFormError(null)
    setFormSuccess(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    console.log('[admin] handleSubmit — editingId:', editingId, 'titolo:', titolo)
    setSubmitting(true)
    setFormError(null)
    setFormSuccess(false)

    const supabase = createClient()
    const uploadedPhotos: string[] = []

    for (const entry of photoEntries) {
      if (entry.type === 'existing') {
        uploadedPhotos.push(entry.url)
      } else {
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}-${entry.file.name.replace(/\s+/g, '_')}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('news-images')
          .upload(path, entry.file, { upsert: false })

        if (uploadError) {
          setFormError(`Upload failed: ${uploadError.message}`)
          setSubmitting(false)
          return
        }

        const { data: { publicUrl } } = supabase.storage
          .from('news-images')
          .getPublicUrl(uploadData.path)

        uploadedPhotos.push(publicUrl)
      }
    }

    const payload = {
      titolo,
      data_pubblicazione: data || null,
      link: link || null,
      short_description: shortDescription || null,
      full_description: fullDescription || null,
      tag: tag || null,
      immagine_url: uploadedPhotos[0] ?? null,
      photos: uploadedPhotos.length > 0 ? uploadedPhotos : null,
    }

    if (editingId !== null) {
      console.log('[admin] UPDATE id:', editingId, 'payload:', payload)
      const { data: updateData, error } = await supabase
        .from('contenuti')
        .update(payload)
        .eq('id', editingId)
        .select()
      console.log('[admin] UPDATE result — data:', updateData, 'error:', error)
      if (error) {
        setFormError(`Update failed: ${error.message}`)
        setSubmitting(false)
        return
      }
    } else {
      console.log('[admin] INSERT payload:', payload)
      const { data: insertData, error } = await supabase
        .from('contenuti')
        .insert({ ...payload, tipo: 'evento' })
        .select()
      console.log('[admin] INSERT result — data:', insertData, 'error:', error)
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

  const navItems = [{ label: 'News & Events', id: 'news-events' }]

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-8 py-10 space-y-16">

      {/* Quick-nav */}
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

      {/* News & Events */}
      <section id="news-events" ref={formRef}>
        <SectionHeading title="News & Events" />

        <div className="bg-white border border-black/10 p-8 space-y-10">

          {/* Form */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs tracking-[0.2em] uppercase text-[#6b7280]">
                {editingId !== null ? `Modifica card #${editingId}` : 'Nuova card'}
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

              {/* Titolo */}
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

              {/* Data + Link */}
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

              {/* Foto (multi-upload) */}
              <div>
                <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-3">
                  Foto
                </label>
                <PhotoUpload
                  key={photoUploadKey}
                  initialPhotos={initialPhotosForUpload}
                  onChange={setPhotoEntries}
                />
              </div>

              {/* Short description */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280]">
                    Homepage preview text
                  </label>
                  <span className={`text-xs tabular-nums ${shortDescription.length > 150 ? 'text-red-500' : 'text-[#9ca3af]'}`}>
                    {shortDescription.length} / 150
                  </span>
                </div>
                <textarea
                  value={shortDescription}
                  onChange={e => setShortDescription(e.target.value)}
                  rows={2}
                  maxLength={150}
                  placeholder="Breve testo visibile nella sezione News & Events in homepage..."
                  className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors resize-none placeholder-[#c4c4c4]"
                />
              </div>

              {/* Full description */}
              <div>
                <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">
                  Events page text
                </label>
                <textarea
                  value={fullDescription}
                  onChange={e => setFullDescription(e.target.value)}
                  rows={5}
                  placeholder="Descrizione completa visibile nella pagina /events..."
                  className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors resize-none placeholder-[#c4c4c4]"
                />
              </div>

              {/* Tag */}
              <div>
                <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-3">
                  Tag
                </label>
                <div className="flex flex-wrap gap-2">
                  {TAG_OPTIONS.map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setTag(tag === option ? null : option)}
                      className="px-4 py-1.5 text-xs font-medium tracking-wide border transition-colors duration-150"
                      style={
                        tag === option
                          ? { background: '#1a4a3a', color: 'white', borderColor: '#1a4a3a' }
                          : { background: 'white', color: '#1a4a3a', borderColor: '#1a4a3a' }
                      }
                    >
                      {option}
                    </button>
                  ))}
                  {tag && (
                    <button
                      type="button"
                      onClick={() => setTag(null)}
                      className="px-3 py-1.5 text-xs text-[#6b7280] hover:text-[#0a0a0a] transition-colors"
                    >
                      ✕ Rimuovi tag
                    </button>
                  )}
                </div>
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

          <div className="border-t border-black/10" />

          {/* Items list */}
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-[#6b7280] mb-4">Card esistenti</p>
            {items.length === 0 ? (
              <p className="text-[#6b7280] text-sm">Nessuna card presente.</p>
            ) : (
              <div className="space-y-px bg-black/5 rounded-sm">
                {items.map(item => {
                  const photoCount = (item.photos as string[] | null)?.length ?? (item.immagine_url ? 1 : 0)
                  return (
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-serif text-base font-medium text-[#0a0a0a] truncate">{item.titolo}</p>
                          {item.tag && (
                            <span className="text-xs px-2 py-0.5 border border-[#1a4a3a] text-[#1a4a3a] whitespace-nowrap">
                              {item.tag}
                            </span>
                          )}
                          {photoCount > 0 && (
                            <span className="text-xs text-[#9ca3af] whitespace-nowrap">
                              {photoCount} foto
                            </span>
                          )}
                        </div>
                        {(item.short_description || item.descrizione) && (
                          <p className="text-[#6b7280] text-xs mt-1 line-clamp-1">
                            {item.short_description || item.descrizione}
                          </p>
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
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </section>

    </div>
  )
}
