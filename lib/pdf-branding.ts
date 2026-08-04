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

// ── Branded header/footer ────────────────────────────────────────────────────
// First-page header band: club name + tagline + university reference on the
// left, document title + subtitle on the right. Logo (if any) is drawn
// separately by the caller via drawImage, since it requires the loaded
// PNG XObject to already be registered as a page resource.
export function drawBrandedHeader(title: string, subtitle: string, rightBlockX = 370): string[] {
  const HDR_H = 72
  // The club name is the only line in the left block — center its baseline
  // on the band rather than top-aligning it.
  const nameY = PH - HDR_H / 2 - 6
  return [
    rect(0, PH - HDR_H, PW, HDR_H, GREEN),
    tx(ML, nameY, 'F2', 16, WHITE, 'ALATA INVESTMENT CLUB'),
    tx(rightBlockX, PH - 28, 'F2', 13, WHITE, title),
    tx(rightBlockX, PH - 46, 'F1', 9, GSUB, subtitle),
  ]
}

export function drawBrandedFooter(pageNum: number): string[] {
  return [
    hline(ML, FOOTER_MIN, MR, GREEN, 0.75),
    tx(ML, FOOTER_MIN - 15, 'F1', 8, MUTED, 'Alata Investment Club - Documento riservato'),
    tx(MR - 50, FOOTER_MIN - 15, 'F1', 8, MUTED, `Pagina ${pageNum}`),
  ]
}
