'use client'

import { useProfile } from '../DashboardProfileContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import EventScanner from '@/components/admin/EventScanner'

export default function DashboardScannerPage() {
  const profile = useProfile()
  const router = useRouter()

  // Only events and media teams (plus BoD/director) can access
  const canAccess =
    profile?.role === 'bod' ||
    profile?.role === 'director' ||
    (profile?.teams ?? []).some(t => t === 'events' || t === 'media')

  useEffect(() => {
    if (profile && !canAccess) {
      router.replace('/dashboard')
    }
  }, [profile, canAccess, router])

  if (!profile || !canAccess) return null

  return (
    <div className="max-w-7xl mx-auto">
      <EventScanner />
    </div>
  )
}
