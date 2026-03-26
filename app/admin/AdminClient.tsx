'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import PhotoUpload, { PhotoEntry } from './PhotoUpload'
import type { Resource } from '@/lib/types'

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

const RESOURCE_CATEGORIES = [
  { id: 'masters',   label: 'Masters' },
  { id: 'career',    label: 'Career & Recruiting' },
  { id: 'education', label: 'Education' },
  { id: 'forbes',    label: 'Forbes Next Leaders' },
  { id: 'documenti', label: 'Documenti Alata' },
]

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mb-8">
      <h2 className="font-serif text-2xl font-bold text-[#0a0a0a]">{title}</h2>
      <div className="w-10 h-0.5 bg-[#1a4a3a] mt-2" />
    </div>
  )
}

// ── Item edit row ─────────────────────────────────────────────────────────────

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
        if (uploadError) { setError(`Upload failed: ${uploadError.message}`); setSaving(false); return }
        const { data: { publicUrl } } = supabase.storage.from('news-images').getPublicUrl(uploadData.path)
        uploadedPhotos.push(publicUrl)
      }
    }
    const payload = {
      titolo, data_pubblicazione: dataPub || null, link: link || null,
      immagine_url: uploadedPhotos[0] ?? null,
      photos: uploadedPhotos.length > 0 ? uploadedPhotos : null,
      short_description: shortDesc || null, full_description: fullDesc || null, tag: tag || null,
    }
    const { data, error: err } = await supabase.from('contenuti').update(payload).eq('id', item.id).select()
    if (err) { setError(err.message); setSaving(false); return }
    if (!data || data.length === 0) { setError('Nessuna riga aggiornata. Verifica le RLS policy su Supabase.'); setSaving(false); return }
    const refreshed = data[0] as Contenuto
    setSaved(true); setSaving(false); router.refresh(); onUpdated(refreshed)
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
    if (err) { setError(err.message); setDeleting(false) } else { onDeleted(item.id); router.refresh() }
  }

  const photoCount = (item.photos as string[] | null)?.length ?? (item.immagine_url ? 1 : 0)

  return (
    <div className={`bg-white ${expanded ? 'ring-1 ring-[#1a4a3a]' : 'border-b border-black/5'}`}>
      <div className="px-6 py-5 flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          {item.data_pubblicazione && (
            <p className="text-xs text-[#6b7280] tracking-widest uppercase mb-1">
              {new Date(item.data_pubblicazione).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-serif text-base font-medium text-[#0a0a0a] truncate">{item.titolo}</p>
            {item.tag && <span className="text-xs px-2 py-0.5 border border-[#1a4a3a] text-[#1a4a3a] whitespace-nowrap">{item.tag}</span>}
            {photoCount > 0 && <span className="text-xs text-[#9ca3af] whitespace-nowrap">{photoCount} foto</span>}
          </div>
          {(item.short_description || item.descrizione) && (
            <p className="text-[#6b7280] text-xs mt-1 line-clamp-1">{item.short_description || item.descrizione}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setExpanded(v => !v)} className="border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-150">
            {expanded ? 'Chiudi' : 'Modifica'}
          </button>
          <button onClick={handleDelete} disabled={deleting} className="border border-red-300 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed">
            {deleting ? '…' : 'Elimina'}
          </button>
        </div>
      </div>
      {expanded && (
        <form onSubmit={handleUpdate} className="px-6 pb-6 pt-4 space-y-4 border-t border-black/8">
          <div>
            <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-1">Titolo <span className="text-red-500">*</span></label>
            <input type="text" required value={titolo} onChange={e => setTitolo(e.target.value)} className="w-full px-4 py-2.5 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-1">Data pubblicazione</label>
              <input type="date" value={dataPub} onChange={e => setDataPub(e.target.value)} className="w-full px-4 py-2.5 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-1">Link esterno</label>
              <input type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." className="w-full px-4 py-2.5 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">Foto</label>
            <PhotoUpload key={photoUploadKey} initialPhotos={existingPhotos} onChange={setPhotoEntries} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280]">Homepage preview text</label>
              <span className={`text-xs tabular-nums ${shortDesc.length > 150 ? 'text-red-500' : 'text-[#9ca3af]'}`}>{shortDesc.length} / 150</span>
            </div>
            <textarea value={shortDesc} onChange={e => setShortDesc(e.target.value)} rows={2} maxLength={150} className="w-full px-4 py-2.5 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-1">Events page text</label>
            <textarea value={fullDesc} onChange={e => setFullDesc(e.target.value)} rows={4} className="w-full px-4 py-2.5 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">Tag</label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map(option => (
                <button key={option} type="button" onClick={() => setTag(tag === option ? '' : option)} className="px-4 py-1.5 text-xs font-medium tracking-wide border transition-colors duration-150" style={tag === option ? { background: '#1a4a3a', color: 'white', borderColor: '#1a4a3a' } : { background: 'white', color: '#1a4a3a', borderColor: '#1a4a3a' }}>
                  {option}
                </button>
              ))}
              {tag && <button type="button" onClick={() => setTag('')} className="px-3 py-1.5 text-xs text-[#6b7280] hover:text-[#0a0a0a] transition-colors">✕ Rimuovi</button>}
            </div>
          </div>
          {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}
          <div className="flex items-center gap-4 pt-1">
            <button type="submit" disabled={saving} className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-sm font-medium tracking-wide px-8 py-2.5 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Saving…' : 'Aggiorna'}
            </button>
            {saved && <span className="text-[#1a4a3a] text-xs font-medium border-l-2 border-[#1a4a3a] pl-3 py-1">Salvato!</span>}
          </div>
        </form>
      )}
    </div>
  )
}

// ── Insert form ───────────────────────────────────────────────────────────────

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
    setSubmitting(true); setError(null); setSuccess(false)
    const supabase = createClient()
    const uploadedPhotos: string[] = []
    for (const entry of photoEntries) {
      if (entry.type === 'existing') {
        uploadedPhotos.push(entry.url)
      } else {
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}-${entry.file.name.replace(/\s+/g, '_')}`
        const { data: uploadData, error: uploadError } = await supabase.storage.from('news-images').upload(path, entry.file, { upsert: false })
        if (uploadError) { setError(`Upload failed: ${uploadError.message}`); setSubmitting(false); return }
        const { data: { publicUrl } } = supabase.storage.from('news-images').getPublicUrl(uploadData.path)
        uploadedPhotos.push(publicUrl)
      }
    }
    const { data: result, error: err } = await supabase.from('contenuti').insert({
      titolo, tipo: 'evento', data_pubblicazione: dataPub || null, link: link || null,
      short_description: shortDesc || null, full_description: fullDesc || null, tag: tag || null,
      immagine_url: uploadedPhotos[0] ?? null, photos: uploadedPhotos.length > 0 ? uploadedPhotos : null,
    }).select().single()
    if (err) { setError(err.message); setSubmitting(false); return }
    setTitolo(''); setDataPub(''); setLink(''); setShortDesc(''); setFullDesc(''); setTag(''); setPhotoEntries([]); setPhotoUploadKey(k => k + 1)
    setSuccess(true); setSubmitting(false)
    setTimeout(() => setSuccess(false), 3000)
    onInserted(result as Contenuto)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-xs tracking-[0.2em] uppercase text-[#6b7280]">Nuova card</p>
      <div>
        <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">Titolo <span className="text-red-500">*</span></label>
        <input type="text" required value={titolo} onChange={e => setTitolo(e.target.value)} className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors" />
      </div>
      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">Data pubblicazione</label>
          <input type="date" value={dataPub} onChange={e => setDataPub(e.target.value)} className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">Link esterno (opzionale)</label>
          <input type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-3">Foto</label>
        <PhotoUpload key={photoUploadKey} initialPhotos={[]} onChange={setPhotoEntries} />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280]">Homepage preview text</label>
          <span className={`text-xs tabular-nums ${shortDesc.length > 150 ? 'text-red-500' : 'text-[#9ca3af]'}`}>{shortDesc.length} / 150</span>
        </div>
        <textarea value={shortDesc} onChange={e => setShortDesc(e.target.value)} rows={2} maxLength={150} placeholder="Breve testo visibile nella sezione News & Events in homepage..." className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors resize-none placeholder-[#c4c4c4]" />
      </div>
      <div>
        <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">Events page text</label>
        <textarea value={fullDesc} onChange={e => setFullDesc(e.target.value)} rows={5} placeholder="Descrizione completa visibile nella pagina /events..." className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors resize-none placeholder-[#c4c4c4]" />
      </div>
      <div>
        <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-3">Tag</label>
        <div className="flex flex-wrap gap-2">
          {TAG_OPTIONS.map(option => (
            <button key={option} type="button" onClick={() => setTag(tag === option ? '' : option)} className="px-4 py-1.5 text-xs font-medium tracking-wide border transition-colors duration-150" style={tag === option ? { background: '#1a4a3a', color: 'white', borderColor: '#1a4a3a' } : { background: 'white', color: '#1a4a3a', borderColor: '#1a4a3a' }}>
              {option}
            </button>
          ))}
          {tag && <button type="button" onClick={() => setTag('')} className="px-3 py-1.5 text-xs text-[#6b7280] hover:text-[#0a0a0a] transition-colors">✕ Rimuovi tag</button>}
        </div>
      </div>
      {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}
      {success && <p className="text-[#1a4a3a] text-xs border-l-2 border-[#1a4a3a] pl-3 py-1">Card creata con successo.</p>}
      <button type="submit" disabled={submitting} className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-sm font-medium tracking-wide px-8 py-3 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
        {submitting ? 'Saving…' : 'Salva'}
      </button>
    </form>
  )
}

// ── Resource file upload helper ───────────────────────────────────────────────

async function uploadResourceFile(file: File): Promise<{ url: string } | { error: string }> {
  const supabase = createClient()
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/\s+/g, '_')}`
  const { data, error } = await supabase.storage
    .from('resources')
    .upload(path, file, { upsert: false })
  if (error) return { error: error.message }
  const { data: { publicUrl } } = supabase.storage.from('resources').getPublicUrl(data.path)
  return { url: publicUrl }
}

// ── Resource insert form ──────────────────────────────────────────────────────

function ResourceInsertForm({ onInserted }: { onInserted: (r: Resource) => void }) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState('masters')
  const [subcategory, setSubcategory] = useState('')
  const [isFolder, setIsFolder] = useState(false)
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    const result = await uploadResourceFile(file)
    if ('error' in result) {
      setUploadError(result.error)
    } else {
      setUrl(result.url)
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true); setError(null); setSuccess(false)
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('resources')
      .insert({ title: title.trim(), url: url.trim(), category, subcategory: subcategory.trim() || null, is_folder: isFolder, description: description.trim() || null })
      .select('id, title, description, url, category, subcategory, is_folder, order_index, created_at')
      .single()
    if (err || !data) { setError(err?.message ?? 'Error'); setSubmitting(false); return }
    onInserted(data as Resource)
    setTitle(''); setUrl(''); setSubcategory(''); setIsFolder(false); setDescription('')
    setSuccess(true); setSubmitting(false)
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs tracking-[0.2em] uppercase text-[#6b7280]">Nuova risorsa</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">Titolo <span className="text-red-500">*</span></label>
          <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="Guida ai Master" className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">Categoria <span className="text-red-500">*</span></label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors">
            {RESOURCE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">URL <span className="text-red-500">*</span></label>
        <div className="flex gap-2">
          <input type="url" required value={url} onChange={e => setUrl(e.target.value)} placeholder="https://drive.google.com/..." className="flex-1 px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors" />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="flex-shrink-0 border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white text-xs font-medium px-4 py-3 transition-colors duration-150 disabled:opacity-50 whitespace-nowrap">
            {uploading ? 'Uploading…' : 'Upload file'}
          </button>
          <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} />
        </div>
        {uploadError && <p className="text-red-500 text-xs mt-1">{uploadError}</p>}
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">Sottocategoria (opzionale)</label>
          <input type="text" value={subcategory} onChange={e => setSubcategory(e.target.value)} placeholder="Es. Prep Colloqui" className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">Descrizione (opzionale)</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Breve descrizione…" className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors" />
        </div>
      </div>
      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={isFolder} onChange={e => setIsFolder(e.target.checked)} className="w-4 h-4 accent-[#1a4a3a]" />
        <span className="text-sm text-[#0a0a0a]">È una cartella (folder)</span>
      </label>
      {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}
      {success && <p className="text-[#1a4a3a] text-xs border-l-2 border-[#1a4a3a] pl-3 py-1">Risorsa aggiunta.</p>}
      <button type="submit" disabled={submitting} className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-sm font-medium tracking-wide px-8 py-3 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
        {submitting ? 'Saving…' : 'Aggiungi'}
      </button>
    </form>
  )
}

// ── Resource row ──────────────────────────────────────────────────────────────

function ResourceRow({ resource, onUpdated, onDeleted, showDragHandle }: { resource: Resource; onUpdated: (r: Resource) => void; onDeleted: (id: string) => void; showDragHandle?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle] = useState(resource.title)
  const [url, setUrl] = useState(resource.url)
  const [subcategory, setSubcategory] = useState(resource.subcategory ?? '')
  const [description, setDescription] = useState(resource.description ?? '')
  const [isFolder, setIsFolder] = useState(resource.is_folder)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    const result = await uploadResourceFile(file)
    if ('error' in result) {
      setUploadError(result.error)
    } else {
      setUrl(result.url)
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setSaved(false); setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.from('resources').update({
      title: title.trim(), url: url.trim(),
      subcategory: subcategory.trim() || null,
      description: description.trim() || null,
      is_folder: isFolder,
    }).eq('id', resource.id)
    if (err) { setError(err.message); setSaving(false); return }
    onUpdated({ ...resource, title: title.trim(), url: url.trim(), subcategory: subcategory.trim() || null, description: description.trim() || null, is_folder: isFolder })
    setSaved(true); setSaving(false)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleDelete() {
    if (!confirm(`Eliminare "${resource.title}"?`)) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('resources').delete().eq('id', resource.id)
    onDeleted(resource.id)
  }

  return (
    <div className={`bg-white ${expanded ? 'ring-1 ring-[#1a4a3a]' : 'border-b border-black/5'}`}>
      <div className="px-4 py-4 flex items-center gap-3">
        {showDragHandle && (
          <div className="cursor-grab active:cursor-grabbing text-[#9ca3af] hover:text-[#1a4a3a] transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="7" cy="5" r="1.5" /><circle cx="13" cy="5" r="1.5" />
              <circle cx="7" cy="10" r="1.5" /><circle cx="13" cy="10" r="1.5" />
              <circle cx="7" cy="15" r="1.5" /><circle cx="13" cy="15" r="1.5" />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-serif text-sm font-medium text-[#0a0a0a] truncate">{resource.title}</p>
            {resource.is_folder && <span className="text-xs px-2 py-0.5 border border-[#9ca3af] text-[#9ca3af]">folder</span>}
            {resource.subcategory && <span className="text-xs px-2 py-0.5 border border-[#1a4a3a] text-[#1a4a3a]">{resource.subcategory}</span>}
          </div>
          {resource.description && <p className="text-xs text-[#6b7280] mt-0.5 truncate">{resource.description}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setExpanded(v => !v)} className="border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-150">
            {expanded ? 'Chiudi' : 'Modifica'}
          </button>
          <button onClick={handleDelete} disabled={deleting} className="border border-red-300 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-150 disabled:opacity-40">
            {deleting ? '…' : 'Elimina'}
          </button>
        </div>
      </div>
      {expanded && (
        <form onSubmit={handleUpdate} className="px-6 pb-6 pt-4 space-y-3 border-t border-black/8">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-1">Titolo</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-1">URL</label>
              <div className="flex gap-2">
                <input value={url} onChange={e => setUrl(e.target.value)} className="flex-1 px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm bg-white" />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="flex-shrink-0 border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white text-xs font-medium px-3 py-2 transition-colors duration-150 disabled:opacity-50 whitespace-nowrap">
                  {uploading ? '…' : 'Upload'}
                </button>
                <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} />
              </div>
              {uploadError && <p className="text-red-500 text-xs mt-1">{uploadError}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-1">Sottocategoria</label>
              <input value={subcategory} onChange={e => setSubcategory(e.target.value)} placeholder="Es. Prep Colloqui" className="w-full px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-1">Descrizione</label>
              <input value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm bg-white" />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isFolder} onChange={e => setIsFolder(e.target.checked)} className="w-4 h-4 accent-[#1a4a3a]" />
            <span className="text-sm text-[#0a0a0a]">È una cartella</span>
          </label>
          {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium tracking-wide px-5 py-2 transition-colors duration-150 disabled:opacity-50">
              {saving ? '…' : 'Salva'}
            </button>
            {saved && <span className="text-xs text-[#1a4a3a] font-medium">Salvato</span>}
          </div>
        </form>
      )}
    </div>
  )
}

// ── Collapsible list section ──────────────────────────────────────────────────

function CollapsibleListSection({
  label, totalCount, filteredCount, open, onToggle, search, onSearch, emptyMessage, children,
}: {
  label: string; totalCount: number; filteredCount: number; open: boolean; onToggle: () => void
  search: string; onSearch: (v: string) => void; emptyMessage: string; children: React.ReactNode
}) {
  return (
    <div>
      <button type="button" onClick={onToggle} className="flex items-center gap-3 group mb-0 w-full text-left">
        <p className="text-xs tracking-[0.2em] uppercase text-[#6b7280]">{label} ({totalCount})</p>
        <svg className="w-3.5 h-3.5 text-[#9ca3af] transition-transform duration-200 flex-shrink-0" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.25s ease' }}>
        <div style={{ overflow: 'hidden' }}>
          <div className="relative mt-4 mb-4">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={search} onChange={e => onSearch(e.target.value)} placeholder="Search..." className="w-full pl-9 pr-4 py-2.5 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors" />
          </div>
          {totalCount === 0 ? (
            <p className="text-[#6b7280] text-sm pb-1">{emptyMessage}</p>
          ) : filteredCount === 0 ? (
            <p className="text-[#6b7280] text-sm pb-1">No results for &ldquo;{search}&rdquo;.</p>
          ) : (
            <div className="space-y-px bg-black/5 rounded-sm overflow-hidden">{children}</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Resource list with drag-and-drop ─────────────────────────────────────────

function ResourceDraggableList({
  label,
  resources,
  search,
  onSearch,
  open,
  onToggle,
  onUpdated,
  onDeleted,
  onReordered,
}: {
  label: string
  resources: Resource[]
  search: string
  onSearch: (v: string) => void
  open: boolean
  onToggle: () => void
  onUpdated: (r: Resource) => void
  onDeleted: (id: string) => void
  onReordered: (reordered: Resource[]) => void
}) {
  const listRef = useRef<Resource[]>(resources)
  listRef.current = resources
  const dragIndex = useRef<number | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)

  function onDragStart(index: number) {
    dragIndex.current = index
  }

  async function onDrop(index: number) {
    const from = dragIndex.current
    if (from === null || from === index) { dragIndex.current = null; return }
    const next = [...listRef.current]
    const [moved] = next.splice(from, 1)
    next.splice(index, 0, moved)
    dragIndex.current = null
    onReordered(next)
    setSavingOrder(true)
    setOrderError(null)
    const supabase = createClient()
    const results = await Promise.all(
      next.map((r, i) => supabase.from('resources').update({ order_index: i }).eq('id', r.id))
    )
    setSavingOrder(false)
    const failed = results.find(r => r.error)
    if (failed?.error) setOrderError(failed.error.message)
  }

  const isSearching = search.length > 0
  const filtered = isSearching
    ? resources.filter(r => r.title.toLowerCase().includes(search.toLowerCase()))
    : resources

  return (
    <div>
      <button type="button" onClick={onToggle} className="flex items-center gap-3 group mb-0 w-full text-left">
        <p className="text-xs tracking-[0.2em] uppercase text-[#6b7280]">{label} ({resources.length})</p>
        {savingOrder && <span className="text-xs text-[#9ca3af]">Saving…</span>}
        {orderError && <span className="text-xs text-red-500">{orderError}</span>}
        <svg className="w-3.5 h-3.5 text-[#9ca3af] transition-transform duration-200 flex-shrink-0" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.25s ease' }}>
        <div style={{ overflow: 'hidden' }}>
          <div className="relative mt-4 mb-4">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={search} onChange={e => onSearch(e.target.value)} placeholder="Search..." className="w-full pl-9 pr-4 py-2.5 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors" />
          </div>
          {resources.length === 0 ? (
            <p className="text-[#6b7280] text-sm pb-1">Nessuna risorsa per questa categoria.</p>
          ) : filtered.length === 0 ? (
            <p className="text-[#6b7280] text-sm pb-1">No results for &ldquo;{search}&rdquo;.</p>
          ) : (
            <div className="space-y-px bg-black/5 rounded-sm overflow-hidden">
              {filtered.map((r, i) => (
                <div
                  key={r.id}
                  draggable={!isSearching}
                  onDragStart={!isSearching ? () => onDragStart(i) : undefined}
                  onDragOver={!isSearching ? e => e.preventDefault() : undefined}
                  onDrop={!isSearching ? () => onDrop(i) : undefined}
                >
                  <ResourceRow resource={r} showDragHandle={!isSearching} onUpdated={onUpdated} onDeleted={onDeleted} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Subcategory order panel ───────────────────────────────────────────────────

function SubcategoryOrderPanel({
  category,
  resources,
  onSaved,
}: {
  category: string
  resources: Resource[]
  onSaved: (subcategory: string, order: number) => void
}) {
  const subcategoryNames = Array.from(
    new Set(resources.map(r => r.subcategory).filter(Boolean) as string[])
  )

  // Initialize order values from the first resource found per subcategory
  const [orders, setOrders] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      subcategoryNames.map(name => {
        const first = resources.find(r => r.subcategory === name)
        return [name, first?.subcategory_order ?? 0]
      })
    )
  )
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string | null>>({})

  if (subcategoryNames.length < 2) return null

  async function handleBlur(name: string) {
    setSaving(prev => ({ ...prev, [name]: true }))
    setErrors(prev => ({ ...prev, [name]: null }))
    const supabase = createClient()
    const { error } = await supabase
      .from('resources')
      .update({ subcategory_order: orders[name] })
      .eq('category', category)
      .eq('subcategory', name)
    setSaving(prev => ({ ...prev, [name]: false }))
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error.message }))
    } else {
      onSaved(name, orders[name])
      setSaved(prev => ({ ...prev, [name]: true }))
      setTimeout(() => setSaved(prev => ({ ...prev, [name]: false })), 2000)
    }
  }

  return (
    <div>
      <p className="text-xs tracking-[0.2em] uppercase text-[#6b7280] mb-4">Ordine sottocategorie</p>
      <div className="space-y-px bg-black/5 rounded-sm overflow-hidden">
        {subcategoryNames.map(name => (
          <div key={name} className="bg-white flex items-center gap-4 px-4 py-3">
            <span className="flex-1 text-sm text-[#0a0a0a]">{name}</span>
            <input
              type="number"
              value={orders[name] ?? 0}
              onChange={e => setOrders(prev => ({ ...prev, [name]: parseInt(e.target.value) || 0 }))}
              onBlur={() => handleBlur(name)}
              className="w-20 px-2 py-1.5 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-center bg-white"
            />
            {saving[name] && <span className="text-xs text-[#9ca3af] w-10">…</span>}
            {saved[name] && <span className="text-xs text-[#1a4a3a] font-medium w-10">Saved</span>}
            {errors[name] && <span className="text-xs text-red-500 truncate max-w-[12rem]">{errors[name]}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminClient({
  items: initialItems,
  resources: initialResources,
}: {
  items: Contenuto[]
  resources: Resource[]
}) {
  const [items, setItems] = useState<Contenuto[]>(initialItems)
  const [resourcesList, setResourcesList] = useState<Resource[]>(initialResources)
  const [activeCat, setActiveCat] = useState('masters')

  const [newsOpen, setNewsOpen] = useState(false)
  const [newsSearch, setNewsSearch] = useState('')
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [resourcesSearch, setResourcesSearch] = useState('')

  const filteredItems = newsSearch
    ? items.filter(i => i.titolo.toLowerCase().includes(newsSearch.toLowerCase()))
    : items

  const catResources = resourcesList.filter(r => r.category === activeCat)

  function handleUpdated(updated: Contenuto) { setItems(prev => prev.map(i => i.id === updated.id ? updated : i)) }
  function handleDeleted(id: number) { setItems(prev => prev.filter(i => i.id !== id)) }
  function handleInserted(item: Contenuto) { setItems(prev => [item, ...prev]) }
  function handleResourceInserted(r: Resource) { setResourcesList(prev => [...prev, r]) }
  function handleResourceUpdated(r: Resource) { setResourcesList(prev => prev.map(x => x.id === r.id ? r : x)) }
  function handleResourceDeleted(id: string) { setResourcesList(prev => prev.filter(r => r.id !== id)) }
  function handleResourceReordered(reordered: Resource[]) {
    setResourcesList(prev => {
      const others = prev.filter(r => r.category !== activeCat)
      return [...others, ...reordered.map((r, i) => ({ ...r, order_index: i }))]
    })
  }
  function handleSubcategoryOrderSaved(subcategory: string, order: number) {
    setResourcesList(prev =>
      prev.map(r =>
        r.category === activeCat && r.subcategory === subcategory
          ? { ...r, subcategory_order: order }
          : r
      )
    )
  }
  function scrollTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-8 py-10 space-y-16">

      <nav className="flex flex-wrap gap-2">
        {[{ label: 'News & Events', id: 'news-events' }, { label: 'Risorse Dashboard', id: 'resources' }].map(({ label, id }) => (
          <button key={id} onClick={() => scrollTo(id)} className="px-5 py-2 text-xs font-medium tracking-wide border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white transition-colors duration-150 rounded-full">
            {label}
          </button>
        ))}
      </nav>

      {/* ── News & Events ── */}
      <section id="news-events">
        <SectionHeading title="News & Events" />
        <div className="bg-white border border-black/10 p-8 space-y-10">
          <InsertForm onInserted={handleInserted} />
          <div className="border-t border-black/10" />
          <CollapsibleListSection label="Card esistenti" totalCount={items.length} filteredCount={filteredItems.length} open={newsOpen} onToggle={() => setNewsOpen(v => !v)} search={newsSearch} onSearch={setNewsSearch} emptyMessage="Nessuna card presente.">
            {filteredItems.map(item => (
              <ItemEditRow key={item.id} item={item} onUpdated={handleUpdated} onDeleted={handleDeleted} />
            ))}
          </CollapsibleListSection>
        </div>
      </section>

      {/* ── Risorse Dashboard ── */}
      <section id="resources">
        <SectionHeading title="Risorse Dashboard" />
        <div className="bg-white border border-black/10 p-8 space-y-8">

          {/* Category tabs */}
          <div className="flex flex-wrap gap-2">
            {RESOURCE_CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => { setActiveCat(c.id); setResourcesOpen(false); setResourcesSearch('') }}
                className={`px-4 py-1.5 text-xs font-medium tracking-wide border transition-colors duration-150 ${
                  activeCat === c.id ? 'bg-[#1a4a3a] text-white border-[#1a4a3a]' : 'border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white'
                }`}
              >
                {c.label} ({resourcesList.filter(r => r.category === c.id).length})
              </button>
            ))}
          </div>

          <div className="border-t border-black/10" />

          <ResourceInsertForm onInserted={handleResourceInserted} />

          <div className="border-t border-black/10" />

          <ResourceDraggableList
            label={`Risorse — ${RESOURCE_CATEGORIES.find(c => c.id === activeCat)?.label}`}
            resources={catResources}
            search={resourcesSearch}
            onSearch={setResourcesSearch}
            open={resourcesOpen}
            onToggle={() => setResourcesOpen(v => !v)}
            onUpdated={handleResourceUpdated}
            onDeleted={handleResourceDeleted}
            onReordered={handleResourceReordered}
          />

          <SubcategoryOrderPanel
            key={activeCat}
            category={activeCat}
            resources={catResources}
            onSaved={handleSubcategoryOrderSaved}
          />

        </div>
      </section>

    </div>
  )
}
