import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

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

function esc(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[Ā-￿]/g, '?')
}

function fmtEur(n: number): string {
  const sign = n < 0 ? '-' : ''
  const parts = Math.abs(n).toFixed(2).split('.')
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${sign}EUR ${intPart},${parts[1]}`
}

// PDF color strings (r g b, 0-1)
const GREEN = '0.102 0.290 0.227'
const WHITE = '1 1 1'
const DARK  = '0.067 0.094 0.153'
const MUTED = '0.420 0.447 0.502'
const LGRAY = '0.976 0.980 0.984'
const TGRN  = '0.086 0.639 0.290'
const TRED  = '0.863 0.149 0.149'
const GSUB  = '0.7 0.85 0.78'
const LGRN  = '0.940 0.970 0.960'
const SGRAY = '0.75 0.75 0.75'

const PW = 595, PH = 842
const ML = 50, MR = 545
const CW = MR - ML  // 495

function rect(x: number, y: number, w: number, h: number, c: string): string {
  return `q ${c} rg ${x} ${y} ${w} ${h} re f Q`
}
function hline(x1: number, y1: number, x2: number, c: string, lw = 0.5): string {
  return `q ${c} RG ${lw} w ${x1} ${y1} m ${x2} ${y1} l S Q`
}
function tx(x: number, y: number, f: 'F1'|'F2', sz: number, c: string, s: string): string {
  return `q ${c} rg BT /${f} ${sz} Tf ${x} ${y} Td (${esc(s)}) Tj ET Q`
}

function buildPDF(payload: PDFPayload): Buffer {
  const today = italianDate()
  const ROW_H = 18
  const FOOTER_MIN = 50
  const COL = { name: ML, rev: ML + 210, cost: ML + 322, bal: ML + 430 }

  const pageStreams: string[][] = []
  let ops: string[] = []
  let curY = 0
  let pageNum = 0

  function addFooter() {
    ops.push(hline(ML, FOOTER_MIN, MR, GREEN, 0.75))
    ops.push(tx(ML, FOOTER_MIN - 15, 'F1', 8, MUTED, 'Alata Investment Club - Documento riservato'))
    ops.push(tx(MR - 50, FOOTER_MIN - 15, 'F1', 8, MUTED, `Pagina ${pageNum}`))
  }

  function flushPage() {
    addFooter()
    pageStreams.push(ops)
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
    if (curY - need < FOOTER_MIN + 10) {
      flushPage()
      startNewPage()
    }
  }

  // ── Page 1 header ────────────────────────────────────────────────────────
  pageNum++
  const HDR_H = 72
  ops.push(rect(0, PH - HDR_H, PW, HDR_H, GREEN))
  ops.push(tx(ML, PH - 28, 'F2', 16, WHITE, 'ALATA INVESTMENT CLUB'))
  ops.push(tx(ML, PH - 46, 'F1', 9, GSUB, 'Associazione Studentesca di Finanza'))
  ops.push(tx(370, PH - 28, 'F2', 13, WHITE, 'BUDGET REPORT'))
  ops.push(tx(370, PH - 46, 'F1', 9, GSUB, payload.period))
  curY = PH - HDR_H - 26

  // ── Document info block ──────────────────────────────────────────────────
  const infoRows: [string, string][] = [
    ['Periodo di riferimento:', payload.period],
    ['Data di redazione:', `Brescia, ${today}`],
    ['Redatto da:', 'Consiglio Direttivo - Alata Investment Club'],
  ]
  for (const [label, value] of infoRows) {
    ops.push(tx(ML, curY, 'F2', 10, DARK, label))
    const lw = label.length * 6.0
    ops.push(tx(ML + lw, curY, 'F1', 10, DARK, value))
    curY -= 17
  }
  curY -= 8
  ops.push(hline(ML, curY, MR, GREEN, 0.5))
  curY -= 22

  // ── RIEPILOGO ────────────────────────────────────────────────────────────
  ops.push(tx(ML, curY, 'F2', 11, GREEN, 'RIEPILOGO'))
  curY -= 5
  ops.push(hline(ML, curY, ML + 78, GREEN, 1))
  curY -= 15

  const sumRows = [
    { label: 'Entrate totali',   val: payload.summary.entrate,           c: TGRN },
    { label: 'Uscite totali',    val: payload.summary.uscite,            c: TRED },
    { label: 'Saldo periodo',    val: payload.summary.saldo,             c: payload.summary.saldo >= 0 ? TGRN : TRED },
    { label: 'Saldo cumulativo', val: payload.summary.saldoCumulativo,   c: payload.summary.saldoCumulativo >= 0 ? TGRN : TRED },
  ]
  for (let i = 0; i < sumRows.length; i++) {
    const r = sumRows[i]
    const ry = curY - ROW_H
    if (i % 2 === 1) ops.push(rect(ML, ry, CW, ROW_H, LGRAY))
    ops.push(tx(ML + 8, ry + 5, 'F1', 10, DARK, r.label))
    ops.push(tx(ML + 230, ry + 5, 'F2', 10, r.c, fmtEur(r.val)))
    curY = ry
  }
  curY -= 26

  // ── DETTAGLIO PER CATEGORIA ──────────────────────────────────────────────
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
  ops.push(tx(COL.rev, hry + 5, 'F2', 8.5, WHITE, 'ENTRATE'))
  ops.push(tx(COL.cost, hry + 5, 'F2', 8.5, WHITE, 'USCITE'))
  ops.push(tx(COL.bal, hry + 5, 'F2', 8.5, WHITE, 'SALDO'))
  curY = hry

  // Data rows
  for (let i = 0; i < payload.categories.length; i++) {
    checkSpace(ROW_H + 5)
    const cat = payload.categories[i]
    const ry = curY - ROW_H
    if (i % 2 === 1) ops.push(rect(ML, ry, CW, ROW_H, LGRAY))
    ops.push(tx(COL.name + 8, ry + 5, 'F1', 9, DARK, cat.name))
    ops.push(tx(COL.rev,  ry + 5, 'F1', 9, cat.entrate > 0 ? TGRN : MUTED, cat.entrate > 0 ? fmtEur(cat.entrate) : '--'))
    ops.push(tx(COL.cost, ry + 5, 'F1', 9, cat.uscite  > 0 ? TRED : MUTED, cat.uscite  > 0 ? fmtEur(cat.uscite)  : '--'))
    const sc = cat.saldo >= 0 ? TGRN : TRED
    ops.push(tx(COL.bal, ry + 5, 'F2', 9, sc, (cat.saldo >= 0 ? '+' : '') + fmtEur(cat.saldo)))
    curY = ry
  }

  // TOTALE row
  checkSpace(ROW_H + 15)
  ops.push(hline(ML, curY, MR, GREEN, 0.75))
  const totalRowY = curY - ROW_H
  ops.push(rect(ML, totalRowY, CW, ROW_H, LGRN))
  ops.push(tx(COL.name + 8, totalRowY + 5, 'F2', 9, DARK, 'TOTALE'))
  ops.push(tx(COL.rev,  totalRowY + 5, 'F2', 9, TGRN, fmtEur(payload.summary.entrate)))
  ops.push(tx(COL.cost, totalRowY + 5, 'F2', 9, TRED, fmtEur(payload.summary.uscite)))
  const ts = payload.summary.saldo
  ops.push(tx(COL.bal, totalRowY + 5, 'F2', 9, ts >= 0 ? TGRN : TRED, (ts >= 0 ? '+' : '') + fmtEur(ts)))
  curY = totalRowY - 40

  // ── Signature block ──────────────────────────────────────────────────────
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

  // Finalize last page
  flushPage()

  // ── Assemble PDF binary ──────────────────────────────────────────────────
  const N = pageStreams.length
  const f1Obj = 2 * N + 3
  const f2Obj = 2 * N + 4
  const totalObjs = 2 * N + 4

  const parts: string[] = []
  const offsets: number[] = new Array(totalObjs).fill(0)
  let pos = 0
  const push = (s: string) => { parts.push(s); pos += s.length }

  push('%PDF-1.4\n')

  // obj 1: Catalog
  offsets[0] = pos
  push('1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n')

  // obj 2: Pages
  offsets[1] = pos
  const kids = Array.from({ length: N }, (_, i) => `${i + 3} 0 R`).join(' ')
  push(`2 0 obj\n<</Type/Pages/Kids[${kids}]/Count ${N}>>\nendobj\n`)

  // Page objects: 3..N+2
  for (let i = 0; i < N; i++) {
    offsets[2 + i] = pos
    const pn = 3 + i
    const cn = N + 3 + i
    push(`${pn} 0 obj\n<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${PW} ${PH}]/Contents ${cn} 0 R/Resources<</Font<</F1 ${f1Obj} 0 R/F2 ${f2Obj} 0 R>>>>>>\nendobj\n`)
  }

  // Content streams: N+3..2N+2
  for (let i = 0; i < N; i++) {
    offsets[N + 2 + i] = pos
    const cn = N + 3 + i
    const stream = pageStreams[i].join('\n')
    push(`${cn} 0 obj\n<</Length ${stream.length}>>\nstream\n${stream}\nendstream\nendobj\n`)
  }

  // Font F1: Helvetica
  offsets[2 * N + 2] = pos
  push(`${f1Obj} 0 obj\n<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>\nendobj\n`)

  // Font F2: Helvetica-Bold
  offsets[2 * N + 3] = pos
  push(`${f2Obj} 0 obj\n<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold/Encoding/WinAnsiEncoding>>\nendobj\n`)

  // xref table
  const xrefPos = pos
  let xref = `xref\n0 ${totalObjs + 1}\n`
  xref += '0000000000 65535 f \n'
  for (let i = 0; i < totalObjs; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n'
  }
  xref += `trailer\n<</Size ${totalObjs + 1}/Root 1 0 R>>\nstartxref\n${xrefPos}\n%%EOF`
  push(xref)

  return Buffer.from(parts.join(''), 'latin1')
}

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
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const pdf = buildPDF(payload)
  const safePeriod = payload.period.replace(/[^a-zA-Z0-9\-_]/g, '-')

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="bilancio-${safePeriod}.pdf"`,
    },
  })
}
