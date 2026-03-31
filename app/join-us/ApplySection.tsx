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
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [yearOfStudy, setYearOfStudy] = useState('')
  const [degreeProgramme, setDegreeProgramme] = useState('')
  const [motivation, setMotivation] = useState('')

  const wordCount = motivation.trim().split(/\s+/).filter(Boolean).length

  function resetForm() {
    setFirstName('')
    setLastName('')
    setEmail('')
    setYearOfStudy('')
    setDegreeProgramme('')
    setMotivation('')
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
          className="inline-block bg-white text-[#1a4a3a] text-sm font-medium tracking-wide px-8 py-3.5 hover:bg-white/90 transition-colors duration-150"
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
        className="inline-block bg-white text-[#1a4a3a] text-sm font-medium tracking-wide px-10 py-4 hover:bg-white/90 transition-colors duration-150"
      >
        Apply Now →
      </button>

      {/* ── Modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="bg-white w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">

            {/* Modal header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-[#e5e5e5]">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#0a0a0a]">Application</h3>
                <p className="text-xs text-[#6b7280] mt-0.5">Alata Investment Club</p>
              </div>
              <button
                onClick={closeModal}
                className="text-[#6b7280] hover:text-[#0a0a0a] transition-colors p-1"
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
                  <p className="font-serif text-2xl font-bold text-[#0a0a0a] mb-3">
                    Application received.
                  </p>
                  <p className="text-[#6b7280] text-sm mb-6">
                    Thank you for applying. We will be in touch shortly.
                  </p>
                  <button
                    onClick={closeModal}
                    className="text-sm text-[#1a4a3a] hover:underline"
                  >
                    Close
                  </button>
                </div>
              ) : (
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
                        className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
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
                        className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
                    />
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
                        className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors appearance-none"
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
                        className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
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
                      rows={5}
                      value={motivation}
                      onChange={e => setMotivation(e.target.value)}
                      placeholder="Why do you want to join Alata Investment Club?"
                      className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors resize-none"
                    />
                  </div>

                  {error && (
                    <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>
                  )}

                  <div className="flex items-center gap-4 pt-1">
                    <button
                      type="submit"
                      disabled={submitting || wordCount > 200}
                      className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-sm font-medium tracking-wide px-8 py-3 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Sending…' : 'Submit Application'}
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="text-sm text-[#6b7280] hover:text-[#0a0a0a] tracking-wide transition-colors"
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
