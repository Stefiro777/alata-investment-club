import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminNavbar from '../components/AdminNavbar'
import MerchManager from './MerchManager'

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function AdminMerchPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dashboard')

  const { data: member } = await supabaseAdmin
    .from('club_members').select('role').eq('email', user.email!).maybeSingle()
  if (member?.role !== 'bod' && member?.role !== 'director') redirect('/dashboard')

  const [{ data: rates }, { data: codes }] = await Promise.all([
    supabaseAdmin.from('shipping_rates').select('zone, price_cents').order('zone'),
    supabaseAdmin.from('discount_codes').select('*').order('created_at', { ascending: false }),
  ])

  return (
    <>
      <AdminNavbar userEmail={user.email ?? ''} />
      <main className="bg-[#f9f9f9] min-h-screen">
        <MerchManager
          shippingRates={(rates ?? []) as { zone: 'IT' | 'EU' | 'WORLD'; price_cents: number }[]}
          discountCodes={codes ?? []}
        />
      </main>
    </>
  )
}
