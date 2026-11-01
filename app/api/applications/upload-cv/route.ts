import { createServiceClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { CV_BUCKET } from '@/lib/cv-path'

const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

// POST /api/applications/upload-cv — public, PDF only, and only while the
// applications switch is on. Returns the storage path (CVs stay private and
// are read by the Board through signed URLs).
export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { data: setting } = await supabase.from('settings').select('value').eq('key', 'applications_open').maybeSingle()
    if (setting?.value !== 'true') {
      return NextResponse.json({ error: 'Applications are currently closed.' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('cv')
    if (!(file instanceof File)) return NextResponse.json({ error: 'Missing cv field' }, { status: 400 })
    if (file.type !== 'application/pdf') return NextResponse.json({ error: 'Your CV must be a PDF.' }, { status: 400 })
    if (file.size > MAX_SIZE_BYTES) return NextResponse.json({ error: 'File exceeds 5 MB limit' }, { status: 400 })

    const safeName = file.name.replace(/[^\w.-]+/g, '_').slice(-80)
    const path = `applications/${randomUUID()}-${safeName}`
    const { data, error } = await supabase.storage
      .from(CV_BUCKET)
      .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ path: data.path })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
