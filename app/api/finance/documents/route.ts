import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { requirePrivilegedAccess } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const BUCKET = 'accounting-documents'

// Shared privileged-access check (bod/director)
const checkAuth = requirePrivilegedAccess

export async function GET(request: NextRequest) {
  const user = await checkAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const folder = request.nextUrl.searchParams.get('folder')
  if (!folder) return NextResponse.json({ error: 'Missing folder' }, { status: 400 })

  const service = createServiceClient()
  const { data, error } = await service.storage.from(BUCKET).list(folder, {
    limit: 200,
    sortBy: { column: 'created_at', order: 'desc' },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const files = (data ?? [])
    .filter(f => f.name !== '.emptyFolderPlaceholder')
    .map(f => {
      const path = `${folder}/${f.name}`
      const { data: { publicUrl } } = service.storage.from(BUCKET).getPublicUrl(path)
      return {
        name: f.name,
        path,
        size: f.metadata?.size ?? 0,
        created_at: f.created_at ?? f.metadata?.lastModified ?? null,
        url: publicUrl,
      }
    })

  return NextResponse.json({ files })
}

export async function POST(request: NextRequest) {
  const user = await checkAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file')
  const folder = formData.get('folder')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  if (typeof folder !== 'string' || !folder) return NextResponse.json({ error: 'Missing folder' }, { status: 400 })

  const safeName = file.name.replace(/\s+/g, '_')
  const path = `${folder}/${Date.now()}-${safeName}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const service = createServiceClient()
  const { data, error } = await service.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = service.storage.from(BUCKET).getPublicUrl(data.path)
  return NextResponse.json({ url: publicUrl, name: file.name, path: data.path })
}

export async function DELETE(request: NextRequest) {
  const user = await checkAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const path = request.nextUrl.searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 })

  const service = createServiceClient()
  const { error } = await service.storage.from(BUCKET).remove([path])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
