import AdminNavbar from '../components/AdminNavbar'
import ApplicationsClient from './ApplicationsClient'

/** CRM · Applications (board ABc2): read, accept and invite, or decline. */
export default function AdminApplicationsPage() {
  return (
    <>
      <AdminNavbar />
      <ApplicationsClient />
    </>
  )
}
