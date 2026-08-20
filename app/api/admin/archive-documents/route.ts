import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { requirePrivilegedAccess } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const member = await requirePrivilegedAccess()
  if (!member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { title, description, tags, file_url, file_name, external_link, year, quarter, uploaded_by, folder_id } = body

  const service = createServiceClient()
  const { data, error } = await service
    .from('admin_documents')
    .insert({ title, description, tags, file_url, file_name, external_link, year, quarter, uploaded_by, folder_id })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(request: NextRequest) {
  const member = await requirePrivilegedAccess()
  if (!member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, folder_id } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const service = createServiceClient()
  const { error } = await service
    .from('admin_documents')
    .update({ folder_id })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const member = await requirePrivilegedAccess()
  if (!member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const service = createServiceClient()
  const { error } = await service
    .from('admin_documents')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
