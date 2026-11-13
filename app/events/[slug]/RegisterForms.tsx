'use client'

import { useState, type FormEvent, type ReactNode } from 'react'
import { isValidPhone, PHONE_ERROR } from '@/lib/phone'
import { EVENT_YEARS } from '@/lib/event-years'

/* Inline versions of EventRegistrationModal / EventWaitlistModal for the
   event page (boards Se3, Se4). Same endpoints, same payloads, same checks. */

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <label className={`block text-[13px] text-earth-700 ${wide ? 'sm:col-span-2' : ''}`}>
      {label}
      {children}
    </label>
  )
}

function Done({ title, text }: { title: string; text: string }) {
  return (
    <div role="status" className="py-6">
      <p className="rd-display text-[clamp(34px,4vw,48px)] text-club">{title}</p>
      <p className="mt-3 max-w-[460px] text-[15px] leading-[1.7] text-earth-700">{text}</p>
    </div>
  )
}

export function RegistrationForm({
  event,
}: {
  event: { id: string; registration_field?: 'motivation' | 'panelists' | null; allowed_years?: string[] | null }
}) {
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [anno, setAnno] = useState('')
  const [fieldValue, setFieldValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isPanelists = event.registration_field === 'panelists'
  const showField = event.registration_field === 'motivation' || isPanelists

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !cognome.trim() || !email.trim() || !anno) return
    if (!isValidPhone(telefono)) { setError(PHONE_ERROR); return }
    if (showField && !fieldValue.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/event-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          nome: nome.trim(),
          cognome: cognome.trim(),
          email: email.trim(),
          telefono: telefono.trim(),
          anno_di_studio: anno,
          ...(showField
            ? isPanelists
              ? { questions_for_panelists: fieldValue.trim() }
              : { motivazione: fieldValue.trim() }
            : {}),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) setError(json.error ?? 'Something went wrong. Please try again.')
      else setSuccess(true)
    } catch {
      setError('Network error. Please try again.')
    }
    setLoading(false)
  }

  if (success) return <Done title="You are registered." text="We have received your registration. Details follow by email." />

  return (
    <form onSubmit={submit} className="grid gap-x-8 gap-y-[22px] sm:grid-cols-2">
      <Field label="First name"><input required autoComplete="given-name" value={nome} onChange={e => setNome(e.target.value)} placeholder="Giulia" className="rd-field" /></Field>
      <Field label="Last name"><input required autoComplete="family-name" value={cognome} onChange={e => setCognome(e.target.value)} placeholder="Rossi" className="rd-field" /></Field>
      <Field label="Email" wide><input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@studenti.unibs.it" className="rd-field" /></Field>
      <Field label="Phone"><input required type="tel" autoComplete="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+39" className="rd-field" /></Field>
      <Field label="Year of study">
        <select required value={anno} onChange={e => setAnno(e.target.value)} className={`rd-field cursor-pointer ${anno ? '' : 'text-night/40'}`}>
          <option value="" disabled>Choose</option>
          {EVENT_YEARS.filter(y => !event.allowed_years?.length || event.allowed_years.includes(y.value)).map(y => <option key={y.form} value={y.form} className="text-night">{y.form}</option>)}
        </select>
      </Field>
      {showField && (
        <Field label={isPanelists ? 'Questions for the speaker' : 'Why do you want to take part?'} wide>
          <textarea
            required
            rows={2}
            maxLength={500}
            value={fieldValue}
            onChange={e => setFieldValue(e.target.value)}
            placeholder={isPanelists ? 'What would you like to ask?' : 'A few lines on your motivation'}
            className="rd-field"
          />
          <span className="mt-1 block text-right text-[11px] text-earth-500">{fieldValue.length}/500</span>
        </Field>
      )}
      {error && <p role="alert" className="text-[13px] text-[#8a2a1d] sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <button type="submit" disabled={loading} className="rd-italic mt-4 text-[clamp(36px,4vw,48px)] text-club hover:underline underline-offset-[0.18em] disabled:opacity-50">
          {loading ? 'Sending…' : 'Confirm registration'}
        </button>
      </div>
    </form>
  )
}

export function WaitlistForm({ eventId }: { eventId: string }) {
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [website, setWebsite] = useState('') // honeypot: must stay empty
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !cognome.trim() || !email.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/event-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          nome: nome.trim(),
          cognome: cognome.trim(),
          email: email.trim(),
          telefono: telefono.trim() || null,
          website,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) setError(json.error ?? 'Something went wrong. Please try again.')
      else setSuccess(true)
    } catch {
      setError('Network error. Please try again.')
    }
    setLoading(false)
  }

  if (success) return <Done title="You are on the waitlist." text="If a place becomes free, we write to you straight away." />

  return (
    <form onSubmit={submit} className="grid gap-x-8 gap-y-[22px] sm:grid-cols-2">
      <Field label="First name"><input required autoComplete="given-name" value={nome} onChange={e => setNome(e.target.value)} className="rd-field" /></Field>
      <Field label="Last name"><input required autoComplete="family-name" value={cognome} onChange={e => setCognome(e.target.value)} className="rd-field" /></Field>
      <Field label="Email" wide><input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="rd-field" /></Field>
      <Field label="Phone (optional)" wide><input type="tel" autoComplete="tel" value={telefono} onChange={e => setTelefono(e.target.value)} className="rd-field" /></Field>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} className="hidden" aria-hidden />
      {error && <p role="alert" className="text-[13px] text-[#8a2a1d] sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <button type="submit" disabled={loading} className="rd-italic mt-4 text-[clamp(36px,4vw,48px)] text-club hover:underline underline-offset-[0.18em] disabled:opacity-50">
          {loading ? 'Sending…' : 'Join the waitlist'}
        </button>
      </div>
    </form>
  )
}
