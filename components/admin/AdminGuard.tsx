'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    async function check() {
      const res = await fetch('/api/admin/check', { credentials: 'include' })
      const data = await res.json()
      if (data.allowed) {
        setAllowed(true)
      } else {
        setAllowed(false)
      }
    }
    check()
  }, [])

  useEffect(() => {
    if (allowed === false) {
      router.push('/dashboard')
    }
  }, [allowed, router])

  if (allowed === null) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>
  if (!allowed) return null
  return <>{children}</>
}
