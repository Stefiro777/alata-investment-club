'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const YEAR_OPTIONS = [
  '1st year',
  '2nd year',
  '3rd year',
  "Master's 1st year",
  "Master's 2nd year",
]

export default function ApplySection({ applicationsOpen }: { applicationsOpen: boolean }) {
  const [showModal, setShowModal] = useState(false)
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
  const [privacyConsent, setPrivacyConsent] = useState(false)

  const wordCount = motivation.trim().split(/\s+/).filter(Boolean).length

  function resetForm() {
    setFirstName('')
    setLastName('')
    setEmail('')
    setTelephoneNumber('')
    setYearOfStudy('')
    setDegreeProgramme('')
    setMotivation('')
    setPrivacyConsent(false)
    setError(null)
    setSubmitted(false)
  }

  function closeModal() {
    setShowModal(false)
    resetForm()
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

  /* ── Closed state ── */
  if (!applicationsOpen) {
    return (
      <div className="flex flex-col items-center gap-5">
        <p className="text-white/80 text-sm max-w-md leading-relaxed">
          Applications are currently closed. Follow us to stay updated on the next opening.
        </p>
        <a
          href="https://linktr.ee/alatainvestmentclub"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-white text-forest text-sm font-medium tracking-wide px-8 py-3.5 hover:bg-white/90 transition-colors duration-fast"
        >
          Follow us →
        </a>
      </div>
    )
  }

  /* ── Open state ── */
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-block bg-white text-forest text-base font-medium tracking-wide px-12 py-5 hover:bg-white/90 transition-colors duration-fast"
      >
        Apply Now
      </button>

      {/* ── Modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl" style={{ background: '#D6D3CE' }}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-line">
              <div>
                <h3 className="font-serif text-xl font-bold text-ink-900">Application</h3>
                <p className="text-xs text-ink-500 mt-0.5">Alata Investment Club</p>
              </div>
              <button
                onClick={closeModal}
                className="text-ink-500 hover:text-ink-900 transition-colors p-1"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="px-8 py-6">
              {submitted ? (
                <div className="py-8 text-center">
                  <p className="font-serif text-2xl font-bold text-ink-900 mb-3">
                    Application received.
                  </p>
                  <p className="text-ink-500 text-sm mb-6">
                    Thank you for applying. We will be in touch shortly.
                  </p>
                  <button
                    onClick={closeModal}
                    className="text-sm text-forest hover:underline"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">

                  {/* First / Last name */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium tracking-wide uppercase text-ink-500 mb-2">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        className="w-full px-4 py-3 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium tracking-wide uppercase text-ink-500 mb-2">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        className="w-full px-4 py-3 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors"
                      />
                    </div>
                  </div>

                  {/* Email / Telephone */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium tracking-wide uppercase text-ink-500 mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full px-4 py-3 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium tracking-wide uppercase text-ink-500 mb-2">
                        Telephone Number
                      </label>
                      <input
                        type="tel"
                        value={telephoneNumber}
                        onChange={e => setTelephoneNumber(e.target.value)}
                        placeholder="e.g. +39 333 123 4567"
                        className="w-full px-4 py-3 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors"
                      />
                    </div>
                  </div>

                  {/* Year of Study / Degree */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium tracking-wide uppercase text-ink-500 mb-2">
                        Year of Study <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={yearOfStudy}
                        onChange={e => setYearOfStudy(e.target.value)}
                        className="w-full px-4 py-3 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors appearance-none"
                      >
                        <option value="" disabled>Select…</option>
                        {YEAR_OPTIONS.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium tracking-wide uppercase text-ink-500 mb-2">
                        Degree Programme <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={degreeProgramme}
                        onChange={e => setDegreeProgramme(e.target.value)}
                        placeholder="e.g. Economics"
                        className="w-full px-4 py-3 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors"
                      />
                    </div>
                  </div>

                  {/* Motivation */}
                  <div>
                    <div className="flex items-end justify-between mb-2">
                      <label className="block text-xs font-medium tracking-wide uppercase text-ink-500">
                        Motivation <span className="text-red-500">*</span>
                      </label>
                      <span className={`text-xs ${wordCount > 200 ? 'text-red-500 font-medium' : 'text-ink-500'}`}>
                        {wordCount} / 200 words
                      </span>
                    </div>
                    <textarea
                      required
                      rows={3}
                      value={motivation}
                      onChange={e => setMotivation(e.target.value)}
                      onInput={e => {
                        const el = e.target as HTMLTextAreaElement
                        el.style.height = 'auto'
                        el.style.height = el.scrollHeight + 'px'
                      }}
                      placeholder="Why do you want to join Alata Investment Club?"
                      className="w-full px-4 py-3 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors resize-none overflow-hidden"
                      style={{ height: 'auto' }}
                    />
                  </div>

                  {/* Privacy consent */}
                  <div className="flex items-start gap-3 pt-1">
                    <input
                      type="checkbox"
                      id="privacy-consent"
                      required
                      checked={privacyConsent}
                      onChange={e => setPrivacyConsent(e.target.checked)}
                      className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[#1a4a3a]"
                    />
                    <label htmlFor="privacy-consent" className="text-xs text-ink-500 leading-relaxed cursor-pointer">
                      I have read and accept the{' '}
                      <Link
                        href="/privacy-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-forest underline hover:text-[#123a2d]"
                      >
                        Privacy Policy
                      </Link>{' '}
                      and consent to the processing of my personal data for the purpose of evaluating my application.
                    </label>
                  </div>

                  {error && (
                    <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>
                  )}

                  <div className="flex items-center gap-4 pt-1">
                    <button
                      type="submit"
                      disabled={submitting || wordCount > 200 || !privacyConsent}
                      className="bg-forest hover:bg-forest-deep text-white text-sm font-medium tracking-wide px-8 py-3 transition-colors duration-fast disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Sending…' : 'Submit Application'}
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="text-sm text-ink-500 hover:text-ink-900 tracking-wide transition-colors"
                    >
                      Cancel
                    </button>
                  </div>

                </form>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  )
}
