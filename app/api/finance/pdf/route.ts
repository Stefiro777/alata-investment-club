import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import * as zlib from 'zlib'
import * as path from 'path'
import { loadLogoPNG } from '@/lib/quote-pdf'
import type { PNGImg } from '@/lib/quote-pdf'
import {
  PW, PH, ML, MR, CW, FOOTER_MIN,
  GREEN, WHITE, BLACK, DARK, MUTED, LGRAY, GSUB, LGRN, SGRAY,
  rect, hline, tx, drawImage, textWidth,
  drawBrandedHeader, drawBrandedFooter,
} from '@/lib/pdf-branding'

// The header title area used to sit at a hardcoded x=370, which real
// Helvetica-Bold metrics show overlaps the logo (drawn at MR - logoW - 8)
// even for the fixed 'BUDGET REPORT' title. Guarantee a minimum gap instead,
// moving the block left when needed — but never past where the left block
// (now just the club name, ending around x=238) would get crowded.
const MIN_LOGO_GAP = 12
const RIGHT_BLOCK_DEFAULT_X = 370
const RIGHT_BLOCK_MIN_X = 250

export const dynamic = 'force-dynamic'

// ── PDF payload ───────────────────────────────────────────────────────────────

interface PDFPayload {
  period: string
  summary: { entrate: number; uscite: number; saldo: number; saldoCumulativo: number }
  categories: Array<{ name: string; entrate: number; uscite: number; saldo: number }>
}

const MONTHS_IT = ['gennaio','febbraio','marzo','aprile','maggio','giugno',
                   'luglio','agosto','settembre','ottobre','novembre','dicembre']

function italianDate(): string {
  const d = new Date()
  return `${d.getDate()} ${MONTHS_IT[d.getMonth()]} ${d.getFullYear()}`
}

function fmtEur(n: number): string {
  const sign = n < 0 ? '-' : ''
  const parts = Math.abs(n).toFixed(2).split('.')
  return `${sign}EUR ${parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.')},${parts[1]}`
}

// ── Build PDF ─────────────────────────────────────────────────────────────────

function buildPDF(payload: PDFPayload, logo: PNGImg | null): Buffer {
  const today = italianDate()
  const ROW_H = 18
  const COL = { name: ML, rev: ML + 210, cost: ML + 322, bal: ML + 430 }

  // Compressed logo image data
  let logoStream: Buffer | null = null
  let logoW = 0, logoH = 0
  if (logo) {
    logoStream = zlib.deflateSync(logo.rgbData)
    logoH = 40
    logoW = Math.round((logo.width / logo.height) * logoH)
  }

  // Collect page streams as Buffer arrays
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
      bufs.push(Buffer.from('\n' + drawImage('Logo', MR - logoW - 8, PH - (72 + logoH) / 2, logoW, logoH), 'latin1'))
    }
    pageStreams.push(bufs)
    ops = []
  }

  function startNewPage() {
    pageNum++
    ops = []
    ops.push(rect(0, PH - 36, PW, 36, GREEN))
    ops.push(tx(ML, PH - 23, 'F2', 10, WHITE, 'ALATA INVESTMENT CLUB - Budget Report (continua)'))
    ops.push(tx(390, PH - 23, 'F1', 9, GSUB, payload.period))
    curY = PH - 36 - 20
  }

  function checkSpace(need: number) {
    if (curY - need < FOOTER_MIN + 10) { flushPage(); startNewPage() }
  }

  // ── Page 1 header ─────────────────────────────────────────────────────────
  pageNum++
  const HDR_H = 72
  const logoX = MR - logoW - 8
  const titleW = textWidth('BUDGET REPORT', 'F2', 13)
  const periodW = textWidth(payload.period, 'F1', 9)
  const rightBlockX = Math.max(
    RIGHT_BLOCK_MIN_X,
    Math.min(RIGHT_BLOCK_DEFAULT_X, logoX - MIN_LOGO_GAP - Math.max(titleW, periodW)),
  )
  ops.push(...drawBrandedHeader('BUDGET REPORT', payload.period, rightBlockX))
  curY = PH - HDR_H - 26

  // ── Document info block ──────────────────────────────────────────────────
  const infoRows: [string, string][] = [
    ['Periodo di riferimento:', payload.period],
    ['Data di redazione:', `Brescia, ${today}`],
    ['Redatto da:', 'Consiglio Direttivo - Alata Investment Club'],
  ]
  for (const [label, value] of infoRows) {
    ops.push(tx(ML, curY, 'F2', 10, DARK, label))
    ops.push(tx(ML + label.length * 6.0, curY, 'F1', 10, DARK, value))
    curY -= 17
  }
  curY -= 8
  ops.push(hline(ML, curY, MR, GREEN, 0.5))
  curY -= 22

  // ── RIEPILOGO ─────────────────────────────────────────────────────────────
  ops.push(tx(ML, curY, 'F2', 11, GREEN, 'RIEPILOGO'))
  curY -= 5
  ops.push(hline(ML, curY, ML + 78, GREEN, 1))
  curY -= 15

  const sumRows = [
    { label: 'Entrate totali',   val: payload.summary.entrate },
    { label: 'Uscite totali',    val: payload.summary.uscite },
    { label: 'Saldo periodo',    val: payload.summary.saldo },
    { label: 'Saldo cumulativo', val: payload.summary.saldoCumulativo },
  ]
  for (let i = 0; i < sumRows.length; i++) {
    const r = sumRows[i]
    const ry = curY - ROW_H
    if (i % 2 === 1) ops.push(rect(ML, ry, CW, ROW_H, LGRAY))
    ops.push(tx(ML + 8,  ry + 5, 'F1', 10, DARK, r.label))
    ops.push(tx(ML + 230, ry + 5, 'F2', 10, BLACK, fmtEur(r.val)))
    curY = ry
  }
  curY -= 26

  // ── DETTAGLIO PER CATEGORIA ───────────────────────────────────────────────
  checkSpace(60)
  ops.push(tx(ML, curY, 'F2', 11, GREEN, 'DETTAGLIO PER CATEGORIA'))
  curY -= 5
  ops.push(hline(ML, curY, ML + 168, GREEN, 1))
  curY -= 15

  // Header row
  checkSpace(ROW_H + 10)
  const hry = curY - ROW_H
  ops.push(rect(ML, hry, CW, ROW_H, GREEN))
  ops.push(tx(COL.name + 8, hry + 5, 'F2', 8.5, WHITE, 'CATEGORIA'))
  ops.push(tx(COL.rev,  hry + 5, 'F2', 8.5, WHITE, 'ENTRATE'))
  ops.push(tx(COL.cost, hry + 5, 'F2', 8.5, WHITE, 'USCITE'))
  ops.push(tx(COL.bal,  hry + 5, 'F2', 8.5, WHITE, 'SALDO'))
  curY = hry

  // Data rows — all values in BLACK
  for (let i = 0; i < payload.categories.length; i++) {
    checkSpace(ROW_H + 5)
    const cat = payload.categories[i]
    const ry = curY - ROW_H
    if (i % 2 === 1) ops.push(rect(ML, ry, CW, ROW_H, LGRAY))
    ops.push(tx(COL.name + 8, ry + 5, 'F1', 9, DARK,  cat.name))
    ops.push(tx(COL.rev,  ry + 5, 'F1', 9, cat.entrate > 0 ? BLACK : MUTED, cat.entrate > 0 ? fmtEur(cat.entrate) : '--'))
    ops.push(tx(COL.cost, ry + 5, 'F1', 9, cat.uscite  > 0 ? BLACK : MUTED, cat.uscite  > 0 ? fmtEur(cat.uscite)  : '--'))
    ops.push(tx(COL.bal,  ry + 5, 'F2', 9, BLACK, (cat.saldo >= 0 ? '+' : '') + fmtEur(cat.saldo)))
    curY = ry
  }

  // TOTALE row
  checkSpace(ROW_H + 15)
  ops.push(hline(ML, curY, MR, GREEN, 0.75))
  const totalRowY = curY - ROW_H
  ops.push(rect(ML, totalRowY, CW, ROW_H, LGRN))
  ops.push(tx(COL.name + 8, totalRowY + 5, 'F2', 9, DARK,  'TOTALE'))
  ops.push(tx(COL.rev,  totalRowY + 5, 'F2', 9, BLACK, fmtEur(payload.summary.entrate)))
  ops.push(tx(COL.cost, totalRowY + 5, 'F2', 9, BLACK, fmtEur(payload.summary.uscite)))
  ops.push(tx(COL.bal,  totalRowY + 5, 'F2', 9, BLACK, (payload.summary.saldo >= 0 ? '+' : '') + fmtEur(payload.summary.saldo)))
  curY = totalRowY - 40

  // ── Signature block ───────────────────────────────────────────────────────
  checkSpace(115)
  ops.push(hline(ML, curY, MR, GREEN, 0.5))
  curY -= 22
  ops.push(tx(ML, curY, 'F1', 9, MUTED, 'Il Presidente'))
  curY -= 26
  ops.push(hline(ML, curY, ML + 160, SGRAY, 0.5))
  curY -= 14
  ops.push(tx(ML, curY, 'F1', 8, MUTED, '(firma)'))
  curY -= 30
  ops.push(tx(ML, curY, 'F1', 9, MUTED, `Approvato dal Consiglio Direttivo in data Brescia, ${today}`))
  curY -= 16
  ops.push(tx(ML, curY, 'F1', 8, MUTED, "Il presente documento e' redatto ai sensi dello Statuto dell'Associazione Alata Investment Club, APS."))

  // Finalize first (and possibly only) page
  flushPage(pageNum === 1)

  // ── Assemble PDF binary ───────────────────────────────────────────────────
  const N = pageStreams.length
  const hasLogo = logo !== null && logoStream !== null

  // Object numbering:
  // 1: Catalog, 2: Pages
  // 3..N+2: Page objects
  // N+3..2N+2: Content streams
  // 2N+3: Font F1 (Helvetica)
  // 2N+4: Font F2 (Helvetica-Bold)
  // 2N+5: Logo XObject (if present)
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

  // obj 1: Catalog
  offsets[0] = pos
  pushStr('1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n')

  // obj 2: Pages
  offsets[1] = pos
  const kids = Array.from({ length: N }, (_, i) => `${i + 3} 0 R`).join(' ')
  pushStr(`2 0 obj\n<</Type/Pages/Kids[${kids}]/Count ${N}>>\nendobj\n`)

  // Page objects: 3..N+2
  for (let i = 0; i < N; i++) {
    offsets[2 + i] = pos
    const pn = 3 + i
    const cn = N + 3 + i
    const xobjDict = hasLogo ? `/XObject<</Logo ${logoObj} 0 R>>` : ''
    pushStr(`${pn} 0 obj\n<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${PW} ${PH}]/Contents ${cn} 0 R/Resources<</Font<</F1 ${f1Obj} 0 R/F2 ${f2Obj} 0 R>>${xobjDict}>>\nendobj\n`)
  }

  // Content streams: N+3..2N+2
  for (let i = 0; i < N; i++) {
    offsets[N + 2 + i] = pos
    const cn = N + 3 + i
    const pageBufs = pageStreams[i]
    const streamData = Buffer.concat(pageBufs)
    pushStr(`${cn} 0 obj\n<</Length ${streamData.length}>>\nstream\n`)
    pushBuf(streamData)
    pushStr('\nendstream\nendobj\n')
  }

  // Font F1
  offsets[2 * N + 2] = pos
  pushStr(`${f1Obj} 0 obj\n<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>\nendobj\n`)

  // Font F2
  offsets[2 * N + 3] = pos
  pushStr(`${f2Obj} 0 obj\n<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold/Encoding/WinAnsiEncoding>>\nendobj\n`)

  // Logo Image XObject
  if (hasLogo && logoStream && logo) {
    offsets[2 * N + 4] = pos
    pushStr(`${logoObj} 0 obj\n<</Type/XObject/Subtype/Image/Width ${logo.width}/Height ${logo.height}/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/FlateDecode/Length ${logoStream.length}>>\nstream\n`)
    pushBuf(logoStream)
    pushStr('\nendstream\nendobj\n')
  }

  // xref table
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
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let payload: PDFPayload
  try { payload = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  // Load logo from public directory
  const logo = loadLogoPNG(path.join(process.cwd(), 'public', 'white.png'), [26, 74, 58])

  const pdf = buildPDF(payload, logo)
  const safePeriod = payload.period.replace(/[^a-zA-Z0-9\-_]/g, '-')

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="bilancio-${safePeriod}.pdf"`,
    },
  })
}
