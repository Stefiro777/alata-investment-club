'use client'

import { useState } from 'react'

export type Contact = {
  id: string
  event_id: string
  nome: string
  cognome: string
  email: string
  telefono: string | null
  anno_di_studio: string
  motivazione: string | null
  questions_for_panelists: string | null
  created_at: string
  source: 'self' | 'manual'
  added_by: string | null
  member_override: boolean | null
  checked_in: boolean
  checked_in_at: string | null
  checked_in_by: string | null
  upcoming_events: {
    title: string
    date: string
  } | null
}

type EditForm = {
  nome: string
  cognome: string
  email: string
  telefono: string
  anno_di_studio: string
  motivazione: string
  questions_for_panelists: string
  member_override: boolean | null
}

// Deletes an event_registrations row. Shared by every table that lists
// participants (CRM Contacts, Analytics Participation) so the request shape
// stays identical.
export async function deleteParticipant(id: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/admin/crm/contacts?id=${id}`, { method: 'DELETE' })
  if (res.ok) return { ok: true }
  const json = await res.json().catch(() => ({}))
  return { ok: false, error: json.error ?? 'Failed to delete' }
}

export function EditParticipantModal({
  contact,
  onSave,
  onClose,
}: {
  contact: Contact
  onSave: (updated: Contact) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<EditForm>({
    nome: contact.nome,
    cognome: contact.cognome,
    email: contact.email,
    telefono: contact.telefono ?? '',
    anno_di_studio: contact.anno_di_studio,
    motivazione: contact.motivazione ?? '',
    questions_for_panelists: contact.questions_for_panelists ?? '',
    member_override: contact.member_override,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: keyof EditForm, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const res = await fetch('/api/admin/crm/contacts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: contact.id,
        nome: form.nome.trim(),
        cognome: form.cognome.trim(),
        email: form.email.trim(),
        telefono: form.telefono.trim() || null,
        anno_di_studio: form.anno_di_studio.trim(),
        motivazione: form.motivazione.trim() || null,
        questions_for_panelists: form.questions_for_panelists.trim() || null,
        member_override: form.member_override,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Failed to save')
      setSaving(false)
      return
    }
    onSave(json.data)
    setSaving(false)
  }

  const inputClass =
    'w-full px-3 py-2 border border-[#d1d5db] focus:outline-none focus:border-forest text-sm text-[#1a1a1a] bg-white transition-colors'

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 9999 }}
      onClick={e => { if (e.target === e.currentTarget && !saving) onClose() }}
    >
      <div className="bg-white border border-line w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <p className="font-serif text-base font-bold text-forest">Edit Contact</p>
          <button onClick={onClose} disabled={saving} className="text-ink-500 hover:text-[#1a1a1a] text-xl leading-none transition-colors -m-4 p-4 disabled:opacity-40">✕</button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-500 uppercase tracking-widest mb-1">Nome *</label>
              <input required value={form.nome} onChange={e => set('nome', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-500 uppercase tracking-widest mb-1">Cognome *</label>
              <input required value={form.cognome} onChange={e => set('cognome', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 uppercase tracking-widest mb-1">Email *</label>
            <input required type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-500 uppercase tracking-widest mb-1">Telefono</label>
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-500 uppercase tracking-widest mb-1">Anno di studio *</label>
              <input required value={form.anno_di_studio} onChange={e => set('anno_di_studio', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 uppercase tracking-widest mb-1">Socio</label>
            <div className="flex gap-2">
              {([
                { value: null, label: 'Auto' },
                { value: true, label: 'Socio' },
                { value: false, label: 'Esterno' },
              ] as const).map(opt => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, member_override: opt.value }))}
                  className={`text-xs font-medium tracking-wide px-4 py-2 border transition-colors ${
                    form.member_override === opt.value
                      ? 'bg-forest text-white border-forest'
                      : 'border-[#d1d5db] text-ink-500 hover:border-forest hover:text-forest'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-ink-500 mt-1.5">
              &ldquo;Auto&rdquo; usa il matching automatico (email o nome). Scegli &ldquo;Socio&rdquo;/&ldquo;Esterno&rdquo; per forzare una correzione manuale.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 uppercase tracking-widest mb-1">Motivazione</label>
            <textarea rows={3} value={form.motivazione} onChange={e => set('motivazione', e.target.value)} className={`${inputClass} resize-none`} />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 uppercase tracking-widest mb-1">Questions for Panelists</label>
            <textarea rows={3} value={form.questions_for_panelists} onChange={e => set('questions_for_panelists', e.target.value)} className={`${inputClass} resize-none`} />
          </div>

          {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}

          <div className="flex justify-end gap-3 pt-2 border-t border-black/5">
            <button type="button" onClick={onClose} disabled={saving} className="border border-[#d1d5db] text-ink-500 hover:bg-[#f3f4f6] text-xs font-medium tracking-wide px-5 py-2.5 transition-colors disabled:opacity-40">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-6 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? '…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
