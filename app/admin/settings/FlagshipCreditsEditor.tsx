'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  FLAGSHIP_CREDITS_KEY,
  FLAGSHIP_CREDITS_MAX,
  FLAGSHIP_CREDIT_MAX_LENGTH,
  cleanFlagshipCredits,
} from '@/lib/flagship-credits'

/** Board > Site > Settings: the names that open "In good company" on the Home. */
export default function FlagshipCreditsEditor({ initial }: { initial: string[] }) {
  const [names, setNames] = useState<string[]>(initial)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function touch(next: string[]) { setNames(next); setSaved(false) }

  function add() {
    const [name] = cleanFlagshipCredits([draft])
    if (!name) return
    if (names.some(n => n.toLowerCase() === name.toLowerCase())) { setError('Questo nome è già nell’elenco.'); return }
    if (names.length >= FLAGSHIP_CREDITS_MAX) { setError(`Al massimo ${FLAGSHIP_CREDITS_MAX} nomi.`); return }
    setError(null)
    touch([...names, name])
    setDraft('')
  }

  function move(i: number, delta: -1 | 1) {
    const j = i + delta
    if (j < 0 || j >= names.length) return
    const next = [...names]
    ;[next[i], next[j]] = [next[j], next[i]]
    touch(next)
  }

  async function save() {
    setSaving(true); setSaved(false); setError(null)
    const supabase = createClient()
    const { error: err } = await supabase
      .from('settings')
      .upsert({ key: FLAGSHIP_CREDITS_KEY, value: JSON.stringify(cleanFlagshipCredits(names)) }, { onConflict: 'key' })
    if (err) setError(err.message)
    else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    setSaving(false)
  }

  return (
    <section id="flagship-credits">
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-bold text-forest">In good company</h2>
        <div className="w-8 h-px bg-forest mt-2" />
      </div>
      <div className="bg-white border border-line-faint p-8">
        <p className="text-sm text-ink-500 mb-6">
          I nomi che aprono i titoli di coda della Home, nell’ordine qui sotto. Dopo di loro compaiono i partner visibili
          (quelli nascosti restano fuori). Se togli tutti i nomi, i titoli partono direttamente dai partner.
        </p>
        {names.length === 0 ? (
          <p className="text-xs text-ink-400 mb-4">Nessun nome fisso.</p>
        ) : (
          <ol className="mb-4 space-y-px">
            {names.map((n, i) => (
              <li key={n} className="flex items-center gap-3 border border-line-faint px-4 py-2.5">
                <span className="w-5 text-xs text-ink-400">{i + 1}</span>
                <span className="flex-1 text-sm text-ink-900">{n}</span>
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Sposta su ${n}`}
                  className="px-2 text-ink-500 hover:text-forest disabled:opacity-25">↑</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === names.length - 1} aria-label={`Sposta giù ${n}`}
                  className="px-2 text-ink-500 hover:text-forest disabled:opacity-25">↓</button>
                <button type="button" onClick={() => touch(names.filter((_, j) => j !== i))} aria-label={`Togli ${n}`}
                  className="px-2 text-xs text-red-500 hover:text-red-700">Togli</button>
              </li>
            ))}
          </ol>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
            maxLength={FLAGSHIP_CREDIT_MAX_LENGTH}
            placeholder="Nome da aggiungere"
            aria-label="Nome da aggiungere"
            className="flex-1 px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm bg-white"
          />
          <button type="button" onClick={add}
            className="border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium px-4 py-2 transition-colors">
            Aggiungi
          </button>
        </div>
        {error && <p className="mt-3 text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}
        <div className="flex items-center gap-3 pt-4">
          <button type="button" onClick={save} disabled={saving}
            className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-6 py-2.5 transition-colors disabled:opacity-50">
            {saving ? '…' : 'Save'}
          </button>
          {saved && <span className="text-xs text-forest font-medium">Saved</span>}
        </div>
      </div>
    </section>
  )
}
