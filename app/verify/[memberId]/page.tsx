import type { Metadata } from 'next'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { roleLabel } from '@/lib/roles'

export const metadata: Metadata = {
  title: 'Membership verification — Alata Investment Club',
  robots: { index: false, follow: false },
}

const supabase = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const ROLE_LABEL: Record<string, string> = { bod: 'Board of Directors', director: 'Management' }

/** Opened from the QR code on the digital membership card. */
export default async function VerifyPage({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params

  const { data } = await supabase
    .from('club_members')
    .select('full_name, role, membership_expires_at')
    .eq('member_id', memberId)
    .maybeSingle()

  const valid = !!data?.membership_expires_at && new Date(data.membership_expires_at) > new Date()

  return (
    <div className={`flex min-h-screen flex-col ${valid ? 'bg-pine text-ivory' : 'bg-ivory text-night'}`}>
      <div className="rd-gutter pt-6 md:pt-[30px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={valid ? '/redesign/logo-light.png' : '/redesign/logo-dark.png'} alt="Alata" className="h-[34px] w-auto md:h-10" />
      </div>
      <div className="rd-gutter flex flex-1 flex-col justify-center py-16">
        <div className={`rd-eyebrow ${valid ? 'text-ivory/70' : 'text-[#8a2a1d]'}`}>Membership verification</div>
        {valid && data ? (
          <>
            <h1 className="rd-display mt-4 text-[clamp(44px,8vw,80px)]">{data.full_name}</h1>
            <p className="rd-italic mt-3 text-[clamp(26px,3vw,34px)]">Active member</p>
            <dl className="mt-10 grid max-w-[520px] grid-cols-2 gap-6 border-t border-ivory/30 pt-6">
              <div>
                <dt className="text-[13px] text-ivory/70">Role</dt>
                <dd className="rd-display mt-1 text-[24px]">{ROLE_LABEL[data.role] ?? roleLabel(data.role)}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-ivory/70">Valid until</dt>
                <dd className="rd-display mt-1 text-[24px]">{fmtDate(data.membership_expires_at!)}</dd>
              </div>
            </dl>
            <p className="mt-8 text-[12px] tracking-[0.06em] text-ivory/60">Card {memberId}</p>
          </>
        ) : (
          <>
            <h1 className="rd-display mt-4 text-[clamp(40px,6vw,64px)]">Not an active <em>membership</em></h1>
            <p className="mt-5 max-w-[440px] text-[15px] leading-[1.7] text-earth-700">
              This card is expired or not valid. For information, write to info@alatainvestmentclub.com.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
