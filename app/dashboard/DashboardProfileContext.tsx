'use client'

import { createContext, useContext } from 'react'

export type MemberProfile = {
  full_name: string
  role: string
  teams: string[] | null
  email: string
}

const DashboardProfileContext = createContext<MemberProfile | null>(null)

export function DashboardProfileProvider({
  children,
  profile,
}: {
  children: React.ReactNode
  profile: MemberProfile
}) {
  return (
    <DashboardProfileContext.Provider value={profile}>
      {children}
    </DashboardProfileContext.Provider>
  )
}

export function useProfile(): MemberProfile | null {
  return useContext(DashboardProfileContext)
}
