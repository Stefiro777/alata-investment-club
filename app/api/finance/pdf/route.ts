import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

interface PDFPayload {
  period: string
  summary: { entrate: number; uscite: number; saldo: number; saldoCumulativo: number }
  categories: Array<{ name: string; entrate: number; uscite: number; saldo: number }>
}

function escapePDF(s: string): string {
  // Replace non-latin1 chars and PDF special chars
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[Ā-￿]/g, '?')
}

function fmtAmt(n: number): string {
  const abs = Math.abs(n).toFixed(2)
  return (n < 0 ? '-' : '') + 'EUR ' + abs.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function buildPDF(payload: PDFPayload): Buffer {
  const parts: string[] = []
  const offsets: number[] = []
  let pos = 0

  const push = (s: string) => { parts.push(s); pos += s.length }

  // Header
  push('%PDF-1.4\n')

  // Build content stream
  const lines: string[] = []
  let y = 790

  const text = (x: number, yy: number, font: string, size: number, str: string) =>
    `BT /${font} ${size} Tf ${x} ${yy} Td (${escapePDF(str)}) Tj ET`

  lines.push(text(50, y, 'F2', 16, 'Budget Report'))
  y -= 22
  lines.push(text(50, y, 'F1', 11, payload.period))
  y -= 30

  lines.push(text(50, y, 'F2', 10, 'RIEPILOGO'))
  y -= 16

  const sumRows = [
    ['Entrate', fmtAmt(payload.summary.entrate)],
    ['Uscite', fmtAmt(payload.summary.uscite)],
    ['Saldo Periodo', fmtAmt(payload.summary.saldo)],
    ['Saldo Cumulativo', fmtAmt(payload.summary.saldoCumulativo)],
  ]
  for (const [label, val] of sumRows) {
    lines.push(`BT /F1 10 Tf 50 ${y} Td (${escapePDF(label)}) Tj 160 0 Td (${escapePDF(val)}) Tj ET`)
    y -= 14
  }

  y -= 16
  lines.push(text(50, y, 'F2', 10, 'CATEGORIE'))
  y -= 16
  lines.push(`BT /F2 9 Tf 50 ${y} Td (CATEGORIA) Tj 200 0 Td (ENTRATE) Tj 100 0 Td (USCITE) Tj 100 0 Td (SALDO) Tj ET`)
  y -= 12
  lines.push(text(50, y, 'F1', 9, '------------------------------------------------------------------------'))
  y -= 14

  for (const cat of payload.categories) {
    if (y < 60) break
    lines.push(
      `BT /F1 9 Tf 50 ${y} Td (${escapePDF(cat.name)}) Tj 200 0 Td (${escapePDF(fmtAmt(cat.entrate))}) Tj 100 0 Td (${escapePDF(fmtAmt(cat.uscite))}) Tj 100 0 Td (${escapePDF(fmtAmt(cat.saldo))}) Tj ET`
    )
    y -= 14
  }

  // Totals row
  if (y > 60) {
    y -= 4
    lines.push(text(50, y, 'F1', 9, '------------------------------------------------------------------------'))
    y -= 12
    lines.push(
      `BT /F2 9 Tf 50 ${y} Td (TOTALE) Tj 200 0 Td (${escapePDF(fmtAmt(payload.summary.entrate))}) Tj 100 0 Td (${escapePDF(fmtAmt(payload.summary.uscite))}) Tj 100 0 Td (${escapePDF(fmtAmt(payload.summary.saldo))}) Tj ET`
    )
  }

  const stream = lines.join('\n')

  // obj 1: catalog
  offsets.push(pos)
  push('1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n')

  // obj 2: pages
  offsets.push(pos)
  push('2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n')

  // obj 3: page
  offsets.push(pos)
  push('3 0 obj\n<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R/F2 6 0 R>>>>>>\nendobj\n')

  // obj 4: content stream
  offsets.push(pos)
  const streamLen = Buffer.byteLength(stream, 'latin1')
  push(`4 0 obj\n<</Length ${streamLen}>>\nstream\n${stream}\nendstream\nendobj\n`)

  // obj 5: Helvetica
  offsets.push(pos)
  push('5 0 obj\n<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>\nendobj\n')

  // obj 6: Helvetica-Bold
  offsets.push(pos)
  push('6 0 obj\n<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold/Encoding/WinAnsiEncoding>>\nendobj\n')

  const xrefPos = pos

  let xref = 'xref\n0 7\n'
  xref += '0000000000 65535 f \n'
  for (const off of offsets) {
    xref += String(off).padStart(10, '0') + ' 00000 n \n'
  }
  xref += `trailer\n<</Size 7/Root 1 0 R>>\nstartxref\n${xrefPos}\n%%EOF`
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
