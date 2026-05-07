import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('club_members')
    .select('role, teams')
    .eq('email', user.email!)
    .maybeSingle()

  const hasAccess = member?.role === 'bod' ||
    member?.role === 'director' ||
    (member?.teams && member.teams.includes('events'))

  if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }

  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/\s+/g, '_')}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const service = createServiceClient()
  const { data, error } = await service.storage.from('venue-photos').upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: signed, error: signErr } = await service.storage
    .from('venue-photos')
    .createSignedUrl(data.path, 31536000)
  if (signErr || !signed) return NextResponse.json({ error: signErr?.message ?? 'Failed to sign URL' }, { status: 500 })
  return NextResponse.json({ url: signed.signedUrl })
}
