'use client'

import { useState } from 'react'
import { SegmentedPills } from '@/app/components/member/ui'
import { Dialog, fieldCls, labelCls, btnPrimary, btnGhost, errorCls } from './crm/ui'

const OVERRIDE_OPTIONS = [
  { key: 'auto', value: null, label: 'Auto' },
  { key: 'member', value: true, label: 'Socio' },
  { key: 'external', value: false, label: 'Esterno' },
] as const

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
  /** Computed server-side by GET /api/admin/crm/contacts (email/name match + override). */
  is_member?: boolean
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

  return (
    <Dialog title="Edit contact" sub={contact.upcoming_events?.title} onClose={onClose} busy={saving}>
      <form onSubmit={handleSave} className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <label className="block"><span className={labelCls}>Nome *</span>
            <input required value={form.nome} onChange={e => set('nome', e.target.value)} className={fieldCls} /></label>
          <label className="block"><span className={labelCls}>Cognome *</span>
            <input required value={form.cognome} onChange={e => set('cognome', e.target.value)} className={fieldCls} /></label>
        </div>
        <label className="block"><span className={labelCls}>Email *</span>
          <input required type="email" value={form.email} onChange={e => set('email', e.target.value)} className={fieldCls} /></label>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <label className="block"><span className={labelCls}>Telefono</span>
            <input value={form.telefono} onChange={e => set('telefono', e.target.value)} className={fieldCls} /></label>
          <label className="block"><span className={labelCls}>Anno di studio *</span>
            <input required value={form.anno_di_studio} onChange={e => set('anno_di_studio', e.target.value)} className={fieldCls} /></label>
        </div>
        <div>
          <span className={`${labelCls} mb-2`}>Socio</span>
          <SegmentedPills
            size="sm"
            label="Socio"
            options={OVERRIDE_OPTIONS.map(o => ({ value: o.key, label: o.label }))}
            value={OVERRIDE_OPTIONS.find(o => o.value === form.member_override)?.key ?? 'auto'}
            onChange={k => setForm(prev => ({ ...prev, member_override: OVERRIDE_OPTIONS.find(o => o.key === k)?.value ?? null }))}
          />
          <p className="mt-2 text-[11px] leading-[1.5] text-earth-500">
            &ldquo;Auto&rdquo; usa il matching automatico (email o nome). Scegli &ldquo;Socio&rdquo;/&ldquo;Esterno&rdquo; per forzare una correzione manuale.
          </p>
        </div>
        <label className="block"><span className={labelCls}>Motivazione</span>
          <textarea rows={3} value={form.motivazione} onChange={e => set('motivazione', e.target.value)} className={`${fieldCls} resize-none`} /></label>
        <label className="block"><span className={labelCls}>Questions for panelists</span>
          <textarea rows={3} value={form.questions_for_panelists} onChange={e => set('questions_for_panelists', e.target.value)} className={`${fieldCls} resize-none`} /></label>

        {error && <p className={errorCls}>{error}</p>}

        <div className="flex justify-end gap-2 border-t border-night/20 pt-4">
          <button type="button" onClick={onClose} disabled={saving} className={btnGhost}>Cancel</button>
          <button type="submit" disabled={saving} className={btnPrimary}>{saving ? '…' : 'Save'}</button>
        </div>
      </form>
    </Dialog>
  )
}
