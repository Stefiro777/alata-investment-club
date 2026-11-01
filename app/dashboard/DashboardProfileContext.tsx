'use client'

import { createContext, useContext } from 'react'

export type MemberProfile = {
  full_name: string
  role: string
  teams: string[] | null
  email: string
  membership_expires_at: string | null
  member_id: string | null
  created_at: string | null
  /** Columns below exist once the redesign SQL has run; null until then. */
  id?: string | null
  title?: string | null
  phone?: string | null
  photo_url?: string | null
  linkedin_url?: string | null
  degree_programme?: string | null
  study_level?: string | null
  study_year?: number | null
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
