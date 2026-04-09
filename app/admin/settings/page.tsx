import { createClient, createServiceClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminShell from '../AdminShell'
import MembersClient from '../members/MembersClient'
import type { Alumni, AlumniCompany } from '@/lib/types'

const SUPERADMIN = process.env.SUPERADMIN_EMAIL ?? ''

export default async function AdminSettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('email')
    .eq('email', user.email)
    .maybeSingle()
  if (!adminRow) redirect('/login')

  const serviceClient = createServiceClient()

  const [
    { data: adminUsersData },
    { data: appSettings },
    { data: showPricesRow },
    { data: priceCVRow },
    { data: priceMasterRow },
    { data: priceCareerRow },
    { data: showAlumniRow },
    { data: alumniRaw, error: alumniError },
    { data: alumniCompaniesData },
  ] = await Promise.all([
    serviceClient.from('admin_users').select('email').order('email', { ascending: true }),
    supabase.from('settings').select('value').eq('key', 'applications_open').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'show_prices').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'price_cv_review').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'price_master_orientation').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'price_career_orientation').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'show_alumni').maybeSingle(),
    supabase
      .from('alumni')
      .select('id, name, role, graduation_year, linkedin_url, current_company, industry, order_index, created_at')
      .order('order_index', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
    supabase
      .from('alumni_companies')
      .select('id, name, logo_url, website_url, created_at')
      .order('created_at', { ascending: false }),
  ])

  const alumniData = alumniError
    ? (await supabase
        .from('alumni')
        .select('id, name, role, graduation_year, linkedin_url, current_company, industry, created_at')
        .order('created_at', { ascending: true })).data
    : alumniRaw

  return (
    <AdminShell userEmail={user.email ?? ''}>
      <MembersClient
        adminUsers={(adminUsersData ?? []).map(r => r.email as string)}
        superadmin={SUPERADMIN}
        applicationsOpen={appSettings?.value === 'true'}
        showPrices={showPricesRow ? showPricesRow.value === 'true' : true}
        priceCV={priceCVRow?.value ?? '€29,99'}
        priceMaster={priceMasterRow?.value ?? '€49,99'}
        priceCareer={priceCareerRow?.value ?? '€49,99'}
        showAlumni={showAlumniRow?.value === 'true'}
        alumni={(alumniData ?? []) as Alumni[]}
        alumniCompanies={(alumniCompaniesData ?? []) as AlumniCompany[]}
      />
    </AdminShell>
  )
}
