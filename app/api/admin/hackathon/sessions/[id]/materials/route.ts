import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { requirePrivilegedAccess } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const MATERIALS_BUCKET = 'hackathon-materials'
const ROLES = ['sell_side', 'buy_side_1', 'buy_side_2', 'buy_side_3'] as const

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requirePrivilegedAccess())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('hackathon_materials')
    .select('*')
    .eq('session_id', id)
    .order('phase_number', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ materials: data ?? [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requirePrivilegedAccess())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const formData = await request.formData()
    const file = formData.get('file')
    const title = (formData.get('title') as string | null)?.trim()
    const phaseNumberRaw = formData.get('phase_number') as string | null
    const roleKey = formData.get('role_key') as string | null

    if (!(file instanceof File)) return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    if (!title) return NextResponse.json({ error: 'Missing title' }, { status: 400 })
    if (!roleKey || !ROLES.includes(roleKey as (typeof ROLES)[number])) {
      return NextResponse.json({ error: 'Invalid role_key' }, { status: 400 })
    }
    const phaseNumber = Number(phaseNumberRaw)
    if (!phaseNumberRaw || Number.isNaN(phaseNumber) || phaseNumber < 1) {
      return NextResponse.json({ error: 'Invalid phase_number' }, { status: 400 })
    }

    const safeName = file.name.replace(/\s+/g, '_')
    const path = `${id}/${phaseNumber}/${roleKey}/${Date.now()}-${safeName}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const supabase = createServiceClient()
    const { data: uploaded, error: uploadError } = await supabase.storage
      .from(MATERIALS_BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: material, error: insertError } = await supabase
      .from('hackathon_materials')
      .insert({
        session_id: id,
        phase_number: phaseNumber,
        role_key: roleKey,
        title,
        file_path: uploaded.path,
      })
      .select('*')
      .single()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    return NextResponse.json({ material })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
