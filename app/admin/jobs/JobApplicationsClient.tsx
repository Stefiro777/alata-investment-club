'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { JobApplication } from './page'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string) {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

const STATUS_LABELS: Record<string, string> = {
  pending:  'In attesa',
  reviewed: 'Esaminata',
  accepted: 'Accettata',
  rejected: 'Rifiutata',
}

const STATUS_COLORS: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-800',
  reviewed: 'bg-blue-100 text-blue-800',
  accepted: 'bg-[#1a4a3a] text-white',
  rejected: 'bg-red-100 text-red-800',
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h1 className="font-serif text-3xl font-bold text-ink-900">{title}</h1>
      <div className="w-8 h-0.5 bg-forest mt-2" />
      {subtitle && <p className="text-sm text-ink-500 mt-3">{subtitle}</p>}
    </div>
  )
}

// ── Cover Letter Modal ────────────────────────────────────────────────────────

function CoverLetterModal({ text, applicant, onClose }: { text: string; applicant: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-2xl max-h-[80vh] overflow-y-auto border-t-4 border-[#1a4a3a] relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-black text-xl leading-none hover:opacity-60 transition-opacity"
          aria-label="Chiudi"
        >
          ✕
        </button>
        <div className="px-8 pt-8 pb-4">
          <h2 className="font-serif text-xl font-bold text-black">Lettera di presentazione</h2>
          <p className="text-sm text-gray-500 mt-1">{applicant}</p>
        </div>
        <div className="px-8 pb-8">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{text}</p>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function JobApplicationsClient({ applications: initial }: { applications: JobApplication[] }) {
  const [applications, setApplications] = useState<JobApplication[]>(initial)
  const [filterTitle, setFilterTitle]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [coverLetter, setCoverLetter]   = useState<{ text: string; applicant: string } | null>(null)

  const uniqueTitles = [...new Set(initial.map(a => a.job_title))].sort()

  const filtered = applications.filter(a => {
    const matchTitle  = !filterTitle  || a.job_title === filterTitle
    const matchStatus = !filterStatus || a.status === filterStatus
    return matchTitle && matchStatus
  })

  async function handleStatusChange(id: string, newStatus: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('job_applications')
      .update({ status: newStatus })
      .eq('id', id)
    if (!error) {
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a))
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <SectionHeading
        title="Candidature"
        subtitle={`${applications.length} candidatur${applications.length === 1 ? 'a' : 'e'} ricevut${applications.length === 1 ? 'a' : 'e'}`}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterTitle}
          onChange={e => setFilterTitle(e.target.value)}
          className="px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white min-w-[200px]"
        >
          <option value="">Tutte le posizioni</option>
          {uniqueTitles.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white min-w-[160px]"
        >
          <option value="">Tutti gli stati</option>
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>

        {(filterTitle || filterStatus) && (
          <button
            onClick={() => { setFilterTitle(''); setFilterStatus('') }}
            className="px-3 py-2 border border-line text-sm text-ink-500 hover:border-forest hover:text-forest transition-colors"
          >
            Rimuovi filtri
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-line-faint px-8 py-16 text-center">
          <p className="text-sm text-ink-500">Nessuna candidatura trovata.</p>
        </div>
      ) : (
        <div className="bg-white border border-line-faint overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10">
                {['Data', 'Nome e Cognome', 'Email', 'Posizione', 'Telefono', 'LinkedIn', 'CV', 'Lettera', 'Stato', 'Azioni'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(app => (
                <tr key={app.id} className="border-b border-black/5 last:border-b-0 hover:bg-black/[0.015] transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-ink-500 text-xs">
                    {fmtDateTime(app.submitted_at)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-ink-900">
                    {app.first_name} {app.last_name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <a href={`mailto:${app.email}`} className="text-forest hover:underline underline-offset-2">
                      {app.email}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-ink-700 max-w-[180px] truncate">
                    {app.job_title}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink-500">
                    {app.phone ?? '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {app.linkedin_url ? (
                      <a
                        href={app.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-forest hover:underline underline-offset-2 text-xs"
                      >
                        LinkedIn ↗
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {app.cv_url ? (
                      <a
                        href={app.cv_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium uppercase tracking-wide px-3 py-1 transition-colors"
                      >
                        Scarica CV
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {app.cover_letter ? (
                      <button
                        onClick={() => setCoverLetter({ text: app.cover_letter!, applicant: `${app.first_name} ${app.last_name}` })}
                        className="inline-block border border-gray-300 text-ink-600 hover:border-forest hover:text-forest text-xs font-medium uppercase tracking-wide px-3 py-1 transition-colors"
                      >
                        Leggi
                      </button>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 ${STATUS_COLORS[app.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[app.status] ?? app.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <select
                      value={app.status}
                      onChange={e => handleStatusChange(app.id, e.target.value)}
                      className="px-2 py-1 border border-line focus:outline-none focus:border-forest text-xs text-ink-900 bg-white"
                    >
                      {Object.entries(STATUS_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {coverLetter && (
        <CoverLetterModal
          text={coverLetter.text}
          applicant={coverLetter.applicant}
          onClose={() => setCoverLetter(null)}
        />
      )}
    </div>
  )
}
