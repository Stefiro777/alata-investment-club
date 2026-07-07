import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { requirePrivilegedAccess } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const MATERIALS_BUCKET = 'hackathon-materials'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; material_id: string }> }
) {
  if (!(await requirePrivilegedAccess())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, material_id } = await params
  if (!id || !material_id) return NextResponse.json({ error: 'Missing id or material_id' }, { status: 400 })

  const supabase = createServiceClient()

  const { data: material, error: fetchError } = await supabase
    .from('hackathon_materials')
    .select('id, file_path')
    .eq('id', material_id)
    .eq('session_id', id)
    .maybeSingle()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  if (!material) return NextResponse.json({ error: 'Materiale non trovato' }, { status: 404 })

  const { error: deleteError } = await supabase
    .from('hackathon_materials')
    .delete()
    .eq('id', material_id)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  await supabase.storage.from(MATERIALS_BUCKET).remove([material.file_path])

  return NextResponse.json({ success: true })
}
