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
const UpdateContext = createContext<(patch: Partial<MemberProfile>) => void>(() => {})

export function DashboardProfileProvider({
  children,
  profile,
  onUpdate,
}: {
  children: React.ReactNode
  profile: MemberProfile
  /** Merges a change into the loaded profile, so every screen shows it at once. */
  onUpdate: (patch: Partial<MemberProfile>) => void
}) {
  return (
    <DashboardProfileContext.Provider value={profile}>
      <UpdateContext.Provider value={onUpdate}>{children}</UpdateContext.Provider>
    </DashboardProfileContext.Provider>
  )
}

export function useProfile(): MemberProfile | null {
  return useContext(DashboardProfileContext)
}

export function useUpdateProfile() {
  return useContext(UpdateContext)
}
