import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { createServiceClient } from '@/lib/supabase-server'
import { requirePrivilegedAccess } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const ALLOWED_BUCKETS = ['event-gallery', 'partner-gallery', 'venue-photos', 'featured-reports']
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024
const MAX_WIDTH = 1920
const JPEG_QUALITY = 80

export async function POST(request: NextRequest) {
  if (!(await requirePrivilegedAccess())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  const bucket = formData.get('bucket')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }
  if (typeof bucket !== 'string' || !ALLOWED_BUCKETS.includes(bucket)) {
    return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 })
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 })
  }

  const originalBuffer = Buffer.from(await file.arrayBuffer())

  // Re-encode through sharp: this both validates that the file is a real,
  // decodable image (not just trusting the browser-supplied content-type)
  // and applies the resize/compression pass below in one decode.
  let outputBuffer: Buffer
  let outputFormat: 'jpeg' | 'webp'
  try {
    const image = sharp(originalBuffer)
    const metadata = await image.metadata()
    if (!metadata.width || !metadata.height) throw new Error('Not a decodable image')

    let pipeline = image
    if (metadata.width > MAX_WIDTH) {
      pipeline = pipeline.resize({ width: MAX_WIDTH })
    }

    outputFormat = metadata.format === 'webp' ? 'webp' : 'jpeg'
    pipeline = outputFormat === 'webp'
      ? pipeline.webp({ quality: JPEG_QUALITY })
      : pipeline.jpeg({ quality: JPEG_QUALITY })

    outputBuffer = await pipeline.toBuffer()
  } catch {
    return NextResponse.json({ error: 'File non valido: non è un\'immagine leggibile' }, { status: 400 })
  }

  const contentType = outputFormat === 'webp' ? 'image/webp' : 'image/jpeg'
  const ext = outputFormat === 'webp' ? 'webp' : 'jpg'
  const baseName = file.name.replace(/\s+/g, '_').replace(/\.[^./]+$/, '')
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}-${baseName}.${ext}`

  const service = createServiceClient()
  const { data, error } = await service.storage.from(bucket).upload(path, outputBuffer, {
    contentType,
    upsert: false,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = service.storage.from(bucket).getPublicUrl(data.path)
  return NextResponse.json({ url: publicUrl })
}
