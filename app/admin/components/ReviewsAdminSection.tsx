'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Review } from '@/lib/types'

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mb-8">
      <h2 className="font-serif text-2xl font-bold text-forest">{title}</h2>
      <div className="w-8 h-px bg-forest mt-2" />
    </div>
  )
}

function StarDisplay({ rating }: { rating: number | null | undefined }) {
  if (rating == null) return <span className="text-xs text-ink-500">—</span>
  return (
    <span className="text-sm">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= rating ? 'text-forest' : 'text-gray-200'}>★</span>
      ))}
    </span>
  )
}

type TabType = 'alumni' | 'events'

interface ReviewModalState {
  open: boolean
  editing: Review | null
}

export default function ReviewsAdminSection({ initialReviews }: { initialReviews: Review[] }) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [activeTab, setActiveTab] = useState<TabType>('alumni')
  const [modal, setModal] = useState<ReviewModalState>({ open: false, editing: null })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Form state
  const [formAuthorName, setFormAuthorName] = useState('')
  const [formAuthorRole, setFormAuthorRole] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formRating, setFormRating] = useState<string>('')
  const [formVisible, setFormVisible] = useState(true)

  const filtered = reviews.filter(r => r.type === activeTab)

  function openAdd() {
    setFormAuthorName('')
    setFormAuthorRole('')
    setFormContent('')
    setFormRating('')
    setFormVisible(true)
    setSaveError(null)
    setModal({ open: true, editing: null })
  }

  function openEdit(review: Review) {
    setFormAuthorName(review.author_name)
    setFormAuthorRole(review.author_role ?? '')
    setFormContent(review.content)
    setFormRating(review.rating != null ? String(review.rating) : '')
    setFormVisible(review.visible)
    setSaveError(null)
    setModal({ open: true, editing: review })
  }

  function closeModal() {
    setModal({ open: false, editing: null })
    setSaveError(null)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!formAuthorName.trim() || !formContent.trim()) return
    setSaving(true)
    setSaveError(null)

    const supabase = createClient()
    const payload = {
      type: activeTab,
      author_name: formAuthorName.trim(),
      author_role: formAuthorRole.trim() || null,
      content: formContent.trim(),
      rating: formRating ? parseInt(formRating) : null,
      visible: formVisible,
    }

    if (modal.editing) {
      const { data, error } = await supabase
        .from('reviews')
        .update(payload)
        .eq('id', modal.editing.id)
        .select('*')
        .single()
      if (error) {
        setSaveError(error.message)
      } else {
        setReviews(prev => prev.map(r => (r.id === modal.editing!.id ? (data as Review) : r)))
        closeModal()
      }
    } else {
      const { data, error } = await supabase
        .from('reviews')
        .insert(payload)
        .select('*')
        .single()
      if (error) {
        setSaveError(error.message)
      } else {
        setReviews(prev => [data as Review, ...prev])
        closeModal()
      }
    }
    setSaving(false)
  }

  async function handleToggleVisible(review: Review) {
    setTogglingId(review.id)
    const supabase = createClient()
    const newVal = !review.visible
    const { error } = await supabase
      .from('reviews')
      .update({ visible: newVal })
      .eq('id', review.id)
    if (!error) {
      setReviews(prev => prev.map(r => (r.id === review.id ? { ...r, visible: newVal } : r)))
    }
    setTogglingId(null)
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('reviews').delete().eq('id', id)
    setReviews(prev => prev.filter(r => r.id !== id))
    setDeleteConfirm(null)
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <SectionHeading title="Reviews" />

      {/* Tabs */}
      <div className="flex border-b border-line-faint mb-6">
        {(['alumni', 'events'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-medium tracking-wide transition-colors duration-fast ${
              activeTab === tab
                ? 'border-b-2 border-forest text-forest'
                : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            {tab === 'alumni' ? 'Alumni Reviews' : 'Events Reviews'}
          </button>
        ))}
      </div>

      {/* Add button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={openAdd}
          className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-5 py-2.5 transition-colors duration-fast"
        >
          + Add Review
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-line-faint overflow-x-auto">
        {filtered.length === 0 ? (
          <p className="text-sm text-ink-500 text-center py-10">No reviews yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line-faint bg-[#f9f9f9]">
                <th className="text-left px-4 py-3 text-xs font-medium text-ink-500 uppercase tracking-wide">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-ink-500 uppercase tracking-wide">Ruolo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-ink-500 uppercase tracking-wide">Contenuto</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-ink-500 uppercase tracking-wide">Rating</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-ink-500 uppercase tracking-wide">Visibile</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-ink-500 uppercase tracking-wide">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(review => (
                <tr key={review.id} className="border-b border-black/5 last:border-0 hover:bg-paper-cool transition-colors">
                  <td className="px-4 py-3 font-medium text-ink-900 whitespace-nowrap">{review.author_name}</td>
                  <td className="px-4 py-3 text-ink-500 whitespace-nowrap">{review.author_role ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-900 max-w-[200px]">
                    <span className="line-clamp-2" title={review.content}>
                      {review.content.length > 60 ? review.content.slice(0, 60) + '…' : review.content}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StarDisplay rating={review.rating} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleVisible(review)}
                      disabled={togglingId === review.id}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer border-2 border-transparent transition-colors duration-fast ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${review.visible ? 'bg-forest' : 'bg-[#d1d5db]'}`}
                      role="switch"
                      aria-checked={review.visible}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 bg-white shadow transform transition duration-200 ease-in-out ${review.visible ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(review)}
                        className="border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium px-3 py-1.5 transition-colors duration-fast"
                      >
                        Modifica
                      </button>
                      {deleteConfirm === review.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-red-600">Conferma?</span>
                          <button
                            onClick={() => handleDelete(review.id)}
                            className="border border-red-400 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium px-2 py-1.5 transition-colors duration-fast"
                          >
                            Sì
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="border border-[#d1d5db] text-ink-500 hover:bg-[#f3f4f6] text-xs font-medium px-2 py-1.5 transition-colors duration-fast"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(review.id)}
                          className="border border-red-300 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium px-3 py-1.5 transition-colors duration-fast"
                        >
                          Elimina
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white border border-line-faint w-full max-w-lg mx-4 p-8 shadow-xl">
            <h3 className="font-serif text-xl font-bold text-forest mb-6">
              {modal.editing ? 'Modifica Recensione' : 'Aggiungi Recensione'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-500 uppercase tracking-wide mb-1">
                  Author Name *
                </label>
                <input
                  required
                  value={formAuthorName}
                  onChange={e => setFormAuthorName(e.target.value)}
                  placeholder="Nome autore"
                  className="w-full px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 uppercase tracking-wide mb-1">
                  Author Role
                </label>
                <input
                  value={formAuthorRole}
                  onChange={e => setFormAuthorRole(e.target.value)}
                  placeholder="Ruolo / Azienda (opzionale)"
                  className="w-full px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 uppercase tracking-wide mb-1">
                  Content *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  placeholder="Testo della recensione"
                  className="w-full px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 uppercase tracking-wide mb-1">
                  Rating
                </label>
                <select
                  value={formRating}
                  onChange={e => setFormRating(e.target.value)}
                  className="w-full px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors"
                >
                  <option value="">— nessun rating —</option>
                  {[1, 2, 3, 4, 5].map(n => (
                    <option key={n} value={n}>{'★'.repeat(n)} ({n}/5)</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formVisible}
                    onChange={e => setFormVisible(e.target.checked)}
                    className="w-4 h-4 accent-[#1a4a3a]"
                  />
                  <span className="text-sm text-ink-900">Visibile</span>
                </label>
              </div>

              {saveError && (
                <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{saveError}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="border border-[#d1d5db] text-ink-500 hover:bg-[#f3f4f6] text-xs font-medium tracking-wide px-5 py-2.5 transition-colors duration-fast"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-6 py-2.5 transition-colors duration-fast disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? '…' : 'Salva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
