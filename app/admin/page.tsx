import { createClient, createServiceClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminShell from './AdminShell'
import type { Resource, Partner, Alumni, AlumniCompany, FeaturedReport } from '@/lib/types'
import type { TeamMember } from './team/page'

type Contenuto = {
  id: number
  titolo: string
  descrizione: string | null
  short_description: string | null
  full_description: string | null
  tag: string | null
  tipo: string
  data_pubblicazione: string | null
  link: string | null
  immagine_url: string | null
  photos: string[] | null
}

const SUPERADMIN = process.env.SUPERADMIN_EMAIL ?? ''

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; tab?: string }>
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('email')
    .eq('email', user.email)
    .maybeSingle()
  if (!adminRow) redirect('/login')

  const params = await searchParams
  const initialSection = params.section ?? 'people'
  const initialTab = params.tab ?? 'board'

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
    { data: contenuti },
    { data: resourcesData },
    { data: partnersData },
    { data: featuredReportsData },
    { data: teamMembersData },
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
    supabase
      .from('contenuti')
      .select('*')
      .in('tipo', ['evento', 'news', 'aggiornamento'])
      .order('data_pubblicazione', { ascending: false }),
    supabase
      .from('resources')
      .select('id, title, description, url, category, subcategory, subcategory_order, is_folder, order_index, created_at')
      .order('order_index', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
    supabase
      .from('partners')
      .select('id, name, logo_url, website_url, order_index, click_count, created_at')
      .order('order_index', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
    supabase
      .from('featured_reports')
      .select('id, title, description, image_url, pdf_url, display_order, created_at')
      .order('display_order', { ascending: true }),
    supabase
      .from('team_members')
      .select('id, name, role, photo_url, linkedin_url, type, order_index, created_at')
      .order('order_index', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
  ])

  // Fallback if order_index column doesn't exist yet
  const alumniData = alumniError
    ? (await supabase
        .from('alumni')
        .select('id, name, role, graduation_year, linkedin_url, current_company, industry, created_at')
        .order('created_at', { ascending: true })).data
    : alumniRaw

  return (
    <AdminShell
      userEmail={user.email ?? ''}
      initialSection={initialSection}
      initialTab={initialTab}
      items={(contenuti ?? []) as Contenuto[]}
      resources={(resourcesData ?? []) as Resource[]}
      partners={(partnersData ?? []) as Partner[]}
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
      reports={(featuredReportsData ?? []) as FeaturedReport[]}
      teamMembers={(teamMembersData ?? []) as TeamMember[]}
    />
  )
}
