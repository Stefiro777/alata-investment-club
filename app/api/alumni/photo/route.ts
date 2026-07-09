import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { requirePrivilegedAccess } from '@/lib/auth'

const ALUMNI_PHOTOS_BUCKET = 'alumni-photos'
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export async function POST(req: NextRequest) {
  try {
    if (!(await requirePrivilegedAccess())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'File exceeds 5 MB limit' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const safeName = file.name.replace(/\s+/g, '_')
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { data, error } = await supabase.storage
      .from(ALUMNI_PHOTOS_BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: { publicUrl } } = supabase.storage.from(ALUMNI_PHOTOS_BUCKET).getPublicUrl(data.path)
    return NextResponse.json({ url: publicUrl })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[alumni/photo] Unexpected error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
