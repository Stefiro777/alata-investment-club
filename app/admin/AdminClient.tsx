'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import PhotoUpload, { PhotoEntry } from './PhotoUpload'
import type { Alumni } from '@/lib/types'

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


type AlumniCompany = {
  id: string
  name: string
  logo_url: string
  website_url: string | null
  created_at: string
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

// ── Per-item edit row ───────────────────────────────────────────────────────

function ItemEditRow({
  item,
  onUpdated,
  onDeleted,
}: {
  item: Contenuto
  onUpdated: (updated: Contenuto) => void
  onDeleted: (id: number) => void
}) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)

  const [titolo, setTitolo] = useState(item.titolo)
  const [dataPub, setDataPub] = useState(item.data_pubblicazione ?? '')
  const [link, setLink] = useState(item.link ?? '')
  const [shortDesc, setShortDesc] = useState(item.short_description ?? '')
  const [fullDesc, setFullDesc] = useState(item.full_description ?? '')
  const [tag, setTag] = useState(item.tag ?? '')

  const existingPhotos = (item.photos as string[] | null) ?? (item.immagine_url ? [item.immagine_url] : [])
  const [photoEntries, setPhotoEntries] = useState<PhotoEntry[]>(
    existingPhotos.map(url => ({ type: 'existing' as const, url }))
  )
  const [photoUploadKey, setPhotoUploadKey] = useState(0)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError(null)

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
          setError(`Upload failed: ${uploadError.message}`)
          setSaving(false)
          return
        }
        const { data: { publicUrl } } = supabase.storage.from('news-images').getPublicUrl(uploadData.path)
        uploadedPhotos.push(publicUrl)
      }
    }

    const payload = {
      titolo,
      data_pubblicazione: dataPub || null,
      link: link || null,
      immagine_url: uploadedPhotos[0] ?? null,
      photos: uploadedPhotos.length > 0 ? uploadedPhotos : null,
      short_description: shortDesc || null,
      full_description: fullDesc || null,
      tag: tag || null,
    }

    console.log('=== UPDATE START ===')
    console.log('ID:', item.id, typeof item.id)
    console.log('Dati da salvare:', payload)

    const { data, error: err, status, statusText } = await supabase
      .from('contenuti')
      .update(payload)
      .eq('id', item.id)
      .select()

    console.log('Response status:', status, statusText)
    console.log('Response data:', data)
    console.log('Response error:', err)
    console.log('Rows affected:', data?.length ?? 0)
    console.log('=== UPDATE END ===')

    if (err) {
      console.error('[update] FULL ERROR:', JSON.stringify(err, null, 2))
      setError(err.message)
      setSaving(false)
      return
    }

    if (!data || data.length === 0) {
      console.warn('[update] No rows affected — check RLS policies on contenuti table')
      setError('Nessuna riga aggiornata. Verifica le RLS policy su Supabase.')
      setSaving(false)
      return
    }

    const refreshed = data[0] as Contenuto
    setSaved(true)
    setSaving(false)
    router.refresh()
    onUpdated(refreshed)
    const savedPhotos = (refreshed.photos as string[] | null) ?? (refreshed.immagine_url ? [refreshed.immagine_url] : [])
    setPhotoEntries(savedPhotos.map((url: string) => ({ type: 'existing' as const, url })))
    setPhotoUploadKey(k => k + 1)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleDelete() {
    if (!confirm(`Eliminare "${item.titolo}"?`)) return
    setDeleting(true)
    const supabase = createClient()
    const { error: err } = await supabase.from('contenuti').delete().eq('id', item.id)
    if (err) {
      console.error('[delete] error:', err)
      setError(err.message)
      setDeleting(false)
    } else {
      onDeleted(item.id)
      router.refresh()
    }
  }

  const photoCount = (item.photos as string[] | null)?.length ?? (item.immagine_url ? 1 : 0)

  return (
    <div className={`bg-white ${expanded ? 'ring-1 ring-[#1a4a3a]' : 'border-b border-black/5'}`}>

      {/* Summary row */}
      <div className="px-6 py-5 flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          {item.data_pubblicazione && (
            <p className="text-xs text-[#6b7280] tracking-widest uppercase mb-1">
              {new Date(item.data_pubblicazione).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
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
              <span className="text-xs text-[#9ca3af] whitespace-nowrap">{photoCount} foto</span>
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
            onClick={() => setExpanded(v => !v)}
            className="border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-150"
          >
            {expanded ? 'Chiudi' : 'Modifica'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="border border-red-300 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deleting ? '…' : 'Elimina'}
          </button>
        </div>
      </div>

      {/* Edit form */}
      {expanded && (
        <form onSubmit={handleUpdate} className="px-6 pb-6 pt-4 space-y-4 border-t border-black/8">

          <div>
            <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-1">
              Titolo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={titolo}
              onChange={e => setTitolo(e.target.value)}
              className="w-full px-4 py-2.5 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-1">
                Data pubblicazione
              </label>
              <input
                type="date"
                value={dataPub}
                onChange={e => setDataPub(e.target.value)}
                className="w-full px-4 py-2.5 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-1">
                Link esterno
              </label>
              <input
                type="url"
                value={link}
                onChange={e => setLink(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2.5 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">Foto</label>
            <PhotoUpload
              key={photoUploadKey}
              initialPhotos={existingPhotos}
              onChange={setPhotoEntries}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280]">
                Homepage preview text
              </label>
              <span className={`text-xs tabular-nums ${shortDesc.length > 150 ? 'text-red-500' : 'text-[#9ca3af]'}`}>
                {shortDesc.length} / 150
              </span>
            </div>
            <textarea
              value={shortDesc}
              onChange={e => setShortDesc(e.target.value)}
              rows={2}
              maxLength={150}
              className="w-full px-4 py-2.5 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-1">
              Events page text
            </label>
            <textarea
              value={fullDesc}
              onChange={e => setFullDesc(e.target.value)}
              rows={4}
              className="w-full px-4 py-2.5 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">Tag</label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTag(tag === option ? '' : option)}
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
                  onClick={() => setTag('')}
                  className="px-3 py-1.5 text-xs text-[#6b7280] hover:text-[#0a0a0a] transition-colors"
                >
                  ✕ Rimuovi
                </button>
              )}
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>
          )}

          <div className="flex items-center gap-4 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-sm font-medium tracking-wide px-8 py-2.5 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : 'Aggiorna'}
            </button>
            {saved && (
              <span className="text-[#1a4a3a] text-xs font-medium border-l-2 border-[#1a4a3a] pl-3 py-1">
                Salvato!
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  )
}

// ── Insert form ─────────────────────────────────────────────────────────────

function InsertForm({ onInserted }: { onInserted: (item: Contenuto) => void }) {
  const [titolo, setTitolo] = useState('')
  const [dataPub, setDataPub] = useState('')
  const [link, setLink] = useState('')
  const [shortDesc, setShortDesc] = useState('')
  const [fullDesc, setFullDesc] = useState('')
  const [tag, setTag] = useState<string>('')
  const [photoEntries, setPhotoEntries] = useState<PhotoEntry[]>([])
  const [photoUploadKey, setPhotoUploadKey] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(false)

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
          setError(`Upload failed: ${uploadError.message}`)
          setSubmitting(false)
          return
        }
        const { data: { publicUrl } } = supabase.storage.from('news-images').getPublicUrl(uploadData.path)
        uploadedPhotos.push(publicUrl)
      }
    }

    const payload = {
      titolo,
      tipo: 'evento',
      data_pubblicazione: dataPub || null,
      link: link || null,
      short_description: shortDesc || null,
      full_description: fullDesc || null,
      tag: tag || null,
      immagine_url: uploadedPhotos[0] ?? null,
      photos: uploadedPhotos.length > 0 ? uploadedPhotos : null,
    }

    console.log('[insert] payload:', payload)
    const { data: result, error: err } = await supabase
      .from('contenuti')
      .insert(payload)
      .select()
      .single()
    console.log('[insert] result:', result, 'error:', err)

    if (err) {
      console.error('[insert] FULL ERROR:', JSON.stringify(err, null, 2))
      setError(err.message)
      setSubmitting(false)
      return
    }

    // Reset form
    setTitolo('')
    setDataPub('')
    setLink('')
    setShortDesc('')
    setFullDesc('')
    setTag('')
    setPhotoEntries([])
    setPhotoUploadKey(k => k + 1)
    setSuccess(true)
    setSubmitting(false)
    setTimeout(() => setSuccess(false), 3000)
    onInserted(result as Contenuto)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-xs tracking-[0.2em] uppercase text-[#6b7280]">Nuova card</p>

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

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">
            Data pubblicazione
          </label>
          <input
            type="date"
            value={dataPub}
            onChange={e => setDataPub(e.target.value)}
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
        <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-3">Foto</label>
        <PhotoUpload key={photoUploadKey} initialPhotos={[]} onChange={setPhotoEntries} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280]">
            Homepage preview text
          </label>
          <span className={`text-xs tabular-nums ${shortDesc.length > 150 ? 'text-red-500' : 'text-[#9ca3af]'}`}>
            {shortDesc.length} / 150
          </span>
        </div>
        <textarea
          value={shortDesc}
          onChange={e => setShortDesc(e.target.value)}
          rows={2}
          maxLength={150}
          placeholder="Breve testo visibile nella sezione News & Events in homepage..."
          className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors resize-none placeholder-[#c4c4c4]"
        />
      </div>

      <div>
        <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">
          Events page text
        </label>
        <textarea
          value={fullDesc}
          onChange={e => setFullDesc(e.target.value)}
          rows={5}
          placeholder="Descrizione completa visibile nella pagina /events..."
          className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors resize-none placeholder-[#c4c4c4]"
        />
      </div>

      <div>
        <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-3">Tag</label>
        <div className="flex flex-wrap gap-2">
          {TAG_OPTIONS.map(option => (
            <button
              key={option}
              type="button"
              onClick={() => setTag(tag === option ? '' : option)}
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
              onClick={() => setTag('')}
              className="px-3 py-1.5 text-xs text-[#6b7280] hover:text-[#0a0a0a] transition-colors"
            >
              ✕ Rimuovi tag
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>
      )}
      {success && (
        <p className="text-[#1a4a3a] text-xs border-l-2 border-[#1a4a3a] pl-3 py-1">Card creata con successo.</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-sm font-medium tracking-wide px-8 py-3 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Saving…' : 'Salva'}
      </button>
    </form>
  )
}

// ── Alumni insert form ───────────────────────────────────────────────────────

function AlumniInsertForm({ onInserted }: { onInserted: (a: Alumni) => void }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [graduationYear, setGraduationYear] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [currentCompany, setCurrentCompany] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(false)

    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('alumni')
      .insert({
        name,
        role,
        graduation_year: graduationYear || null,
        linkedin_url: linkedinUrl || null,
        current_company: currentCompany || null,
      })
      .select()
      .single()

    if (err) {
      setError(err.message)
      setSubmitting(false)
      return
    }

    setName('')
    setRole('')
    setGraduationYear('')
    setLinkedinUrl('')
    setCurrentCompany('')
    setSuccess(true)
    setSubmitting(false)
    setTimeout(() => setSuccess(false), 3000)
    onInserted(data as Alumni)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs tracking-[0.2em] uppercase text-[#6b7280]">Nuovo alumni</p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">
            Nome <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Mario Rossi"
            className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">
            Ruolo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={role}
            onChange={e => setRole(e.target.value)}
            placeholder="Former President"
            className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">
            Anno di laurea
          </label>
          <input
            type="text"
            value={graduationYear}
            onChange={e => setGraduationYear(e.target.value)}
            placeholder="2024"
            className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">
            LinkedIn URL
          </label>
          <input
            type="text"
            value={linkedinUrl}
            onChange={e => setLinkedinUrl(e.target.value)}
            placeholder="https://linkedin.com/in/..."
            className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">
          Current Company
        </label>
        <input
          type="text"
          value={currentCompany}
          onChange={e => setCurrentCompany(e.target.value)}
          placeholder="Goldman Sachs"
          className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
        />
      </div>

      {error && (
        <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>
      )}
      {success && (
        <p className="text-[#1a4a3a] text-xs border-l-2 border-[#1a4a3a] pl-3 py-1">Alumni aggiunto con successo.</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-sm font-medium tracking-wide px-8 py-3 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Saving…' : 'Aggiungi'}
      </button>
    </form>
  )
}

// ── Alumni row ───────────────────────────────────────────────────────────────

function AlumniRow({
  alumni,
  onDeleted,
  dragHandlers,
}: {
  alumni: Alumni
  onDeleted: (id: string) => void
  dragHandlers?: {
    onDragStart: () => void
    onDragEnter: () => void
    onDragEnd: () => void
  }
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!confirm(`Eliminare "${alumni.name}"?`)) return
    setDeleting(true)
    const supabase = createClient()
    const { error: err } = await supabase.from('alumni').delete().eq('id', alumni.id)
    if (err) {
      setError(err.message)
      setDeleting(false)
    } else {
      onDeleted(alumni.id)
      router.refresh()
    }
  }

  return (
    <div
      className="bg-white px-4 py-4 flex items-center gap-3 border-b border-black/5 last:border-b-0"
      draggable={!!dragHandlers}
      onDragStart={dragHandlers?.onDragStart}
      onDragEnter={dragHandlers?.onDragEnter}
      onDragEnd={dragHandlers?.onDragEnd}
      onDragOver={e => e.preventDefault()}
    >
      {dragHandlers && (
        <div className="cursor-grab text-[#9ca3af] flex-shrink-0 select-none px-1" title="Trascina per riordinare">
          <svg width="12" height="20" viewBox="0 0 12 20" fill="currentColor">
            <circle cx="3" cy="4" r="1.5"/><circle cx="9" cy="4" r="1.5"/>
            <circle cx="3" cy="10" r="1.5"/><circle cx="9" cy="10" r="1.5"/>
            <circle cx="3" cy="16" r="1.5"/><circle cx="9" cy="16" r="1.5"/>
          </svg>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-serif text-base font-medium text-[#0a0a0a]">{alumni.name}</p>
          {alumni.graduation_year && (
            <span className="text-xs px-2 py-0.5 border border-[#1a4a3a] text-[#1a4a3a] whitespace-nowrap">
              {alumni.graduation_year}
            </span>
          )}
        </div>
        <p className="text-xs text-[#6b7280] mt-0.5">{alumni.role}</p>
        {alumni.current_company && (
          <p className="text-xs text-[#9ca3af] mt-0.5">{alumni.current_company}</p>
        )}
        {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {alumni.linkedin_url && (
          <a
            href={alumni.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#1a4a3a] hover:underline"
          >
            LinkedIn
          </a>
        )}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="border border-red-300 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {deleting ? '…' : 'Elimina'}
        </button>
      </div>
    </div>
  )
}

// ── Alumni company insert form ───────────────────────────────────────────────

async function uploadAlumniLogo(file: File): Promise<{ url: string } | { error: string }> {
  const supabase = createClient()
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/\s+/g, '_')}`
  const { data, error } = await supabase.storage
    .from('alumni-logos')
    .upload(path, file, { upsert: false })
  if (error) return { error: error.message }
  const { data: { publicUrl } } = supabase.storage.from('alumni-logos').getPublicUrl(data.path)
  return { url: publicUrl }
}

function AlumniCompanyInsertForm({ onInserted }: { onInserted: (c: AlumniCompany) => void }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const logoFileRef = useRef<HTMLInputElement>(null)

  async function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    const result = await uploadAlumniLogo(file)
    if ('error' in result) {
      setUploadError(result.error)
    } else {
      setLogoUrl(result.url)
    }
    setUploading(false)
    if (logoFileRef.current) logoFileRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(false)

    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('alumni_companies')
      .insert({
        name,
        logo_url: logoUrl,
        website_url: websiteUrl || null,
      })
      .select()
      .single()

    if (err) {
      setError(err.message)
      setSubmitting(false)
      return
    }

    setName('')
    setLogoUrl('')
    setWebsiteUrl('')
    setSuccess(true)
    setSubmitting(false)
    setTimeout(() => setSuccess(false), 3000)
    onInserted(data as AlumniCompany)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs tracking-[0.2em] uppercase text-[#6b7280]">Nuova azienda</p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">
            Nome azienda <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Goldman Sachs"
            className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">
            URL sito web
          </label>
          <input
            type="text"
            value={websiteUrl}
            onChange={e => setWebsiteUrl(e.target.value)}
            placeholder="https://goldmansachs.com"
            className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">
          URL logo <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            required
            value={logoUrl}
            onChange={e => setLogoUrl(e.target.value)}
            placeholder="https://... oppure carica dal PC"
            className="flex-1 px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
          />
          <button
            type="button"
            onClick={() => logoFileRef.current?.click()}
            disabled={uploading}
            className="flex-shrink-0 border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white text-xs font-medium px-4 py-3 transition-colors duration-150 disabled:opacity-50 whitespace-nowrap"
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
          <input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
        </div>
        {uploadError && <p className="text-red-500 text-xs mt-1">{uploadError}</p>}
        {logoUrl && (
          <div className="mt-2 p-3 border border-[#e5e5e5] bg-[#f9f9f7] inline-flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="preview" className="h-8 w-auto object-contain max-w-[120px]" />
            <span className="text-xs text-[#6b7280]">Preview</span>
          </div>
        )}
      </div>

      {error && (
        <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>
      )}
      {success && (
        <p className="text-[#1a4a3a] text-xs border-l-2 border-[#1a4a3a] pl-3 py-1">Azienda aggiunta con successo.</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-sm font-medium tracking-wide px-8 py-3 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Saving…' : 'Aggiungi'}
      </button>
    </form>
  )
}

// ── Alumni company row ───────────────────────────────────────────────────────

function AlumniCompanyRow({
  company,
  onDeleted,
}: {
  company: AlumniCompany
  onDeleted: (id: string) => void
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!confirm(`Eliminare "${company.name}"?`)) return
    setDeleting(true)
    const supabase = createClient()
    const { error: err } = await supabase.from('alumni_companies').delete().eq('id', company.id)
    if (err) {
      setError(err.message)
      setDeleting(false)
    } else {
      onDeleted(company.id)
      router.refresh()
    }
  }

  return (
    <div className="bg-white px-6 py-4 flex items-center justify-between gap-6 border-b border-black/5 last:border-b-0">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={company.logo_url}
          alt={company.name}
          className="h-8 w-auto object-contain max-w-[100px] flex-shrink-0 opacity-80"
        />
        <div className="min-w-0">
          <p className="font-serif text-base font-medium text-[#0a0a0a] truncate">{company.name}</p>
          {company.website_url && (
            <p className="text-xs text-[#6b7280] truncate">{company.website_url}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {error && <p className="text-red-600 text-xs">{error}</p>}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="border border-red-300 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {deleting ? '…' : 'Elimina'}
        </button>
      </div>
    </div>
  )
}

// ── Collapsible list section ─────────────────────────────────────────────────

function CollapsibleListSection({
  label,
  totalCount,
  filteredCount,
  open,
  onToggle,
  search,
  onSearch,
  emptyMessage,
  children,
}: {
  label: string
  totalCount: number
  filteredCount: number
  open: boolean
  onToggle: () => void
  search: string
  onSearch: (v: string) => void
  emptyMessage: string
  children: React.ReactNode
}) {
  return (
    <div>
      {/* Header row */}
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-3 group mb-0 w-full text-left"
      >
        <p className="text-xs tracking-[0.2em] uppercase text-[#6b7280]">
          {label} ({totalCount})
        </p>
        <svg
          className="w-3.5 h-3.5 text-[#9ca3af] transition-transform duration-200 flex-shrink-0"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsible body — CSS grid trick for smooth height animation */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.25s ease',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          {/* Search */}
          <div className="relative mt-4 mb-4">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] pointer-events-none"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => onSearch(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-4 py-2.5 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
            />
          </div>

          {/* List */}
          {totalCount === 0 ? (
            <p className="text-[#6b7280] text-sm pb-1">{emptyMessage}</p>
          ) : filteredCount === 0 ? (
            <p className="text-[#6b7280] text-sm pb-1">
              No results for &ldquo;{search}&rdquo;.
            </p>
          ) : (
            <div className="space-y-px bg-black/5 rounded-sm overflow-hidden">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function AdminClient({ items: initialItems, alumni: initialAlumni, alumniCompanies: initialAlumniCompanies }: { items: Contenuto[]; alumni: Alumni[]; alumniCompanies: AlumniCompany[] }) {
  const [items, setItems] = useState<Contenuto[]>(initialItems)
  const [alumniList, setAlumniList] = useState<Alumni[]>(initialAlumni)
  const [companiesList, setCompaniesList] = useState<AlumniCompany[]>(initialAlumniCompanies)

  // Collapsible + search state
  const [newsOpen, setNewsOpen] = useState(false)
  const [newsSearch, setNewsSearch] = useState('')
  const [alumniOpen, setAlumniOpen] = useState(false)
  const [alumniSearch, setAlumniSearch] = useState('')
  const [companiesOpen, setCompaniesOpen] = useState(false)
  const [companiesSearch, setCompaniesSearch] = useState('')

  const filteredItems = newsSearch
    ? items.filter(i => i.titolo.toLowerCase().includes(newsSearch.toLowerCase()))
    : items
  const filteredAlumni = alumniSearch
    ? alumniList.filter(a => a.name.toLowerCase().includes(alumniSearch.toLowerCase()))
    : alumniList
  const filteredCompanies = companiesSearch
    ? companiesList.filter(c => c.name.toLowerCase().includes(companiesSearch.toLowerCase()))
    : companiesList

  function handleUpdated(updated: Contenuto) {
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
  }

  function handleDeleted(id: number) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function handleInserted(item: Contenuto) {
    setItems(prev => [item, ...prev])
  }

  function handleAlumniInserted(a: Alumni) {
    setAlumniList(prev => [a, ...prev])
  }

  function handleAlumniDeleted(id: string) {
    setAlumniList(prev => prev.filter(a => a.id !== id))
  }

  const dragSrcRef = useRef<number | null>(null)
  const alumniListRef = useRef<Alumni[]>(alumniList)
  alumniListRef.current = alumniList
  const [savingOrder, setSavingOrder] = useState(false)

  function handleAlumniDragStart(idx: number) {
    dragSrcRef.current = idx
  }

  function handleAlumniDragEnter(idx: number) {
    const src = dragSrcRef.current
    if (src === null || src === idx) return
    dragSrcRef.current = idx
    setAlumniList(prev => {
      const next = [...prev]
      const [moved] = next.splice(src, 1)
      next.splice(idx, 0, moved)
      return next
    })
  }

  async function handleAlumniDragEnd() {
    dragSrcRef.current = null
    const currentList = alumniListRef.current
    setSavingOrder(true)
    const supabase = createClient()
    const results = await Promise.all(
      currentList.map((a, i) =>
        supabase.from('alumni').update({ order_index: i }).eq('id', a.id)
      )
    )
    const failed = results.find(r => r.error)
    if (failed?.error) console.error('[alumni order] save failed:', failed.error.message)
    setSavingOrder(false)
  }

  function handleCompanyInserted(c: AlumniCompany) {
    setCompaniesList(prev => [c, ...prev])
  }

  function handleCompanyDeleted(id: string) {
    setCompaniesList(prev => prev.filter(c => c.id !== id))
  }

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-8 py-10 space-y-16">

      <nav className="flex flex-wrap gap-2">
        <button
          onClick={() => scrollTo('news-events')}
          className="px-5 py-2 text-xs font-medium tracking-wide border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white transition-colors duration-150 rounded-full"
        >
          News & Events
        </button>
        <button
          onClick={() => scrollTo('alumni')}
          className="px-5 py-2 text-xs font-medium tracking-wide border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white transition-colors duration-150 rounded-full"
        >
          Alumni
        </button>
      </nav>

      <section id="news-events">
        <SectionHeading title="News & Events" />

        <div className="bg-white border border-black/10 p-8 space-y-10">

          <InsertForm onInserted={handleInserted} />

          <div className="border-t border-black/10" />

          <CollapsibleListSection
            label="Card esistenti"
            totalCount={items.length}
            filteredCount={filteredItems.length}
            open={newsOpen}
            onToggle={() => setNewsOpen(v => !v)}
            search={newsSearch}
            onSearch={setNewsSearch}
            emptyMessage="Nessuna card presente."
          >
            {filteredItems.map(item => (
              <ItemEditRow
                key={item.id}
                item={item}
                onUpdated={handleUpdated}
                onDeleted={handleDeleted}
              />
            ))}
          </CollapsibleListSection>

        </div>
      </section>

      {/* ══════════════════════════════════════
          Alumni
      ══════════════════════════════════════ */}
      <section id="alumni">
        <SectionHeading title="Alumni" />

        <div className="bg-white border border-black/10 p-8 space-y-10">

          <AlumniInsertForm onInserted={handleAlumniInserted} />

          <div className="border-t border-black/10" />

          <CollapsibleListSection
            label="Alumni esistenti"
            totalCount={alumniList.length}
            filteredCount={filteredAlumni.length}
            open={alumniOpen}
            onToggle={() => setAlumniOpen(v => !v)}
            search={alumniSearch}
            onSearch={setAlumniSearch}
            emptyMessage="Nessun alumni presente."
          >
            {alumniSearch && (
              <p className="text-xs text-[#9ca3af] px-1 pb-2">
                Drag-and-drop disabilitato durante la ricerca.
              </p>
            )}
            {savingOrder && (
              <p className="text-xs text-[#1a4a3a] px-1 pb-2">Salvataggio ordine…</p>
            )}
            {filteredAlumni.map((a, idx) => (
              <AlumniRow
                key={a.id}
                alumni={a}
                onDeleted={handleAlumniDeleted}
                dragHandlers={!alumniSearch ? {
                  onDragStart: () => handleAlumniDragStart(idx),
                  onDragEnter: () => handleAlumniDragEnter(idx),
                  onDragEnd: handleAlumniDragEnd,
                } : undefined}
              />
            ))}
          </CollapsibleListSection>

          <div className="border-t border-black/10" />

          <AlumniCompanyInsertForm onInserted={handleCompanyInserted} />

          <div className="border-t border-black/10" />

          <CollapsibleListSection
            label="Aziende esistenti"
            totalCount={companiesList.length}
            filteredCount={filteredCompanies.length}
            open={companiesOpen}
            onToggle={() => setCompaniesOpen(v => !v)}
            search={companiesSearch}
            onSearch={setCompaniesSearch}
            emptyMessage="Nessuna azienda presente."
          >
            {filteredCompanies.map(c => (
              <AlumniCompanyRow
                key={c.id}
                company={c}
                onDeleted={handleCompanyDeleted}
              />
            ))}
          </CollapsibleListSection>

        </div>
      </section>

    </div>
  )
}
