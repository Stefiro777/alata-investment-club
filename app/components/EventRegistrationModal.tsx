'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

const ANNI = [
  'Primo anno triennale',
  'Secondo anno triennale',
  'Terzo anno triennale',
  'Primo anno magistrale',
  'Secondo anno magistrale',
]

interface EventRegistrationModalProps {
  event: { id: string; title: string; date: string }
  onClose: () => void
}

export default function EventRegistrationModal({ event, onClose }: EventRegistrationModalProps) {
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [anno, setAnno] = useState('')
  const [motivazione, setMotivazione] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !cognome.trim() || !email.trim() || !anno || !motivazione.trim()) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: insertError } = await supabase.from('event_registrations').insert({
      event_id: event.id,
      nome: nome.trim(),
      cognome: cognome.trim(),
      email: email.trim(),
      telefono: telefono.trim() || null,
      anno_di_studio: anno,
      motivazione: motivazione.trim(),
    })

    if (insertError) {
      setError(insertError.message)
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
    'w-full bg-transparent border-0 border-b border-white/20 focus:border-[#1a4a3a] focus:outline-none text-white text-sm py-2.5 placeholder-white/30 transition-colors'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.80)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[#0d0d0d] border border-[#1a4a3a] w-full max-w-xl max-h-[92vh] overflow-y-auto">
        {/* Double-border inner frame */}
        <div className="border border-[#1a4a3a]/30 m-3 p-8">

          {/* Header */}
          <div className="mb-8">
            <p className="text-xs tracking-[0.25em] uppercase text-[#1a4a3a] mb-3">Registration</p>
            <h2 className="font-serif text-2xl font-bold text-white leading-snug">{event.title}</h2>
            <p className="text-gray-500 text-xs mt-1 tracking-wide">{formattedDate}</p>
            <div className="w-8 h-px bg-[#1a4a3a] mt-4" />
          </div>

          {success ? (
            <div className="py-8 text-center space-y-6">
              <div className="w-12 h-px bg-[#1a4a3a] mx-auto" />
              <p className="font-serif text-xl text-white">Registration received.</p>
              <p className="text-gray-400 text-sm leading-relaxed">
                We&apos;ll be in touch with further details.
              </p>
              <div className="w-12 h-px bg-[#1a4a3a] mx-auto" />
              <button
                onClick={onClose}
                className="mt-4 border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white text-xs font-medium tracking-widest uppercase px-8 py-3 transition-colors duration-150"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nome + Cognome */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-white/40 mb-2">Nome *</label>
                  <input
                    required
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    placeholder="Mario"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase text-white/40 mb-2">Cognome *</label>
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
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-white/40 mb-2">Email *</label>
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
                  <label className="block text-xs tracking-widest uppercase text-white/40 mb-2">Telefono</label>
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
                <label className="block text-xs tracking-widest uppercase text-white/40 mb-2">Anno di studio *</label>
                <select
                  required
                  value={anno}
                  onChange={e => setAnno(e.target.value)}
                  className="w-full bg-transparent border-0 border-b border-white/20 focus:border-[#1a4a3a] focus:outline-none text-white text-sm py-2.5 transition-colors"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="" disabled className="bg-[#0d0d0d]">Seleziona anno</option>
                  {ANNI.map(a => (
                    <option key={a} value={a} className="bg-[#0d0d0d]">{a}</option>
                  ))}
                </select>
              </div>

              {/* Motivazione */}
              <div>
                <label className="block text-xs tracking-widest uppercase text-white/40 mb-2">
                  Motivazione * <span className="text-white/20 normal-case tracking-normal">(max 500 caratteri)</span>
                </label>
                <textarea
                  required
                  rows={4}
                  maxLength={500}
                  value={motivazione}
                  onChange={e => setMotivazione(e.target.value)}
                  placeholder="Perché vuoi partecipare a questo evento?"
                  className="w-full bg-transparent border-b border-white/20 focus:border-[#1a4a3a] focus:outline-none text-white text-sm py-2.5 placeholder-white/30 transition-colors resize-none"
                />
                <p className="text-right text-xs text-white/20 mt-1">{motivazione.length}/500</p>
              </div>

              {error && (
                <p className="text-red-400 text-xs border-l-2 border-red-500 pl-3 py-1">{error}</p>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs tracking-widest uppercase text-white/40 hover:text-white/70 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium tracking-widest uppercase px-8 py-3 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
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
