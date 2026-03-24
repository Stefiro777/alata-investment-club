'use client'

import { useRef, useState } from 'react'

export type PhotoEntry =
  | { type: 'existing'; url: string }
  | { type: 'new'; file: File; preview: string }

interface Props {
  initialPhotos?: string[]
  onChange: (photos: PhotoEntry[]) => void
}

export default function PhotoUpload({ initialPhotos = [], onChange }: Props) {
  const [photos, setPhotos] = useState<PhotoEntry[]>(
    initialPhotos.map(url => ({ type: 'existing' as const, url }))
  )
  const dragIdx = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  function update(next: PhotoEntry[]) {
    setPhotos(next)
    onChange(next)
  }

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const entries: PhotoEntry[] = Array.from(files).map(file => ({
      type: 'new' as const,
      file,
      preview: URL.createObjectURL(file),
    }))
    update([...photos, ...entries])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function remove(idx: number) {
    const entry = photos[idx]
    if (entry.type === 'new') URL.revokeObjectURL(entry.preview)
    update(photos.filter((_, i) => i !== idx))
  }

  function onDragStart(e: React.DragEvent<HTMLDivElement>, idx: number) {
    dragIdx.current = idx
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>, targetIdx: number) {
    e.preventDefault()
    const from = dragIdx.current
    if (from === null || from === targetIdx) return
    const next = [...photos]
    const [moved] = next.splice(from, 1)
    next.splice(targetIdx, 0, moved)
    dragIdx.current = null
    update(next)
  }

  return (
    <div>
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors duration-150 ${
          isDragOver ? 'border-[#1a4a3a] bg-[#1a4a3a]/5' : 'border-[#e5e5e5] hover:border-[#1a4a3a]'
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setIsDragOver(false)
          addFiles(e.dataTransfer.files)
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => addFiles(e.target.files)}
        />
        <svg className="w-8 h-8 mx-auto text-[#9ca3af] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm text-[#6b7280]">
          Drag & drop, or{' '}
          <span className="text-[#1a4a3a] underline">click to select</span>
        </p>
        <p className="text-xs text-[#9ca3af] mt-1">
          Più immagini supportate · Trascina per riordinare · La prima è la copertina
        </p>
      </div>

      {/* Preview grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-4">
          {photos.map((photo, idx) => {
            const src = photo.type === 'existing' ? photo.url : photo.preview
            return (
              <div
                key={idx}
                draggable
                onDragStart={e => onDragStart(e, idx)}
                onDragOver={e => e.preventDefault()}
                onDrop={e => onDrop(e, idx)}
                className="relative aspect-square group cursor-grab active:cursor-grabbing overflow-hidden border-2 border-transparent hover:border-[#1a4a3a] transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />

                {idx === 0 && (
                  <span className="absolute top-1 left-1 bg-[#1a4a3a] text-white text-[9px] font-semibold px-1.5 py-0.5 tracking-wider uppercase pointer-events-none">
                    Cover
                  </span>
                )}

                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); remove(idx) }}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/70 hover:bg-red-500 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Rimuovi foto"
                >
                  ✕
                </button>

                {idx > 0 && (
                  <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[9px] w-4 h-4 flex items-center justify-center pointer-events-none">
                    {idx + 1}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
