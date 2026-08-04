// ── Page geometry ─────────────────────────────────────────────────────────────
export const PW = 595
export const PH = 842
export const ML = 50
export const MR = 545
export const CW = MR - ML
export const FOOTER_MIN = 50

// ── Color palette ──────────────────────────────────────────────────────────────
export const GREEN = '0.102 0.290 0.227'
export const WHITE = '1 1 1'
export const BLACK = '0 0 0'
export const DARK  = '0 0 0'      // body text
export const MUTED = '0.420 0.447 0.502'
export const LGRAY = '0.976 0.980 0.984'
export const GSUB  = '0.7 0.85 0.78'
export const LGRN  = '0.940 0.970 0.960'
export const SGRAY = '0.75 0.75 0.75'

// ── Text escaping ──────────────────────────────────────────────────────────────
function esc(s: string): string {
  return s.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)').replace(/[Ā-￿]/g,'?')
}

// ── Font metrics ──────────────────────────────────────────────────────────────
// Standard Helvetica / Helvetica-Bold AFM widths (per 1000 em units), for
// exact text measurement where the rough average-char-width heuristics used
// elsewhere for cell truncation aren't precise enough (e.g. guaranteeing a
// fixed-width gap next to a logo).
const HELVETICA_WIDTHS: Record<string, number> = {
  ' ':278,'!':278,'"':355,'#':556,'$':556,'%':889,'&':667,"'":191,'(':333,')':333,
  '*':389,'+':584,',':278,'-':333,'.':278,'/':278,
  '0':556,'1':556,'2':556,'3':556,'4':556,'5':556,'6':556,'7':556,'8':556,'9':556,
  ':':278,';':278,'<':584,'=':584,'>':584,'?':556,'@':1015,
  A:667,B:667,C:722,D:722,E:667,F:611,G:778,H:722,I:278,J:500,K:667,L:556,M:833,N:722,O:778,P:667,Q:778,R:722,S:667,T:611,U:722,V:667,W:944,X:667,Y:667,Z:611,
  '[':278,'\\':278,']':278,'^':469,'_':556,'`':333,
  a:556,b:556,c:500,d:556,e:556,f:278,g:556,h:556,i:222,j:222,k:500,l:222,m:833,n:556,o:556,p:556,q:556,r:333,s:500,t:278,u:556,v:500,w:722,x:500,y:500,z:500,
}

const HELVETICA_BOLD_WIDTHS: Record<string, number> = {
  ' ':278,'!':333,'"':474,'#':556,'$':556,'%':889,'&':722,"'":238,'(':333,')':333,
  '*':389,'+':584,',':278,'-':333,'.':278,'/':278,
  '0':556,'1':556,'2':556,'3':556,'4':556,'5':556,'6':556,'7':556,'8':556,'9':556,
  ':':333,';':333,'<':584,'=':584,'>':584,'?':611,'@':975,
  A:722,B:667,C:722,D:722,E:667,F:611,G:778,H:722,I:278,J:556,K:722,L:611,M:889,N:722,O:778,P:667,Q:778,R:722,S:667,T:611,U:722,V:667,W:944,X:667,Y:667,Z:611,
  '[':333,'\\':278,']':333,'^':584,'_':556,'`':333,
  a:556,b:611,c:556,d:611,e:556,f:333,g:611,h:611,i:278,j:278,k:556,l:278,m:889,n:611,o:611,p:611,q:611,r:389,s:556,t:333,u:611,v:556,w:778,x:556,y:556,z:500,
}

// Exact width in pt of `s` set in font `f` ('F1' = Helvetica, 'F2' =
// Helvetica-Bold) at size `size`. Falls back to 556 (the digit/average
// width) for any character outside the mapped set.
export function textWidth(s: string, f: 'F1' | 'F2', size: number): number {
  const table = f === 'F2' ? HELVETICA_BOLD_WIDTHS : HELVETICA_WIDTHS
  let units = 0
  for (const ch of s) units += table[ch] ?? 556
  return (units / 1000) * size
}

// Ellipsis-truncates `s` to fit within maxWidthPt using real glyph widths.
// Shared by any caller that needs an exact-width fallback truncation (the
// header title wrap below only reaches this for a single word/line that's
// still too wide on its own; callers elsewhere use it directly).
export function truncateToRealWidth(s: string, maxWidthPt: number, f: 'F1' | 'F2', size: number): string {
  const ellipsisW = textWidth('...', f, size)
  const available = Math.max(0, maxWidthPt - ellipsisW)
  let cut = 0
  let w = 0
  for (let i = 0; i < s.length; i++) {
    w += textWidth(s[i], f, size)
    if (w > available) break
    cut = i + 1
  }
  return s.slice(0, Math.max(1, cut)) + '...'
}

// ── Drawing operators ───────────────────────────────────────────────────────────
export function rect(x: number, y: number, w: number, h: number, c: string): string {
  return `q ${c} rg ${x} ${y} ${w} ${h} re f Q`
}
export function hline(x1: number, y: number, x2: number, c: string, lw = 0.5): string {
  return `q ${c} RG ${lw} w ${x1} ${y} m ${x2} ${y} l S Q`
}
export function tx(x: number, y: number, f: 'F1'|'F2', sz: number, c: string, s: string): string {
  return `q ${c} rg BT /${f} ${sz} Tf ${x} ${y} Td (${esc(s)}) Tj ET Q`
}
export function drawImage(name: string, x: number, y: number, w: number, h: number): string {
  return `q ${w} 0 0 ${h} ${x} ${y} cm /${name} Do Q`
}

const HDR_BASE_H = 72
const TITLE_SIZE_MAX = 13
const TITLE_SIZE_MIN = 9
const HEADER_LOGO_GAP = 12

export interface BrandedHeader {
  ops: string[]
  height: number
}

// Greedy word-wrap into at most 2 lines within maxWidthPt at the given font
// size (real AFM widths). Doesn't guarantee either line actually fits —
// fitTitle below is the one that checks that and decides whether to retry
// at a smaller size.
function greedyWrapTwoLines(title: string, maxWidthPt: number, size: number): string[] {
  const words = title.split(/\s+/).filter(Boolean)
  let line1 = ''
  let i = 0
  for (; i < words.length; i++) {
    const candidate = line1 ? `${line1} ${words[i]}` : words[i]
    if (!line1 || textWidth(candidate, 'F2', size) <= maxWidthPt) {
      line1 = candidate
    } else {
      break
    }
  }
  const line2 = words.slice(i).join(' ')
  return line2 ? [line1, line2] : [line1]
}

interface TitleFit {
  lines: string[]
  size: number
}

// Fits `title` into at most 2 lines within maxWidthPt, preferring the
// largest size (13pt down to a 9pt floor) that lets the whole title fit
// without losing any words. Only once the 9pt floor is reached and it still
// doesn't fit does the trailing line get ellipsis-truncated, as a last
// resort for pathological cases (e.g. one word wider than the budget itself).
function fitTitle(title: string, maxWidthPt: number): TitleFit {
  if (textWidth(title, 'F2', TITLE_SIZE_MAX) <= maxWidthPt) {
    return { lines: [title], size: TITLE_SIZE_MAX }
  }

  for (let size = TITLE_SIZE_MAX; size >= TITLE_SIZE_MIN; size--) {
    const lines = greedyWrapTwoLines(title, maxWidthPt, size)
    if (lines.every(line => textWidth(line, 'F2', size) <= maxWidthPt)) {
      return { lines, size }
    }
  }

  const size = TITLE_SIZE_MIN
  const lines = greedyWrapTwoLines(title, maxWidthPt, size).map(line =>
    textWidth(line, 'F2', size) > maxWidthPt ? truncateToRealWidth(line, maxWidthPt, 'F2', size) : line,
  )
  return { lines, size }
}

// ── Branded header/footer ────────────────────────────────────────────────────
// First-page header band: club name on the left, document title + subtitle
// on the right. Logo (if any) is drawn separately by the caller via
// drawImage, since it requires the loaded PNG XObject to already be
// registered as a page resource — `logoX` here is only used to size the
// available width for the title, so it never overlaps the logo.
// The title wraps onto a 2nd line (growing the band height accordingly)
// when it doesn't fit the single-line budget between rightBlockX and the
// logo; callers must read back `height` to position content below the band.
export function drawBrandedHeader(
  title: string,
  subtitle: string,
  rightBlockX = 370,
  logoX = MR - 8,
): BrandedHeader {
  const available = Math.max(20, logoX - HEADER_LOGO_GAP - rightBlockX)
  const { lines: titleLines, size: titleSize } = fitTitle(title, available)
  // Leading scales with the size actually used, so 2 lines at a shrunk size
  // don't end up loosely spaced relative to the (smaller) glyphs.
  const lineH = titleSize * 1.2
  const extraLines = titleLines.length - 1
  const height = HDR_BASE_H + extraLines * lineH

  // The club name is the only line in the left block — center its baseline
  // on the (possibly taller) band rather than top-aligning it.
  const nameY = PH - height / 2 - 6
  const ops = [
    rect(0, PH - height, PW, height, GREEN),
    tx(ML, nameY, 'F2', 16, WHITE, 'ALATA INVESTMENT CLUB'),
  ]
  titleLines.forEach((line, i) => {
    ops.push(tx(rightBlockX, PH - 28 - i * lineH, 'F2', titleSize, WHITE, line))
  })
  // Subtitle size/position stays fixed (9pt) regardless of the title size —
  // only its Y drops to clear however many title lines were drawn.
  ops.push(tx(rightBlockX, PH - 28 - extraLines * lineH - 18, 'F1', 9, GSUB, subtitle))

  return { ops, height }
}

export function drawBrandedFooter(pageNum: number): string[] {
  return [
    hline(ML, FOOTER_MIN, MR, GREEN, 0.75),
    tx(ML, FOOTER_MIN - 15, 'F1', 8, MUTED, 'Alata Investment Club - Documento riservato'),
    tx(MR - 50, FOOTER_MIN - 15, 'F1', 8, MUTED, `Pagina ${pageNum}`),
  ]
}
