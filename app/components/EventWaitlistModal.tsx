'use client'

import { useState } from 'react'

interface EventWaitlistModalProps {
  event: { id: string; title: string; date: string }
  onClose: () => void
}

/** Replaces the registration form for a sold-out event. */
export default function EventWaitlistModal({ event, onClose }: EventWaitlistModalProps) {
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [website, setWebsite] = useState('') // honeypot: must stay empty
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !cognome.trim() || !email.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/event-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
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

  const formattedDate = new Date(event.date + 'T00:00:00').toLocaleDateString('en-GB', {
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
        <div className="border border-forest/30 m-3 p-8">
          <div className="mb-8">
            <p className="text-xs tracking-widest uppercase text-forest mb-3">Sold out · Waitlist</p>
            <h2 className="font-serif text-2xl font-bold text-black leading-snug">{event.title}</h2>
            <p className="text-gray-500 text-xs mt-1 tracking-wide">{formattedDate}</p>
            <div className="w-8 h-px bg-forest mt-4" />
          </div>

          {success ? (
            <div className="py-8 text-center space-y-6">
              <div className="w-12 h-px bg-forest mx-auto" />
              <p className="font-serif text-xl text-black">You&apos;re on the waitlist.</p>
              <p className="text-gray-500 text-sm leading-relaxed">
                If a seat becomes available, the team will contact you by email.
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
              <p className="text-sm text-gray-600 leading-relaxed">
                This event is sold out. Leave your details and we will get in touch if a seat becomes available.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>First Name *</label>
                  <input required maxLength={100} value={nome} onChange={e => setNome(e.target.value)} placeholder="Mario" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Last Name *</label>
                  <input required maxLength={100} value={cognome} onChange={e => setCognome(e.target.value)} placeholder="Rossi" className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Email *</label>
                  <input required type="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="mario@email.com" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input type="tel" maxLength={40} value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+39 333 000 0000" className={inputClass} />
                </div>
              </div>

              {/* Honeypot — hidden from people and assistive tech */}
              <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
                <label>
                  Website
                  <input tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} />
                </label>
              </div>

              {error && <p className="text-red-500 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <button type="button" onClick={onClose} className="text-xs tracking-widest uppercase text-gray-500 hover:text-black transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-widest uppercase px-8 py-3 transition-colors duration-fast disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '…' : 'Join waitlist'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
