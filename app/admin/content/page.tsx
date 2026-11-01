import AdminNavbar from '../components/AdminNavbar'
import EventsContent from '@/app/dashboard/team/[slug]/EventsContent'

/** Site · Content: events, event cards, stories, partners and venues (board ABs1). */
export default function AdminContentPage() {
  return (
    <>
      <AdminNavbar />
      <EventsContent />
    </>
  )
}
