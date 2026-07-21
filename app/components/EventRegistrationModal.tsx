'use client'

import { useState } from 'react'

const ANNI = [
  '1st year Bachelor',
  '2nd year Bachelor',
  '3rd year Bachelor',
  '1st year Master',
  '2nd year Master',
]

interface EventRegistrationModalProps {
  event: { id: string; title: string; date: string; registration_field?: 'motivation' | 'panelists' | null }
  onClose: () => void
}

export default function EventRegistrationModal({ event, onClose }: EventRegistrationModalProps) {
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
  const showFieldPrompt = event.registration_field === 'motivation' || event.registration_field === 'panelists'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !cognome.trim() || !email.trim() || !anno) return
    if (showFieldPrompt && !fieldValue.trim()) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/event-registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: event.id,
        nome: nome.trim(),
        cognome: cognome.trim(),
        email: email.trim(),
        telefono: telefono.trim() || null,
        anno_di_studio: anno,
        ...(showFieldPrompt
          ? isPanelists
            ? { questions_for_panelists: fieldValue.trim() }
            : { motivazione: fieldValue.trim() }
          : {}),
      }),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Something went wrong. Please try again.')
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  // Format date for display
  const dateObj = new Date(event.date + 'T00:00:00')
  const formattedDate = dateObj.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const inputClass =
    'w-full bg-transparent border-0 border-b border-gray-300 focus:border-forest focus:outline-none text-black text-sm py-2.5 placeholder:text-gray-400 transition-colors'

  const labelClass = 'block text-xs tracking-widest uppercase text-black mb-2'

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/40"
      style={{ zIndex: 9999 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[#f5f5f3] border border-forest w-full max-w-xl max-h-[92vh] overflow-y-auto">
        {/* Double-border inner frame */}
        <div className="border border-forest/30 m-3 p-8">

          {/* Header */}
          <div className="mb-8">
            <p className="text-xs tracking-widest uppercase text-forest mb-3">Registration</p>
            <h2 className="font-serif text-2xl font-bold text-black leading-snug">{event.title}</h2>
            <p className="text-gray-500 text-xs mt-1 tracking-wide">{formattedDate}</p>
            <div className="w-8 h-px bg-forest mt-4" />
          </div>

          {success ? (
            <div className="py-8 text-center space-y-6">
              <div className="w-12 h-px bg-forest mx-auto" />
              <p className="font-serif text-xl text-black">Registration received.</p>
              <p className="text-gray-500 text-sm leading-relaxed">
                We&apos;ll be in touch with further details.
              </p>
              <div className="w-12 h-px bg-forest mx-auto" />
              <button
                onClick={onClose}
                className="mt-4 border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium tracking-widest uppercase px-8 py-3 transition-colors duration-fast"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nome + Cognome */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>First Name *</label>
                  <input
                    required
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    placeholder="Mario"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Last Name *</label>
                  <input
                    required
                    value={cognome}
                    onChange={e => setCognome(e.target.value)}
                    placeholder="Rossi"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Email + Telefono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Email *</label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="mario@email.com"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    type="tel"
                    value={telefono}
                    onChange={e => setTelefono(e.target.value)}
                    placeholder="+39 333 000 0000"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Anno di studio */}
              <div>
                <label className={labelClass}>Year of Study *</label>
                <select
                  required
                  value={anno}
                  onChange={e => setAnno(e.target.value)}
                  className="w-full bg-[#f5f5f3] border-0 border-b border-gray-300 focus:border-forest focus:outline-none text-black text-sm py-2.5 transition-colors"
                >
                  <option value="" disabled className="bg-[#f5f5f3] text-gray-400">Select year</option>
                  {ANNI.map(a => (
                    <option key={a} value={a} className="bg-[#f5f5f3] text-black">{a}</option>
                  ))}
                </select>
              </div>

              {/* Dynamic field: motivation or panelists (hidden when registration_field is null) */}
              {showFieldPrompt && (
                <div>
                  <label className={labelClass}>
                    {isPanelists ? 'Questions for the Panelists' : 'Motivation'} *{' '}
                    <span className="text-gray-400 normal-case tracking-normal">(max 500 characters)</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    maxLength={500}
                    value={fieldValue}
                    onChange={e => setFieldValue(e.target.value)}
                    placeholder={isPanelists ? 'What would you like to ask the panelists?' : 'Why do you want to attend this event?'}
                    className="w-full bg-transparent border-b border-gray-300 focus:border-forest focus:outline-none text-black text-sm py-2.5 placeholder:text-gray-400 transition-colors resize-none"
                  />
                  <p className="text-right text-xs text-gray-400 mt-1">{fieldValue.length}/500</p>
                </div>
              )}

              {error && (
                <p className="text-red-500 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs tracking-widest uppercase text-gray-500 hover:text-black transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-widest uppercase px-8 py-3 transition-colors duration-fast disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '…' : 'Register'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
