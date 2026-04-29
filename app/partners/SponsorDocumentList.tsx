'use client'

import type { PartnerDocument } from '@/lib/types'

function DocIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )
}

async function trackPreview(documentId: string) {
  try {
    await fetch('/api/partners/document-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId }),
    })
  } catch {
    // Non-critical — ignore errors
  }
}

export default function SponsorDocumentList({ documents }: { documents: PartnerDocument[] }) {
  if (documents.length === 0) return null
  return (
    <div className="mt-4 pt-4 border-t border-line-faint">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-400 mb-2">Documenti</p>
      <ul className="space-y-1">
        {documents.map(doc => (
          <li key={doc.id}>
            <button
              onClick={() => { trackPreview(doc.id); window.open(doc.file_url, '_blank', 'noopener,noreferrer') }}
              className="flex items-center gap-2 text-sm text-ink-700 hover:text-forest transition-colors py-1 group"
            >
              <DocIcon />
              <span className="group-hover:underline underline-offset-2">{doc.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
