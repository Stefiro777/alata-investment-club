/**
 * Download of the membership card as a JPEG (html-to-image). The portrait comes from another
 * origin (storage): if the browser cannot embed it, or the render stalls, the card is rendered
 * again without it, so the download always works, just without the photo.
 */

type RenderOptions = { quality: number; pixelRatio: number; filter?: (node: Node) => boolean }
export type ToJpeg = (node: HTMLElement, options: RenderOptions) => Promise<string>

/** The node of the portrait is marked with data-card-photo. */
export function isCardPhoto(node: unknown): boolean {
  const dataset = (node as { dataset?: Record<string, string | undefined> } | null)?.dataset
  return !!dataset && dataset.cardPhoto !== undefined
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The card render took too long')), ms)
    promise.then(
      value => { clearTimeout(timer); resolve(value) },
      error => { clearTimeout(timer); reject(error) },
    )
  })
}

export async function renderCardJpeg(node: HTMLElement, toJpeg: ToJpeg, timeoutMs = 20_000): Promise<string> {
  const options = { quality: 0.97, pixelRatio: 3 }
  try {
    return await withTimeout(toJpeg(node, options), timeoutMs)
  } catch {
    return await withTimeout(toJpeg(node, { ...options, filter: n => !isCardPhoto(n) }), timeoutMs)
  }
}
