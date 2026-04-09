import { createClient, createServiceClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminNavbar from '../components/AdminNavbar'
import SettingsClient from './SettingsClient'

const SUPERADMIN = process.env.SUPERADMIN_EMAIL ?? ''

export default async function AdminSettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dashboard')

  const { data: adminRow } = await supabase
    .from('admin_users').select('email').eq('email', user.email).maybeSingle()
  if (!adminRow) redirect('/dashboard')

  const serviceClient = createServiceClient()

  const [
    { data: adminUsersData },
    { data: appSettings },
    { data: showPricesRow },
    { data: priceCVRow },
    { data: priceMasterRow },
    { data: priceCareerRow },
    { data: showAlumniRow },
  ] = await Promise.all([
    serviceClient.from('admin_users').select('email').order('email', { ascending: true }),
    supabase.from('settings').select('value').eq('key', 'applications_open').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'show_prices').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'price_cv_review').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'price_master_orientation').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'price_career_orientation').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'show_alumni').maybeSingle(),
  ])

  return (
    <>
      <AdminNavbar userEmail={user.email ?? ''} />
      <main className="bg-[#f9f9f9] min-h-screen">
        <SettingsClient
          adminUsers={(adminUsersData ?? []).map(r => r.email as string)}
          superadmin={SUPERADMIN}
          applicationsOpen={appSettings?.value === 'true'}
          showPrices={showPricesRow ? showPricesRow.value === 'true' : true}
          priceCV={priceCVRow?.value ?? '€29,99'}
          priceMaster={priceMasterRow?.value ?? '€49,99'}
          priceCareer={priceCareerRow?.value ?? '€49,99'}
          showAlumni={showAlumniRow?.value === 'true'}
        />
      </main>
    </>
  )
}
