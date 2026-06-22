import { createServiceClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('cv')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing cv field' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only PDF and DOCX files are allowed' }, { status: 400 })
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'File exceeds 5 MB limit' }, { status: 400 })
    }

    const safeName = file.name.replace(/\s+/g, '_')
    const path = `career-bookings/${randomUUID()}-${safeName}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const supabase = createServiceClient()
    const { data, error } = await supabase.storage
      .from('cv-uploads')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage.from('cv-uploads').getPublicUrl(data.path)
    return NextResponse.json({ url: publicUrl })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
