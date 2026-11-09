import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminNavbar from '../components/AdminNavbar'
import SettingsClient from './SettingsClient'
import { requirePrivilegedAccess } from '@/lib/auth'
import { ABOUT_STATS_KEY, parseAboutStats } from '@/lib/about-stats'
import { FLAGSHIP_CREDITS_KEY, parseFlagshipCredits } from '@/lib/flagship-credits'

export default async function AdminSettingsPage() {
  const member = await requirePrivilegedAccess()
  if (!member) redirect('/dashboard')

  const supabase = await createClient()

  const [
    { data: appSettings },
    { data: showPricesRow },
    { data: careerSessionPriceRow },
    { data: showAlumniRow },
    { data: showAlumniReviewsRow },
    { data: showEventsReviewsRow },
    { data: aboutStatsRow },
    { data: flagshipCreditsRow },
  ] = await Promise.all([
    supabase.from('settings').select('value').eq('key', 'applications_open').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'show_prices').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'career_session_price_cents').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'show_alumni').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'show_alumni_reviews').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'show_events_reviews').maybeSingle(),
    supabase.from('settings').select('value').eq('key', ABOUT_STATS_KEY).maybeSingle(),
    supabase.from('settings').select('value').eq('key', FLAGSHIP_CREDITS_KEY).maybeSingle(),
  ])

  return (
    <>
      <AdminNavbar userEmail={member.email ?? ''} />
      <div>
        <SettingsClient
          applicationsOpen={appSettings?.value === 'true'}
          showPrices={showPricesRow ? showPricesRow.value === 'true' : true}
          careerSessionPriceCents={careerSessionPriceRow?.value ?? '3000'}
          showAlumni={showAlumniRow?.value === 'true'}
          showAlumniReviews={showAlumniReviewsRow?.value === 'true'}
          showEventsReviews={showEventsReviewsRow?.value === 'true'}
          aboutStats={parseAboutStats(aboutStatsRow?.value)}
          flagshipCredits={parseFlagshipCredits(flagshipCreditsRow?.value)}
        />
      </div>
    </>
  )
}
