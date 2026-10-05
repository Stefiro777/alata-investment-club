'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { UpcomingEvent } from '@/lib/types'

type WaitlistStatus = 'waiting' | 'contacted' | 'converted' | 'removed'

type WaitlistRow = {
  id: string
  nome: string
  cognome: string
  email: string
  telefono: string | null
  status: WaitlistStatus
  created_at: string
  contacted_at: string | null
}

const STATUS_LABELS: Record<WaitlistStatus, string> = {
  waiting: 'In attesa',
  contacted: 'Contattato',
  converted: 'Iscritto',
  removed: 'Rimosso',
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/**
 * Waitlist of one event, in arrival order. Nothing is sent automatically:
 * "Contatta" marks the person as contacted and opens the mail client with a
 * draft, the team decides what to write and when. Access is enforced by RLS
 * (events team, bod, director, superadmin).
 */
export default function EventWaitlistAdmin({
  event,
  seatsLeft,
  onClose,
  onChanged,
}: {
  event: UpcomingEvent
  /** null = unlimited */
  seatsLeft: number | null
  onClose: () => void
  /** Called after any change so the parent can refresh its counters. */
  onChanged: () => void
}) {
  const [rows, setRows] = useState<WaitlistRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hideClosed, setHideClosed] = useState(true)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('event_waitlist')
      .select('id, nome, cognome, email, telefono, status, created_at, contacted_at')
      .eq('event_id', event.id)
      .order('created_at', { ascending: true })
    if (err) { setError(err.message); setRows([]); return }
    setRows((data ?? []) as WaitlistRow[])
  }, [event.id])

  useEffect(() => { void load() }, [load])

  async function setStatus(row: WaitlistRow, status: WaitlistStatus) {
    const supabase = createClient()
    const patch: { status: WaitlistStatus; contacted_at?: string } = { status }
    if (status === 'contacted') patch.contacted_at = new Date().toISOString()
    const { error: err } = await supabase.from('event_waitlist').update(patch).eq('id', row.id)
    if (err) { setError(err.message); return }
    setRows(prev => (prev ?? []).map(r => (r.id === row.id ? { ...r, ...patch } : r)))
    onChanged()
  }

  async function contact(row: WaitlistRow) {
    await setStatus(row, 'contacted')
    const subject = `Posto disponibile — ${event.title}`
    const body =
      `Ciao ${row.nome},\n\nsi è liberato un posto per "${event.title}" (${event.date}). ` +
      `Se sei ancora interessato/a, rispondi a questa email.\n\nAlata Investment Club`
    window.location.href = `mailto:${encodeURIComponent(row.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const visible = (rows ?? []).filter(r => !hideClosed || r.status === 'waiting' || r.status === 'contacted')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white border border-line-faint w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-line-faint">
          <div>
            <p className="font-serif text-lg font-bold text-forest">Waitlist — {event.title}</p>
            <p className="text-xs text-ink-500 mt-1">
              {seatsLeft === null
                ? 'Capienza illimitata.'
                : seatsLeft > 0
                  ? `${seatsLeft} post${seatsLeft === 1 ? 'o' : 'i'} disponibil${seatsLeft === 1 ? 'e' : 'i'} ora: l'evento è di nuovo aperto alle iscrizioni.`
                  : 'Evento al completo.'}
            </p>
          </div>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900 text-xl leading-none transition-colors">✕</button>
        </div>

        <div className="px-6 py-4">
          <label className="flex items-center gap-2 text-xs text-ink-500 mb-4 cursor-pointer">
            <input type="checkbox" className="accent-forest" checked={hideClosed} onChange={e => setHideClosed(e.target.checked)} />
            Nascondi iscritti e rimossi
          </label>

          {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1 mb-4">{error}</p>}

          {rows === null ? (
            <p className="text-sm text-ink-500 py-8 text-center">Caricamento…</p>
          ) : visible.length === 0 ? (
            <p className="text-sm text-ink-500 py-8 text-center">Nessuno in lista.</p>
          ) : (
            <div className="border border-line-faint divide-y divide-black/5">
              {visible.map((r, i) => (
                <div key={r.id} className="px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="w-6 text-xs text-ink-400 tabular-nums">{i + 1}</span>
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-sm font-medium text-ink-900">{r.nome} {r.cognome}</p>
                    <p className="text-xs text-ink-500 break-all">
                      {r.email}{r.telefono ? ` · ${r.telefono}` : ''}
                    </p>
                    <p className="text-[11px] text-ink-400 mt-0.5">
                      In lista dal {fmtDateTime(r.created_at)}
                      {r.contacted_at ? ` · contattato il ${fmtDateTime(r.contacted_at)}` : ''}
                    </p>
                  </div>
                  <select
                    value={r.status}
                    onChange={e => setStatus(r, e.target.value as WaitlistStatus)}
                    aria-label={`Stato di ${r.nome} ${r.cognome}`}
                    className="text-xs font-medium uppercase tracking-wide border border-line px-2 py-1.5 bg-white focus:outline-none focus:border-forest"
                  >
                    {(Object.keys(STATUS_LABELS) as WaitlistStatus[]).map(s => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => contact(r)}
                    className="border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium px-3 py-1.5 transition-colors"
                  >
                    Contatta
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
