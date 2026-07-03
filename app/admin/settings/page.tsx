import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminNavbar from '../components/AdminNavbar'
import SettingsClient from './SettingsClient'
import { requirePrivilegedAccess } from '@/lib/auth'

export default async function AdminSettingsPage() {
  const member = await requirePrivilegedAccess()
  if (!member) redirect('/dashboard')

  const supabase = await createClient()

  const [
    { data: appSettings },
    { data: showPricesRow },
    { data: priceCVRow },
    { data: priceMasterRow },
    { data: priceCareerRow },
    { data: showAlumniRow },
    { data: showAlumniReviewsRow },
    { data: showEventsReviewsRow },
  ] = await Promise.all([
    supabase.from('settings').select('value').eq('key', 'applications_open').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'show_prices').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'price_cv_review').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'price_master_orientation').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'price_career_orientation').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'show_alumni').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'show_alumni_reviews').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'show_events_reviews').maybeSingle(),
  ])

  return (
    <>
      <AdminNavbar userEmail={member.email ?? ''} />
      <main className="bg-[#f9f9f9] min-h-screen">
        <SettingsClient
          applicationsOpen={appSettings?.value === 'true'}
          showPrices={showPricesRow ? showPricesRow.value === 'true' : true}
          priceCV={priceCVRow?.value ?? '€29,99'}
          priceMaster={priceMasterRow?.value ?? '€49,99'}
          priceCareer={priceCareerRow?.value ?? '€49,99'}
          showAlumni={showAlumniRow?.value === 'true'}
          showAlumniReviews={showAlumniReviewsRow?.value === 'true'}
          showEventsReviews={showEventsReviewsRow?.value === 'true'}
        />
      </main>
    </>
  )
}
