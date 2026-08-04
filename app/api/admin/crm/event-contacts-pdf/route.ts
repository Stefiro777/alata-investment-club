import { NextRequest, NextResponse } from 'next/server'
import * as zlib from 'zlib'
import * as path from 'path'
import { requirePrivilegedAccess } from '@/lib/auth'
import { loadLogoPNG } from '@/lib/quote-pdf'
import type { PNGImg } from '@/lib/quote-pdf'
import {
  PW, PH, ML, MR, CW, FOOTER_MIN,
  GREEN, WHITE, BLACK, DARK, MUTED, LGRAY,
  rect, hline, tx, drawImage, textWidth, truncateToRealWidth,
  drawBrandedHeader, drawBrandedFooter,
} from '@/lib/pdf-branding'

export const dynamic = 'force-dynamic'

// ── Payload ───────────────────────────────────────────────────────────────────

type FieldKey =
  | 'nome' | 'cognome' | 'email' | 'telefono' | 'anno_di_studio'
  | 'evento' | 'data_evento' | 'campo' | 'registrato_il'

interface ContactRow {
  nome: string
  cognome: string
  email: string
  telefono: string | null
  anno_di_studio: string
  motivazione: string | null
  questions_for_panelists: string | null
  created_at: string
  upcoming_events: { title: string; date: string } | null
}

interface PDFRequestBody {
  contacts: ContactRow[]
  fields: FieldKey[]
  eventFilter?: string
}

// Canonical column order — independent of the order the client sends fields in,
// so the exported table always reads left-to-right the same way the CSV did.
const FIELD_ORDER: FieldKey[] = [
  'nome', 'cognome', 'email', 'telefono', 'anno_di_studio',
  'evento', 'data_evento', 'campo', 'registrato_il',
]

// Abbreviated where the column is narrow (data_evento, registrato_il), so the
// header reads cleanly even with all fields selected instead of relying on
// mid-word truncation.
const FIELD_LABELS: Record<FieldKey, string> = {
  nome: 'NOME',
  cognome: 'COGNOME',
  email: 'EMAIL',
  telefono: 'TELEFONO',
  anno_di_studio: 'ANNO',
  evento: 'EVENTO',
  data_evento: 'DATA EV.',
  campo: 'CAMPO',
  registrato_il: 'REG. IL',
}

// Relative width weights — wider for fields that tend to hold longer text
// (email, campo, evento), narrower for short fixed-format fields.
const FIELD_WEIGHTS: Record<FieldKey, number> = {
  nome: 1, cognome: 1, email: 1.6, telefono: 0.9, anno_di_studio: 0.7,
  evento: 1.3, data_evento: 0.9, campo: 2.2, registrato_il: 0.9,
}

function fieldValue(c: ContactRow, key: FieldKey): string {
  switch (key) {
    case 'nome': return c.nome ?? ''
    case 'cognome': return c.cognome ?? ''
    case 'email': return c.email ?? ''
    case 'telefono': return c.telefono ?? '-'
    case 'anno_di_studio': return c.anno_di_studio ?? ''
    case 'evento': return c.upcoming_events?.title ?? '-'
    case 'data_evento': return c.upcoming_events?.date ?? '-'
    case 'campo': return c.motivazione ?? c.questions_for_panelists ?? '-'
    case 'registrato_il': return new Date(c.created_at).toLocaleDateString('it-IT')
  }
}

// Rough Helvetica average-char-width factor, used to fit cell text on one
// line without measuring actual glyph widths.
function truncateToWidth(s: string, widthPt: number, fontSize: number): string {
  const avgCharW = fontSize * 0.52
  const maxChars = Math.max(4, Math.floor(widthPt / avgCharW))
  if (s.length <= maxChars) return s
  return s.slice(0, Math.max(1, maxChars - 3)) + '...'
}

// Same width approximation as truncateToWidth, but wraps onto multiple lines
// (breaking on word boundaries) instead of truncating with an ellipsis — used
// for the "campo" column, whose free-text answers can run well past one line.
function wrapTextToWidth(s: string, widthPt: number, fontSize: number): string[] {
  if (!s) return ['']
  const avgCharW = fontSize * 0.52
  const maxChars = Math.max(1, Math.floor(widthPt / avgCharW))
  const words = s.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (let word of words) {
    // A single word longer than the column width has to be hard-broken —
    // otherwise it would never fit on any line.
    while (word.length > maxChars) {
      if (current) { lines.push(current); current = '' }
      lines.push(word.slice(0, maxChars))
      word = word.slice(maxChars)
    }
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > maxChars) {
      if (current) lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

const MONTHS_IT = ['gennaio','febbraio','marzo','aprile','maggio','giugno',
                   'luglio','agosto','settembre','ottobre','novembre','dicembre']

function italianDate(): string {
  const d = new Date()
  return `${d.getDate()} ${MONTHS_IT[d.getMonth()]} ${d.getFullYear()}`
}

// Fixed logo height used both when sizing the drawn logo and when reserving
// space for it in the header title budget — must stay in sync with the
// logoH used inside buildEventContactsPDF.
const LOGO_H = 40

// ── Build PDF ─────────────────────────────────────────────────────────────────

function buildEventContactsPDF(
  contacts: ContactRow[],
  fields: FieldKey[],
  headerTitle: string,
  headerSubtitle: string,
  eventLabel: string,
  logo: PNGImg | null
): Buffer {
  const today = italianDate()
  const ROW_H = 18
  const FONT_SZ = 8

  // Column layout: proportional widths from FIELD_WEIGHTS, in canonical order.
  const orderedFields = FIELD_ORDER.filter(f => fields.includes(f))
  const totalWeight = orderedFields.reduce((sum, f) => sum + FIELD_WEIGHTS[f], 0)
  let x = ML
  const columns = orderedFields.map(f => {
    const w = (CW * FIELD_WEIGHTS[f]) / totalWeight
    const col = { key: f, x, w }
    x += w
    return col
  })

  // Compressed logo image data
  let logoStream: Buffer | null = null
  let logoW = 0, logoH = 0
  if (logo) {
    logoStream = zlib.deflateSync(logo.rgbData)
    logoH = LOGO_H
    logoW = Math.round((logo.width / logo.height) * logoH)
  }
  const logoX = MR - logoW - 8

  // Set once the page-1 header is drawn below — flushPage() only reads it
  // when finalizing page 1 (after that section has run), so the default
  // here never actually applies.
  let headerH = 72

  // The continuation-page banner is a single fixed-height line (unlike the
  // main header, it can't grow to 2 lines) — truncate with real widths so a
  // long event name never overflows it.
  const bannerPrefix = 'ALATA INVESTMENT CLUB - '
  const bannerSuffix = ' (continua)'
  const bannerBudget = (MR - ML) - textWidth(bannerPrefix, 'F2', 10) - textWidth(bannerSuffix, 'F2', 10)
  const bannerTitle = textWidth(headerTitle, 'F2', 10) <= bannerBudget
    ? headerTitle
    : truncateToRealWidth(headerTitle, bannerBudget, 'F2', 10)

  const pageStreams: Buffer[][] = []
  let ops: string[] = []
  let curY = 0
  let pageNum = 0

  function addFooter() {
    ops.push(...drawBrandedFooter(pageNum))
  }

  function flushPage(isFirstPage = false) {
    addFooter()
    const bufs: Buffer[] = []
    const joined = ops.join('\n')
    bufs.push(Buffer.from(joined, 'latin1'))
    if (isFirstPage && logo && logoStream) {
      bufs.push(Buffer.from('\n' + drawImage('Logo', logoX, PH - (headerH + logoH) / 2, logoW, logoH), 'latin1'))
    }
    pageStreams.push(bufs)
    ops = []
  }

  function drawTableHeaderRow() {
    const hry = curY - ROW_H
    ops.push(rect(ML, hry, CW, ROW_H, GREEN))
    for (const col of columns) {
      ops.push(tx(col.x + 6, hry + 5, 'F2', FONT_SZ, WHITE, truncateToWidth(FIELD_LABELS[col.key], col.w - 8, FONT_SZ)))
    }
    curY = hry
  }

  function startNewPage() {
    pageNum++
    ops = []
    ops.push(rect(0, PH - 36, PW, 36, GREEN))
    ops.push(tx(ML, PH - 23, 'F2', 10, WHITE, `${bannerPrefix}${bannerTitle}${bannerSuffix}`))
    curY = PH - 36 - 20
    drawTableHeaderRow()
  }

  function checkSpace(need: number) {
    if (curY - need < FOOTER_MIN + 10) { flushPage(); startNewPage() }
  }

  // ── Page 1 header ─────────────────────────────────────────────────────────
  pageNum++
  const header = drawBrandedHeader(headerTitle, headerSubtitle, HEADER_TEXT_X, logoX)
  ops.push(...header.ops)
  headerH = header.height
  curY = PH - headerH - 26

  // ── Document info block ──────────────────────────────────────────────────
  const infoRows: [string, string][] = [
    ['Evento:', eventLabel],
    ['Partecipanti totali:', String(contacts.length)],
    ['Generato il:', `Brescia, ${today}`],
  ]
  for (const [label, value] of infoRows) {
    ops.push(tx(ML, curY, 'F2', 10, DARK, label))
    ops.push(tx(ML + label.length * 6.0, curY, 'F1', 10, DARK, truncateToWidth(value, MR - ML - label.length * 6.0, 10)))
    curY -= 17
  }
  curY -= 8
  ops.push(hline(ML, curY, MR, GREEN, 0.5))
  curY -= 22

  // ── Table ─────────────────────────────────────────────────────────────────
  checkSpace(ROW_H + 10)
  drawTableHeaderRow()

  const LINE_H = FONT_SZ * 1.2
  const campoCol = columns.find(col => col.key === 'campo')

  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i]
    const campoLines = campoCol ? wrapTextToWidth(fieldValue(c, 'campo'), campoCol.w - 8, FONT_SZ) : ['']
    const rowLines = Math.max(1, campoLines.length)
    const rowH = ROW_H + (rowLines - 1) * LINE_H

    checkSpace(rowH + 5)
    const ry = curY - rowH
    if (i % 2 === 1) ops.push(rect(ML, ry, CW, rowH, LGRAY))
    // First-line baseline matches the single-line row's 5pt-from-bottom
    // baseline, extended upward — so short columns stay top-aligned with
    // the first wrapped "campo" line instead of sinking to the row bottom.
    const firstLineY = ry + rowH - 13
    for (const col of columns) {
      if (col.key === 'campo') {
        campoLines.forEach((line, li) => {
          ops.push(tx(col.x + 6, firstLineY - li * LINE_H, 'F1', FONT_SZ, line === '-' ? MUTED : BLACK, line))
        })
      } else {
        const raw = fieldValue(c, col.key)
        ops.push(tx(col.x + 6, firstLineY, 'F1', FONT_SZ, raw === '-' ? MUTED : BLACK, truncateToWidth(raw, col.w - 8, FONT_SZ)))
      }
    }
    curY = ry
  }

  // Finalize first (and possibly only) page
  flushPage(pageNum === 1)

  // ── Assemble PDF binary ───────────────────────────────────────────────────
  const N = pageStreams.length
  const hasLogo = logo !== null && logoStream !== null

  const f1Obj = 2 * N + 3
  const f2Obj = 2 * N + 4
  const logoObj = 2 * N + 5
  const totalObjs = hasLogo ? 2 * N + 5 : 2 * N + 4

  const parts: Buffer[] = []
  const offsets: number[] = new Array(totalObjs).fill(0)
  let pos = 0
  const pushStr = (s: string) => { const b = Buffer.from(s, 'latin1'); parts.push(b); pos += b.length }
  const pushBuf = (b: Buffer) => { parts.push(b); pos += b.length }

  pushStr('%PDF-1.4\n')

  offsets[0] = pos
  pushStr('1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n')

  offsets[1] = pos
  const kids = Array.from({ length: N }, (_, i) => `${i + 3} 0 R`).join(' ')
  pushStr(`2 0 obj\n<</Type/Pages/Kids[${kids}]/Count ${N}>>\nendobj\n`)

  for (let i = 0; i < N; i++) {
    offsets[2 + i] = pos
    const pn = 3 + i
    const cn = N + 3 + i
    const xobjDict = hasLogo ? `/XObject<</Logo ${logoObj} 0 R>>` : ''
    pushStr(`${pn} 0 obj\n<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${PW} ${PH}]/Contents ${cn} 0 R/Resources<</Font<</F1 ${f1Obj} 0 R/F2 ${f2Obj} 0 R>>${xobjDict}>>>>\nendobj\n`)
  }

  for (let i = 0; i < N; i++) {
    offsets[N + 2 + i] = pos
    const cn = N + 3 + i
    const pageBufs = pageStreams[i]
    const streamData = Buffer.concat(pageBufs)
    pushStr(`${cn} 0 obj\n<</Length ${streamData.length}>>\nstream\n`)
    pushBuf(streamData)
    pushStr('\nendstream\nendobj\n')
  }

  offsets[2 * N + 2] = pos
  pushStr(`${f1Obj} 0 obj\n<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>\nendobj\n`)

  offsets[2 * N + 3] = pos
  pushStr(`${f2Obj} 0 obj\n<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold/Encoding/WinAnsiEncoding>>\nendobj\n`)

  if (hasLogo && logoStream && logo) {
    offsets[2 * N + 4] = pos
    pushStr(`${logoObj} 0 obj\n<</Type/XObject/Subtype/Image/Width ${logo.width}/Height ${logo.height}/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/FlateDecode/Length ${logoStream.length}>>\nstream\n`)
    pushBuf(logoStream)
    pushStr('\nendstream\nendobj\n')
  }

  const xrefPos = pos
  let xref = `xref\n0 ${totalObjs + 1}\n`
  xref += '0000000000 65535 f \n'
  for (let i = 0; i < totalObjs; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n'
  }
  xref += `trailer\n<</Size ${totalObjs + 1}/Root 1 0 R>>\nstartxref\n${xrefPos}\n%%EOF`
  pushStr(xref)

  return Buffer.concat(parts)
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const user = await requirePrivilegedAccess()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: PDFRequestBody
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { contacts, fields, eventFilter } = body
  if (!Array.isArray(contacts) || !Array.isArray(fields) || fields.length === 0) {
    return NextResponse.json({ error: 'Missing contacts or fields' }, { status: 400 })
  }

  const logo = loadLogoPNG(path.join(process.cwd(), 'public', 'white.png'), [26, 74, 58])

  const hasEventFilter = !!eventFilter && eventFilter.trim() !== ''
  const headerTitle = hasEventFilter ? eventFilter!.toUpperCase() : 'EVENT CONTACTS'
  const headerSubtitle = `${contacts.length} partecipant${contacts.length === 1 ? 'e' : 'i'} - ${italianDate()}`
  const eventLabel = hasEventFilter ? eventFilter! : 'Tutti gli eventi'

  const pdf = buildEventContactsPDF(contacts, fields, headerTitle, headerSubtitle, eventLabel, logo)

  const safeTitle = headerTitle.replace(/[^a-zA-Z0-9\-_]/g, '-')
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="event-contacts-${safeTitle}.pdf"`,
    },
  })
}

// The header title area (drawBrandedHeader) starts at x=300 — moved in from
// the shared 370 default since this export drops the two left-block tagline
// lines, freeing room to shift the title block left. Long event names now
// wrap onto a 2nd line (see drawBrandedHeader) instead of truncating, so this
// only needs to mark where the title block starts.
const HEADER_TEXT_X = 300
