import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { createServiceClient } from '@/lib/supabase-server'

// TEMPORARY — production-only verification of the Buffer→Uint8Array storage
// upload fix. Removed once verified. Not linked from any UI.
export const dynamic = 'force-dynamic'

const DIAG_SECRET = '660aa0ee1882c3ccc6bf5d8332e89e978adbeb35ad6d0276'

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get('secret') !== DIAG_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const testImage = await sharp({
    create: { width: 800, height: 600, channels: 3, background: { r: 200, g: 100, b: 50 } },
  }).jpeg({ quality: 90 }).toBuffer()

  const image = sharp(testImage)
  const metadata = await image.metadata()
  let pipeline = image
  if (metadata.width && metadata.width > 1920) pipeline = pipeline.resize({ width: 1920 })
  const outputFormat = metadata.format === 'webp' ? 'webp' : 'jpeg'
  pipeline = outputFormat === 'webp'
    ? pipeline.webp({ quality: 80 })
    : pipeline.jpeg({ quality: 80 })
  const outputBuffer = await pipeline.toBuffer()

  const contentType = outputFormat === 'webp' ? 'image/webp' : 'image/jpeg'
  const path = `diag-prod-verify-${Date.now()}.jpg`

  const service = createServiceClient()
  const { data, error } = await service.storage.from('event-gallery').upload(path, new Uint8Array(outputBuffer), {
    contentType,
    upsert: false,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = service.storage.from('event-gallery').getPublicUrl(data.path)
  return NextResponse.json({ url: publicUrl, path: data.path, outputSize: outputBuffer.length })
}
