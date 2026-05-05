'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    async function check() {
      console.log('AdminGuard: starting check')
      const res = await fetch('/api/admin/check', { credentials: 'include' })
      const data = await res.json()
      console.log('AdminGuard: response', JSON.stringify(data))
      if (data.allowed) {
        console.log('AdminGuard: setting allowed true')
        setAllowed(true)
      } else {
        console.log('AdminGuard: redirecting to dashboard')
        router.push('/dashboard')
      }
    }
    check()
  }, [])

  if (allowed === null) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>
  if (!allowed) return null
  return <>{children}</>
}
