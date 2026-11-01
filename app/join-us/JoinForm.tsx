'use client'

import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { isValidPhone, PHONE_ERROR } from '@/lib/phone'

type Team = 'lab' | 'media' | 'events'
const TEAMS: { key: Team; label: string }[] = [
  { key: 'lab', label: 'Lab' },
  { key: 'media', label: 'Media' },
  { key: 'events', label: 'Events' },
]

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <label className={`block text-[12px] text-earth-700 ${wide ? 'sm:col-span-2' : ''}`}>
      {label}
      {children}
    </label>
  )
}

/** Pill radio group (Bachelor's / Master's, Lab / Media / Events). */
function Pills<T extends string>({ label, value, onChange, options, disabled }: {
  label: string
  value: T | null
  onChange: (v: T) => void
  options: { key: T; label: string }[]
  disabled?: (key: T) => boolean
}) {
  return (
    <fieldset>
      <legend className="text-[12px] text-earth-700">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map(o => {
          const on = value === o.key
          const off = disabled?.(o.key) ?? false
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={off}
              onClick={() => onChange(o.key)}
              className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors disabled:opacity-30 ${
                on ? 'border-night bg-night text-ivory' : 'border-night hover:bg-night/5'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length
const withProtocol = (url: string) => (url && !/^https?:\/\//i.test(url) ? `https://${url}` : url)

/** Boards J4 (Analyst application) and J6 (Member request). */
export default function JoinForm({ track }: { track: 'analyst' | 'member' }) {
  const analyst = track === 'analyst'
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [level, setLevel] = useState<'bachelor' | 'master' | null>(null)
  const [degree, setDegree] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [first, setFirst] = useState<Team | null>(null)
  const [second, setSecond] = useState<Team | null>(null)
  const [motivation, setMotivation] = useState('')
  const [cvPath, setCvPath] = useState<string | null>(null)
  const [cvName, setCvName] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function uploadCv(file: File) {
    setUploading(true)
    setError(null)
    const fd = new FormData()
    fd.append('cv', file)
    try {
      const res = await fetch('/api/applications/upload-cv', { method: 'POST', body: fd })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setError(json.error ?? 'Upload failed.'); setCvPath(null); setCvName(null) }
      else { setCvPath(json.path); setCvName(file.name) }
    } catch {
      setError('Upload failed. Please try again.')
    }
    setUploading(false)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isValidPhone(phone)) { setError(PHONE_ERROR); return }
    if (analyst && !level) { setError("Tell us whether you are on a Bachelor's or a Master's."); return }
    if (analyst && !first) { setError('Choose where you would like to start.'); return }
    if (analyst && !cvPath) { setError('Attach your CV as a PDF.'); return }
    if (wordCount(motivation) > 200) { setError('Keep the motivation under 200 words.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track,
          nome: nome.trim(),
          cognome: cognome.trim(),
          email: email.trim(),
          telephone_number: phone.trim(),
          degree_programme: degree.trim(),
          motivazione: motivation.trim(),
          ...(analyst ? { study_level: level, first_choice: first, second_choice: second, linkedin_url: withProtocol(linkedin.trim()), cv_path: cvPath } : {}),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) setError(json.error ?? 'Something went wrong. Please try again.')
      else setDone(true)
    } catch {
      setError('Network error. Please try again.')
    }
    setLoading(false)
  }

  if (done) {
    return (
      <div role="status" className="py-4">
        <p className="rd-display text-[clamp(36px,4vw,52px)] text-club">{analyst ? 'Application received.' : 'Request received.'}</p>
        <p className="mt-3 max-w-[460px] text-[15px] leading-[1.7] text-earth-700">
          {analyst
            ? 'Thank you. We read every application and reply by email.'
            : 'Thank you. We read every request; if it is a good fit, you receive the payment link for the annual fee and your membership card.'}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="grid gap-x-8 gap-y-4 sm:grid-cols-2" noValidate={false}>
      <Field label="First name"><input required autoComplete="given-name" value={nome} onChange={e => setNome(e.target.value)} className="rd-field" /></Field>
      <Field label="Last name"><input required autoComplete="family-name" value={cognome} onChange={e => setCognome(e.target.value)} className="rd-field" /></Field>
      <Field label="Email"><input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="rd-field" /></Field>
      <Field label="Phone"><input required type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+39" className="rd-field" /></Field>

      {analyst ? (
        <>
          <div className="sm:col-span-2">
            <Pills
              label="You are studying"
              value={level}
              onChange={setLevel}
              options={[{ key: 'bachelor', label: "Bachelor's" }, { key: 'master', label: "Master's" }]}
            />
          </div>
          <Field label="Degree course and year"><input required value={degree} onChange={e => setDegree(e.target.value)} placeholder="Economics, year 2" className="rd-field" /></Field>
          <Field label="LinkedIn"><input type="text" inputMode="url" autoComplete="url" value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="linkedin.com/in/…" className="rd-field" /></Field>
          <Pills label="First choice" value={first} onChange={v => { setFirst(v); if (second === v) setSecond(null) }} options={TEAMS} />
          <Pills label="Second choice" value={second} onChange={setSecond} options={TEAMS} disabled={k => k === first} />
          <div className="sm:col-span-2">
            <span className="text-[12px] text-earth-700">Your CV (PDF)</span>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadCv(f) }}
            />
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="rounded-full border border-night px-5 py-2 text-[12px] font-medium hover:bg-night/5 disabled:opacity-40">
                {uploading ? 'Uploading…' : cvName ? 'Replace' : 'Attach your CV'}
              </button>
              {cvName && <span className="min-w-0 truncate text-[13px]">{cvName}</span>}
            </div>
          </div>
        </>
      ) : (
        <Field label="Degree course and year, or what you do" wide>
          <input required value={degree} onChange={e => setDegree(e.target.value)} className="rd-field" />
        </Field>
      )}

      <Field label={analyst ? 'Why do you want to join the club as an Analyst?' : 'Why do you want to be part of the club?'} wide>
        <textarea required rows={2} value={motivation} onChange={e => setMotivation(e.target.value)} className="rd-field" />
        <span className={`mt-1 block text-right text-[11px] ${wordCount(motivation) > 200 ? 'text-[#8a2a1d]' : 'text-earth-500'}`}>{wordCount(motivation)}/200 words</span>
      </Field>

      {error && <p role="alert" className="text-[13px] text-[#8a2a1d] sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <button type="submit" disabled={loading || uploading} className="rd-italic mt-2 text-[clamp(36px,3.7vw,44px)] leading-[1.2] text-club hover:underline underline-offset-[0.18em] disabled:opacity-50">
          {loading ? 'Sending…' : analyst ? 'Send application' : 'Send request'}
        </button>
      </div>
    </form>
  )
}
