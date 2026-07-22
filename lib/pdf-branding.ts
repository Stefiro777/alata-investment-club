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
export function drawBrandedHeader(title: string, subtitle: string): string[] {
  const HDR_H = 72
  return [
    rect(0, PH - HDR_H, PW, HDR_H, GREEN),
    tx(ML, PH - 28, 'F2', 16, WHITE, 'ALATA INVESTMENT CLUB'),
    tx(ML, PH - 46, 'F1', 9, GSUB, 'Associazione Studentesca di Finanza'),
    tx(ML, PH - 64, 'F1', 8, GSUB, 'Università degli Studi di Brescia'),
    tx(370, PH - 28, 'F2', 13, WHITE, title),
    tx(370, PH - 46, 'F1', 9, GSUB, subtitle),
  ]
}

export function drawBrandedFooter(pageNum: number): string[] {
  return [
    hline(ML, FOOTER_MIN, MR, GREEN, 0.75),
    tx(ML, FOOTER_MIN - 15, 'F1', 8, MUTED, 'Alata Investment Club - Documento riservato'),
    tx(MR - 50, FOOTER_MIN - 15, 'F1', 8, MUTED, `Pagina ${pageNum}`),
  ]
}
