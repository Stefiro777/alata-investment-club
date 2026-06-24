import * as zlib from 'zlib'
import * as fs from 'fs'

// ── PNG loader ────────────────────────────────────────────────────────────────

export interface PNGImg { width: number; height: number; rgbData: Buffer }

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a; if (pb <= pc) return b; return c
}

export function loadLogoPNG(filePath: string): PNGImg | null {
  try {
    const buf = fs.readFileSync(filePath)
    const SIG = [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]
    for (let i = 0; i < 8; i++) if (buf[i] !== SIG[i]) return null
    let pos = 8, width = 0, height = 0, bitDepth = 0, colorType = 0
    const idatChunks: Buffer[] = []
    while (pos + 12 <= buf.length) {
      const len = buf.readUInt32BE(pos); const type = buf.toString('ascii', pos + 4, pos + 8)
      const data = buf.subarray(pos + 8, pos + 8 + len); pos += 12 + len
      if (type === 'IHDR') { width=data.readUInt32BE(0); height=data.readUInt32BE(4); bitDepth=data[8]; colorType=data[9] }
      else if (type === 'IDAT') { idatChunks.push(Buffer.from(data)) }
      else if (type === 'IEND') break
    }
    if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) return null
    const ch = colorType === 6 ? 4 : 3
    const inflated = zlib.inflateSync(Buffer.concat(idatChunks))
    const stride = width * ch; const rgb = Buffer.allocUnsafe(width * height * 3)
    let inP = 0, outP = 0; const prev = Buffer.alloc(stride, 255)
    for (let y = 0; y < height; y++) {
      const ft = inflated[inP++]; const cur = Buffer.allocUnsafe(stride)
      for (let x = 0; x < stride; x++) {
        const raw=inflated[inP+x]; const left=x<ch?0:cur[x-ch]; const up=prev[x]; const upLeft=x<ch?0:prev[x-ch]
        let v: number
        switch(ft){case 0:v=raw;break;case 1:v=raw+left;break;case 2:v=raw+up;break;case 3:v=raw+Math.floor((left+up)/2);break;case 4:v=raw+paeth(left,up,upLeft);break;default:v=raw}
        cur[x]=v&0xFF
      }
      inP+=stride; cur.copy(prev)
      for (let x = 0; x < width; x++) {
        if (ch===4){const r=cur[x*4],g=cur[x*4+1],b=cur[x*4+2],a=cur[x*4+3]/255;rgb[outP++]=Math.round(a*r+(1-a)*255);rgb[outP++]=Math.round(a*g+(1-a)*255);rgb[outP++]=Math.round(a*b+(1-a)*255)}
        else{rgb[outP++]=cur[x*3];rgb[outP++]=cur[x*3+1];rgb[outP++]=cur[x*3+2]}
      }
    }
    return { width, height, rgbData: rgb }
  } catch { return null }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuoteItem { description: string; qty: number; unit_price: number }
export interface QuoteData {
  number: string
  issued_at: string
  recipient_name: string
  recipient_email?: string | null
  recipient_org?: string | null
  subject: string
  items: QuoteItem[]
  notes?: string | null
}

// ── PDF primitives ────────────────────────────────────────────────────────────

const PW = 595, PH = 842, ML = 50, MR = 545, CW = MR - ML
const GREEN = '0.102 0.290 0.227', WHITE = '1 1 1', BLACK = '0 0 0'
const MUTED  = '0.420 0.447 0.502', LGRAY = '0.976 0.980 0.984'
const GSUB   = '0.7 0.85 0.78'

const MONTHS_IT = ['gennaio','febbraio','marzo','aprile','maggio','giugno',
                   'luglio','agosto','settembre','ottobre','novembre','dicembre']

function fmtDate(d: string) {
  const dt = new Date(d); return `${dt.getDate()} ${MONTHS_IT[dt.getMonth()]} ${dt.getFullYear()}`
}
function fmtEur(n: number) {
  const sign = n < 0 ? '-' : ''; const [int, dec] = Math.abs(n).toFixed(2).split('.')
  return `${sign}EUR ${int.replace(/\B(?=(\d{3})+(?!\d))/g,'.')},${dec}`
}
function esc(s: string) { return s.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)').replace(/[Ā-￿]/g,'?') }
function rect(x:number,y:number,w:number,h:number,c:string){return `q ${c} rg ${x} ${y} ${w} ${h} re f Q`}
function hline(x1:number,y:number,x2:number,c:string,lw=0.5){return `q ${c} RG ${lw} w ${x1} ${y} m ${x2} ${y} l S Q`}
function tx(x:number,y:number,f:'F1'|'F2',sz:number,c:string,s:string){return `q ${c} rg BT /${f} ${sz} Tf ${x} ${y} Td (${esc(s)}) Tj ET Q`}

// ── Build quote PDF ───────────────────────────────────────────────────────────

export function buildQuotePDF(q: QuoteData, logo: PNGImg | null): Buffer {
  let logoStream: Buffer | null = null
  let logoW = 0, logoH = 0
  if (logo) { logoStream = zlib.deflateSync(logo.rgbData); logoH = 40; logoW = Math.round((logo.width / logo.height) * logoH) }
  const hasLogo = !!logoStream && !!logo

  const HDR_H = 72
  const ROW_H = 18
  const ops: string[] = []
  let curY = PH - HDR_H - 30

  // Header band
  ops.push(rect(0, PH - HDR_H, PW, HDR_H, GREEN))
  ops.push(tx(ML, PH - 28, 'F2', 14, WHITE, 'ALATA INVESTMENT CLUB'))
  ops.push(tx(ML, PH - 46, 'F1', 9, GSUB, "Universita' degli Studi di Brescia"))
  ops.push(tx(ML, PH - 64, 'F1', 8, GSUB, 'alatainvestmentclub.com'))
  ops.push(tx(370, PH - 28, 'F2', 13, WHITE, 'PREVENTIVO'))
  ops.push(tx(370, PH - 46, 'F1', 8, GSUB, q.number))
  ops.push(tx(370, PH - 60, 'F1', 8, GSUB, fmtDate(q.issued_at)))

  // Subject
  ops.push(tx(ML, curY, 'F2', 12, BLACK, `Oggetto: ${q.subject}`))
  curY -= 22
  ops.push(hline(ML, curY, MR, GREEN, 0.75))
  curY -= 20

  // Sender / Recipient columns
  ops.push(tx(ML,       curY, 'F2', 9, GREEN, 'MITTENTE'))
  ops.push(tx(ML + 260, curY, 'F2', 9, GREEN, 'DESTINATARIO'))
  curY -= 14
  const sender = ['Alata Investment Club', "Universita' degli Studi di Brescia", 'info@alatainvestmentclub.com']
  const recip  = [q.recipient_name, q.recipient_org ?? '', q.recipient_email ?? '']
  for (let i = 0; i < 3; i++) {
    if (sender[i]) ops.push(tx(ML,       curY, 'F1', 9, BLACK, sender[i]))
    if (recip[i])  ops.push(tx(ML + 260, curY, 'F1', 9, BLACK, recip[i]))
    curY -= 14
  }
  curY -= 10
  ops.push(hline(ML, curY, MR, GREEN, 0.5))
  curY -= 22

  // Items table header
  const COL = { desc: ML, qty: ML + 265, unit: ML + 330, total: ML + 420 }
  const hryT = curY - ROW_H
  ops.push(rect(ML, hryT, CW, ROW_H, GREEN))
  ops.push(tx(COL.desc  + 6, hryT + 5, 'F2', 8.5, WHITE, 'DESCRIZIONE'))
  ops.push(tx(COL.qty,        hryT + 5, 'F2', 8.5, WHITE, 'QTA'))
  ops.push(tx(COL.unit,       hryT + 5, 'F2', 8.5, WHITE, 'PREZZO UNIT.'))
  ops.push(tx(COL.total,      hryT + 5, 'F2', 8.5, WHITE, 'TOTALE'))
  curY = hryT

  let grandTotal = 0
  for (let i = 0; i < q.items.length; i++) {
    const item = q.items[i]
    const rowTotal = (item.qty ?? 0) * (item.unit_price ?? 0)
    grandTotal += rowTotal
    const ry = curY - ROW_H
    if (i % 2 === 1) ops.push(rect(ML, ry, CW, ROW_H, LGRAY))
    ops.push(tx(COL.desc  + 6, ry + 5, 'F1', 9, BLACK, item.description ?? ''))
    ops.push(tx(COL.qty,        ry + 5, 'F1', 9, BLACK, String(item.qty ?? 0)))
    ops.push(tx(COL.unit,       ry + 5, 'F1', 9, BLACK, fmtEur(item.unit_price ?? 0)))
    ops.push(tx(COL.total,      ry + 5, 'F2', 9, BLACK, fmtEur(rowTotal)))
    curY = ry
  }

  // Total row
  ops.push(hline(ML, curY, MR, GREEN, 0.75))
  const totRowY = curY - ROW_H
  ops.push(rect(ML, totRowY, CW, ROW_H, '0.940 0.970 0.960'))
  ops.push(tx(COL.desc + 6, totRowY + 5, 'F2', 10, BLACK, 'TOTALE PREVENTIVO'))
  ops.push(tx(COL.total,    totRowY + 5, 'F2', 10, BLACK, fmtEur(grandTotal)))
  curY = totRowY - 30

  // Notes
  if (q.notes) {
    ops.push(hline(ML, curY, MR, '0.8 0.8 0.8', 0.5))
    curY -= 16
    ops.push(tx(ML, curY, 'F2', 9, GREEN, 'NOTE E CONDIZIONI'))
    curY -= 14
    const words = q.notes.split(' '); let line = ''
    for (const word of words) {
      if ((line + word).length > 95) { if (line) { ops.push(tx(ML, curY, 'F1', 9, BLACK, line.trim())); curY -= 13; line = '' } }
      line += word + ' '
    }
    if (line.trim()) { ops.push(tx(ML, curY, 'F1', 9, BLACK, line.trim())); curY -= 13 }
  }

  // Signature / footer
  ops.push(hline(ML, 120, MR, GREEN, 0.5))
  ops.push(tx(ML, 105, 'F2', 9, BLACK, 'Alata Investment Club'))
  ops.push(tx(ML, 92,  'F1', 8, MUTED, 'alatainvestmentclub.com — info@alatainvestmentclub.com'))
  ops.push(tx(ML, 38,  'F1', 8, MUTED, "Documento emesso da Alata Investment Club — Universita' degli Studi di Brescia"))

  // ── PDF binary assembly ───────────────────────────────────────────────────
  // Objects: 1=Catalog, 2=Pages, 3=Page, 4=Content, 5=F1, 6=F2[, 7=Logo]
  const f1N = 5, f2N = 6, logoN = 7
  const totalObjs = hasLogo ? 7 : 6
  const allParts: Buffer[] = []
  const offsets: number[] = new Array(totalObjs).fill(0)
  let bytePos = 0
  const pushStr = (s: string) => { const b = Buffer.from(s, 'latin1'); allParts.push(b); bytePos += b.length }
  const pushBuf = (b: Buffer) => { allParts.push(b); bytePos += b.length }

  pushStr('%PDF-1.4\n')

  offsets[0] = bytePos
  pushStr('1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n')

  offsets[1] = bytePos
  pushStr('2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n')

  offsets[2] = bytePos
  const xRes = hasLogo ? `/XObject<</Logo ${logoN} 0 R>>` : ''
  pushStr(`3 0 obj\n<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${PW} ${PH}]/Contents 4 0 R/Resources<</Font<</F1 ${f1N} 0 R/F2 ${f2N} 0 R>>${xRes}>>\nendobj\n`)

  offsets[3] = bytePos
  const streamParts: Buffer[] = [Buffer.from(ops.join('\n'), 'latin1')]
  if (hasLogo && logoStream && logo) {
    streamParts.push(Buffer.from(`\nq ${logoW} 0 0 ${logoH} ${MR - logoW - 8} ${PH - (HDR_H + logoH) / 2} cm /Logo Do Q`, 'latin1'))
  }
  const sd = Buffer.concat(streamParts)
  pushStr(`4 0 obj\n<</Length ${sd.length}>>\nstream\n`); pushBuf(sd); pushStr('\nendstream\nendobj\n')

  offsets[4] = bytePos
  pushStr(`${f1N} 0 obj\n<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>\nendobj\n`)

  offsets[5] = bytePos
  pushStr(`${f2N} 0 obj\n<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold/Encoding/WinAnsiEncoding>>\nendobj\n`)

  if (hasLogo && logoStream && logo) {
    offsets[6] = bytePos
    pushStr(`${logoN} 0 obj\n<</Type/XObject/Subtype/Image/Width ${logo.width}/Height ${logo.height}/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/FlateDecode/Length ${logoStream.length}>>\nstream\n`)
    pushBuf(logoStream)
    pushStr('\nendstream\nendobj\n')
  }

  const xrefPos = bytePos
  let xref = `xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`
  for (let i = 0; i < totalObjs; i++) xref += String(offsets[i]).padStart(10,'0') + ' 00000 n \n'
  xref += `trailer\n<</Size ${totalObjs + 1}/Root 1 0 R>>\nstartxref\n${xrefPos}\n%%EOF`
  pushStr(xref)

  return Buffer.concat(allParts)
}
