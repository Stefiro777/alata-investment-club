'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: member } = await supabase
        .from('club_members')
        .select('role')
        .eq('email', user.email!)
        .maybeSingle()

      if (member?.role === 'bod' || member?.role === 'director') {
        setAllowed(true)
      } else {
        router.push('/dashboard')
      }
    }
    check()
  }, [router])

  if (allowed === null) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>
  if (!allowed) return null
  return <>{children}</>
}
