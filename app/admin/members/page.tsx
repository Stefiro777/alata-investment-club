import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import MembersClient from './MembersClient'
import type { Alumni, AlumniCompany } from '@/lib/types'

const SUPERADMIN = 'finullistefano@gmail.com'

export default async function MembersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('email')
    .eq('email', user.email)
    .maybeSingle()

  if (!adminRow) redirect('/login')

  const [
    { data: adminUsers },
    { data: appSettings },
    { data: showPricesRow },
    { data: priceCVRow },
    { data: priceMasterRow },
    { data: priceCareerRow },
    { data: showAlumniRow },
    { data: alumniRaw, error: alumniError },
    { data: alumniCompaniesData },
  ] = await Promise.all([
    supabase.from('admin_users').select('email').order('email', { ascending: true }),
    supabase.from('settings').select('value').eq('key', 'applications_open').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'show_prices').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'price_cv_review').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'price_master_orientation').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'price_career_orientation').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'show_alumni').maybeSingle(),
    supabase
      .from('alumni')
      .select('id, name, role, graduation_year, linkedin_url, current_company, order_index, created_at')
      .order('order_index', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
    supabase
      .from('alumni_companies')
      .select('id, name, logo_url, website_url, created_at')
      .order('created_at', { ascending: false }),
  ])

  // Fallback if order_index column doesn't exist yet
  const alumniData = alumniError
    ? (await supabase
        .from('alumni')
        .select('id, name, role, graduation_year, linkedin_url, current_company, created_at')
        .order('created_at', { ascending: true })).data
    : alumniRaw

  const applicationsOpen = appSettings?.value === 'true'
  const showPrices = showPricesRow ? showPricesRow.value === 'true' : true
  const priceCV = priceCVRow?.value ?? '€29,99'
  const priceMaster = priceMasterRow?.value ?? '€49,99'
  const priceCareer = priceCareerRow?.value ?? '€49,99'
  const showAlumni = showAlumniRow?.value === 'true'

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Top bar */}
      <div className="bg-[#1a4a3a] text-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-xl font-medium">Admin — Members Management</h1>
            <p className="text-white/50 text-xs mt-0.5">{user.email}</p>
          </div>
          <div className="flex items-center gap-3 ml-8">
            <a
              href="/admin"
              className="border border-white/40 hover:border-white text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-150"
            >
              Content
            </a>
            <a
              href="/admin/team"
              className="border border-white/40 hover:border-white text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-150"
            >
              Team
            </a>
            <a
              href="/dashboard"
              className="border border-white/40 hover:border-white text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-150"
            >
              Dashboard
            </a>
          </div>
        </div>
      </div>

      <MembersClient
        adminUsers={(adminUsers ?? []).map(r => r.email as string)}
        superadmin={SUPERADMIN}
        applicationsOpen={applicationsOpen}
        showPrices={showPrices}
        priceCV={priceCV}
        priceMaster={priceMaster}
        priceCareer={priceCareer}
        showAlumni={showAlumni}
        alumni={(alumniData ?? []) as Alumni[]}
        alumniCompanies={(alumniCompaniesData ?? []) as AlumniCompany[]}
      />
    </div>
  )
}
