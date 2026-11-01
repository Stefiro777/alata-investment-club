import { redirect } from 'next/navigation'
import { requireTeamAccess } from '@/lib/auth'

// Only the teams that have a page; Lab and the hidden teams go back home.
const TEAMS_WITH_PAGE = ['events', 'media', 'career']

/** Server gate: members open only the teams they belong to (BoD and Management all). */
export default async function TeamLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!TEAMS_WITH_PAGE.includes(slug)) redirect('/dashboard')
  const member = await requireTeamAccess(slug)
  if (!member) redirect('/dashboard')
  return <>{children}</>
}
