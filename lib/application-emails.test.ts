import test from 'node:test'
import assert from 'node:assert/strict'
import { applicationKind, analystPath, confirmationEmail, internalEmail } from './application-emails.ts'

const analyst = { id: 7, nome: 'Giulia', cognome: 'Rossi', email: 'g@example.invalid', telephone_number: '+39 333 1234567', degree_programme: 'Economics', track: 'analyst', study_level: 'bachelor', first_choice: 'lab', second_choice: 'media', cv_path: 'applications/x-cv.pdf', motivazione: 'Mi interessa la ricerca.', linkedin_url: 'https://linkedin.com/in/g', created_at: '2026-11-03T09:00:00Z' }
const member = { id: 8, nome: 'Marco', cognome: 'Bianchi', email: 'm@example.invalid', telephone_number: '+39 333 7654321', degree_programme: 'Law', track: 'member', motivazione: 'Voglio partecipare agli eventi.', created_at: '2026-11-03T09:05:00Z' }

test('kind: explicit track, team member, legacy note, default analyst', () => {
  assert.equal(applicationKind(analyst), 'analyst')
  assert.equal(applicationKind(member), 'member')
  assert.equal(applicationKind({ team: 'member' }), 'member')
  assert.equal(applicationKind({ motivazione: 'x\n\nTrack: Member' }), 'member')
  assert.equal(applicationKind({ team: 'lab' }), 'analyst')
})

test('path: the Academy is only for Lab bachelor, everything else goes to the interview', () => {
  assert.deepEqual(analystPath('lab', 'bachelor'), ['Academy', 'Interview', 'In'])
  assert.deepEqual(analystPath('lab', 'master'), ['Interview', 'In'])
  assert.deepEqual(analystPath('media', 'bachelor'), ['Interview', 'In'])
  assert.deepEqual(analystPath('events', null), ['Interview', 'In'])
})

test('internal email: the subject and the badge say the type, the body says what it means', () => {
  const a = internalEmail(analyst, 'https://site.test')
  assert.match(a.subject, /^\[ANALYST · Lab\] Nuova candidatura — Giulia Rossi$/)
  assert.match(a.html, /Socio operativo/)
  assert.match(a.html, /Academy → Interview → In/)
  assert.match(a.html, /allegato nel Board/)
  assert.match(a.html, /https:\/\/site\.test\/admin\/applications/)
  const m = internalEmail(member, 'https://site.test')
  assert.match(m.subject, /^\[MEMBER\] Nuova candidatura — Marco Bianchi$/)
  assert.match(m.html, /Socio non operativo/)
  assert.match(m.html, /Nessun CV e nessun colloquio/)
  assert.match(m.html, /link di pagamento della quota annuale/)
  assert.doesNotMatch(m.html, /Prima scelta/)
})

test('internal email: no CV is said plainly; user text is escaped', () => {
  const noCv = internalEmail({ ...analyst, cv_path: null }, 'https://site.test')
  assert.match(noCv.html, /non allegato/)
  const evil = internalEmail({ ...member, motivazione: '<script>alert(1)</script> "x"' }, 'https://site.test')
  assert.doesNotMatch(evil.html, /<script>alert/)
  assert.match(evil.html, /&lt;script&gt;/)
})

test('confirmation email: addressed to the applicant, says what was received and what comes next', () => {
  const a = confirmationEmail(analyst, 'info@x.test')
  assert.match(a.subject, /We received your application/)
  assert.match(a.html, /Hi Giulia/)
  assert.match(a.html, /Alata Academy, then an interview/)
  assert.match(a.html, /First choice/)
  assert.match(a.text, /Analyst/)
  const master = confirmationEmail({ ...analyst, study_level: 'master' }, 'info@x.test')
  assert.doesNotMatch(master.html, /Academy/)
  const m = confirmationEmail(member, 'info@x.test')
  assert.match(m.subject, /We received your request/)
  assert.match(m.html, /payment link for the annual membership fee/)
  assert.doesNotMatch(m.html, /First choice/)
})
