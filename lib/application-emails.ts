// Emails around a Join Us application. Pure builders (covered by tests):
//   - confirmationEmail: to the applicant, right after they submit
//   - internalEmail: to the club's inbox, which says which kind of application it is
//     and what it means for whoever follows the process

export type ApplicationKind = 'analyst' | 'member'

export type ApplicationRecord = {
  id?: string | number
  nome?: string | null
  cognome?: string | null
  email?: string | null
  telephone_number?: string | null
  anno_di_studio?: string | null
  degree_programme?: string | null
  motivazione?: string | null
  created_at?: string | null
  track?: string | null
  team?: string | null
  study_level?: string | null
  first_choice?: string | null
  second_choice?: string | null
  linkedin_url?: string | null
  cv_path?: string | null
  [key: string]: unknown
}

export const esc = (v: unknown) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const TEAM_LABEL: Record<string, string> = { lab: 'Lab', media: 'Media', events: 'Events' }
const teamLabel = (k?: string | null) => (k ? TEAM_LABEL[k] ?? k : null)

/** Analyst or Member. Rows saved before the Join Us columns existed are told apart by team or by the note in the motivation. */
export function applicationKind(r: ApplicationRecord): ApplicationKind {
  if (r.track === 'member' || r.track === 'analyst') return r.track
  if (r.team === 'member') return 'member'
  if (typeof r.motivazione === 'string' && /Track: Member/.test(r.motivazione)) return 'member'
  return 'analyst'
}

/** The steps an Analyst goes through: the Academy is only for Lab, and Master's applicants skip it. */
export function analystPath(firstChoice?: string | null, level?: string | null): string[] {
  const academy = firstChoice === 'lab' && level !== 'master'
  return academy ? ['Academy', 'Interview', 'In'] : ['Interview', 'In']
}

const fullName = (r: ApplicationRecord) => `${r.nome ?? ''} ${r.cognome ?? ''}`.trim()
const levelLabel = (l?: string | null) => (l === 'master' ? "Master's" : l === 'bachelor' ? "Bachelor's" : null)

// ── Layout shared by both emails ────────────────────────────────────────────────

function shell(opts: { eyebrow: string; title: string; badge?: { text: string; bg: string; fg: string }; body: string; footer: string; lang: string }) {
  const badge = opts.badge
    ? `<p style="margin:14px 0 0;"><span style="display:inline-block;background:${opts.badge.bg};color:${opts.badge.fg};font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:6px 12px;border-radius:999px;">${esc(opts.badge.text)}</span></p>`
    : ''
  return `<!DOCTYPE html>
<html lang="${opts.lang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f1e8;font-family:Arial,sans-serif;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e5e1d6;">
        <tr><td style="background:#1a4a3a;padding:26px 32px;">
          <p style="margin:0;font-size:11px;color:#a8c5b8;letter-spacing:2px;text-transform:uppercase;">${esc(opts.eyebrow)}</p>
          <h1 style="margin:8px 0 0;font-size:22px;line-height:1.25;color:#ffffff;font-weight:700;">${esc(opts.title)}</h1>
          ${badge}
        </td></tr>
        <tr><td style="padding:28px 32px;">${opts.body}</td></tr>
        <tr><td style="padding:18px 32px;background:#f4f7f4;border-top:1px solid #e5e1d6;">
          <p style="margin:0;font-size:11px;line-height:1.6;color:#888;">${opts.footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

const h2 = (t: string) => `<h2 style="margin:26px 0 8px;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:#1a4a3a;">${esc(t)}</h2>`
const p = (t: string) => `<p style="margin:0 0 12px;font-size:14px;line-height:1.65;">${t}</p>`

function rows(fields: [string, string | null | undefined][]) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e1d6;">${fields
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([label, value]) => `<tr>
      <td style="padding:9px 12px 9px 0;font-size:12px;color:#1a4a3a;font-weight:700;width:150px;vertical-align:top;border-bottom:1px solid #e5e1d6;">${esc(label)}</td>
      <td style="padding:9px 0;font-size:13px;vertical-align:top;white-space:pre-wrap;border-bottom:1px solid #e5e1d6;">${value}</td>
    </tr>`).join('')}</table>`
}

// ── To the applicant ─────────────────────────────────────────────────────────────

export function confirmationEmail(r: ApplicationRecord, contactEmail: string): { subject: string; html: string; text: string } {
  const kind = applicationKind(r)
  const first = esc(r.nome || 'there')
  const first_ = teamLabel(r.first_choice)
  const second_ = teamLabel(r.second_choice)
  const level = levelLabel(r.study_level)

  const summary = kind === 'analyst'
    ? rows([
        ['Application', 'Analyst (operating member)'],
        ['First choice', first_ ? esc(first_) : null],
        ['Second choice', second_ ? esc(second_) : null],
        ['Degree level', level ? esc(level) : null],
        ['Degree', r.degree_programme ? esc(r.degree_programme) : null],
        ['CV', r.cv_path ? 'Received' : null],
      ])
    : rows([
        ['Application', 'Member (non-operating member)'],
        ['Degree', r.degree_programme ? esc(r.degree_programme) : null],
      ])

  const path = analystPath(r.first_choice, r.study_level)
  const next = kind === 'analyst'
    ? p(`We read every application. ${path[0] === 'Academy'
        ? 'The next step for the Lab is the Alata Academy, then an interview.'
        : 'The next step is an interview.'} We will write to you at this address: there is no need to send anything else.`)
    : p('We read every request and we want the right people in the room. If it is a good fit, we will send you by email the payment link for the annual membership fee, and then your digital membership card.')

  const body = `${p(`Hi ${first},`)}
${p(kind === 'analyst' ? 'Thank you for applying to join the Alata Investment Club as an Analyst. We have received your application.' : 'Thank you for your interest in the Alata Investment Club. We have received your request to become a Member.')}
${h2('What you sent')}${summary}
${h2('What happens next')}${next}
${p(`Questions? Just reply to this message or write to <a href="mailto:${esc(contactEmail)}" style="color:#1a4a3a;">${esc(contactEmail)}</a>.`)}
${p('The Alata Investment Club team')}`

  const subject = kind === 'analyst' ? 'We received your application — Alata Investment Club' : 'We received your request — Alata Investment Club'
  const html = shell({
    lang: 'en',
    eyebrow: 'Alata Investment Club',
    title: kind === 'analyst' ? 'Your application has arrived' : 'Your request has arrived',
    body,
    footer: `You are receiving this email because this address was used on alatainvestmentclub.com/join-us. If it was not you, you can ignore this message.`,
  })
  const text = [
    `Hi ${r.nome || 'there'},`,
    '',
    kind === 'analyst'
      ? 'Thank you for applying to join the Alata Investment Club as an Analyst. We have received your application.'
      : 'Thank you for your interest in the Alata Investment Club. We have received your request to become a Member.',
    '',
    kind === 'analyst'
      ? `What happens next: ${path[0] === 'Academy' ? 'the Alata Academy, then an interview.' : 'an interview.'} We will write to you at this address.`
      : 'What happens next: if it is a good fit, we will send you the payment link for the annual membership fee, and then your digital membership card.',
    '',
    `Questions? Reply to this message or write to ${contactEmail}.`,
    'The Alata Investment Club team',
  ].join('\n')
  return { subject, html, text }
}

// ── To the club's inbox ──────────────────────────────────────────────────────────

export function internalEmail(r: ApplicationRecord, siteUrl: string): { subject: string; html: string } {
  const kind = applicationKind(r)
  const name = fullName(r)
  const first = teamLabel(r.first_choice)
  const second = teamLabel(r.second_choice)
  const level = levelLabel(r.study_level)
  const boardUrl = `${siteUrl}/admin/applications`
  const when = r.created_at ? new Date(r.created_at).toLocaleString('it-IT', { timeZone: 'Europe/Rome' }) : null

  const typeText = kind === 'analyst'
    ? `ANALYST${first ? ` · ${first}` : ''}`
    : 'MEMBER'

  const meaning = kind === 'analyst'
    ? `${p('<strong>Socio operativo.</strong> Chi entra lavora nel club, in uno dei team Lab, Media o Events.')}
${p(`Va letta dal team della prima scelta${first ? ` (<strong>${esc(first)}</strong>)` : ''}, insieme a Management e BoD. È richiesto il CV${r.cv_path ? ' (allegato nel Board)' : ' (<strong>non allegato</strong>)'}.`)}
${p(`<strong>Percorso:</strong> ${analystPath(r.first_choice, r.study_level).join(' → ')}. ${analystPath(r.first_choice, r.study_level)[0] === 'Academy' ? 'L’Academy è solo per il Lab; chi fa la magistrale la salta.' : 'Per questo team e livello si va direttamente al colloquio.'}`)}
${h2('Cosa fare')}
<ol style="margin:0 0 12px;padding-left:20px;font-size:14px;line-height:1.7;">
  <li>Leggere motivazione e CV nel Board (CRM · Applications).</li>
  <li>Segnare lo stato: visto, accettato o rifiutato.</li>
  <li>Rispondere al candidato: basta rispondere a questa mail, arriva a lui.</li>
  <li>Se accettato: fissare ${analystPath(r.first_choice, r.study_level)[0] === 'Academy' ? 'Academy e colloquio' : 'il colloquio'}; poi quota annuale e tessera.</li>
</ol>`
    : `${p('<strong>Socio non operativo.</strong> Partecipa a eventi e incontri, non gestisce il club.')}
${p('Nessun CV e nessun colloquio: è una richiesta breve da valutare.')}
${h2('Cosa fare')}
<ol style="margin:0 0 12px;padding-left:20px;font-size:14px;line-height:1.7;">
  <li>Leggere la richiesta nel Board (CRM · Applications).</li>
  <li>Segnare lo stato: visto, accettato o rifiutato.</li>
  <li>Se è una persona adatta: inviare il <strong>link di pagamento della quota annuale</strong>; poi arriva la tessera digitale.</li>
  <li>Se no: rispondere con garbo (basta rispondere a questa mail, arriva al candidato).</li>
</ol>`

  const details = rows([
    ['Tipo', `<strong>${esc(typeText)}</strong>`],
    ['Nome', esc(name) || '—'],
    ['Email', r.email ? `<a href="mailto:${esc(r.email)}" style="color:#1a4a3a;">${esc(r.email)}</a>` : '—'],
    ['Telefono', r.telephone_number ? esc(r.telephone_number) : '—'],
    ['Corso di laurea', r.degree_programme ? esc(r.degree_programme) : '—'],
    ['Livello', kind === 'analyst' ? (level ? esc(level) : r.anno_di_studio ? esc(r.anno_di_studio) : '—') : null],
    ['Prima scelta', kind === 'analyst' ? (first ? esc(first) : '—') : null],
    ['Seconda scelta', kind === 'analyst' ? (second ? esc(second) : '—') : null],
    ['LinkedIn', r.linkedin_url ? `<a href="${esc(r.linkedin_url)}" style="color:#1a4a3a;">${esc(r.linkedin_url)}</a>` : kind === 'analyst' ? '—' : null],
    ['CV', kind === 'analyst' ? (r.cv_path ? 'Sì, nel Board' : 'No') : null],
    ['Motivazione', r.motivazione ? esc(r.motivazione) : '—'],
    ['Ricevuta', when ? esc(when) : null],
    ['ID', r.id !== undefined ? esc(r.id) : null],
  ])

  const body = `${h2('Cosa comporta')}${meaning}
<p style="margin:18px 0 22px;"><a href="${esc(boardUrl)}" style="display:inline-block;background:#1a4a3a;color:#f5f1e8;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;padding:12px 22px;border-radius:999px;">Apri nel Board</a></p>
${h2('Dati')}${details}`

  const subject = `[${typeText}] Nuova candidatura — ${name || 'senza nome'}`
  const html = shell({
    lang: 'it',
    eyebrow: 'Alata Investment Club · Join Us',
    title: kind === 'analyst' ? 'Nuova candidatura da Analyst' : 'Nuova richiesta da Member',
    badge: kind === 'analyst' ? { text: typeText, bg: '#ccff00', fg: '#1a4a3a' } : { text: 'MEMBER', bg: '#f5f1e8', fg: '#1a4a3a' },
    body,
    footer: 'Notifica automatica — Alata Investment Club &bull; alatainvestmentclub.com',
  })
  return { subject, html }
}
