'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

const YEAR_OPTIONS = [
  '1st year',
  '2nd year',
  '3rd year',
  "Master's 1st year",
  "Master's 2nd year",
]

export default function ApplySection({ applicationsOpen }: { applicationsOpen: boolean }) {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [telephoneNumber, setTelephoneNumber] = useState('')
  const [yearOfStudy, setYearOfStudy] = useState('')
  const [degreeProgramme, setDegreeProgramme] = useState('')
  const [motivation, setMotivation] = useState('')

  const wordCount = motivation.trim().split(/\s+/).filter(Boolean).length

  function resetForm() {
    setFirstName('')
    setLastName('')
    setEmail('')
    setTelephoneNumber('')
    setYearOfStudy('')
    setDegreeProgramme('')
    setMotivation('')
    setError(null)
    setSubmitted(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (wordCount > 200) {
      setError('Motivation must not exceed 200 words.')
      return
    }
    setError(null)
    setSubmitting(true)

    const supabase = createClient()
    const { error: insertError } = await supabase.from('applications').insert({
      nome: firstName,
      cognome: lastName,
      email,
      telephone_number: telephoneNumber,
      anno_di_studio: yearOfStudy,
      degree_programme: degreeProgramme,
      motivazione: motivation,
    })

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    setSubmitted(true)
    setSubmitting(false)
  }

  const fieldClass = "w-full px-4 py-3 border border-[#d1d5db] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"

  /* ── Closed state ── */
  if (!applicationsOpen) {
    return (
      <div className="text-center py-4">
        <p className="text-sm leading-relaxed mb-6" style={{ color: '#6b7280' }}>
          Applications are currently closed. Follow us to stay updated on the next opening.
        </p>
        <a
          href="https://linktr.ee/alatainvestmentclub"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm font-medium tracking-wide px-8 py-3 transition-colors duration-150"
          style={{ background: '#1a4a3a', color: '#ffffff', border: '1px solid #1a4a3a' }}
        >
          Follow us
        </a>
      </div>
    )
  }

  /* ── Success state ── */
  if (submitted) {
    return (
      <div className="py-10 text-center">
        <p className="font-serif text-2xl font-bold text-[#0a0a0a] mb-3">
          Application received.
        </p>
        <p className="text-sm mb-6" style={{ color: '#6b7280' }}>
          Thank you for applying. We will be in touch shortly.
        </p>
        <button
          onClick={resetForm}
          className="text-sm underline"
          style={{ color: '#1a4a3a' }}
        >
          Submit another application
        </button>
      </div>
    )
  }

  /* ── Form ── */
  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* First / Last name */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      {/* Email / Telephone */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">
            Telephone Number
          </label>
          <input
            type="tel"
            value={telephoneNumber}
            onChange={e => setTelephoneNumber(e.target.value)}
            placeholder="e.g. +39 333 123 4567"
            className={fieldClass}
          />
        </div>
      </div>

      {/* Year of Study / Degree */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">
            Year of Study <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={yearOfStudy}
            onChange={e => setYearOfStudy(e.target.value)}
            className={fieldClass + ' appearance-none'}
          >
            <option value="" disabled>Select…</option>
            {YEAR_OPTIONS.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">
            Degree Programme <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={degreeProgramme}
            onChange={e => setDegreeProgramme(e.target.value)}
            placeholder="e.g. Economics"
            className={fieldClass}
          />
        </div>
      </div>

      {/* Motivation */}
      <div>
        <div className="flex items-end justify-between mb-2">
          <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280]">
            Motivation <span className="text-red-500">*</span>
          </label>
          <span className={`text-xs ${wordCount > 200 ? 'text-red-500 font-medium' : 'text-[#6b7280]'}`}>
            {wordCount} / 200 words
          </span>
        </div>
        <textarea
          required
          rows={4}
          value={motivation}
          onChange={e => setMotivation(e.target.value)}
          onInput={e => {
            const el = e.target as HTMLTextAreaElement
            el.style.height = 'auto'
            el.style.height = el.scrollHeight + 'px'
          }}
          placeholder="Why do you want to join Alata Investment Club?"
          className={fieldClass + ' resize-none overflow-hidden'}
          style={{ height: 'auto' }}
        />
      </div>

      {error && (
        <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>
      )}

      <div className="pt-1">
        <button
          type="submit"
          disabled={submitting || wordCount > 200}
          className="text-white text-sm font-medium tracking-wide px-8 py-3 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: '#1a4a3a', border: '1px solid rgba(255,255,255,0.3)' }}
          onMouseEnter={e => { if (!submitting && wordCount <= 200) (e.currentTarget as HTMLButtonElement).style.background = '#2d6b54' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1a4a3a' }}
        >
          {submitting ? 'Sending…' : 'Submit Application'}
        </button>
      </div>

    </form>
  )
}
