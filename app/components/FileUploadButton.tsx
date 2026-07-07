'use client'

import { useRef } from 'react'

export default function FileUploadButton({
  value,
  onChange,
  accept,
  className = '',
}: {
  value: File | null
  onChange: (file: File | null) => void
  accept?: string
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full flex items-center gap-3 border border-dashed border-line px-4 py-3 text-left font-sans text-sm text-ink-500 hover:border-forest hover:text-forest transition-colors"
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 9l5-5 5 5M12 4v12" />
        </svg>
        <span className="truncate">{value ? value.name : 'Choose file'}</span>
      </button>
    </div>
  )
}
