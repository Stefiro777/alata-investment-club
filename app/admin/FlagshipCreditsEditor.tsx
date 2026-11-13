'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Section } from '@/app/components/member/ui'
import { fieldCls, errorCls } from '@/components/admin/crm/ui'
import {
  FLAGSHIP_CREDITS_KEY,
  FLAGSHIP_CREDITS_MAX,
  FLAGSHIP_CREDIT_MAX_LENGTH,
  cleanFlagshipCredits,
} from '@/lib/flagship-credits'

const textAction = 'rd-italic text-[20px] hover:underline underline-offset-[0.18em] disabled:opacity-30'

/** Board > Overview: the names that open "In good company" on the Home. */
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
    if (names.some(n => n.toLowerCase() === name.toLowerCase())) { setError('That name is already in the list.'); return }
    if (names.length >= FLAGSHIP_CREDITS_MAX) { setError(`${FLAGSHIP_CREDITS_MAX} names at most.`); return }
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
    <Section id="flagship-credits" title="In good company" meta="Home credits">
      <p className="py-3 text-[12px] leading-[1.6] text-earth-600">
        The names that open the credits on the Home, in the order below. The visible partners follow
        (hidden ones stay out). Remove every name and the credits start from the partners.
      </p>
      {names.length === 0 ? (
        <p className="border-y border-night/20 py-3.5 text-[13px] text-earth-600">No fixed names.</p>
      ) : (
        <ol className="border-t border-night/20">
          {names.map((n, i) => (
            <li key={n} className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-night/20 py-3">
              <span className="rd-eyebrow text-[10px] text-earth-500">{i + 1}</span>
              <span className="font-serif text-[20px] font-medium leading-[1.15]">{n}</span>
              <span className="flex items-baseline gap-4">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${n} up`} className={textAction}>Up</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === names.length - 1} aria-label={`Move ${n} down`} className={textAction}>Down</button>
                <button type="button" onClick={() => touch(names.filter((_, j) => j !== i))} aria-label={`Remove ${n}`} className={`${textAction} text-[#8a2a1d]`}>Remove</button>
              </span>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-5 flex items-end gap-4">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          maxLength={FLAGSHIP_CREDIT_MAX_LENGTH}
          placeholder="Name to add"
          aria-label="Name to add"
          className={fieldCls}
        />
        <button type="button" onClick={add} className={`${textAction} shrink-0 text-club`}>Add</button>
      </div>
      {error && <p role="alert" className={`${errorCls} mt-4`}>{error}</p>}
      <div className="mt-5 flex items-baseline gap-5">
        <button type="button" onClick={save} disabled={saving} className="rd-italic text-[24px] text-club hover:underline underline-offset-[0.18em] disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && <span role="status" className="text-[12px] text-earth-600">Saved</span>}
      </div>
    </Section>
  )
}
